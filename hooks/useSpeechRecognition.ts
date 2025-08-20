import { useState, useEffect, useRef, useCallback } from 'react';

// Type definitions for the Web Speech API to fix TypeScript errors.
interface SpeechRecognitionResult {
  readonly isFinal: boolean;
  readonly [index: number]: SpeechRecognitionAlternative;
  readonly length: number;
}

interface SpeechRecognitionResultList {
  readonly length: number;
  item(index: number): SpeechRecognitionResult;
  [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionEvent extends Event {
  readonly resultIndex: number;
  readonly results: SpeechRecognitionResultList;
}

interface SpeechRecognitionAlternative {
  readonly transcript: string;
  readonly confidence: number;
}

interface SpeechRecognitionErrorEvent extends Event {
    readonly error: string;
    readonly message: string;
}

interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start(): void;
  stop(): void;
  onend: (() => void) | null;
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
}

interface SpeechRecognitionStatic {
    new(): SpeechRecognition;
}

declare global {
  interface Window {
    SpeechRecognition: SpeechRecognitionStatic;
    webkitSpeechRecognition: SpeechRecognitionStatic;
  }
}


const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
const hasRecognitionSupport = !!SpeechRecognition;

export const useSpeechRecognition = () => {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [error, setError] = useState<string | null>(null);

  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const listeningIntentionallyRef = useRef(false);
  const retryTimeoutRef = useRef<number | null>(null);

  const stopListening = useCallback((finalError?: string) => {
    listeningIntentionallyRef.current = false;
    if (retryTimeoutRef.current) {
      clearTimeout(retryTimeoutRef.current);
      retryTimeoutRef.current = null;
    }
    if (recognitionRef.current) {
      // It's possible for stop() to throw an error if the service is already inactive.
      try {
        recognitionRef.current.stop();
      } catch (e) {
        console.warn("Speech recognition stop error:", e);
      }
    }
    setIsListening(false);
    if (finalError) {
      setError(finalError);
    }
  }, []);

  useEffect(() => {
    if (!hasRecognitionSupport) {
      console.warn("Speech recognition is not supported in this browser.");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = false;
    recognition.lang = 'en-US';

    recognitionRef.current = recognition;
    let retryCount = 0;
    const MAX_RETRIES = 3;

    const startRecognition = () => {
      if (listeningIntentionallyRef.current && recognitionRef.current) {
        try {
          recognitionRef.current.start();
        } catch (e) {
          console.error("Recognition restart failed", e);
          // If start itself fails, it's likely a persistent issue.
          stopListening("Speech recognition service failed to restart.");
        }
      }
    };

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      retryCount = 0; // Reset on success
      setError(null);   // Clear any "retrying" message
      
      let finalTranscript = '';
      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) {
          finalTranscript += event.results[i][0].transcript;
        }
      }
      setTranscript(prev => (prev ? prev + ' ' : '') + finalTranscript);
    };

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      console.error('Speech recognition error:', event.error, event.message);

      if (event.error === 'network' && listeningIntentionallyRef.current) {
        if (retryCount < MAX_RETRIES) {
          retryCount++;
          const retryDelay = Math.pow(2, retryCount - 1) * 1000; // 1s, 2s, 4s
          setError(`Connection unstable. Retrying...`);

          // Schedule a restart instead of relying on onend
          retryTimeoutRef.current = window.setTimeout(startRecognition, retryDelay);

        } else {
          stopListening("Network error. Please check your connection and try again.");
        }
        return;
      }
      
      let errorMessage = "An unknown error occurred.";
      switch (event.error) {
        case 'no-speech':
          errorMessage = "No speech was detected. Please try again.";
          break;
        case 'not-allowed':
        case 'service-not-allowed':
          errorMessage = "Microphone access denied. Please allow it in browser settings.";
          break;
        case 'aborted':
          // Usually user-initiated, not an error to display unless we weren't expecting it.
          if (listeningIntentionallyRef.current) {
            errorMessage = "Dictation was unexpectedly interrupted.";
          } else {
             return; // Expected stop
          }
          break;
      }
      stopListening(errorMessage);
    };

    recognition.onend = () => {
      // onend is called after stop(), an error, or a browser timeout.
      // If we are not intentionally listening (e.g., user clicked stop), make sure UI is synced.
      if (!listeningIntentionallyRef.current) {
        setIsListening(false);
      }
      // If a retry is scheduled, isListening will remain true, which is correct from the user's perspective.
    };
    
    return () => {
      stopListening();
    };
  }, [stopListening]);

  const start = () => {
    if (recognitionRef.current && !isListening) {
      listeningIntentionallyRef.current = true;
      setError(null);
      setTranscript('');
      setIsListening(true);
      try {
        recognitionRef.current.start();
      } catch (e) {
        console.error("Could not start speech recognition:", e);
        stopListening("Could not start speech recognition.");
      }
    }
  };

  const stop = () => {
    stopListening();
  };

  return { isListening, transcript, error, start, stop, hasRecognitionSupport };
};
