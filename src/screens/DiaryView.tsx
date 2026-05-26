import React, { useState, useRef, useEffect } from 'react';
import { useParams, useNavigate, useOutletContext } from 'react-router-dom';
import {
  IconX,
  IconBook,
  IconMapPin,
  IconPencil,
  IconPhoto,
  IconDotsVertical,
  IconTrash,
  IconCalendar
} from '@tabler/icons-react';
import DiaryEditor from '../components/DiaryEditor';
import FloatingActionButton from '../components/FloatingActionButton';
import { store } from '../services/db';
import type { AppState, DiaryEntry } from '../types';
import { generateSecureNumericId } from '../utils/taskHelper';
// Import UI Design System components
import Button from '../components/ui/Button';
import Dropdown, { DropdownItem } from '../components/ui/Dropdown';
import Card from '../components/ui/Card';
import BookmarkToggle from '../components/ui/BookmarkToggle';
import ConfirmationModal from '../components/ui/ConfirmationModal';

export default function DiaryView() {
  const { entryId } = useParams();
  const navigate = useNavigate();

  // Retrieve shared state and search query from Outlet Context
  const { state, searchQuery } = useOutletContext<{ state: AppState; searchQuery: string }>();

  const [isEditing, setIsEditing] = useState(false);
  const [newImageUrl, setNewImageUrl] = useState('');
  const [showImageInput, setShowImageInput] = useState(false);
  const [entryToDelete, setEntryToDelete] = useState<number | string | null>(null);

  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  const activeEntry = state.diaries.find((j) => String(j.id) === String(entryId));

  // Auto-focus/auto-resize editor text area
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [activeEntry?.title, isEditing]);

  // Set edit mode automatically for drafts or new entries
  useEffect(() => {
    if (activeEntry) {
      if (activeEntry.draft || isEntryEmpty(activeEntry)) {
        setIsEditing(true);
      } else {
        setIsEditing(false);
      }
    } else {
      setIsEditing(false);
    }
    setShowImageInput(false);
  }, [entryId]);

  // General updater helper for active diary entry
  const updateActiveEntry = (fields: Partial<DiaryEntry>) => {
    const updated = state.diaries.map((j) => {
      if (String(j.id) === String(entryId)) {
        return { ...j, ...fields };
      }
      return j;
    });
    store.setState({ diaries: updated });
  };

  const handleCreateNew = () => {
    const newId = generateSecureNumericId();
    const newEntry: DiaryEntry = {
      id: newId,
      title: '',
      content: JSON.stringify([{ id: '1', type: 'text', content: '', indent: 0 }]),
      bookmarked: false,
      location: '',
      images: [],
      created_at: new Date().toISOString(),
      draft: true
    };
    store.setState({ diaries: [...state.diaries, newEntry] });
    navigate(`/diary/${newId}`);
  };

  const handleDeleteEntry = (id: number | string) => {
    setEntryToDelete(id);
  };

  const confirmDelete = () => {
    if (!entryToDelete) return;
    const id = entryToDelete;
    const updated = state.diaries.filter((j) => String(j.id) !== String(id));
    const deletedIds = {
      ...(state.deletedIds || {}),
      diaries: [...(state.deletedIds?.diaries || []), id],
    };
    store.setState({ diaries: updated, deletedIds });
    setEntryToDelete(null);
    navigate('/diary');
  };

  const isEntryEmpty = (entry: DiaryEntry) => {
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
        const updated = state.diaries.filter((j) => String(j.id) !== String(activeEntry.id));
        store.setState({ diaries: updated });
      } else if (!activeEntry.title || activeEntry.title.trim() === '') {
        updateActiveEntry({ draft: true });
      }
    }
    navigate('/diary');
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

  // Filter diaries based on global TopBar search input
  const filteredDiaries = (state.diaries || []).filter((j) => {
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

  // Sort diaries descending by date
  const sortedDiaries = [...filteredDiaries].sort((a, b) => {
    const da = a.created_at ? new Date(a.created_at).getTime() : 0;
    const db = b.created_at ? new Date(b.created_at).getTime() : 0;
    return db - da;
  });

  // Split diaries into categories
  const drafts = sortedDiaries.filter((j) => j.draft || !j.title || j.title.trim() === '');
  const nonDrafts = sortedDiaries.filter((j) => !j.draft && j.title && j.title.trim() !== '');
  const bookmarkedEntries = sortedDiaries.filter((j) => j.bookmarked);
  
  // List of all non-draft entries
  const allEntries = nonDrafts;

  // Toggle bookmark directly from cards
  const handleToggleBookmark = (id: number | string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = state.diaries.map((j) => {
      if (String(j.id) === String(id)) {
        return { ...j, bookmarked: !j.bookmarked };
      }
      return j;
    });
    store.setState({ diaries: updated });
  };

  const handleOpenEntry = (id: number | string) => {
    navigate(`/diary/${id}`);
  };

  return (
    <div className="diary-container">
      {!activeEntry ? (
        /* ==================== DIARY LIST VIEW ==================== */
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <div className="diary-scroll-area">
            {sortedDiaries.length === 0 ? (
              <div className="empty" style={{ padding: '80px 20px' }}>
                <IconBook size={48} style={{ color: 'var(--text3)', marginBottom: '16px' }} />
                <h3>No diary entries found</h3>
                <p style={{ color: 'var(--text3)', fontSize: '13px' }}>
                  {searchQuery ? 'Try matching different search keywords.' : 'Tap the pencil icon below to write your first entry!'}
                </p>
              </div>
            ) : (
              <>
                {/* 1. Drafts Section */}
                {drafts.length > 0 && (
                  <div>
                    <div className="diary-section-title">Drafts</div>
                    {drafts.map((d) => (
                      <Card key={d.id} padding={false} hoverable className="diary-card-row" onClick={() => handleOpenEntry(d.id)}>
                        <div className="diary-card-left-icon" style={{ background: 'var(--bg3)', color: 'var(--text3)' }}>
                          <IconPhoto size={18} />
                        </div>
                        <div className="diary-card-info">
                          <span className="diary-card-date">{formatDate(d.created_at)}</span>
                          <span className="diary-card-title placeholder">{d.title || 'Untitled Entry'}</span>
                          <span className="diary-card-location">
                            <IconMapPin size={10} />
                            {d.location || 'Add location'}
                          </span>
                        </div>
                        <BookmarkToggle
                          checked={d.bookmarked || false}
                          onToggle={(e) => handleToggleBookmark(d.id, e)}
                        />
                      </Card>
                    ))}
                  </div>
                )}

                {/* 2. Bookmarks Section */}
                {bookmarkedEntries.length > 0 && (
                  <div>
                    <div className="diary-section-title">Bookmarks</div>
                    {bookmarkedEntries.map((b) => (
                      <Card key={b.id} padding={false} hoverable className="diary-card-row" onClick={() => handleOpenEntry(b.id)}>
                        {b.images && b.images[0] ? (
                          <img src={b.images[0]} alt="thumbnail" className="diary-card-left-img" />
                        ) : (
                          <div className="diary-card-left-icon">
                            <IconBook size={18} />
                          </div>
                        )}
                        <div className="diary-card-info">
                          <span className="diary-card-date">{formatDate(b.created_at)}</span>
                          <span className="diary-card-title">{b.title || 'Untitled Entry'}</span>
                          {b.location && (
                            <span className="diary-card-location">
                              <IconMapPin size={10} />
                              {b.location}
                            </span>
                          )}
                        </div>
                        <BookmarkToggle
                          checked={true}
                          onToggle={(e) => handleToggleBookmark(b.id, e)}
                        />
                      </Card>
                    ))}
                  </div>
                )}

                {/* 3. All Entries Section */}
                {allEntries.length > 0 && (
                  <div>
                    <div className="diary-section-title">Entries</div>
                    {allEntries.map((j) => (
                      <Card key={j.id} padding={false} hoverable className="diary-card-row" onClick={() => handleOpenEntry(j.id)}>
                        {j.images && j.images[0] ? (
                          <img src={j.images[0]} alt="thumbnail" className="diary-card-left-img" />
                        ) : (
                          <div className="diary-card-left-icon">
                            <IconBook size={18} />
                          </div>
                        )}
                        <div className="diary-card-info">
                          <span className="diary-card-date">{formatDate(j.created_at)}</span>
                          <span className="diary-card-title">{j.title || 'Untitled Entry'}</span>
                          {j.location && (
                            <span className="diary-card-location">
                              <IconMapPin size={10} />
                              {j.location}
                            </span>
                          )}
                        </div>
                        <BookmarkToggle
                          checked={j.bookmarked || false}
                          onToggle={(e) => handleToggleBookmark(j.id, e)}
                        />
                      </Card>
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
        /* ==================== DIARY EDITOR/READ VIEW ==================== */
        <div
          className="diary-wrap"
          id="diary-editor-view"
          style={{
            display: 'flex',
            flexDirection: 'column',
            position: 'relative',
            width: '100%',
            height: '100%',
            overflowY: 'auto',
            padding: '20px',
            maxWidth: '100%'
          }}
        >
          {/* Header Controls */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', width: '100%' }}>
            <Button
              onClick={handleClose}
              variant="secondary"
              style={{ 
                padding: '8px', 
                borderRadius: '50%',
                width: '40px',
                height: '40px',
                minWidth: 'auto',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <IconX size={20} />
            </Button>

            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              {isEditing && (
                <Button
                  variant="primary"
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
                    minWidth: 'auto',
                  }}
                >
                  Save
                </Button>
              )}

              <BookmarkToggle
                checked={activeEntry.bookmarked || false}
                onToggle={() => updateActiveEntry({ bookmarked: !activeEntry.bookmarked })}
                size={20}
                className="add-btn"
                style={{
                  width: '40px',
                  height: '40px',
                  background: 'var(--bg3)',
                }}
              />

              <Dropdown
                align="right"
                trigger={
                  <Button
                    variant="secondary"
                    style={{
                      padding: '8px',
                      borderRadius: '50%',
                      width: '40px',
                      height: '40px',
                      minWidth: 'auto',
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <IconDotsVertical size={20} />
                  </Button>
                }
              >
                <DropdownItem variant="danger" onClick={() => handleDeleteEntry(activeEntry.id)}>
                  <IconTrash size={16} />
                  Delete Entry
                </DropdownItem>
              </Dropdown>
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
                    <Button
                      type="submit"
                      variant="primary"
                      style={{
                        padding: '4px 8px',
                        fontSize: '11px',
                        fontWeight: '700',
                        minWidth: 'auto',
                      }}
                    >
                      Add
                    </Button>
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
            <textarea
              ref={textareaRef}
              className="diary-title"
              placeholder="Untitled Diary Entry"
              value={activeEntry?.title || ''}
              onChange={(e) => updateActiveEntry({ title: e.target.value })}
              rows={1}
              style={{
                width: '100%',
                resize: 'none',
                height: 'auto',
                overflowY: 'hidden'
              }}
              onInput={(e) => {
                const el = e.currentTarget;
                el.style.height = 'auto';
                el.style.height = `${el.scrollHeight}px`;
              }}
            />
          ) : (
            <h1 
              className="diary-title" 
              style={{ 
                width: '100%', 
                wordBreak: 'break-word', 
                whiteSpace: 'pre-wrap' 
              }}
            >
              {activeEntry?.title || 'Untitled Diary Entry'}
            </h1>
          )}

          {/* Diary Block-based Rich Editor */}
          <DiaryEditor
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

      <ConfirmationModal
        isOpen={entryToDelete !== null}
        onClose={() => setEntryToDelete(null)}
        onConfirm={confirmDelete}
        title="Are you sure you want to delete this diary entry?"
        confirmLabel="Delete"
      />
    </div>
  );
}
