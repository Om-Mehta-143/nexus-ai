import React, { useState, useEffect, useRef } from 'react';
import { WandIcon } from './icons/WandIcon';
import { TableIcon } from './icons/TableIcon';
import { ImageIcon } from './icons/ImageIcon';

interface NoteGeneratorModalProps {
  onClose: () => void;
  onGenerate: (topic: string, type: 'note' | 'database' | 'image') => Promise<void>;
}

const loadingMessages = {
    note: [
        "Consulting the digital oracle...",
        "Weaving threads of knowledge...",
        "Summoning insights from the ether...",
    ],
    database: [
        "Structuring brilliance...",
        "Compiling data from across the web...",
        "Asking the silicon sages for wisdom...",
    ],
    image: [
        "Painting with pixels...",
        "Dreaming up your vision...",
        "Translating words into art...",
        "The AI is getting its easel ready...",
    ]
};

const NoteGeneratorModal: React.FC<NoteGeneratorModalProps> = ({ onClose, onGenerate }) => {
  const [topic, setTopic] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [generationType, setGenerationType] = useState<'note' | 'database' | 'image'>('note');
  const [currentMessage, setCurrentMessage] = useState(loadingMessages.note[0]);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  useEffect(() => {
    let interval: number;
    if (isLoading) {
      const messages = loadingMessages[generationType];
      interval = window.setInterval(() => {
        setCurrentMessage(prev => {
          const currentIndex = messages.indexOf(prev);
          const nextIndex = (currentIndex + 1) % messages.length;
          return messages[nextIndex];
        });
      }, 3000);
    }
    return () => clearInterval(interval);
  }, [isLoading, generationType]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!topic.trim() || isLoading) return;

    setIsLoading(true);
    setError(null);
    setCurrentMessage(loadingMessages[generationType][0]);
    try {
      await onGenerate(topic, generationType);
      // On success, the component will be unmounted by the parent.
    } catch (err) {
      console.error("Generation failed:", err);
      setError(err instanceof Error ? err.message : "An unknown error occurred. Please try again.");
      setIsLoading(false);
    }
  };

  const titles = {
    note: "Generate a New Note",
    database: "Generate a New Database",
    image: "Generate a New Image"
  };
  const descriptions = {
    note: "Describe a topic, and AI will create a structured note for you.",
    database: "Describe data you want to track, and AI will create a table.",
    image: "Describe a scene or concept, and AI will create an image."
  };
  const placeholders = {
    note: "e.g., 'The History of Ancient Rome'",
    database: "e.g., 'A project tracker for a new app launch'",
    image: "e.g., 'A vibrant oil painting of a futuristic city at sunset'"
  };
  const icons = {
    note: <WandIcon className="w-8 h-8 text-sky-400" />,
    database: <TableIcon className="w-8 h-8 text-sky-400" />,
    image: <ImageIcon className="w-8 h-8 text-sky-400" />
  };

  return (
    <div 
      className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 animate-modal-fade-in"
      onClick={onClose}
    >
      <div 
        className="bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl w-full max-w-lg p-8 relative animate-modal-slide-up"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-4 mb-6">
          <div className="bg-sky-500/10 p-3 rounded-full border border-sky-500/30">
            {icons[generationType]}
          </div>
          <div>
            <h2 className="text-2xl font-bold text-slate-100">{titles[generationType]}</h2>
            <p className="text-slate-400">{descriptions[generationType]}</p>
          </div>
        </div>

        {isLoading ? (
          <div className="text-center py-12">
            <div className="w-10 h-10 border-4 border-slate-600 border-t-sky-400 rounded-full animate-spin mx-auto"></div>
            <p className="text-slate-300 mt-6 text-lg font-medium transition-opacity duration-500">{currentMessage}</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            {error && (
              <div className="bg-red-900/50 border border-red-500/30 text-red-300 p-3 rounded-lg mb-4 text-sm" role="alert">
                  <p className="font-bold mb-1">Generation Failed</p>
                  <p>{error}</p>
              </div>
            )}
            <div className="mb-4 flex gap-2 p-1 bg-slate-800 rounded-lg">
                <button type="button" onClick={() => setGenerationType('note')} className={`flex-1 p-2 rounded-md text-sm font-semibold transition-colors ${generationType === 'note' ? 'bg-sky-600 text-white' : 'text-slate-300 hover:bg-slate-700'}`}>Note</button>
                <button type="button" onClick={() => setGenerationType('database')} className={`flex-1 p-2 rounded-md text-sm font-semibold transition-colors ${generationType === 'database' ? 'bg-sky-600 text-white' : 'text-slate-300 hover:bg-slate-700'}`}>Database</button>
                <button type="button" onClick={() => setGenerationType('image')} className={`flex-1 p-2 rounded-md text-sm font-semibold transition-colors ${generationType === 'image' ? 'bg-sky-600 text-white' : 'text-slate-300 hover:bg-slate-700'}`}>Image</button>
            </div>
            <div className="mb-6">
              <label htmlFor="topic" className="block text-sm font-medium text-slate-300 mb-2">Prompt / Description</label>
              <input
                ref={inputRef}
                type="text"
                id="topic"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder={placeholders[generationType]}
                className="w-full bg-slate-800 border border-slate-600 rounded-lg px-4 py-3 text-lg text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500 transition-colors"
              />
            </div>
            <div className="flex justify-end gap-4">
              <button
                type="button"
                onClick={onClose}
                className="px-6 py-2.5 rounded-lg bg-slate-700 text-slate-200 font-semibold hover:bg-slate-600 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!topic.trim()}
                className="px-6 py-2.5 rounded-lg bg-sky-600 text-white font-semibold hover:bg-sky-500 transition-colors disabled:bg-sky-800/50 disabled:text-sky-300/50 disabled:cursor-not-allowed"
              >
                {error ? 'Try Again' : 'Generate'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default NoteGeneratorModal;