import React, { useState, useEffect, useRef } from 'react';

interface TableGeneratorModalProps {
  onClose: () => void;
  onCreateTable: (dimensions: { rows: number; cols: number }) => void;
}

const TableGeneratorModal: React.FC<TableGeneratorModalProps> = ({ onClose, onCreateTable }) => {
  const [rows, setRows] = useState(3);
  const [cols, setCols] = useState(3);
  const rowsInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    rowsInputRef.current?.focus();
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (rows > 0 && cols > 0) {
      onCreateTable({ rows, cols });
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 animate-modal-fade-in" onClick={onClose}>
      <div className="bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl w-full max-w-sm p-8 animate-modal-slide-up" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-2xl font-bold text-slate-100 mb-6 text-center">Create Table</h2>
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label htmlFor="rows" className="block text-sm font-medium text-slate-300 mb-2">Rows</label>
            <input
              ref={rowsInputRef}
              type="number"
              id="rows"
              value={rows}
              onChange={(e) => setRows(Math.max(1, parseInt(e.target.value, 10) || 1))}
              min="1"
              className="w-full bg-slate-800 border border-slate-600 rounded-lg px-4 py-3 text-lg text-slate-200 focus:outline-none focus:ring-2 focus:ring-sky-500"
            />
          </div>
          <div className="mb-6">
            <label htmlFor="cols" className="block text-sm font-medium text-slate-300 mb-2">Columns</label>
            <input
              type="number"
              id="cols"
              value={cols}
              onChange={(e) => setCols(Math.max(1, parseInt(e.target.value, 10) || 1))}
              min="1"
              className="w-full bg-slate-800 border border-slate-600 rounded-lg px-4 py-3 text-lg text-slate-200 focus:outline-none focus:ring-2 focus:ring-sky-500"
            />
          </div>
          <div className="flex justify-end gap-4">
            <button type="button" onClick={onClose} className="px-6 py-2.5 rounded-lg bg-slate-700 text-slate-200 font-semibold hover:bg-slate-600 transition-colors">Cancel</button>
            <button type="submit" className="px-6 py-2.5 rounded-lg bg-sky-600 text-white font-semibold hover:bg-sky-500 transition-colors">Create</button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default TableGeneratorModal;
