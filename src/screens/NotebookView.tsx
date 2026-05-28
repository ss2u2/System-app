import React, { useState, useRef, useEffect } from 'react';
import { useParams, useNavigate, useOutletContext } from 'react-router-dom';
import {
  IconX,
  IconBook,
  IconPencil,
  IconDotsVertical,
  IconTrash,
  IconCalendar,
  IconPalette,
  IconChevronDown
} from '@tabler/icons-react';
import { useTheme } from '../context/ThemeContext';
import NotebookEditor from '../components/NotebookEditor';
import FloatingActionButton from '../components/FloatingActionButton';
import { store } from '../services/db';
import type { AppState, NotebookEntry } from '../types';
import { generateSecureNumericId } from '../utils/taskHelper';
// Import UI Design System components
import Button from '../components/ui/Button';
import Dropdown, { DropdownItem } from '../components/ui/Dropdown';
import Card from '../components/ui/Card';
import BookmarkToggle from '../components/ui/BookmarkToggle';
import ConfirmationModal from '../components/ui/ConfirmationModal';

const pastelColors = [
  {
    name: 'default',
    label: 'Default (No Filter)',
    lightPreview: '#94a3b8',
    darkPreview: '#475569',
    lightBg: 'var(--bg)',
    darkBg: 'var(--bg)'
  },
  {
    name: 'peach',
    label: 'Peach',
    lightPreview: '#ffcccc',
    darkPreview: '#7a3131',
    lightBg: '#ffcccc',
    darkBg: '#592222'
  },
  {
    name: 'cream',
    label: 'Cream',
    lightPreview: '#fef08a',
    darkPreview: '#6b5428',
    lightBg: '#fef08a',
    darkBg: '#4d3d1e'
  },
  {
    name: 'mint',
    label: 'Mint',
    lightPreview: '#bbf7d0',
    darkPreview: '#1c5e37',
    lightBg: '#bbf7d0',
    darkBg: '#114a29'
  },
  {
    name: 'sky',
    label: 'Sky',
    lightPreview: '#bfdbfe',
    darkPreview: '#254e7c',
    lightBg: '#bfdbfe',
    darkBg: '#1e385c'
  },
  {
    name: 'lavender',
    label: 'Lavender',
    lightPreview: '#e9d5ff',
    darkPreview: '#55327c',
    lightBg: '#e9d5ff',
    darkBg: '#3e225c'
  }
];

const getPatternStyle = (patternName?: string, theme?: string): React.CSSProperties => {
  const lineColor = theme === 'dark' ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.06)';

  switch (patternName) {
    case 'lined':
      return {
        backgroundImage: `linear-gradient(${lineColor} 1px, transparent 1px)`,
        backgroundSize: '100% 28px',
        backgroundAttachment: 'local',
      };
    case 'grid':
      return {
        backgroundImage: `linear-gradient(${lineColor} 1px, transparent 1px), linear-gradient(90deg, ${lineColor} 1px, transparent 1px)`,
        backgroundSize: '24px 24px',
        backgroundAttachment: 'local',
      };
    case 'dotted':
      return {
        backgroundImage: `radial-gradient(${lineColor} 1.5px, transparent 1.5px)`,
        backgroundSize: '20px 20px',
        backgroundAttachment: 'local',
      };
    default:
      return {};
  }
};

