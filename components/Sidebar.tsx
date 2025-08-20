import React from 'react';
import type { Note } from '../types';
import { PlusIcon } from './icons/PlusIcon';
import { TrashIcon } from './icons/TrashIcon';
import { WandIcon } from './icons/WandIcon';
import { TableIcon } from './icons/TableIcon';
import { ImageIcon } from './icons/ImageIcon';

const ChevronDoubleLeftIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M18.75 19.5l-7.5-7.5 7.5-7.5m-6 15L5.25 12l7.5-7.5" />
  </svg>
);

interface SidebarProps {
  notes: Note[];
  activeNoteId: string | null;
  isOpen: boolean;
  onToggle: () => void;
  onAddNote: () => void;
  onDeleteNote: (id: string) => void;
  onSelectNote: (id: string) => void;
  onOpenGenerator: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ notes, activeNoteId, isOpen, onToggle, onAddNote, onDeleteNote, onSelectNote, onOpenGenerator }) => {
  const formatDate = (timestamp: number) => {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    }).format(new Date(timestamp));
  };

  // Removes markdown for a cleaner text snippet
  const createSnippet = (text: string, type?: string) => {
    if (type === 'image') return 'AI-generated image content';
    const cleanedText = text.replace(/#+\s/g, '').replace(/(\*|_|`|>)/g, '');
    return cleanedText.substring(0, 80) + (cleanedText.length > 80 ? '...' : '');
  };

  const getNoteIcon = (type?: string) => {
    const iconClass = "w-4 h-4 text-slate-500 shrink-0";
    if (type === 'database') return <TableIcon className={iconClass} />;
    if (type === 'image') return <ImageIcon className={iconClass} />;
    return null;
  }

  return (
    <aside className={`h-full bg-slate-950/70 border-r border-slate-800 flex flex-col transition-all duration-300 ease-in-out ${isOpen ? 'w-80' : 'w-20'}`}>
      <div className={`p-4 border-b border-slate-800 flex items-center shrink-0 ${isOpen ? 'justify-between' : 'justify-center'}`}>
        {isOpen && <h1 className="text-xl font-bold text-sky-400 whitespace-nowrap">Nexus Notes AI</h1>}
        <div className="flex items-center gap-1">
          <button
            onClick={onOpenGenerator}
            className="p-2 rounded-lg hover:bg-slate-700 transition-colors duration-200"
            aria-label="Generate note with AI"
          >
            <WandIcon />
          </button>
          <button
            onClick={onAddNote}
            className="p-2 rounded-lg hover:bg-slate-700 transition-colors duration-200"
            aria-label="Add new note"
          >
            <PlusIcon />
          </button>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto overflow-x-hidden">
        {isOpen && (
            notes.length > 0 ? (
            <ul>
                {notes.map((note) => (
                <li key={note.id}>
                    <button
                    onClick={() => onSelectNote(note.id)}
                    className={`w-full text-left p-4 border-b border-slate-800 hover:bg-slate-800 transition-colors duration-200 group ${
                        note.id === activeNoteId ? 'bg-sky-950/50' : ''
                    }`}
                    >
                    <div className="flex justify-between items-start gap-2">
                        <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                            {getNoteIcon(note.type)}
                            <h3 className={`font-semibold truncate ${note.id === activeNoteId ? 'text-sky-300' : 'text-slate-200'}`}>{note.title}</h3>
                        </div>
                        <p className="text-sm text-slate-400 mt-1.5 truncate">{createSnippet(note.content, note.type)}</p>
                        <p className="text-xs text-slate-500 mt-2">{formatDate(note.lastModified)}</p>
                        </div>
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                onDeleteNote(note.id);
                            }}
                            className="p-1.5 rounded-md opacity-0 group-hover:opacity-100 hover:bg-red-500/20 text-slate-500 hover:text-red-400 transition-all duration-200 flex-shrink-0"
                            aria-label={`Delete note ${note.title}`}
                            >
                            <TrashIcon />
                        </button>
                    </div>
                    </button>
                </li>
                ))}
            </ul>
            ) : (
            <div className="p-8 text-center text-slate-500">
                <p>No notes yet.</p>
                <p>Create one to get started!</p>
            </div>
            )
        )}
      </div>
      <div className="p-2 border-t border-slate-800 shrink-0">
        <button
            onClick={onToggle}
            className="w-full p-3 flex items-center justify-center gap-4 rounded-lg hover:bg-slate-700 transition-colors duration-200 text-slate-400"
            aria-label={isOpen ? 'Collapse sidebar' : 'Expand sidebar'}
            title={isOpen ? 'Collapse sidebar' : 'Expand sidebar'}
        >
            <ChevronDoubleLeftIcon className={`w-5 h-5 shrink-0 transition-transform duration-300 ${!isOpen && 'rotate-180'}`} />
            {isOpen && <span className="font-medium whitespace-nowrap">Collapse</span>}
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;