import React, { useState } from 'react';
import { IconPlus, IconChevronRight, IconArrowLeft, IconBook } from '@tabler/icons-react';
import NotionEditor from '../components/NotionEditor';
import { store } from '../services/db';
import type { AppState, JournalEntry } from '../types';

interface JournalViewProps {
  state: AppState;
}

export default function JournalView({ state }: JournalViewProps) {
  const [activeEntryId, setActiveEntryId] = useState<number | null>(null);

  const activeEntry = state.journals.find((j) => j.id === activeEntryId);

  const handleCreateNew = () => {
    const newId = Date.now();
    const newEntry: JournalEntry = {
      id: newId,
      title: '',
      content: JSON.stringify([{ id: '1', type: 'text', content: '', indent: 0 }]),
    };
    store.setState({ journals: [...state.journals, newEntry] });
    setActiveEntryId(newId);
  };

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const updated = state.journals.map((j) => {
      if (j.id === activeEntryId) {
        return { ...j, title: e.target.value };
      }
      return j;
    });
    store.setState({ journals: updated });
  };

  const handleContentChange = (contentString: string) => {
    const updated = state.journals.map((j) => {
      if (j.id === activeEntryId) {
        return { ...j, content: contentString };
      }
      return j;
    });
    store.setState({ journals: updated });
  };

  return (
    <div className="main-view active">
      {/* Journal list view */}
      {!activeEntry ? (
        <div
          id="journal-list-view"
          style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '20px', overflowY: 'auto' }}
        >
          <div className="sec-hdr">
            <span className="sec-title">Journal Entries</span>
            <button className="add-btn cursor-pointer" onClick={handleCreateNew}>
              <IconPlus size={13} />
              New Entry
            </button>
          </div>

          <div className="tasks-list">
            {state.journals && state.journals.length > 0 ? (
              state.journals.map((j) => (
                <div key={j.id} className="task-item" onClick={() => setActiveEntryId(j.id)}>
                  <div className="task-name">{j.title || 'Untitled Journal Entry'}</div>
                  <IconChevronRight size={16} style={{ color: 'var(--text3)' }} />
                </div>
              ))
            ) : (
              <div className="empty">
                <IconBook />
                No journal entries yet.
              </div>
            )}
          </div>
        </div>
      ) : (
        /* Journal Editor View */
        <div
          className="journal-wrap"
          id="journal-editor-view"
          style={{
            display: 'flex',
            position: 'relative',
            width: '100%',
            height: '100%',
            overflowY: 'auto',
          }}
        >
          <div style={{ marginBottom: '20px' }}>
            <button
              className="add-btn cursor-pointer"
              onClick={() => setActiveEntryId(null)}
              style={{ display: 'inline-flex', border: 'none', padding: '6px 12px', fontWeight: '500' }}
            >
              <IconArrowLeft size={14} />
              Back to Entries
            </button>
          </div>

          <input
            type="text"
            className="journal-title"
            placeholder="Untitled Journal Entry"
            value={activeEntry.title}
            onChange={handleTitleChange}
          />

          <NotionEditor initialContent={activeEntry.content} onChange={handleContentChange} />
        </div>
      )}
    </div>
  );
}
