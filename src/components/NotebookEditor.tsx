import React, { useState, useEffect, useRef } from 'react';
import {
  IconCaretRightFilled,
  IconTextSize,
  IconH1,
  IconH2,
  IconH3,
  IconSquareCheck,
  IconList,
  IconListTree,
  IconCheck,
  IconGridDots,
  IconTrash,
  IconPaperclip,
  IconPhoto,
  IconMicrophone,
  IconBell,
  IconX,
  IconPlus,
} from '@tabler/icons-react';
import type { NotebookBlock } from '../types';
import { generateUUID } from '../utils/taskHelper';

interface NotebookEditorProps {
  initialContent: string;
  onChange?: (content: string) => void;
  readOnly?: boolean;
}

interface SlashMenuState {
  active: boolean;
  x: number;
  y: number;
  blockIndex: number | null;
  filter: string;
}

export default function NotebookEditor({ initialContent, onChange, readOnly }: NotebookEditorProps) {
  const [blocks, setBlocks] = useState<NotebookBlock[]>([]);
  const [slashMenu, setSlashMenu] = useState<SlashMenuState>({
    active: false,
    x: 0,
    y: 0,
    blockIndex: null,
    filter: '',
  });
  const [slashSelectedIdx, setSlashSelectedIdx] = useState(0);
  const refs = useRef<Record<string, HTMLDivElement | null>>({});
  
  // Track active formatting and block focus
  const [activeBlockId, setActiveBlockId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'text' | 'block' | 'attachment' | null>(null);
  const [isBold, setIsBold] = useState(false);
  const [isItalic, setIsItalic] = useState(false);
  const [isUnderline, setIsUnderline] = useState(false);
  const bottomBarRef = useRef<HTMLDivElement | null>(null);

  // Audio recording states
  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  // Track if we are currently typing to avoid resetting content and losing cursor
  const isInternalUpdate = useRef(false);

  // Parse initial content - only if it's not an internal update
  useEffect(() => {
    if (isInternalUpdate.current) {
      isInternalUpdate.current = false;
      return;
    }

    try {
      let parsed = initialContent;
      if (typeof initialContent === 'string') {
        parsed = JSON.parse(initialContent);
      }
      
      if (Array.isArray(parsed) && parsed.length > 0) {
        setBlocks(parsed);
      } else {
        setBlocks([{ id: '1', type: 'text', content: '', indent: 0 }]);
      }
    } catch (err) {
      console.error('Failed to parse initial content:', err, 'Raw content:', initialContent);
      setBlocks([{ id: '1', type: 'text', content: '', indent: 0 }]);
    }
  }, [initialContent]);

  // Sync blocks contents directly into DOM element innerHTML after render
  useEffect(() => {
    blocks.forEach((block) => {
      const el = refs.current[block.id];
      if (el && !['toc', 'image', 'audio', 'reminder'].includes(block.type)) {
        if (el.innerHTML !== block.content) {
          el.innerHTML = block.content;
        }
      }
    });
  }, [blocks]);

  // Handle selection state changes, outside click detection, and mic recording safety unmount
  useEffect(() => {
    if (readOnly) return;

    const handleSelectionChange = () => {
      setIsBold(document.queryCommandState('bold'));
      setIsItalic(document.queryCommandState('italic'));
      setIsUnderline(document.queryCommandState('underline'));
    };

    const handleOutsideClick = (e: MouseEvent) => {
      if (bottomBarRef.current && !bottomBarRef.current.contains(e.target as Node)) {
        if (!isRecording) {
          setActiveTab(null);
        }
      }
    };

    document.addEventListener('selectionchange', handleSelectionChange);
    document.addEventListener('mousedown', handleOutsideClick);

    return () => {
      document.removeEventListener('selectionchange', handleSelectionChange);
      document.removeEventListener('mousedown', handleOutsideClick);
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop();
      }
    };
  }, [readOnly, isRecording]);

  // Handle keyboard height on mobile for floating bar
  useEffect(() => {
    if (readOnly) return;

    const handleViewportChange = () => {
      const visualViewport = (window as any).visualViewport;
      if (visualViewport && bottomBarRef.current) {
        // The distance from the layout bottom to the visual bottom is what we need to offset.
        // This covers both the keyboard height and any 'sliding up' of the screen.
        const bottomObscured = window.innerHeight - (visualViewport.offsetTop + visualViewport.height);
        
        if (bottomObscured > 20) {
          // Keyboard is visible or screen has shifted
          bottomBarRef.current.style.bottom = `${bottomObscured + 16}px`;
        } else {
          // Revert to CSS
          bottomBarRef.current.style.bottom = '';
        }
      }
    };

    const visualViewport = (window as any).visualViewport;
    if (visualViewport) {
      visualViewport.addEventListener('resize', handleViewportChange);
      visualViewport.addEventListener('scroll', handleViewportChange);
      handleViewportChange();
    }

    return () => {
      if (visualViewport) {
        visualViewport.removeEventListener('resize', handleViewportChange);
        visualViewport.removeEventListener('scroll', handleViewportChange);
      }
    };
  }, [readOnly]);

  // Sync back to parent
  const updateBlocks = (newBlocks: NotebookBlock[]) => {
    setBlocks(newBlocks);
    if (onChange) {
      isInternalUpdate.current = true;
      onChange(JSON.stringify(newBlocks));
    }
  };

  const getHeadingBlocks = () => {
    return blocks.filter((b) =>
      ['h1', 'h2', 'h3', 'toggle-h1', 'toggle-h2', 'toggle-h3'].includes(b.type)
    );
  };

  const handleContentChange = (index: number, html: string) => {
    if (readOnly) return;
    const updated = [...blocks];
    updated[index].content = html;
    updateBlocks(updated);

    // Handle slash menu activation using text content for parsing
    const selection = window.getSelection();
    if (selection && selection.rangeCount > 0) {
      const textNode = selection.anchorNode;
      const offset = selection.anchorOffset;
      const fullText = textNode?.textContent || '';
      const beforeCursor = fullText.slice(0, offset);

      const slashIndex = beforeCursor.lastIndexOf('/');
      if (slashIndex !== -1 && (slashIndex === 0 || beforeCursor[slashIndex - 1] === ' ')) {
        const query = beforeCursor.slice(slashIndex + 1);
        const parentElement = textNode?.parentElement;
        if (parentElement) {
          const rect = parentElement.getBoundingClientRect();
          setSlashMenu({
            active: true,
            x: rect.left,
            y: rect.bottom + window.scrollY,
            blockIndex: index,
            filter: query,
          });
          setSlashSelectedIdx(0);
        }
      } else {
        setSlashMenu((prev) => ({ ...prev, active: false }));
      }
    }
  };

  const executeCommand = (type: string) => {
    if (readOnly || slashMenu.blockIndex === null) return;
    const idx = slashMenu.blockIndex;
    const updated = [...blocks];

    // Remove '/' from content — work with innerText to strip slash
    const el = refs.current[updated[idx].id];
    let text = el ? el.innerText : updated[idx].content;
    const slashIdx = text.lastIndexOf('/');
    if (slashIdx !== -1) {
      text = text.substring(0, slashIdx);
    }
    updated[idx].content = text;
    updated[idx].type = type;

    if (type.startsWith('toggle-')) {
      updated[idx].collapsed = false;
    }

    setSlashMenu({ active: false, x: 0, y: 0, blockIndex: null, filter: '' });
    isInternalUpdate.current = false; 
    updateBlocks(updated);

    setTimeout(() => {
      const focusEl = refs.current[updated[idx].id];
      if (focusEl) {
        focusEl.innerHTML = text;
        focusEl.focus();
        const range = document.createRange();
        const sel = window.getSelection();
        range.selectNodeContents(focusEl);
        range.collapse(false);
        if (sel) {
          sel.removeAllRanges();
          sel.addRange(range);
        }
      }
    }, 50);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>, index: number) => {
    if (readOnly) return;
    const block = blocks[index];

    // Slash Menu Controls
    if (slashMenu.active) {
      const filtered = getFilteredMenuItems();
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSlashSelectedIdx((slashSelectedIdx + 1) % filtered.length);
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSlashSelectedIdx((slashSelectedIdx - 1 + filtered.length) % filtered.length);
        return;
      }
      if (e.key === 'Enter') {
        e.preventDefault();
        const selected = filtered[slashSelectedIdx];
        if (selected) {
          executeCommand(selected.type);
        }
        return;
      }
      if (e.key === 'Escape') {
        e.preventDefault();
        setSlashMenu((prev) => ({ ...prev, active: false }));
        return;
      }
    }

    // Standard Editor Shortcuts
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      const newBlockId = generateUUID();

      let newType = 'text';
      let newIndent = block.indent || 0;

      if (['todo', 'bullet'].includes(block.type)) {
        newType = block.type;
      } else if (['toggle-h1', 'toggle-h2', 'toggle-h3'].includes(block.type)) {
        newIndent = (block.indent || 0) + 1;
      }

      const newBlock: NotebookBlock = {
        id: newBlockId,
        type: newType,
        content: '',
        indent: newIndent,
      };

      const updated = [...blocks];
      updated.splice(index + 1, 0, newBlock);
      isInternalUpdate.current = false;
      updateBlocks(updated);

      setTimeout(() => {
        const el = refs.current[newBlockId];
        if (el) el.focus();
      }, 50);
      return;
    }

    if (e.key === 'Backspace' && (block.content === '' || block.content === '<br>')) {
      e.preventDefault();
      if (block.indent > 0) {
        const updated = [...blocks];
        updated[index].indent = Math.max(0, block.indent - 1);
        updateBlocks(updated);
        return;
      }

      if (blocks.length > 1 && index > 0) {
        const prevBlock = blocks[index - 1];
        const updated = blocks.filter((_, i) => i !== index);
        isInternalUpdate.current = false;
        updateBlocks(updated);

        setTimeout(() => {
          const el = refs.current[prevBlock.id];
          if (el) {
            el.focus();
            const range = document.createRange();
            const sel = window.getSelection();
            range.selectNodeContents(el);
            range.collapse(false);
            if (sel) {
              sel.removeAllRanges();
              sel.addRange(range);
            }
          }
        }, 50);
      }
      return;
    }

    if (e.key === 'Tab') {
      e.preventDefault();
      const updated = [...blocks];
      if (e.shiftKey) {
        updated[index].indent = Math.max(0, (block.indent || 0) - 1);
      } else {
        updated[index].indent = Math.min(3, (block.indent || 0) + 1);
      }
      updateBlocks(updated);
    }

    if (e.key === 'ArrowUp' && index > 0) {
      e.preventDefault();
      const prevId = blocks[index - 1].id;
      refs.current[prevId]?.focus();
    }

    if (e.key === 'ArrowDown' && index < blocks.length - 1) {
      e.preventDefault();
      const nextId = blocks[index + 1].id;
      refs.current[nextId]?.focus();
    }
  };

  const handleToggleCollapse = (index: number) => {
    const updated = [...blocks];
    updated[index].collapsed = !updated[index].collapsed;
    updateBlocks(updated);
  };

  const toggleTodoDone = (index: number) => {
    if (readOnly) return;
    const updated = [...blocks];
    updated[index].done = !updated[index].done;
    updateBlocks(updated);
  };

  // Block Level operations for Bottom Bar Controls
  const changeBlockType = (idx: number, type: string) => {
    if (readOnly || idx < 0 || idx >= blocks.length) return;
    const updated = [...blocks];
    updated[idx].type = type;

    if (type.startsWith('toggle-')) {
      updated[idx].collapsed = false;
    }

    if (type === 'todo') {
      updated[idx].done = updated[idx].done || false;
    }

    isInternalUpdate.current = false;
    updateBlocks(updated);

    setTimeout(() => {
      const el = refs.current[updated[idx].id];
      if (el) el.focus();
    }, 50);
  };

  const addNewBlockAt = (idx: number) => {
    if (readOnly) return;
    const targetIdx = idx >= 0 && idx < blocks.length ? idx : blocks.length - 1;
    const newId = generateUUID();
    const newBlock: NotebookBlock = {
      id: newId,
      type: 'text',
      content: '',
      indent: blocks[targetIdx]?.indent || 0,
    };
    const updated = [...blocks];
    updated.splice(targetIdx + 1, 0, newBlock);
    isInternalUpdate.current = false;
    updateBlocks(updated);

    setTimeout(() => {
      const el = refs.current[newId];
      if (el) el.focus();
    }, 50);
  };

  const deleteBlockAt = (idx: number) => {
    if (readOnly || idx < 0 || idx >= blocks.length) return;
    if (blocks.length <= 1) return;
    const prevBlock = blocks[idx - 1] || blocks[idx + 1];
    const updated = blocks.filter((_, i) => i !== idx);
    isInternalUpdate.current = false;
    updateBlocks(updated);

    setTimeout(() => {
      const el = refs.current[prevBlock.id];
      if (el) {
        el.focus();
        const range = document.createRange();
        const sel = window.getSelection();
        range.selectNodeContents(el);
        range.collapse(false);
        if (sel) {
          sel.removeAllRanges();
          sel.addRange(range);
        }
      }
    }, 50);
  };

  // Attachments Handling
  const handleAddImage = (idx: number) => {
    if (readOnly || idx < 0 || idx >= blocks.length) return;
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (readerEvent) => {
          const base64 = readerEvent.target?.result as string;
          if (base64) {
            const newId = generateUUID();
            const newBlock: NotebookBlock = {
              id: newId,
              type: 'image',
              content: base64,
              indent: blocks[idx].indent || 0,
            };
            const updated = [...blocks];
            updated.splice(idx + 1, 0, newBlock);
            isInternalUpdate.current = false;
            updateBlocks(updated);
          }
        };
        reader.readAsDataURL(file);
      }
    };
    input.click();
  };

  const startRecording = async (idx: number) => {
    if (readOnly || idx < 0 || idx >= blocks.length) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const reader = new FileReader();
        reader.onload = (readerEvent) => {
          const base64 = readerEvent.target?.result as string;
          if (base64) {
            const newId = generateUUID();
            const newBlock: NotebookBlock = {
              id: newId,
              type: 'audio',
              content: base64,
              indent: blocks[idx].indent || 0,
            };
            const updated = [...blocks];
            updated.splice(idx + 1, 0, newBlock);
            isInternalUpdate.current = false;
            updateBlocks(updated);
          }
        };
        reader.readAsDataURL(audioBlob);
        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (err) {
      console.error('Failed to start recording:', err);
      alert('Could not access microphone.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const handleAddReminder = (idx: number) => {
    if (readOnly || idx < 0 || idx >= blocks.length) return;
    const newId = generateUUID();
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(9, 0, 0, 0);
    const tomorrowStr = tomorrow.toISOString().slice(0, 16);

    const newBlock: NotebookBlock = {
      id: newId,
      type: 'reminder',
      content: tomorrowStr,
      indent: blocks[idx].indent || 0,
    };
    const updated = [...blocks];
    updated.splice(idx + 1, 0, newBlock);
    isInternalUpdate.current = false;
    updateBlocks(updated);
  };

  const handleCloseTab = (e: React.MouseEvent) => {
    e.preventDefault();
    if (isRecording) {
      stopRecording();
    }
    setActiveTab(null);
  };

  // Filter menu items for Slash commands
  const menuItems = [
    { type: 'text', label: 'Text', icon: IconTextSize, category: 'Basic' },
    { type: 'h1', label: 'Heading 1', icon: IconH1, category: 'Basic' },
    { type: 'h2', label: 'Heading 2', icon: IconH2, category: 'Basic' },
    { type: 'h3', label: 'Heading 3', icon: IconH3, category: 'Basic' },
    { type: 'todo', label: 'To-do List', icon: IconSquareCheck, category: 'Basic' },
    { type: 'bullet', label: 'Bullet List', icon: IconList, category: 'Basic' },
    { type: 'toc', label: 'Table of Contents', icon: IconListTree, category: 'Advanced' },
    {
      type: 'toggle-h1',
      label: 'Toggle Heading 1',
      icon: IconCaretRightFilled,
      category: 'Advanced',
      shortcut: '#>',
    },
    {
      type: 'toggle-h2',
      label: 'Toggle Heading 2',
      icon: IconCaretRightFilled,
      category: 'Advanced',
      shortcut: '##>',
    },
    {
      type: 'toggle-h3',
      label: 'Toggle Heading 3',
      icon: IconCaretRightFilled,
      category: 'Advanced',
      shortcut: '###>',
    },
  ];

  const getFilteredMenuItems = () => {
    if (!slashMenu.filter) return menuItems;
    return menuItems.filter(
      (item) =>
        item.label.toLowerCase().includes(slashMenu.filter.toLowerCase()) ||
        item.type.toLowerCase().includes(slashMenu.filter.toLowerCase())
    );
  };

  // Visibility logic for toggle folding
  const shouldRenderBlock = (index: number) => {
    for (let i = index - 1; i >= 0; i--) {
      const parentBlock = blocks[i];
      if (['toggle-h1', 'toggle-h2', 'toggle-h3'].includes(parentBlock.type)) {
        if (parentBlock.collapsed && blocks[index].indent > parentBlock.indent) {
          return false;
        }
      }
      if (blocks[index].indent <= parentBlock.indent) {
        if (blocks[index].indent === parentBlock.indent && !parentBlock.type.startsWith('toggle-')) {
          continue;
        }
      }
    }
    return true;
  };

  const filteredItems = getFilteredMenuItems();
  const activeBlockIdx = blocks.findIndex((b) => b.id === activeBlockId);
  const currentBlockIdx = activeBlockIdx !== -1 ? activeBlockIdx : blocks.length - 1;

  return (
    <div className="notebook-editor" style={{ position: 'relative', width: '100%' }}>
      {blocks.map((block, idx) => {
        if (!shouldRenderBlock(idx)) return null;

        const combinedStyle: React.CSSProperties = {
          paddingLeft: `${(block.indent || 0) * 24}px`,
        };

        return (
          <div
            key={block.id}
            className={`j-block group ${block.done ? 'done' : ''}`}
            data-type={block.type}
            style={combinedStyle}
          >
            {/* Todo checkbox — matches task section style */}
            {block.type === 'todo' && (
              <div
                className={`custom-task-checkbox notebook-todo-cb ${block.done ? 'done' : ''}`}
                onClick={() => toggleTodoDone(idx)}
              >
                {block.done ? (
                  <IconCheck size={15} strokeWidth={3} />
                ) : (
                  <div className="checkbox-inner" />
                )}
              </div>
            )}

            {block.type.startsWith('toggle-') && (
              <div
                className={`j-toggle-btn ${!block.collapsed ? 'open' : ''}`}
                onClick={() => handleToggleCollapse(idx)}
              >
                <IconCaretRightFilled size={10} />
              </div>
            )}

            {/* Structured/Media Block Renderers */}
            {block.type === 'image' && (
              <div className="j-image-block">
                <img src={block.content} alt="Attachment" className="j-image-preview" />
                {!readOnly && (
                  <button
                    type="button"
                    className="j-block-delete-btn"
                    onClick={() => deleteBlockAt(idx)}
                    title="Delete image"
                  >
                    <IconTrash size={16} />
                  </button>
                )}
              </div>
            )}

            {block.type === 'audio' && (
              <div className="j-audio-block">
                <audio src={block.content} controls className="j-audio-player" />
                {!readOnly && (
                  <button
                    type="button"
                    className="j-block-delete-btn"
                    onClick={() => deleteBlockAt(idx)}
                    title="Delete voice note"
                  >
                    <IconTrash size={16} />
                  </button>
                )}
              </div>
            )}

            {block.type === 'reminder' && (
              <div className="j-reminder-block">
                <div className="j-reminder-card">
                  <IconBell size={18} className="j-reminder-bell" />
                  <div className="j-reminder-info">
                    <div className="j-reminder-label">Reminder Set</div>
                    <div className="j-reminder-time">
                      {block.content ? new Date(block.content).toLocaleString() : 'No date set'}
                    </div>
                  </div>
                  {!readOnly && (
                    <div className="j-reminder-actions">
                      <input
                        type="datetime-local"
                        className="j-reminder-input"
                        value={block.content || ''}
                        onChange={(e) => {
                          const updated = [...blocks];
                          updated[idx].content = e.target.value;
                          updateBlocks(updated);
                        }}
                      />
                      <button
                        type="button"
                        className="j-block-delete-btn-static"
                        onClick={() => deleteBlockAt(idx)}
                        title="Delete reminder"
                      >
                        <IconTrash size={16} />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Standard text editable content area — uses innerHTML for rich formatting */}
            {!['toc', 'image', 'audio', 'reminder'].includes(block.type) && (
              <div
                ref={(el) => {
                  refs.current[block.id] = el;
                }}
                className={`j-content ${!readOnly ? 'focus:outline-none' : ''}`}
                contentEditable={!readOnly}
                suppressContentEditableWarning
                data-placeholder={!readOnly ? "Type '/' for commands" : ""}
                onFocus={() => {
                  if (!readOnly) {
                    setActiveBlockId(block.id);
                  }
                }}
                onKeyDown={(e) => handleKeyDown(e, idx)}
                onInput={(e) => handleContentChange(idx, e.currentTarget.innerHTML)}
                onBlur={() => !readOnly && updateBlocks([...blocks])}
              >
                {/* Content is managed via innerHTML in useEffect and handleContentChange */}
              </div>
            )}

            {/* Table of contents block — no nested j-block wrapper */}
            {block.type === 'toc' && (
              <div className="j-toc-wrapper">
                <div className="j-toc-title">Table of Contents</div>
                <div className="j-toc-inner">
                  {getHeadingBlocks().length > 0 ? (
                    getHeadingBlocks().map((h) => {
                      // Strip HTML tags from heading content for TOC display
                      const headingText = (h.content || 'Untitled Heading').replace(/<[^>]*>/g, '');
                      let headingCls = 'toc-h1';
                      if (h.type.endsWith('h2')) headingCls = 'toc-h2';
                      if (h.type.endsWith('h3')) headingCls = 'toc-h3';

                      return (
                        <a
                          key={h.id}
                          href={`#${h.id}`}
                          className={headingCls}
                          onClick={(e) => {
                            e.preventDefault();
                            refs.current[h.id]?.scrollIntoView({
                              behavior: 'smooth',
                              block: 'center',
                            });
                            refs.current[h.id]?.focus();
                          }}
                        >
                          {headingText}
                        </a>
                      );
                    })
                  ) : (
                    <span style={{ color: 'var(--text3)', fontSize: '12px' }}>
                      Add headings to see the table of contents.
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>
        );
      })}

      {/* Hovering Slash command menu */}
      {!readOnly && slashMenu.active && (
        <div
          className="slash-menu active"
          style={{
            left: `${Math.min(slashMenu.x, window.innerWidth - 240)}px`,
            top: `${slashMenu.y}px`,
          }}
        >
          {filteredItems.length > 0 ? (
            <div>
              <div className="slash-cat">Commands</div>
              {filteredItems.map((item, idx) => {
                const Icon = item.icon;
                const isSelected = idx === slashSelectedIdx;
                return (
                  <div
                    key={item.type}
                    className={`slash-item ${isSelected ? 'selected' : ''}`}
                    onClick={() => executeCommand(item.type)}
                  >
                    <Icon size={14} />
                    <span>{item.label}</span>
                    {item.shortcut && <span className="slash-shortcut">{item.shortcut}</span>}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="empty !p-3">No matching commands</div>
          )}
        </div>
      )}

      {/* Docked Fluid Expanding Bottom Bar */}
      {!readOnly && (
        <div className="notebook-editor-bottom-bar" ref={bottomBarRef}>
          <div className={`notebook-editor-bottom-bar-inner tab-${activeTab || 'none'}`}>
            
            {/* Unexpanded main buttons */}
            {!activeTab && (
              <div className="main-nav-buttons">
                <button
                  type="button"
                  className="notebook-bottom-btn"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setActiveTab('text');
                  }}
                  title="Text Formatting"
                >
                  <IconTextSize size={18} />
                </button>
                <button
                  type="button"
                  className="notebook-bottom-btn"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setActiveTab('block');
                  }}
                  title="Block Types"
                >
                  <IconGridDots size={18} />
                </button>
                <button
                  type="button"
                  className="notebook-bottom-btn"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setActiveTab('attachment');
                  }}
                  title="Attachments & Reminders"
                >
                  <IconPaperclip size={18} />
                </button>
                <button
                  type="button"
                  className="notebook-bottom-btn"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    addNewBlockAt(currentBlockIdx);
                  }}
                  title="New Block"
                >
                  <IconPlus size={18} />
                </button>
              </div>
            )}

            {/* Text Tab Expanded */}
            {activeTab === 'text' && (
              <div className="expanded-tab-content">
                <button
                  type="button"
                  className="notebook-tab-option-btn"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    changeBlockType(currentBlockIdx, 'h1');
                  }}
                  title="Heading 1"
                >
                  H1
                </button>
                <button
                  type="button"
                  className="notebook-tab-option-btn"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    changeBlockType(currentBlockIdx, 'h2');
                  }}
                  title="Heading 2"
                >
                  H2
                </button>
                <button
                  type="button"
                  className="notebook-tab-option-btn"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    changeBlockType(currentBlockIdx, 'h3');
                  }}
                  title="Heading 3"
                >
                  H3
                </button>
                <button
                  type="button"
                  className="notebook-tab-option-btn"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    changeBlockType(currentBlockIdx, 'text');
                  }}
                  title="Normal Text"
                >
                  <span className="aa-label">Aa</span>
                </button>

                <div className="bar-divider" />

                <button
                  type="button"
                  className={`notebook-bottom-btn format-btn-b ${isBold ? 'active' : ''}`}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    document.execCommand('bold');
                  }}
                  title="Bold"
                >
                  B
                </button>
                <button
                  type="button"
                  className={`notebook-bottom-btn format-btn-i ${isItalic ? 'active' : ''}`}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    document.execCommand('italic');
                  }}
                  title="Italic"
                >
                  I
                </button>
                <button
                  type="button"
                  className={`notebook-bottom-btn format-btn-u ${isUnderline ? 'active' : ''}`}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    document.execCommand('underline');
                  }}
                  title="Underline"
                >
                  U
                </button>

                <button
                  type="button"
                  className="notebook-bottom-close-btn"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    handleCloseTab(e);
                  }}
                  title="Close"
                >
                  <IconX size={16} />
                </button>
              </div>
            )}


            {/* Block Tab Expanded */}
            {activeTab === 'block' && (
              <div className="expanded-tab-content">
                <button
                  type="button"
                  className="notebook-tab-option-btn"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    changeBlockType(currentBlockIdx, 'todo');
                  }}
                  title="To-do List"
                >
                  <IconSquareCheck size={18} />
                </button>
                <button
                  type="button"
                  className="notebook-tab-option-btn"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    changeBlockType(currentBlockIdx, 'bullet');
                  }}
                  title="Bullet Points"
                >
                  <IconList size={18} />
                </button>
                <button
                  type="button"
                  className="notebook-tab-option-btn"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    changeBlockType(currentBlockIdx, 'toc');
                  }}
                  title="Table of Contents"
                >
                  <IconListTree size={18} />
                </button>

                <div className="bar-divider" />

                <button
                  type="button"
                  className="notebook-tab-option-btn"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    changeBlockType(currentBlockIdx, 'toggle-h1');
                  }}
                  title="Toggle Heading 1"
                >
                  T1
                </button>
                <button
                  type="button"
                  className="notebook-tab-option-btn"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    changeBlockType(currentBlockIdx, 'toggle-h2');
                  }}
                  title="Toggle Heading 2"
                >
                  T2
                </button>
                <button
                  type="button"
                  className="notebook-tab-option-btn"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    changeBlockType(currentBlockIdx, 'toggle-h3');
                  }}
                  title="Toggle Heading 3"
                >
                  T3
                </button>

                <button
                  type="button"
                  className="notebook-bottom-close-btn"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    handleCloseTab(e);
                  }}
                  title="Close"
                >
                  <IconX size={16} />
                </button>
              </div>
            )}

            {/* Attachments Tab Expanded */}
            {activeTab === 'attachment' && (
              <div className="expanded-tab-content">
                {isRecording ? (
                  <div className="recording-status-container">
                    <span className="recording-indicator animate-pulse" />
                    <span className="recording-text">Recording...</span>
                    <button
                      type="button"
                      className="recording-stop-btn"
                      onMouseDown={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        stopRecording();
                      }}
                    >
                      Stop
                    </button>
                  </div>
                ) : (
                  <>
                    <button
                      type="button"
                      className="notebook-tab-option-btn"
                      onMouseDown={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        handleAddImage(currentBlockIdx);
                      }}
                      title="Add Image"
                    >
                      <IconPhoto size={18} />
                    </button>
                    <button
                      type="button"
                      className="notebook-tab-option-btn"
                      onMouseDown={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        startRecording(currentBlockIdx);
                      }}
                      title="Add Voice Recording"
                    >
                      <IconMicrophone size={18} />
                    </button>
                    <button
                      type="button"
                      className="notebook-tab-option-btn"
                      onMouseDown={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        handleAddReminder(currentBlockIdx);
                      }}
                      title="Add Reminder"
                    >
                      <IconBell size={18} />
                    </button>
                  </>
                )}

                <button
                  type="button"
                  className="notebook-bottom-close-btn"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    handleCloseTab(e);
                  }}
                  title="Close"
                >
                  <IconX size={16} />
                </button>
              </div>
            )}


          </div>
        </div>
      )}
    </div>
  );
}
