import React, { useState, useRef, useEffect } from 'react';
import type { Note } from '../types';
import TurndownService from 'turndown';
import { marked } from 'marked';
import AIAssistant from './AIAssistant';
import SlashCommandMenu, { Command } from './SlashCommandMenu';
import TableGeneratorModal from './TableGeneratorModal';
import VisualizationModal from './VisualizationModal';
import { WandIcon } from './icons/WandIcon';
import { EyeIcon } from './icons/EyeIcon';
import { SpeakerWaveIcon } from './icons/SpeakerWaveIcon';
import { StopIcon } from './icons/StopIcon';
import { MicrophoneIcon } from './icons/MicrophoneIcon';
import { useSpeechToSpeech } from '../hooks/useSpeechToSpeech';
import { useSpeechRecognition } from '../hooks/useSpeechRecognition';
import * as geminiService from '../services/geminiService';

interface EditorProps {
  activeNote: Note;
  onUpdateNote: (note: Partial<Note> & { id: string }) => void;
}

const turndownService = new TurndownService({ headingStyle: 'atx' });
turndownService.addRule('todo', {
  filter: (node) => {
    return node.nodeName === 'LI' && node.classList.contains('todo-list-item');
  },
  replacement: (content, node) => {
    const checkbox = node.querySelector('input[type="checkbox"]');
    const checked = checkbox && (checkbox as HTMLInputElement).checked;
    // Turndown adds a space, so we trim our content
    return `${checked ? '- [x]' : '- [ ]'} ${content.trim()}`;
  }
});

const getBlockContainer = (node: Node, editorRoot: HTMLElement): HTMLElement | null => {
    let current: Node | null = node.nodeType === Node.TEXT_NODE ? node.parentNode : node;
    while (current && current !== editorRoot) {
      if (current.parentNode === editorRoot && current instanceof HTMLElement) {
        return current;
      }
      current = current.parentNode;
    }
    return null;
};


