import { useState, useEffect, useCallback } from 'react';
import { cleanMarkdownForSpeech } from '../utils/textUtils';

export const useSpeechToSpeech = () => {
    const [isPlaying, setIsPlaying] = useState(false);

    const play = useCallback((text: string) => {
        if (isPlaying || !text.trim()) return;

        // Clean the text to remove markdown for better pronunciation
        const cleanText = cleanMarkdownForSpeech(text);
        if (!cleanText) return;

        const utterance = new SpeechSynthesisUtterance(cleanText);
        utterance.onstart = () => setIsPlaying(true);
        utterance.onend = () => setIsPlaying(false);
        utterance.onerror = (e) => {
            console.error("Speech synthesis error:", e);
            setIsPlaying(false);
        };
        
        window.speechSynthesis.speak(utterance);
    }, [isPlaying]);

    const stop = useCallback(() => {
        if (isPlaying) {
            window.speechSynthesis.cancel();
            setIsPlaying(false);
        }
    }, [isPlaying]);

    // Cleanup on component unmount
    useEffect(() => {
        return () => {
            // Ensure any ongoing speech is stopped when the component unmounts
            window.speechSynthesis.cancel();
        };
    }, []);

    // Also stop if isPlaying is true but synthesis is not actually speaking
    useEffect(() => {
        const interval = setInterval(() => {
            if (isPlaying && !window.speechSynthesis.speaking) {
                setIsPlaying(false);
            }
        }, 500);

        return () => clearInterval(interval);
    }, [isPlaying]);

    return { play, stop, isPlaying };
};
