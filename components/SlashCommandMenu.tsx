import React, { useState, useEffect, useMemo, useRef } from 'react';
import { WandIcon } from './icons/WandIcon';
import { HeadingIcon } from './icons/HeadingIcon';
import { ListBulletIcon } from './icons/ListBulletIcon';
import { ListNumberedIcon } from './icons/ListNumberedIcon';
import { CheckboxIcon } from './icons/CheckboxIcon';
import { QuoteIcon } from './icons/QuoteIcon';
import { CodeBlockIcon } from './icons/CodeBlockIcon';
import { TableIcon } from './icons/TableIcon';

export type Command = {
    title: string;
    description: string;
    icon: React.ReactNode;
    action: 'askAI' | 'bulletedList' | 'numberedList' | 'todoList' | 'codeBlock' | 'table';
    tag?: never; // For commands that don't map to a simple tag
} | {
    title: string;
    description: string;
    icon: React.ReactNode;
    tag: 'h1' | 'h2' | 'h3' | 'blockquote';
    action?: never;
};

const ALL_COMMANDS: Command[] = [
    { title: 'Ask AI', description: 'Let AI write, edit, or create.', icon: <WandIcon className="w-5 h-5" />, action: 'askAI' },
    { title: 'Heading 1', description: 'Big section heading.', icon: <HeadingIcon className="w-5 h-5" />, tag: 'h1' },
    { title: 'Heading 2', description: 'Medium section heading.', icon: <HeadingIcon className="w-5 h-5 opacity-75" />, tag: 'h2' },
    { title: 'Heading 3', description: 'Small section heading.', icon: <HeadingIcon className="w-5 h-5 opacity-50" />, tag: 'h3' },
    { title: 'Bulleted list', description: 'Create a simple bulleted list.', icon: <ListBulletIcon className="w-5 h-5" />, action: 'bulletedList' },
    { title: 'Numbered list', description: 'Create a list with numbers.', icon: <ListNumberedIcon className="w-5 h-5" />, action: 'numberedList' },
    { title: 'To-do list', description: 'Track tasks with a checklist.', icon: <CheckboxIcon className="w-5 h-5" />, action: 'todoList' },
    { title: 'Blockquote', description: 'Capture a quote.', icon: <QuoteIcon className="w-5 h-5" />, tag: 'blockquote' },
    { title: 'Code block', description: 'Capture a code snippet.', icon: <CodeBlockIcon className="w-5 h-5" />, action: 'codeBlock' },
    { title: 'Table', description: 'Add a simple table.', icon: <TableIcon className="w-5 h-5" />, action: 'table' },
];


interface SlashCommandMenuProps {
    query: string;
    position: { top: number; left: number };
    onSelect: (command: Command) => void;
    onClose: () => void;
}

const SlashCommandMenu: React.FC<SlashCommandMenuProps> = ({ query, position, onSelect, onClose }) => {
    const [selectedIndex, setSelectedIndex] = useState(0);
    const menuRef = useRef<HTMLDivElement>(null);

    const filteredCommands = useMemo(() => {
        if (!query) return ALL_COMMANDS;
        return ALL_COMMANDS.filter(command =>
            command.title.toLowerCase().includes(query.toLowerCase())
        );
    }, [query]);

    useEffect(() => {
        setSelectedIndex(0);
    }, [filteredCommands.length]);
    
    useEffect(() => {
      const selectedElement = menuRef.current?.querySelector('.selected');
      if (selectedElement) {
        selectedElement.scrollIntoView({ block: 'nearest' });
      }
    }, [selectedIndex]);

    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'ArrowUp') {
                setSelectedIndex(prev => (prev > 0 ? prev - 1 : filteredCommands.length - 1));
            } else if (event.key === 'ArrowDown') {
                setSelectedIndex(prev => (prev < filteredCommands.length - 1 ? prev + 1 : 0));
            } else if (event.key === 'Enter') {
                if (filteredCommands[selectedIndex]) {
                    onSelect(filteredCommands[selectedIndex]);
                }
            } else if (event.key === 'Escape') {
                onClose();
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [filteredCommands, selectedIndex, onSelect, onClose]);

    if (filteredCommands.length === 0) {
        return (
             <div className="absolute slash-command-menu" style={{ top: position.top, left: position.left }}>
                <div className="p-4 text-center text-slate-400">No results found.</div>
            </div>
        );
    }

    return (
        <div ref={menuRef} className="absolute slash-command-menu w-80" style={{ top: position.top, left: position.left }}>
            <div className="p-2 font-semibold text-xs text-slate-400">COMMANDS</div>
            {filteredCommands.map((command, index) => (
                <div
                    key={command.title}
                    className={`slash-command-item ${index === selectedIndex ? 'selected' : ''}`}
                    onClick={() => onSelect(command)}
                    onMouseMove={() => setSelectedIndex(index)}
                >
                    <div className="slash-command-icon">{command.icon}</div>
                    <div>
                        <div className="slash-command-title">{command.title}</div>
                        <div className="slash-command-description">{command.description}</div>
                    </div>
                </div>
            ))}
        </div>
    );
};

export default SlashCommandMenu;