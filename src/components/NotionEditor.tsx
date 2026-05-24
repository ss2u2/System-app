import React, { useState, useEffect, useRef } from 'react';
import {
  IconPlus,
  IconGripVertical,
  IconCaretRightFilled,
  IconTextSize,
  IconH1,
  IconH2,
  IconH3,
  IconSquareCheck,
  IconList,
  IconListTree,
  IconCheck,
} from '@tabler/icons-react';
import type { JournalBlock } from '../types';
import { generateUUID } from '../utils/taskHelper';
import { usePointerDragReorder } from '../hooks/usePointerDragReorder';

interface NotionEditorProps {
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

export default function NotionEditor({ initialContent, onChange, readOnly }: NotionEditorProps) {
  const [blocks, setBlocks] = useState<JournalBlock[]>([]);
  const [slashMenu, setSlashMenu] = useState<SlashMenuState>({
    active: false,
    x: 0,
    y: 0,
    blockIndex: null,
    filter: '',
  });
  const [slashSelectedIdx, setSlashSelectedIdx] = useState(0);
  const refs = useRef<Record<string, HTMLDivElement | null>>({});
  
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

  // Sync blocks contents directly into DOM element innerText after render
  useEffect(() => {
    blocks.forEach((block) => {
      const el = refs.current[block.id];
      if (el && el.innerText !== block.content) {
        el.innerText = block.content;
      }
    });
  }, [blocks]);

  // Sync back to parent
  const updateBlocks = (newBlocks: JournalBlock[]) => {
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

  const handleContentChange = (index: number, text: string) => {
    if (readOnly) return;
    const updated = [...blocks];
    updated[index].content = text;
    updateBlocks(updated);

    // Handle slash menu activation
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

    // Remove '/'
    let text = updated[idx].content;
    const slashIdx = text.lastIndexOf('/');
    if (slashIdx !== -1) {
      text = text.substring(0, slashIdx);
    }
    updated[idx].content = text;
    updated[idx].type = type;

    // Additional configuration for toggle
    if (type.startsWith('toggle-')) {
      updated[idx].collapsed = false;
    }

    setSlashMenu({ active: false, x: 0, y: 0, blockIndex: null, filter: '' });
    
    // For command execution, we want the DOM to update since we changed type
    isInternalUpdate.current = false; 
    updateBlocks(updated);

    // Re-focus the editor node
    setTimeout(() => {
      const el = refs.current[updated[idx].id];
      if (el) {
        el.innerText = text; // Ensure text is correct in DOM
        el.focus();
        // Move caret to end
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

      // Inherit properties
      let newType = 'text';
      let newIndent = block.indent || 0;

      if (['todo', 'bullet'].includes(block.type)) {
        newType = block.type;
      } else if (['toggle-h1', 'toggle-h2', 'toggle-h3'].includes(block.type)) {
        newIndent = (block.indent || 0) + 1;
      }

      const newBlock: JournalBlock = {
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

  const addNewBlockFloat = (index: number) => {
    if (readOnly) return;
    const newId = generateUUID();
    const newBlock: JournalBlock = {
      id: newId,
      type: 'text',
      content: '',
      indent: blocks[index].indent || 0,
    };
    const updated = [...blocks];
    updated.splice(index + 1, 0, newBlock);
    isInternalUpdate.current = false;
    updateBlocks(updated);
    setTimeout(() => refs.current[newId]?.focus(), 50);
  };

  // Swap block indices and update state
  const handleReorder = (dragId: string | number, targetId: string | number) => {
    const dragIdx = blocks.findIndex((b) => String(b.id) === String(dragId));
    const targetIdx = blocks.findIndex((b) => String(b.id) === String(targetId));
    if (dragIdx !== -1 && targetIdx !== -1) {
      const updated = [...blocks];
      const [dragged] = updated.splice(dragIdx, 1);
      updated.splice(targetIdx, 0, dragged);
      isInternalUpdate.current = false; // We want DOM to sync because block index orders swapped
      updateBlocks(updated);
    }
  };

  const {
    draggedId,
    getItemStyle,
    getItemProps,
  } = usePointerDragReorder({
    items: blocks,
    onReorder: handleReorder,
    enabled: !readOnly,
  });

  // Filter menu items
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

  return (
    <div className="journal-editor" style={{ position: 'relative', width: '100%' }}>
      {blocks.map((block, idx) => {
        if (!shouldRenderBlock(idx)) return null;

        const isCurrentDrag = block.id === draggedId;
        const dragStyle = getItemStyle(block.id, idx);
        
        // Remove the default grab cursor from the block wrapper to keep text cursor editability
        if (dragStyle.cursor === 'grab') {
          delete dragStyle.cursor;
        }

        const combinedStyle: React.CSSProperties = {
          ...dragStyle,
          paddingLeft: `${(block.indent || 0) * 24}px`,
        };

        return (
          <div
            key={block.id}
            className={`j-block group ${isCurrentDrag ? 'dragging-active' : ''} ${
              block.done ? 'done' : ''
            }`}
            data-type={block.type}
            style={combinedStyle}
            {...getItemProps(block.id, idx)}
          >
            {/* Drag Handle & Hover Plus controls */}
            {!readOnly && (
              <div className="j-floating-controls">
                <div className="j-ctrl-btn cursor-pointer" data-nodrag onClick={() => addNewBlockFloat(idx)}>
                  <IconPlus size={14} />
                </div>
                <div
                  className="j-ctrl-btn j-drag-handle cursor-grab"
                >
                  <IconGripVertical size={14} />
                </div>
              </div>
            )}

            {/* Block Type Custom Decorators */}
            {block.type === 'todo' && (
              <div className="j-todo-cb" data-nodrag onClick={() => toggleTodoDone(idx)}>
                {block.done && (
                  <IconCheck
                    size={10}
                    className="text-white"
                    style={{ display: 'block' }}
                  />
                )}
              </div>
            )}

            {block.type.startsWith('toggle-') && (
              <div
                className={`j-toggle-btn ${!block.collapsed ? 'open' : ''}`}
                data-nodrag
                onClick={() => handleToggleCollapse(idx)}
              >
                <IconCaretRightFilled size={10} />
              </div>
            )}

            {block.type === 'bullet' && (
              <div className="mr-2 text-[var(--text3)] text-lg leading-tight select-none" data-nodrag>•</div>
            )}

            {/* Content Editable Area */}
            {block.type !== 'toc' ? (
              <div
                ref={(el) => {
                  refs.current[block.id] = el;
                }}
                className={`j-content ${!readOnly ? 'focus:outline-none' : ''}`}
                contentEditable={!readOnly}
                suppressContentEditableWarning
                data-placeholder={!readOnly ? "Type '/' for commands" : ""}
                data-nodrag
                onKeyDown={(e) => handleKeyDown(e, idx)}
                onInput={(e) => handleContentChange(idx, e.currentTarget.innerText)}
                onBlur={() => !readOnly && updateBlocks([...blocks])}
              >
                {/* Content is managed via innerText in useEffect and handleContentChange */}
              </div>
            ) : (
              <div className="j-block" data-type="toc" data-nodrag style={{ width: '100%' }}>
                <div className="j-toc-title">Table of Contents</div>
                <div className="j-toc-inner">
                  {getHeadingBlocks().length > 0 ? (
                    getHeadingBlocks().map((h) => {
                      const headingText = h.content || 'Untitled Heading';
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
    </div>
  );
}
