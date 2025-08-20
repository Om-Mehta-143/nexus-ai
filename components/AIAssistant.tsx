import React, { useState, useEffect, useRef, useMemo } from 'react';
import * as geminiService from '../services/geminiService';
import { SparklesIcon } from './icons/SparklesIcon';
import { ContinueWritingIcon } from './icons/ContinueWritingIcon';
import { SummaryIcon } from './icons/SummaryIcon';
import { ActionItemsIcon } from './icons/ActionItemsIcon';
import { BrainstormIcon } from './icons/BrainstormIcon';
import { PencilIcon } from './icons/PencilIcon';
import { SendIcon } from './icons/SendIcon';

interface AIAssistantProps {
    onClose: () => void;
    onSubmit: (action: keyof typeof geminiService, customPrompt?: string) => void;
    contextText: string;
    triggerMode: 'selection' | 'empty-line';
}

const allActions = [
    { label: 'Continue writing', icon: <ContinueWritingIcon />, action: 'continueWriting' as const, modes: ['selection', 'empty-line'] },
    { label: 'Summarize', icon: <SummaryIcon />, action: 'summarizeText' as const, modes: ['selection'] },
    { label: 'Improve writing', icon: <PencilIcon className="w-5 h-5" />, action: 'improveWriting' as const, modes: ['selection'] },
    { label: 'Find action items', icon: <ActionItemsIcon />, action: 'generateActionItems' as const, modes: ['selection', 'empty-line'] },
    { label: 'Brainstorm ideas', icon: <BrainstormIcon />, action: 'brainstormIdeas' as const, modes: ['selection', 'empty-line'] },
];

const AIAssistant: React.FC<AIAssistantProps> = ({ onClose, onSubmit, contextText, triggerMode }) => {
    const [prompt, setPrompt] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', handleKeyDown);
        inputRef.current?.focus();
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [onClose]);

    const handleAction = async (action: keyof typeof geminiService, customPromptOverride?: string) => {
        setIsLoading(true);
        setError(null);
        try {
            await onSubmit(action, customPromptOverride || prompt);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'An unknown error occurred.');
            setIsLoading(false); // only keep modal open on error
        }
    };

    const suggestedActions = useMemo(() => {
        return allActions.filter(action => action.modes.includes(triggerMode));
    }, [triggerMode]);

    return (
        <div className="fixed inset-0 bg-black/50 z-40 flex items-start justify-center p-4 pt-[10vh] animate-modal-fade-in" onClick={onClose}>
            <div 
                className="bg-slate-900 border border-slate-700 rounded-xl shadow-2xl w-full max-w-2xl relative animate-modal-slide-up"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="p-4">
                    {isLoading ? (
                         <div className="flex items-center justify-center p-8 h-48">
                            <div className="w-6 h-6 border-2 border-slate-500 border-t-sky-400 rounded-full animate-spin"></div>
                            <span className="text-slate-300 text-sm ml-4">AI is thinking...</span>
                        </div>
                    ) : (
                    <>
                        <form onSubmit={(e) => { e.preventDefault(); handleAction('askAI'); }} className="relative">
                           <SparklesIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-sky-400 pointer-events-none" />
                           <input
                            ref={inputRef}
                            type="text"
                            value={prompt}
                            onChange={(e) => setPrompt(e.target.value)}
                            placeholder="Ask AI to write, edit, or generate..."
                            className="w-full bg-slate-800 border border-slate-700 rounded-lg pl-10 pr-10 py-2.5 text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500"
                           />
                           <button type="submit" disabled={!prompt.trim()} className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-slate-400 hover:text-sky-400 disabled:text-slate-600 rounded-md">
                               <SendIcon />
                           </button>
                        </form>
                        
                        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-2">
                           {suggestedActions.map(({label, icon, action}) => (
                               <button 
                                key={action}
                                onClick={() => handleAction(action)}
                                className="flex items-center gap-3 p-3 text-left bg-slate-800/50 hover:bg-slate-700 rounded-lg transition-colors text-slate-200"
                               >
                                <div className="text-slate-400">{icon}</div>
                                <span>{label}</span>
                               </button>
                           ))}
                        </div>
                        {error && <p className="text-red-400 text-sm mt-3 text-center">{error}</p>}
                    </>
                    )}
                </div>
            </div>
        </div>
    );
};

export default AIAssistant;