const Editor: React.FC<EditorProps> = ({ activeNote, onUpdateNote }) => {
  const editorRef = useRef<HTMLDivElement>(null);
  const [isAssistantOpen, setIsAssistantOpen] = useState(false);
  const [assistantPosition, setAssistantPosition] = useState<{ top: number; left: number } | null>(null);
  const [selectedText, setSelectedText] = useState('');
  const [fullContext, setFullContext] = useState('');
  const [savedRange, setSavedRange] = useState<Range | null>(null);
  const [aiTriggerMode, setAiTriggerMode] = useState<'selection' | 'empty-line'>('selection');

  const [slashMenuState, setSlashMenuState] = useState({ isOpen: false, query: '', top: 0, left: 0 });
  const [isTableModalOpen, setIsTableModalOpen] = useState(false);
  const [isVisualizationModalOpen, setIsVisualizationModalOpen] = useState(false);

  const tts = useSpeechToSpeech();
  const { isListening, transcript, error: sttError, start: startStt, stop: stopStt, hasRecognitionSupport } = useSpeechRecognition();

  useEffect(() => {
    if (editorRef.current) {
        let content = activeNote.content;
        
        const html = marked.parse(content, { gfm: true, breaks: true });
        
        // Post-process to make todo lists interactive
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = html as string;
        tempDiv.querySelectorAll('li:has(input[type="checkbox"])').forEach(li => {
          li.classList.add('todo-list-item');
          const parent = li.parentElement;
          if(parent && parent.tagName === 'UL') {
            parent.classList.add('todo-list');
          }
        });

        editorRef.current.innerHTML = tempDiv.innerHTML;
    }
  }, []); 

  // Effect to handle insertion of dictated text
  useEffect(() => {
    if (!isListening && transcript) {
        const selection = window.getSelection();
        if (!selection) return;

        // Restore cursor position if we have one saved
        if (savedRange) {
            selection.removeAllRanges();
            selection.addRange(savedRange);
        } else {
            // Fallback: move to the end of the editor
            editorRef.current?.focus();
            const range = document.createRange();
            range.selectNodeContents(editorRef.current!);
            range.collapse(false);
            selection.removeAllRanges();
            selection.addRange(range);
        }

        // Process simple commands
        const processedText = transcript.replace(/new paragraph/gi, '\n\n');

        // Insert text at the cursor
        const textNode = document.createTextNode(processedText + ' ');
        selection.getRangeAt(0).insertNode(textNode);
        
        // Move cursor after inserted text
        const newRange = document.createRange();
        newRange.setStartAfter(textNode);
        newRange.collapse(true);
        selection.removeAllRanges();
        selection.addRange(newRange);
        
        setSavedRange(null); // Clear saved range
        handleBlur(); // Save the note
    }
  }, [isListening, transcript]);


  const onEdit = (key: 'title' | 'content', value: string) => {
    onUpdateNote({ id: activeNote.id, [key]: value });
  };

  const handleBlur = () => {
    if (editorRef.current) {
      const htmlContent = editorRef.current.innerHTML;
      const markdownContent = turndownService.turndown(htmlContent);
      if (markdownContent !== activeNote.content) {
        onEdit('content', markdownContent);
      }
    }
  };

  const handleSelection = () => {
    if (slashMenuState.isOpen) return; // Don't trigger AI button if slash menu is open
    const selection = window.getSelection();
    if (selection && selection.toString().trim().length > 0) {
      const text = selection.toString();
      setSelectedText(text);
      setAiTriggerMode('selection');
      const range = selection.getRangeAt(0);
      setSavedRange(range.cloneRange()); // Save range for AI replacements
      const rect = range.getBoundingClientRect();
      setAssistantPosition({ top: rect.bottom + window.scrollY, left: rect.left + window.scrollX + rect.width / 2 });
    } else {
      setSelectedText('');
      setAssistantPosition(null);
    }
  };
  
  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (slashMenuState.isOpen) {
        // Intercept keys for slash command menu navigation
        if (['ArrowUp', 'ArrowDown', 'Enter', 'Escape'].includes(event.key)) {
            event.preventDefault();
        }
        return; // Don't process other key events while menu is open
    }

    if (event.key === ' ') {
      const selection = window.getSelection();
      if (selection && selection.isCollapsed) {
        const range = selection.getRangeAt(0);
        const node = range.startContainer;
        const currentElement = node.nodeType === Node.TEXT_NODE ? node.parentElement : node as Element;
        if (currentElement && currentElement.textContent?.trim() === '' && currentElement.childNodes.length <= 1) {
          event.preventDefault();
          setSavedRange(range.cloneRange());
          setAiTriggerMode('empty-line');
          if (editorRef.current) setFullContext(editorRef.current.innerText);
          setIsAssistantOpen(true);
        }
      }
    }
  };

  const handleInput = (event: React.FormEvent<HTMLDivElement>) => {
    const selection = window.getSelection();
    if (!selection || !selection.isCollapsed) {
      if (slashMenuState.isOpen) setSlashMenuState({ ...slashMenuState, isOpen: false });
      return;
    }

    const range = selection.getRangeAt(0);
    const node = range.startContainer;
    
    // Ensure we're in a text node
    if (node.nodeType !== Node.TEXT_NODE) {
      if (slashMenuState.isOpen) setSlashMenuState({ ...slashMenuState, isOpen: false });
      return;
    }

    const text = node.textContent || '';
    const cursorPosition = range.startOffset;

    // The regex now looks for a / at the beginning of a block
    const blockText = node.textContent?.substring(0, cursorPosition) ?? '';
    const commandMatch = blockText.match(/^\/(\S*)$/);
    
    if (commandMatch) {
      const rect = range.getBoundingClientRect();
      setSlashMenuState({
        isOpen: true,
        query: commandMatch[1],
        top: rect.bottom + window.scrollY + 5,
        left: rect.left + window.scrollX,
      });
    } else {
      if (slashMenuState.isOpen) {
        setSlashMenuState({ ...slashMenuState, isOpen: false });
      }
    }
  };

 const handleCommandSelect = (command: Command) => {
    const selection = window.getSelection();
    if (!selection?.rangeCount || !editorRef.current) return;

    const editor = editorRef.current;
    editor.focus(); 

    let range = selection.getRangeAt(0);
    const startNode = range.startContainer;
    
    const currentBlock = getBlockContainer(startNode, editor);

    // Remove the trigger text (e.g., "/h1") from the current block
    if (currentBlock) {
        const query = `/${slashMenuState.query}`;
        // A more robust way to find and remove the text
        const textContent = currentBlock.textContent || '';
        if (textContent.trim().startsWith(query)) {
            currentBlock.innerHTML = ''; // Clear the block
        }
    }
    
    const isBlockEmpty = !currentBlock || currentBlock.textContent?.trim() === '';
    
    // --- Create the new element to insert ---
    let newElement: HTMLElement | DocumentFragment | null = null;
    let elementToFocus: Node | null = null;
    
    if ('tag' in command) {
        const newBlock = document.createElement(command.tag);
        newBlock.appendChild(document.createElement('br'));
        newElement = newBlock;
        elementToFocus = newBlock;
    } else {
        switch (command.action) {
            case 'askAI':
                setSavedRange(range.cloneRange());
                setAiTriggerMode('empty-line');
                setFullContext(editor.innerText);
                setIsAssistantOpen(true);
                setSlashMenuState({ ...slashMenuState, isOpen: false });
                return;
            case 'bulletedList': {
                const ul = document.createElement('ul');
                const li = document.createElement('li');
                li.appendChild(document.createElement('br'));
                ul.appendChild(li);
                newElement = ul;
                elementToFocus = li;
                break;
            }
            case 'numberedList': {
                const ol = document.createElement('ol');
                const li = document.createElement('li');
                li.appendChild(document.createElement('br'));
                ol.appendChild(li);
                newElement = ol;
                elementToFocus = li;
                break;
            }
            case 'todoList': {
                const ul = document.createElement('ul');
                ul.className = 'todo-list';
                const li = document.createElement('li');
                li.className = 'todo-list-item';
                const checkbox = document.createElement('input');
                checkbox.type = 'checkbox';
                li.appendChild(checkbox);
                li.appendChild(document.createTextNode('\u00A0')); // non-breaking space
                ul.appendChild(li);
                newElement = ul;
                elementToFocus = li;
                break;
            }
            case 'codeBlock': {
                const pre = document.createElement('pre');
                const code = document.createElement('code');
                code.appendChild(document.createElement('br'));
                pre.appendChild(code);
                newElement = pre;
                elementToFocus = code;
                break;
            }
            case 'table': {
                if (selection && selection.rangeCount > 0) {
                    setSavedRange(selection.getRangeAt(0).cloneRange());
                }
                setIsTableModalOpen(true);
                setSlashMenuState({ ...slashMenuState, isOpen: false });
                return;
            }
        }
    }

    if (!newElement) {
        setSlashMenuState({ ...slashMenuState, isOpen: false });
        return;
    }
    
    // --- Insert the new element into the DOM ---
    if (isBlockEmpty && currentBlock) {
        currentBlock.replaceWith(newElement);
    } else if (currentBlock) {
        currentBlock.after(newElement);
    } else {
        // Fallback: This may happen if the editor is empty.
        editor.appendChild(newElement);
    }
    
    // --- Set the cursor/selection to the correct position ---
    if (elementToFocus) {
        range = document.createRange();
        if (command.action === 'todoList') {
            // Position cursor inside the <li>, after the checkbox and space
            range.setStart(elementToFocus, 2);
            range.collapse(true);
        } else {
            // For other elements, select the start of the content
            range.selectNodeContents(elementToFocus);
            range.collapse(true); // collapse to the start
        }
        
        selection.removeAllRanges();
        selection.addRange(range);
    }

    setSlashMenuState({ ...slashMenuState, isOpen: false });
    editor.dispatchEvent(new Event('input', { bubbles: true, cancelable: true }));
};

