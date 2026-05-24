import React, { useState } from 'react';
import {
  IconX,
  IconBook,
  IconBookmark,
  IconBookmarkFilled,
  IconMapPin,
  IconPencil,
  IconPhoto,
  IconDotsVertical,
  IconTrash,
  IconCalendar
} from '@tabler/icons-react';
import NotionEditor from '../components/NotionEditor';
import FloatingActionButton from '../components/FloatingActionButton';
import { store } from '../services/db';
import type { AppState, JournalEntry } from '../types';
import { generateSecureNumericId } from '../utils/taskHelper';

interface JournalViewProps {
  state: AppState;
  searchQuery?: string;
}

export default function JournalView({ state, searchQuery = '' }: JournalViewProps) {
  const [activeEntryId, setActiveEntryId] = useState<number | string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [showDeleteMenu, setShowDeleteMenu] = useState(false);
  const [newImageUrl, setNewImageUrl] = useState('');
  const [showImageInput, setShowImageInput] = useState(false);

  const activeEntry = state.journals.find((j) => j.id === activeEntryId);

  // General updater helper for active journal entry
  const updateActiveEntry = (fields: Partial<JournalEntry>) => {
    const updated = state.journals.map((j) => {
      if (j.id === activeEntryId) {
        return { ...j, ...fields };
      }
      return j;
    });
    store.setState({ journals: updated });
  };

  const handleCreateNew = () => {
    const newId = generateSecureNumericId();
    const newEntry: JournalEntry = {
      id: newId,
      title: '',
      content: JSON.stringify([{ id: '1', type: 'text', content: '', indent: 0 }]),
      bookmarked: false,
      location: '',
      images: [],
      created_at: new Date().toISOString(),
      draft: true
    };
    store.setState({ journals: [...state.journals, newEntry] });
    setActiveEntryId(newId);
    setIsEditing(true);
  };

  const handleDeleteEntry = (id: number | string) => {
    if (window.confirm('Are you sure you want to delete this journal entry?')) {
      const updated = state.journals.filter((j) => j.id !== id);
      const deletedIds = {
        ...(state.deletedIds || {}),
        journals: [...(state.deletedIds?.journals || []), id],
      };
      store.setState({ journals: updated, deletedIds });
      setActiveEntryId(null);
      setIsEditing(false);
      setShowDeleteMenu(false);
    }
  };

  const isEntryEmpty = (entry: JournalEntry) => {
    if (entry.title && entry.title.trim() !== '') return false;
    if (entry.location && entry.location.trim() !== '') return false;
    if (entry.images && entry.images.length > 0) return false;
    try {
      const blocks = JSON.parse(entry.content);
      const hasContent = blocks.some((b: { content?: string }) => b.content && b.content.trim() !== '');
      if (hasContent) return false;
    } catch (err) {
      console.error('Failed to parse blocks for emptiness check:', err);
    }
    return true;
  };

  const handleClose = () => {
    if (activeEntry) {
      if (isEntryEmpty(activeEntry)) {
        // Remove empty entry completely
        const updated = state.journals.filter((j) => j.id !== activeEntry.id);
        store.setState({ journals: updated });
      } else if (!activeEntry.title || activeEntry.title.trim() === '') {
        updateActiveEntry({ draft: true });
      }
    }
    setActiveEntryId(null);
    setIsEditing(false);
    setShowDeleteMenu(false);
  };

  const handleAddImage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newImageUrl.trim() || !activeEntry) return;
    const currentImages = activeEntry.images || [];
    updateActiveEntry({ images: [...currentImages, newImageUrl.trim()] });
    setNewImageUrl('');
    setShowImageInput(false);
  };

  const handleRemoveImage = (index: number) => {
    if (!activeEntry) return;
    const currentImages = activeEntry.images || [];
    const updatedImages = currentImages.filter((_, idx) => idx !== index);
    updateActiveEntry({ images: updatedImages });
  };

  // Date Formatting Helpers
  const formatDate = (dateStr?: string) => {
    if (!dateStr) return 'No Date';
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return dateStr;
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };


  // Filter journals based on global TopBar search input
  const filteredJournals = (state.journals || []).filter((j) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    const titleMatch = j.title.toLowerCase().includes(q);
    const locationMatch = (j.location || '').toLowerCase().includes(q);
    let contentMatch = false;
    try {
      const blocks = JSON.parse(j.content);
      contentMatch = blocks.some((b: { content?: string }) => b.content && b.content.toLowerCase().includes(q));
    } catch (err) {
      console.error('Failed to parse blocks for filtering:', err);
    }
    return titleMatch || locationMatch || contentMatch;
  });

  // Sort journals descending by date
  const sortedJournals = [...filteredJournals].sort((a, b) => {
    const da = a.created_at ? new Date(a.created_at).getTime() : 0;
    const db = b.created_at ? new Date(b.created_at).getTime() : 0;
    return db - da;
  });

  // Split journals into categories
  const drafts = sortedJournals.filter((j) => j.draft || !j.title || j.title.trim() === '');
  const nonDrafts = sortedJournals.filter((j) => !j.draft && j.title && j.title.trim() !== '');
  const bookmarkedEntries = sortedJournals.filter((j) => j.bookmarked);
  
  // List of all non-draft entries
  const allEntries = nonDrafts;

  // Toggle bookmark directly from cards
  const handleToggleBookmark = (id: number | string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = state.journals.map((j) => {
      if (j.id === id) {
        return { ...j, bookmarked: !j.bookmarked };
      }
      return j;
    });
    store.setState({ journals: updated });
  };

  const handleOpenEntry = (id: number | string) => {
    setActiveEntryId(id);
    setIsEditing(false);
  };

  return (
    <div className="journal-container">
      {!activeEntry ? (
        /* ==================== JOURNAL LIST VIEW ==================== */
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <div className="journal-scroll-area">
            {sortedJournals.length === 0 ? (
              <div className="empty" style={{ padding: '80px 20px' }}>
                <IconBook size={48} style={{ color: 'var(--text3)', marginBottom: '16px' }} />
                <h3>No journal entries found</h3>
                <p style={{ color: 'var(--text3)', fontSize: '13px' }}>
                  {searchQuery ? 'Try matching different search keywords.' : 'Tap the pencil icon below to write your first entry!'}
                </p>
              </div>
            ) : (
              <>
                {/* 1. Drafts Section */}
                {drafts.length > 0 && (
                  <div>
                    <div className="journal-section-title">Drafts</div>
                    {drafts.map((d) => (
                      <div key={d.id} className="journal-card-row" onClick={() => handleOpenEntry(d.id)}>
                        <div className="journal-card-left-icon" style={{ background: 'var(--bg3)', color: 'var(--text3)' }}>
                          <IconPhoto size={18} />
                        </div>
                        <div className="journal-card-info">
                          <span className="journal-card-date">{formatDate(d.created_at)}</span>
                          <span className="journal-card-title placeholder">{d.title || 'Untitled Entry'}</span>
                          <span className="journal-card-location">
                            <IconMapPin size={10} />
                            {d.location || 'Add location'}
                          </span>
                        </div>
                        <button
                          className={`journal-bookmark-btn ${d.bookmarked ? 'active' : ''}`}
                          onClick={(e) => handleToggleBookmark(d.id, e)}
                        >
                          {d.bookmarked ? <IconBookmarkFilled size={16} /> : <IconBookmark size={16} />}
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* 2. Bookmarks Section */}
                {bookmarkedEntries.length > 0 && (
                  <div>
                    <div className="journal-section-title">Bookmarks</div>
                    {bookmarkedEntries.map((b) => (
                      <div key={b.id} className="journal-card-row" onClick={() => handleOpenEntry(b.id)}>
                        {b.images && b.images[0] ? (
                          <img src={b.images[0]} alt="thumbnail" className="journal-card-left-img" />
                        ) : (
                          <div className="journal-card-left-icon">
                            <IconBook size={18} />
                          </div>
                        )}
                        <div className="journal-card-info">
                          <span className="journal-card-date">{formatDate(b.created_at)}</span>
                          <span className="journal-card-title">{b.title || 'Untitled Entry'}</span>
                          {b.location && (
                            <span className="journal-card-location">
                              <IconMapPin size={10} />
                              {b.location}
                            </span>
                          )}
                        </div>
                        <button
                          className="journal-bookmark-btn active"
                          onClick={(e) => handleToggleBookmark(b.id, e)}
                        >
                          <IconBookmarkFilled size={16} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* 3. All Entries Section */}
                {allEntries.length > 0 && (
                  <div>
                    <div className="journal-section-title">Entries</div>
                    {allEntries.map((j) => (
                      <div key={j.id} className="journal-card-row" onClick={() => handleOpenEntry(j.id)}>
                        {j.images && j.images[0] ? (
                          <img src={j.images[0]} alt="thumbnail" className="journal-card-left-img" />
                        ) : (
                          <div className="journal-card-left-icon">
                            <IconBook size={18} />
                          </div>
                        )}
                        <div className="journal-card-info">
                          <span className="journal-card-date">{formatDate(j.created_at)}</span>
                          <span className="journal-card-title">{j.title || 'Untitled Entry'}</span>
                          {j.location && (
                            <span className="journal-card-location">
                              <IconMapPin size={10} />
                              {j.location}
                            </span>
                          )}
                        </div>
                        <button
                          className={`journal-bookmark-btn ${j.bookmarked ? 'active' : ''}`}
                          onClick={(e) => handleToggleBookmark(j.id, e)}
                        >
                          {j.bookmarked ? <IconBookmarkFilled size={16} /> : <IconBookmark size={16} />}
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>

          <FloatingActionButton 
            onClick={handleCreateNew}
            icon={IconPencil}
            title="New Entry"
          />
        </div>
      ) : (
        /* ==================== JOURNAL EDITOR/READ VIEW ==================== */
        <div
          className="journal-wrap"
          id="journal-editor-view"
          style={{
            display: 'flex',
            flexDirection: 'column',
            position: 'relative',
            width: '100%',
            height: '100%',
            overflowY: 'auto',
            padding: '20px 20px 20px 60px',
            maxWidth: '100%'
          }}
        >
          {/* Header Controls */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', width: '100%' }}>
            <button
              className="add-btn cursor-pointer"
              onClick={handleClose}
              style={{ 
                display: 'inline-flex', 
                alignItems: 'center', 
                justifyContent: 'center',
                border: 'none', 
                padding: '8px', 
                borderRadius: '50%',
                width: '40px',
                height: '40px',
                background: 'var(--bg3)'
              }}
            >
              <IconX size={20} />
            </button>

            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              {isEditing && (
                <button
                  className="btn-save"
                  onClick={() => {
                    updateActiveEntry({ draft: false });
                    setIsEditing(false);
                  }}
                  style={{ 
                    padding: '6px 16px', 
                    borderRadius: '20px', 
                    fontSize: '13px', 
                    fontWeight: '700',
                    height: '36px',
                    display: 'flex',
                    alignItems: 'center'
                  }}
                >
                  Save
                </button>
              )}

              <button
                className={`add-btn cursor-pointer ${activeEntry.bookmarked ? 'active' : ''}`}
                onClick={() => updateActiveEntry({ bookmarked: !activeEntry.bookmarked })}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  border: 'none',
                  padding: '8px',
                  borderRadius: '50%',
                  width: '40px',
                  height: '40px',
                  justifyContent: 'center',
                  background: 'var(--bg3)',
                  color: activeEntry.bookmarked ? 'var(--accent)' : 'var(--text2)'
                }}
              >
                {activeEntry.bookmarked ? (
                  <IconBookmarkFilled size={20} style={{ color: 'var(--accent)' }} />
                ) : (
                  <IconBookmark size={20} />
                )}
              </button>

              <div style={{ position: 'relative' }}>
                <button
                  className="add-btn cursor-pointer"
                  onClick={() => setShowDeleteMenu(!showDeleteMenu)}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    border: 'none',
                    padding: '8px',
                    borderRadius: '50%',
                    width: '40px',
                    height: '40px',
                    justifyContent: 'center',
                    background: 'var(--bg3)'
                  }}
                >
                  <IconDotsVertical size={20} />
                </button>

                {showDeleteMenu && (
                  <div
                    style={{
                      position: 'absolute',
                      top: '100%',
                      right: 0,
                      marginTop: '8px',
                      background: 'var(--bg2)',
                      border: '1px solid var(--border)',
                      borderRadius: '8px',
                      boxShadow: 'var(--shadow)',
                      zIndex: 100
                    }}
                  >
                    <button
                      onClick={() => handleDeleteEntry(activeEntry.id)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        padding: '10px 16px',
                        color: 'var(--red)',
                        background: 'none',
                        border: 'none',
                        width: '100%',
                        cursor: 'pointer',
                        fontSize: '13px',
                        fontWeight: '600',
                        whiteSpace: 'nowrap'
                      }}
                    >
                      <IconTrash size={16} />
                      Delete Entry
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Metadata Row */}
          <div className="editor-meta-row" style={{ width: '100%' }}>
            <div className="editor-meta-field">
              <IconCalendar size={14} />
              {isEditing ? (
                <input
                  type="date"
                  className="editor-meta-input"
                  value={activeEntry.created_at ? new Date(activeEntry.created_at).toISOString().split('T')[0] : ''}
                  onChange={(e) => {
                    const selectedVal = e.target.value;
                    const currentFullDate = activeEntry.created_at ? new Date(activeEntry.created_at) : new Date();
                    const [y, m, d] = selectedVal.split('-');
                    currentFullDate.setFullYear(Number(y));
                    currentFullDate.setMonth(Number(m) - 1);
                    currentFullDate.setDate(Number(d));
                    updateActiveEntry({ created_at: currentFullDate.toISOString() });
                  }}
                />
              ) : (
                <span style={{ fontSize: '12px' }}>{formatDate(activeEntry.created_at)}</span>
              )}
            </div>

            <div className="editor-meta-field">
              <IconMapPin size={14} />
              {isEditing ? (
                <input
                  type="text"
                  className="editor-meta-input"
                  placeholder="Add location..."
                  value={activeEntry.location || ''}
                  onChange={(e) => updateActiveEntry({ location: e.target.value })}
                />
              ) : (
                <span style={{ fontSize: '12px' }}>{activeEntry.location || 'No location'}</span>
              )}
            </div>

            {isEditing && (
              <div className="editor-meta-field" style={{ position: 'relative' }}>
                <button
                  type="button"
                  onClick={() => setShowImageInput(!showImageInput)}
                  style={{ background: 'none', border: 'none', color: 'inherit', display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer', padding: 0 }}
                >
                  <IconPhoto size={14} />
                  <span>Add Image URL</span>
                </button>

                {showImageInput && (
                  <form
                    onSubmit={handleAddImage}
                    style={{
                      position: 'absolute',
                      top: 'calc(100% + 8px)',
                      left: 0,
                      background: 'var(--bg2)',
                      border: '1px solid var(--border2)',
                      padding: '8px',
                      borderRadius: '8px',
                      boxShadow: 'var(--shadow)',
                      display: 'flex',
                      gap: '6px',
                      zIndex: 20
                    }}
                  >
                    <input
                      type="text"
                      placeholder="https://example.com/image.jpg"
                      value={newImageUrl}
                      onChange={(e) => setNewImageUrl(e.target.value)}
                      style={{
                        background: 'var(--bg3)',
                        border: '1px solid var(--border)',
                        borderRadius: '4px',
                        padding: '4px 8px',
                        fontSize: '11px',
                        color: 'var(--text)',
                        width: '180px',
                        outline: 'none'
                      }}
                    />
                    <button
                      type="submit"
                      style={{
                        background: 'var(--text)',
                        color: 'var(--bg2)',
                        border: 'none',
                        borderRadius: '4px',
                        padding: '4px 8px',
                        fontSize: '11px',
                        fontWeight: '700',
                        cursor: 'pointer'
                      }}
                    >
                      Add
                    </button>
                  </form>
                )}
              </div>
            )}
          </div>

          {/* Horizontal thumbnail previews */}
          {activeEntry.images && activeEntry.images.length > 0 && (
            <div style={{ display: 'flex', gap: '10px', overflowX: 'auto', marginBottom: '20px', paddingBottom: '6px', width: '100%' }}>
              {activeEntry.images.map((imgUrl, idx) => (
                <div key={idx} style={{ position: 'relative', flexShrink: 0 }}>
                  <img
                    src={imgUrl}
                    alt={`uploaded-${idx}`}
                    style={{ width: '80px', height: '60px', borderRadius: '6px', objectFit: 'cover', border: '1px solid var(--border)' }}
                  />
                  {isEditing && (
                    <button
                      onClick={() => handleRemoveImage(idx)}
                      style={{
                        position: 'absolute',
                        top: '-4px',
                        right: '-4px',
                        background: 'var(--red)',
                        color: 'white',
                        border: 'none',
                        borderRadius: '50%',
                        width: '16px',
                        height: '16px',
                        fontSize: '9px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: '0'
                      }}
                    >
                      ×
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Large Title */}
          {isEditing ? (
            <input
              type="text"
              className="journal-title"
              placeholder="Untitled Journal Entry"
              value={activeEntry.title}
              onChange={(e) => updateActiveEntry({ title: e.target.value })}
              style={{ marginBottom: '24px', fontSize: '32px', width: '100%' }}
            />
          ) : (
            <h1 className="journal-title" style={{ marginBottom: '24px', fontSize: '32px', width: '100%' }}>
              {activeEntry.title || 'Untitled Journal Entry'}
            </h1>
          )}

          {/* Notion Block-based Rich Editor */}
          <NotionEditor
            initialContent={activeEntry.content}
            onChange={(contentString) => updateActiveEntry({ content: contentString })}
            readOnly={!isEditing}
          />

          {!isEditing && (
            <FloatingActionButton 
              onClick={() => setIsEditing(true)}
              icon={IconPencil}
              title="Edit Entry"
            />
          )}
        </div>
      )}
    </div>
  );
}
