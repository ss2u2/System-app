import React, { useState, useEffect, useRef } from 'react';
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
import { generateSecureNumericId, convertBlocksToHtml } from '../utils/taskHelper';
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

/* ─── Helper: Extract title & body from legacy content HTML ─── */
const extractTitleAndBody = (entry: NotebookEntry): { title: string; body: string } => {
  let content = entry.content || '';

  // Handle legacy JSON block format
  try {
    const parsed = JSON.parse(content);
    if (Array.isArray(parsed)) {
      content = convertBlocksToHtml(parsed);
    }
  } catch { /* not JSON, use as-is */ }

  // Extract embedded title from HTML if present (backward compat)
  const parser = new DOMParser();
  const doc = parser.parseFromString(content, 'text/html');
  const titleEl = doc.querySelector('.notebook-title');

  if (titleEl) {
    const extractedTitle = titleEl.textContent?.trim() || '';
    titleEl.remove();
    const body = doc.body.innerHTML.trim();
    return {
      title: extractedTitle || entry.title || '',
      body: body || '<div><br></div>',
    };
  }

  return {
    title: entry.title || '',
    body: content || '<div><br></div>',
  };
};

/* ─── Helper: Check if an entry is empty ─── */
const isEntryEmpty = (entry: NotebookEntry): boolean => {
  const { title, body } = extractTitleAndBody(entry);
  const bodyText = new DOMParser()
    .parseFromString(body, 'text/html')
    .body.textContent?.trim() || '';
  const hasMedia =
    body.includes('j-image-block') ||
    body.includes('j-audio-block') ||
    body.includes('j-reminder-block');
  return title.trim() === '' && bodyText === '' && !hasMedia;
};

export default function NotebookView() {
  const { entryId } = useParams();
  const navigate = useNavigate();

  // Retrieve shared state and search query from Outlet Context
  const { state, searchQuery } = useOutletContext<{ state: AppState; searchQuery: string }>();

  const { theme } = useTheme();

  const [isEditing, setIsEditing] = useState(false);
  const [entryToDelete, setEntryToDelete] = useState<number | string | null>(null);
  const [localTitle, setLocalTitle] = useState('');
  const [localContent, setLocalContent] = useState('');

  const activeEntry = state.notebooks.find((j) => String(j.id) === String(entryId));

  const lastLoadedIdRef = useRef<number | string | null>(null);

  /* ─── Load entry title & content (with backward compat) ─── */
  useEffect(() => {
    if (activeEntry) {
      if (lastLoadedIdRef.current !== activeEntry.id) {
        const { title, body } = extractTitleAndBody(activeEntry);
        setLocalTitle(title);
        setLocalContent(body);
        lastLoadedIdRef.current = activeEntry.id;
      }
    } else {
      lastLoadedIdRef.current = null;
    }
  }, [activeEntry]);

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

  // Prevent body scrolling when activeEntry (notebook overlay) is open
  useEffect(() => {
    if (activeEntry) {
      document.body.classList.add('modal-open');
    } else {
      document.body.classList.remove('modal-open');
    }
    return () => {
      document.body.classList.remove('modal-open');
    };
  }, [activeEntry]);

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
      content: '<div><br></div>',
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

  const handleClose = () => {
    if (activeEntry) {
      if (isEditing) {
        const bodyText = new DOMParser()
          .parseFromString(localContent, 'text/html')
          .body.textContent?.trim() || '';
        const hasMedia =
          localContent.includes('j-image-block') ||
          localContent.includes('j-audio-block') ||
          localContent.includes('j-reminder-block');
        const isEmpty = localTitle.trim() === '' && bodyText === '' && !hasMedia;

        if (isEmpty) {
          // Remove empty entry completely
          const updated = state.notebooks.filter((j) => String(j.id) !== String(activeEntry.id));
          store.setState({ notebooks: updated });
        } else {
          // Save current changes as a draft
          updateActiveEntry({
            title: localTitle || 'Untitled Entry',
            content: localContent,
            draft: true
          });
        }
      } else {
        if (isEntryEmpty(activeEntry)) {
          const updated = state.notebooks.filter((j) => String(j.id) !== String(activeEntry.id));
          store.setState({ notebooks: updated });
        }
      }
    }
    setIsEditing(false);
    navigate('/notebook');
  };

  const formatDateTime = (dateStr?: string) => {
    if (!dateStr) return 'No Date';
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return dateStr;
    return date.toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric'
    }) + ' at ' + date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
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
    const contentMatch = j.content ? j.content.toLowerCase().includes(q) : false;
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
                backgroundColor: overlayBackgroundColor,
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
                      updateActiveEntry({
                        title: localTitle || 'Untitled Entry',
                        content: localContent,
                        draft: false
                      });
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
                  className="editor-meta-field"
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
                    userSelect: 'none',
                    transition: 'all 0.2s',
                    position: 'relative'
                  }}
                >
                  <IconCalendar size={14} />
                  <span>{formatDateTime(activeEntry.created_at)}</span>
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

              {/* Notebook Editor */}
              <NotebookEditor
                title={localTitle}
                onTitleChange={isEditing ? setLocalTitle : undefined}
                initialContent={localContent}
                onChange={isEditing ? (contentString) => setLocalContent(contentString) : undefined}
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