export default function NotebookView() {
  const { entryId } = useParams();
  const navigate = useNavigate();

  // Retrieve shared state and search query from Outlet Context
  const { state, searchQuery } = useOutletContext<{ state: AppState; searchQuery: string }>();

  const { theme } = useTheme();

  const [isEditing, setIsEditing] = useState(false);
  const [entryToDelete, setEntryToDelete] = useState<number | string | null>(null);

  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const dateInputRef = useRef<HTMLInputElement | null>(null);

  const handleDateClick = () => {
    if (dateInputRef.current) {
      dateInputRef.current.showPicker();
    }
  };

  const activeEntry = state.notebooks.find((j) => String(j.id) === String(entryId));

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
  }, [entryId]);

  // General updater helper for active notebook entry
  const updateActiveEntry = (fields: Partial<NotebookEntry>) => {
    const updated = state.notebooks.map((j) => {
      if (String(j.id) === String(entryId)) {
        return { ...j, ...fields };
      }
      return j;
    });
    store.setState({ notebooks: updated });
  };

  const handleCreateNew = () => {
    const newId = generateSecureNumericId();
    const newEntry: NotebookEntry = {
      id: newId,
      title: '',
      content: JSON.stringify([{ id: '1', type: 'text', content: '', indent: 0 }]),
      bookmarked: false,
      location: '',
      images: [],
      created_at: new Date().toISOString(),
      draft: true
    };
    store.setState({ notebooks: [...state.notebooks, newEntry] });
    navigate(`/notebook/${newId}`);
  };

  const handleDeleteEntry = (id: number | string) => {
    setEntryToDelete(id);
  };

  const confirmDelete = () => {
    if (!entryToDelete) return;
    const id = entryToDelete;
    const updated = state.notebooks.filter((j) => String(j.id) !== String(id));
    const deletedIds = {
      ...(state.deletedIds || {}),
      notebooks: [...(state.deletedIds?.notebooks || []), id],
    };
    store.setState({ notebooks: updated, deletedIds });
    setEntryToDelete(null);
    navigate('/notebook');
  };

  const isEntryEmpty = (entry: NotebookEntry) => {
    if (entry.title && entry.title.trim() !== '') return false;
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
        const updated = state.notebooks.filter((j) => String(j.id) !== String(activeEntry.id));
        store.setState({ notebooks: updated });
      } else if (!activeEntry.title || activeEntry.title.trim() === '') {
        updateActiveEntry({ draft: true });
      }
    }
    navigate('/notebook');
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

  // Filter notebooks based on global TopBar search input
  const filteredNotebooks = (state.notebooks || []).filter((j) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    const titleMatch = j.title.toLowerCase().includes(q);
    let contentMatch = false;
    try {
      const blocks = JSON.parse(j.content);
      contentMatch = blocks.some((b: { content?: string }) => b.content && b.content.toLowerCase().includes(q));
    } catch (err) {
      console.error('Failed to parse blocks for filtering:', err);
    }
    return titleMatch || contentMatch;
  });

  // Sort notebooks descending by date
  const sortedNotebooks = [...filteredNotebooks].sort((a, b) => {
    const da = a.created_at ? new Date(a.created_at).getTime() : 0;
    const db = b.created_at ? new Date(b.created_at).getTime() : 0;
    return db - da;
  });

  // Split notebooks into categories
  const drafts = sortedNotebooks.filter((j) => j.draft || !j.title || j.title.trim() === '');
  const nonDrafts = sortedNotebooks.filter((j) => !j.draft && j.title && j.title.trim() !== '');
  const bookmarkedEntries = sortedNotebooks.filter((j) => j.bookmarked);

  // List of all non-draft entries
  const allEntries = nonDrafts;

  // Toggle bookmark directly from cards
  const handleToggleBookmark = (id: number | string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = state.notebooks.map((j) => {
      if (String(j.id) === String(id)) {
        return { ...j, bookmarked: !j.bookmarked };
      }
      return j;
    });
    store.setState({ notebooks: updated });
  };

  const handleOpenEntry = (id: number | string) => {
    navigate(`/notebook/${id}`);
  };

  const activeColorObj = activeEntry
    ? (pastelColors.find((c) => c.name === activeEntry.themeColor) || pastelColors[0])
    : pastelColors[0];
  const overlayBackgroundColor = theme === 'dark' ? activeColorObj.darkBg : activeColorObj.lightBg;

  return (
    <div className="notebook-container">
      {/* ==================== NOTEBOOK LIST VIEW ==================== */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div className="notebook-scroll-area">
          {sortedNotebooks.length === 0 ? (
            <div className="empty" style={{ padding: '80px 20px' }}>
              <IconBook size={48} style={{ color: 'var(--text3)', marginBottom: '16px' }} />
              <h3>No notebook entries found</h3>
              <p style={{ color: 'var(--text3)', fontSize: '13px' }}>
                {searchQuery ? 'Try matching different search keywords.' : 'Tap the pencil icon below to write your first entry!'}
              </p>
            </div>
          ) : (
            <>
              {/* 1. Drafts Section */}
              {drafts.length > 0 && (
                <div>
                  <div className="notebook-section-title">Drafts</div>
                  {drafts.map((d) => (
                    <Card key={d.id} padding={false} hoverable className="notebook-card-row" onClick={() => handleOpenEntry(d.id)}>
                      <div className="notebook-card-left-icon" style={{ background: 'var(--bg3)', color: 'var(--text3)' }}>
                        <IconBook size={18} />
                      </div>
                      <div className="notebook-card-info">
                        <span className="notebook-card-date">{formatDate(d.created_at)}</span>
                        <span className="notebook-card-title placeholder">{d.title || 'Untitled Entry'}</span>
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
                  <div className="notebook-section-title">Bookmarks</div>
                  {bookmarkedEntries.map((b) => (
                    <Card key={b.id} padding={false} hoverable className="notebook-card-row" onClick={() => handleOpenEntry(b.id)}>
                      <div className="notebook-card-left-icon">
                        <IconBook size={18} />
                      </div>
                      <div className="notebook-card-info">
                        <span className="notebook-card-date">{formatDate(b.created_at)}</span>
                        <span className="notebook-card-title">{b.title || 'Untitled Entry'}</span>
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
                  <div className="notebook-section-title">Entries</div>
                  {allEntries.map((j) => (
                    <Card key={j.id} padding={false} hoverable className="notebook-card-row" onClick={() => handleOpenEntry(j.id)}>
                      <div className="notebook-card-left-icon">
                        <IconBook size={18} />
                      </div>
                      <div className="notebook-card-info">
                        <span className="notebook-card-date">{formatDate(j.created_at)}</span>
                        <span className="notebook-card-title">{j.title || 'Untitled Entry'}</span>
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

      {/* ==================== NOTEBOOK EDITOR/READ OVERLAY ==================== */}
      {activeEntry && (
        <>
          <div className="task-detail-backdrop" onClick={handleClose} />
          <div
            className="task-detail-overlay"
            style={{ backgroundColor: overlayBackgroundColor }}
          >
            {/* Top Bar */}
            <div
              className="task-detail-topbar"
              style={{
                backgroundColor: 'transparent',
                borderBottom: '1px solid var(--border)'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
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
              </div>

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

            {/* Scrollable Body */}
            <div
              className="task-detail-body notebook-editor-body"
              style={getPatternStyle(activeEntry.themePattern || 'blank', theme)}
            >
              {/* Row 1: Metadata Row (Date selector, Theme color swatch picker, and Paper Pattern segmented picker) */}
              <div
                className="editor-meta-row"
                style={{
                  width: '100%',
                  display: 'flex',
                  flexWrap: 'wrap',
                  alignItems: 'center',
                  gap: '8px',
                  borderBottom: '1px solid var(--border)',
                  paddingBottom: '8px',
                  marginBottom: '4px'
                }}
              >
                <div
                  className="editor-meta-field cursor-pointer"
                  onClick={handleDateClick}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    background: 'var(--bg3)',
                    border: '1px solid var(--border)',
                    borderRadius: '16px',
                    padding: '6px 14px',
                    fontSize: '12px',
                    fontWeight: 500,
                    color: 'var(--text2)',
                    cursor: 'pointer',
                    userSelect: 'none',
                    transition: 'all 0.2s',
                    position: 'relative'
                  }}
                >
                  <IconCalendar size={14} />
                  <span>{formatDate(activeEntry.created_at)}</span>
                  {isEditing && (
                    <input
                      ref={dateInputRef}
                      type="date"
                      style={{ position: 'absolute', opacity: 0, width: 0, height: 0, pointerEvents: 'none' }}
                      value={activeEntry.created_at ? new Date(activeEntry.created_at).toISOString().split('T')[0] : ''}
                      onChange={(e) => {
                        const selectedVal = e.target.value;
                        if (!selectedVal) return;
                        const currentFullDate = activeEntry.created_at ? new Date(activeEntry.created_at) : new Date();
                        const [y, m, d] = selectedVal.split('-');
                        currentFullDate.setFullYear(Number(y));
                        currentFullDate.setMonth(Number(m) - 1);
                        currentFullDate.setDate(Number(d));
                        updateActiveEntry({ created_at: currentFullDate.toISOString() });
                      }}
                    />
                  )}
                </div>

                {/* Theme Color Swatch Dropdown */}
                {isEditing && (
                  <Dropdown
                    align="right"
                    className="color-picker-dropdown"
                    trigger={
                      <button
                        type="button"
                        className="editor-theme-btn"
                        style={{
                          width: '32px',
                          height: '32px',
                          borderRadius: '50%',
                          background: 'var(--bg3)',
                          border: '1px solid var(--border)',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: 'var(--text2)',
                          transition: 'all 0.2s',
                        }}
                        title="Select background color"
                      >
                        <IconPalette size={16} />
                      </button>
                    }
                  >
                    {pastelColors.map((colorObj) => {
                      const swatchBg = theme === 'dark' ? colorObj.darkPreview : colorObj.lightPreview;
                      return (
                        <button
                          key={colorObj.name}
                          type="button"
                          onClick={() => {
                            updateActiveEntry({ themeColor: colorObj.name });
                          }}
                          style={{
                            width: '24px',
                            height: '24px',
                            borderRadius: '50%',
                            backgroundColor: colorObj.name === 'default' ? 'var(--bg3)' : swatchBg,
                            border: activeEntry.themeColor === colorObj.name ? '2px solid var(--text)' : '1px solid var(--border)',
                            cursor: 'pointer',
                            padding: 0,
                            outline: 'none',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            position: 'relative',
                            overflow: 'hidden',
                            flexShrink: 0
                          }}
                          title={colorObj.label}
                        >
                          {colorObj.name === 'default' && (
                            <div
                              style={{
                                width: '100%',
                                height: '2px',
                                backgroundColor: '#ef4444',
                                transform: 'rotate(-45deg)'
                              }}
                            />
                          )}
                        </button>
                      );
                    })}
                  </Dropdown>
                )}

                {/* Paper Pattern Dropdown */}
                {isEditing && (
                  <Dropdown
                    align="left"
                    className="paper-picker-dropdown"
                    trigger={
                      <button
                        type="button"
                        className="editor-theme-btn"
                        style={{
                          height: '32px',
                          borderRadius: '16px',
                          background: 'var(--bg3)',
                          border: '1px solid var(--border)',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          padding: '0 12px',
                          color: 'var(--text2)',
                          transition: 'all 0.2s',
                          fontSize: '12px',
                          fontWeight: 600,
                        }}
                        title="Select paper style"
                      >
                        <span>Paper: {activeEntry.themePattern ? activeEntry.themePattern.charAt(0).toUpperCase() + activeEntry.themePattern.slice(1) : 'Blank'}</span>
                        <IconChevronDown size={12} />
                      </button>
                    }
                  >
                    {[
                      { name: 'blank', label: 'Blank' },
                      { name: 'lined', label: 'Lined' },
                      { name: 'grid', label: 'Grid' },
                      { name: 'dotted', label: 'Dotted' }
                    ].map((pattern) => (
                      <DropdownItem
                        key={pattern.name}
                        onClick={() => {
                          updateActiveEntry({ themePattern: pattern.name });
                        }}
                        style={{
                          background: activeEntry.themePattern === pattern.name ? 'var(--text)' : 'transparent',
                          color: activeEntry.themePattern === pattern.name ? 'var(--bg)' : 'var(--text2)',
                          fontWeight: activeEntry.themePattern === pattern.name ? '600' : '500',
                        }}
                      >
                        {pattern.label}
                      </DropdownItem>
                    ))}
                  </Dropdown>
                )}
              </div>

              {/* Large Title */}
              {isEditing ? (
                <textarea
                  ref={textareaRef}
                  className="notebook-title"
                  placeholder="Title"
                  value={activeEntry?.title || ''}
                  onChange={(e) => updateActiveEntry({ title: e.target.value })}
                  rows={1}
                  style={{
                    width: '100%',
                    resize: 'none',
                    height: 'auto',
                    overflowY: 'hidden',
                    marginTop: '0px',
                    marginBottom: '8px'
                  }}
                  onInput={(e) => {
                    const el = e.currentTarget;
                    el.style.height = 'auto';
                    el.style.height = `${el.scrollHeight}px`;
                  }}
                />
              ) : (
                <h1
                  className="notebook-title"
                  style={{
                    width: '100%',
                    wordBreak: 'break-word',
                    whiteSpace: 'pre-wrap',
                    marginTop: '0px',
                    marginBottom: '8px'
                  }}
                >
                  {activeEntry?.title || 'Untitled Notebook Entry'}
                </h1>
              )}

              {/* Notebook Block-based Rich Editor */}
              <NotebookEditor
                initialContent={activeEntry.content}
                onChange={(contentString) => updateActiveEntry({ content: contentString })}
                readOnly={!isEditing}
              />
            </div>

            {/* Bottom Action Bar */}
            {!isEditing && (
              <div
                className="task-detail-bottom-bar"
                style={{ backgroundColor: 'transparent', borderTop: '1px solid var(--border)' }}
              >
                <Button
                  variant="primary"
                  onClick={() => setIsEditing(true)}
                  className="task-detail-complete-btn"
                  style={{ width: '100%', maxWidth: 'none' }}
                >
                  Edit Entry
                </Button>
              </div>
            )}
          </div>
        </>
      )}

      <ConfirmationModal
        isOpen={entryToDelete !== null}
        onClose={() => setEntryToDelete(null)}
        onConfirm={confirmDelete}
        title="Are you sure you want to delete this notebook entry?"
        confirmLabel="Delete"
      />
    </div>
  );
}
