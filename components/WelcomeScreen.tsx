import React from 'react';
import { PlusIcon } from './icons/PlusIcon';
import { SparklesIcon } from './icons/SparklesIcon';
import { WandIcon } from './icons/WandIcon';

interface WelcomeScreenProps {
  onNewNote: () => void;
  onOpenGenerator: () => void;
}

export const WelcomeScreen: React.FC<WelcomeScreenProps> = ({ onNewNote, onOpenGenerator }) => {
  return (
    <div className="flex flex-col items-center justify-center h-full text-center text-slate-500 p-8">
      <div className="max-w-md">
        <SparklesIcon className="w-24 h-24 mx-auto text-sky-500" />
        <h2 className="mt-6 text-4xl font-bold text-slate-200">Welcome to Nexus Notes AI</h2>
        <p className="mt-4 text-lg text-slate-400">
          Your intelligent notetaking companion. Select a note, create a blank one, or let AI generate one for you.
        </p>
        <div className="mt-8 flex flex-col sm:flex-row justify-center items-center gap-4">
          <button
            onClick={onOpenGenerator}
            className="inline-flex items-center gap-3 px-6 py-3 bg-sky-600 text-white font-semibold rounded-lg shadow-md hover:bg-sky-500 transition-all duration-300 transform hover:scale-105 w-full sm:w-auto"
          >
            <WandIcon className="w-5 h-5" />
            Generate Note with AI
          </button>
          <button
            onClick={onNewNote}
            className="inline-flex items-center gap-2 px-6 py-3 bg-slate-700 text-slate-200 font-semibold rounded-lg shadow-md hover:bg-slate-600 transition-all duration-300 w-full sm:w-auto"
          >
            <PlusIcon className="w-5 h-5" />
            Create Blank Note
          </button>
        </div>
      </div>
    </div>
  );
};