const handleCreateTable = ({ rows, cols }: { rows: number; cols: number }) => {
    setIsTableModalOpen(false);
    const editor = editorRef.current;
    if (!editor) return;

    editor.focus();

    const selection = window.getSelection();
    if (!selection) return;

    if (savedRange) {
        selection.removeAllRanges();
        selection.addRange(savedRange);
    }
    
    const range = selection.getRangeAt(0);
    const startNode = range.startContainer;
    const currentBlock = getBlockContainer(startNode, editor);

    const fragment = document.createDocumentFragment();
    const table = document.createElement('table');
    const thead = table.createTHead();
    const tbody = table.createTBody();
    const headRow = thead.insertRow();
    for (let i = 0; i < cols; i++) {
        const th = document.createElement('th');
        th.textContent = `Header ${i + 1}`;
        headRow.appendChild(th);
    }

    for (let i = 0; i < rows; i++) {
        const bodyRow = tbody.insertRow();
        for (let j = 0; j < cols; j++) {
            const td = bodyRow.insertCell();
            td.appendChild(document.createElement('br'));
        }
    }
    fragment.appendChild(table);

    const p = document.createElement('p');
    p.appendChild(document.createElement('br'));
    fragment.appendChild(p);

    if (currentBlock && currentBlock.textContent?.trim() === '') {
        currentBlock.replaceWith(fragment);
    } else if (currentBlock) {
        currentBlock.after(fragment);
    } else {
        range.insertNode(fragment);
    }

    range.setStart(p, 0);
    range.collapse(true);
    selection.removeAllRanges();
    selection.addRange(range);

    setSavedRange(null);
    handleBlur(); // Force save
};

  const handleAiRequest = async (action: keyof typeof geminiService, customPrompt: string = '') => {
      setIsAssistantOpen(false);
      const context = selectedText || activeNote.content;
      let result = '';

      try {
          if (action === 'askAI' && customPrompt) {
              result = await geminiService.askAI(customPrompt, context);
          } else if (action !== 'askAI') {
              // This is a type assertion to satisfy TypeScript
              const serviceFunction = geminiService[action] as (text: string) => Promise<string>;
              if (typeof serviceFunction === 'function') {
                  result = await serviceFunction(context);
              } else {
                  throw new Error(`Invalid AI action: ${action}`);
              }
          }
      
          const selection = window.getSelection();
          if (savedRange && selection) {
              selection.removeAllRanges();
              selection.addRange(savedRange);
              
              // Instead of execCommand, we manipulate the range directly
              const range = selection.getRangeAt(0);
              range.deleteContents();
              range.insertNode(document.createTextNode(result));

              setSavedRange(null);
          } else if (editorRef.current) {
               // Fallback if there's no range, append to end.
              editorRef.current.innerHTML += `<br>${marked.parse(result) as string}`;
          }
          handleBlur();
      } catch (error) {
          console.error("AI request failed:", error);
      } finally {
          setSelectedText('');
          setAssistantPosition(null);
          setSavedRange(null);
      }
  };

  const toggleDictation = () => {
    if (isListening) {
        stopStt();
    } else {
        const selection = window.getSelection();
        if (selection && selection.rangeCount > 0) {
            setSavedRange(selection.getRangeAt(0).cloneRange());
        }
        startStt();
    }
  };

  if (!activeNote) return null;

  if (activeNote.type === 'image') {
    return (
      <div className="h-screen w-full flex flex-col relative p-4 md:p-8">
        <div className="mb-8">
          <input type="text" value={activeNote.title} onChange={(e) => onEdit('title', e.target.value)} className="w-full bg-transparent text-4xl font-bold focus:outline-none text-slate-100 placeholder-slate-500" placeholder="Image Title" />
        </div>
        <div className="flex-1 flex items-center justify-center bg-slate-950/50 rounded-lg border border-slate-800 overflow-hidden">
          {activeNote.content ? <img src={activeNote.content} alt={activeNote.title} className="max-w-full max-h-full w-full h-full object-contain" /> : <p className="text-slate-500">Image content is missing or invalid.</p>}
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen w-full flex flex-col relative" onMouseUp={handleSelection}>
      {assistantPosition && selectedText && !isAssistantOpen && (
          <button onClick={() => { setIsAssistantOpen(true); if(editorRef.current) setFullContext(editorRef.current.innerText); }} className="absolute z-10 flex items-center gap-2 px-3 py-1.5 bg-slate-800/90 backdrop-blur-md border border-slate-600 rounded-lg shadow-xl text-sky-300 hover:bg-slate-700 transition-all duration-200 animate-modal-fade-in" style={{ top: assistantPosition.top + 8, left: assistantPosition.left, transform: 'translateX(-50%)' }}>
            <WandIcon className="w-4 h-4" /> Ask AI
          </button>
      )}

      {isAssistantOpen && (
          <AIAssistant onClose={() => { setIsAssistantOpen(false); setSavedRange(null); }} onSubmit={handleAiRequest} contextText={selectedText || fullContext} triggerMode={aiTriggerMode} />
      )}

      {slashMenuState.isOpen && (
          <SlashCommandMenu
            query={slashMenuState.query}
            position={{ top: slashMenuState.top, left: slashMenuState.left }}
            onSelect={handleCommandSelect}
            onClose={() => setSlashMenuState({ ...slashMenuState, isOpen: false })}
          />
      )}
      
      {isTableModalOpen && (
        <TableGeneratorModal
          onClose={() => {
            setIsTableModalOpen(false);
            setSavedRange(null);
          }}
          onCreateTable={handleCreateTable}
        />
      )}

      {isVisualizationModalOpen && (
        <VisualizationModal
          noteContent={activeNote.content}
          onClose={() => setIsVisualizationModalOpen(false)}
        />
      )}

      <div className="p-4 md:px-8 md:pt-8 md:pb-4 flex justify-between items-center gap-4">
        <input type="text" value={activeNote.title} onChange={(e) => onEdit('title', e.target.value)} className="w-full bg-transparent text-3xl md:text-4xl font-bold focus:outline-none text-slate-100 placeholder-slate-500" placeholder="Note Title" />
        <div className="flex items-center gap-2">
            <button
                onClick={() => tts.isPlaying ? tts.stop() : tts.play(activeNote.content)}
                className="p-2 rounded-lg text-slate-400 hover:bg-slate-700 hover:text-sky-400 transition-colors duration-200"
                aria-label={tts.isPlaying ? "Stop listening" : "Listen to note"}
                title={tts.isPlaying ? "Stop listening" : "Listen to note"}
            >
                {tts.isPlaying ? <StopIcon className="w-6 h-6" /> : <SpeakerWaveIcon className="w-6 h-6" />}
            </button>
            <button
                onClick={() => setIsVisualizationModalOpen(true)}
                className="p-2 rounded-lg text-slate-400 hover:bg-slate-700 hover:text-sky-400 transition-colors duration-200"
                aria-label="Visualize note"
                title="Visualize note"
            >
                <EyeIcon className="w-6 h-6" />
            </button>
        </div>
      </div>

      <div className="flex-1 w-full min-h-0 overflow-hidden relative">
        <div ref={editorRef} contentEditable={true} onBlur={handleBlur} onKeyDown={handleKeyDown} onInput={handleInput} className="wysiwyg-editor prose-dark" suppressContentEditableWarning={true} />
        
        {(isListening || sttError) && (
            <div 
                key={sttError}
                className={`absolute bottom-24 right-8 px-4 py-2 rounded-lg text-sm font-medium text-white shadow-lg transition-opacity duration-300 animate-modal-fade-in ${
                sttError
                    ? (sttError.includes('Retrying') ? 'bg-orange-500' : 'bg-red-600')
                    : 'bg-slate-700'
            }`}>
                {sttError || 'Listening...'}
            </div>
        )}

        {hasRecognitionSupport && (
            <button 
                onClick={toggleDictation}
                className={`absolute bottom-8 right-8 w-14 h-14 rounded-full flex items-center justify-center text-white transition-all duration-300 shadow-lg ${
                    isListening ? 'bg-red-600 animate-pulse-red' : 'bg-sky-600 hover:bg-sky-500'
                }`}
                aria-label={isListening ? 'Stop dictation' : 'Start dictation'}
                title={isListening ? 'Stop dictation' : 'Start dictation'}
            >
                {isListening ? <StopIcon className="w-7 h-7" /> : <MicrophoneIcon className="w-7 h-7" />}
            </button>
        )}
      </div>
    </div>
  );
};

export default Editor;