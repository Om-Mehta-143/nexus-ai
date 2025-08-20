import React, { useState } from 'react';
import { useLocalStorage } from './hooks/useLocalStorage';
import type { Note } from './types';
import Sidebar from './components/Sidebar';
import Editor from './components/Editor';
import { WelcomeScreen } from './components/WelcomeScreen';
import NoteGeneratorModal from './components/NoteGeneratorModal';
import { generateDynamicNote, generateDatabase, generateImageNote } from './services/geminiService';

const App: React.FC = () => {
  const [notes, setNotes] = useLocalStorage<Note[]>('nexus-notes', []);
  const [activeNoteId, setActiveNoteId] = useState<string | null>(null);
  const [isGeneratorModalOpen, setIsGeneratorModalOpen] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useLocalStorage<boolean>('sidebar-open', true);

  const sortedNotes = [...notes].sort((a, b) => b.lastModified - a.lastModified);

  const addNote = () => {
    const newNote: Note = {
      id: `note-${Date.now()}`,
      title: 'Untitled Note',
      content: `## Welcome to Nexus Notes AI!

Start writing your brilliant ideas here.

### Features
- Create lists
- Use *italics* or **bold** text
- Add \`inline code\`

> Blockquotes are great for highlighting important information.

Try it out by selecting some text!`,
      lastModified: Date.now(),
      type: 'note',
    };
    setNotes([newNote, ...notes]);
    setActiveNoteId(newNote.id);
  };

  const handleGenerateNote = async (topic: string, type: 'note' | 'database' | 'image') => {
    try {
      let content = '';
      let sources: { uri: string; title: string }[] | null = null;
      
      if (type === 'note') {
        const result = await generateDynamicNote(topic);
        content = result.content;
        sources = result.sources;
      } else if (type === 'database') {
        content = await generateDatabase(topic);
      } else if (type === 'image') {
        content = await generateImageNote(topic);
      }
      
      let finalContent = content;
      if (sources && sources.length > 0) {
        const sourcesMarkdown = sources
          .map(source => `- [${source.title}](${source.uri})`)
          .join('\n');
        finalContent += `\n\n---\n\n## Sources\n${sourcesMarkdown}`;
      }

      const newNote: Note = {
        id: `note-${Date.now()}`,
        title: topic,
        content: finalContent,
        lastModified: Date.now(),
        type: type,
      };
      setNotes([newNote, ...notes]);
      setActiveNoteId(newNote.id);
      setIsGeneratorModalOpen(false);
    } catch (error) {
        console.error(`Failed to generate ${type} note:`, error);
        // Re-throw the error so the modal can catch it and display it to the user.
        throw error;
    }
  };


  const deleteNote = (idToDelete: string) => {
    setNotes(notes.filter((note) => note.id !== idToDelete));
    if (activeNoteId === idToDelete) {
      setActiveNoteId(sortedNotes.length > 1 ? sortedNotes.filter(n => n.id !== idToDelete)[0].id : null);
    }
  };

  const updateNote = (updatedNote: Partial<Note> & { id: string }) => {
    const updatedNotes = notes.map((note) => {
      if (note.id === updatedNote.id) {
        return { ...note, ...updatedNote, lastModified: Date.now() };
      }
      return note;
    });
    setNotes(updatedNotes);
  };

  const activeNote = notes.find((note) => note.id === activeNoteId) || null;

  return (
    <div className="flex h-screen w-full bg-slate-900 text-white antialiased">
      <Sidebar
        isOpen={isSidebarOpen}
        onToggle={() => setIsSidebarOpen(!isSidebarOpen)}
        notes={sortedNotes}
        activeNoteId={activeNoteId}
        onAddNote={addNote}
        onDeleteNote={deleteNote}
        onSelectNote={setActiveNoteId}
        onOpenGenerator={() => setIsGeneratorModalOpen(true)}
      />
      <main className="flex-1 h-screen overflow-y-auto">
        {activeNote ? (
          <Editor key={activeNote.id} activeNote={activeNote} onUpdateNote={updateNote} />
        ) : (
          <WelcomeScreen onNewNote={addNote} onOpenGenerator={() => setIsGeneratorModalOpen(true)} />
        )}
      </main>
      {isGeneratorModalOpen && (
          <NoteGeneratorModal
            onClose={() => setIsGeneratorModalOpen(false)}
            onGenerate={handleGenerateNote}
          />
      )}
    </div>
  );
};

export default App;