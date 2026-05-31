import React, { useState, useEffect, useRef } from 'react';
import {
  IconTextSize,
  IconSquareCheck,
  IconList,
  IconListNumbers,
  IconPaperclip,
  IconAlignLeft,
  IconAlignCenter,
  IconAlignRight,
  IconPhoto,
  IconMicrophone,
  IconBell,
  IconX,
} from '@tabler/icons-react';

interface NotebookEditorProps {
  title: string;
  onTitleChange?: (title: string) => void;
  initialContent: string;
  onChange?: (content: string) => void;
  readOnly?: boolean;
}

export default function NotebookEditor({
  title,
  onTitleChange,
  initialContent,
  onChange,
  readOnly,
}: NotebookEditorProps) {
  const editorRef = useRef<HTMLDivElement | null>(null);
  const titleRef = useRef<HTMLTextAreaElement | null>(null);
  const isInternalUpdate = useRef(false);
  const bottomBarRef = useRef<HTMLDivElement | null>(null);

  // Toolbar category state
  const [activeTab, setActiveTab] = useState<'text' | 'list' | 'attachment' | null>(null);

  // Format states
  const [isBold, setIsBold] = useState(false);
  const [isItalic, setIsItalic] = useState(false);
  const [isUnderline, setIsUnderline] = useState(false);
  const [activeFormat, setActiveFormat] = useState<string>('text');
  const [activeAlign, setActiveAlign] = useState<string>('left');

  // Audio recording states
  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  /* ─── Sync initialContent into the editor ─── */
  useEffect(() => {
    if (isInternalUpdate.current) {
      isInternalUpdate.current = false;
      return;
    }
    if (editorRef.current) {
      let html = initialContent || '';
      if (!html || html.trim() === '' || html === '[]') {
        html = '<div><br></div>';
      }
      editorRef.current.innerHTML = html;
      updateEmptyState(editorRef.current);
    }
  }, [initialContent]);

  /* ─── Auto-resize title textarea ─── */
  useEffect(() => {
    if (titleRef.current) {
      titleRef.current.style.height = 'auto';
      titleRef.current.style.height = titleRef.current.scrollHeight + 'px';
    }
  }, [title]);

  /* ─── Auto-focus title for new notes ─── */
  useEffect(() => {
    if (!readOnly && titleRef.current && title === '') {
      setTimeout(() => titleRef.current?.focus(), 80);
    }
  }, [readOnly]);

  /* ─── Detect active block format at caret ─── */
  const getActiveFormatAtCaret = (): string => {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0 || !editorRef.current) return 'text';
    let node = selection.anchorNode;
    while (node && node !== editorRef.current) {
      if (node.nodeType === Node.ELEMENT_NODE) {
        const tag = (node as HTMLElement).tagName.toUpperCase();
        if (tag === 'H1') return 'h1';
        if (tag === 'H2') return 'h2';
        if (tag === 'H3') return 'h3';
        if (tag === 'LI') {
          const parentTag = (node as HTMLElement).parentElement?.tagName.toUpperCase();
          if (parentTag === 'OL') return 'number';
          if (parentTag === 'UL') {
            if (
              (node as HTMLElement).querySelector('.notebook-todo-cb') ||
              (node as HTMLElement).classList.contains('todo-item-line')
            )
              return 'todo';
            return 'bullet';
          }
        }
        if (tag === 'UL') {
          if ((node as HTMLElement).classList.contains('todo-list')) return 'todo';
          return 'bullet';
        }
        if (tag === 'OL') return 'number';
      }
      node = node.parentNode;
    }
    return 'text';
  };

  const getActiveAlignment = (): string => {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0 || !editorRef.current) return 'left';
    let node = selection.anchorNode;
    while (node && node !== editorRef.current) {
      if (node.nodeType === Node.ELEMENT_NODE) {
        const ta = (node as HTMLElement).style.textAlign;
        if (ta === 'center') return 'center';
        if (ta === 'right') return 'right';
        if (ta === 'left') return 'left';
      }
      node = node.parentNode;
    }
    return 'left';
  };

  /* ─── Selection-change listener ─── */
  useEffect(() => {
    if (readOnly) return;
    const handle = () => {
      setIsBold(document.queryCommandState('bold'));
      setIsItalic(document.queryCommandState('italic'));
      setIsUnderline(document.queryCommandState('underline'));
      setActiveFormat(getActiveFormatAtCaret());
      setActiveAlign(getActiveAlignment());
    };
    document.addEventListener('selectionchange', handle);
    return () => {
      document.removeEventListener('selectionchange', handle);
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop();
      }
    };
  }, [readOnly, isRecording]);

  /* ─── Keyboard-aware bottom bar positioning ─── */
  useEffect(() => {
    if (readOnly) return;
    const handleViewport = () => {
      const vv = (window as any).visualViewport;
      if (vv && bottomBarRef.current) {
        const obscured = window.innerHeight - (vv.offsetTop + vv.height);
        bottomBarRef.current.style.bottom = obscured > 20 ? `${obscured + 16}px` : '';
      }
    };
    const vv = (window as any).visualViewport;
    if (vv) {
      vv.addEventListener('resize', handleViewport);
      vv.addEventListener('scroll', handleViewport);
      handleViewport();
    }
    return () => {
      if (vv) {
        vv.removeEventListener('resize', handleViewport);
        vv.removeEventListener('scroll', handleViewport);
      }
    };
  }, [readOnly]);

  /* ─── Helpers ─── */
  const updateEmptyState = (el: HTMLElement) => {
    const text = el.textContent?.trim() || '';
    const hasMedia = el.querySelector('.j-image-block, .j-audio-block, .j-reminder-block') !== null;
    el.classList.toggle('is-empty', text === '' && !hasMedia);
  };

  const ensureTodoListIntegrity = (el: HTMLElement) => {
    const todoLis = el.querySelectorAll('li.todo-item-line');
    const selection = window.getSelection();
    todoLis.forEach((li) => {
      if (!li.querySelector('.notebook-todo-cb')) {
        const isDone = li.classList.contains('done');
        const span = document.createElement('span');
        span.className = `custom-task-checkbox notebook-todo-cb ${isDone ? 'done' : ''}`;
        span.setAttribute('contenteditable', 'false');
        span.innerHTML = isDone
          ? '<svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" class="tabler-icon tabler-icon-check"><path d="M5 12l5 5l10 -10"></path></svg>'
          : '<div class="checkbox-inner"></div>';
        li.insertBefore(span, li.firstChild);

        if (selection && selection.rangeCount > 0) {
          const range = selection.getRangeAt(0);
          if (li.contains(range.startContainer)) {
            const nr = document.createRange();
            if (span.nextSibling) nr.setStart(span.nextSibling, 0);
            else { nr.selectNodeContents(li); nr.collapse(false); }
            selection.removeAllRanges();
            selection.addRange(nr);
          }
        }
      }
    });
  };

  const handleInput = () => {
    if (!editorRef.current || readOnly) return;
    ensureTodoListIntegrity(editorRef.current);
    updateEmptyState(editorRef.current);
    const html = editorRef.current.innerHTML;
    if (onChange) {
      isInternalUpdate.current = true;
      onChange(html);
    }
  };

  const insertHtmlAtCaret = (html: string) => {
    const sel = window.getSelection();
    if (sel && sel.rangeCount > 0) {
      const range = sel.getRangeAt(0);
      range.deleteContents();
      const tmp = document.createElement('div');
      tmp.innerHTML = html;
      const frag = document.createDocumentFragment();
      let node: Node | null;
      let last: Node | null = null;
      while ((node = tmp.firstChild)) last = frag.appendChild(node);
      range.insertNode(frag);
      if (last) {
        const nr = document.createRange();
        nr.setStartAfter(last);
        nr.collapse(true);
        sel.removeAllRanges();
        sel.addRange(nr);
      }
    }
  };

  /* ─── List formatting ─── */
  const makeCurrentLineTodo = () => {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0 || !editorRef.current) return;
    let node = selection.anchorNode;
    let li: HTMLLIElement | null = null;
    while (node && node !== editorRef.current) {
      if (node.nodeName === 'LI') { li = node as HTMLLIElement; break; }
      node = node.parentNode;
    }
    if (!li) {
      document.execCommand('insertUnorderedList');
      let n = window.getSelection()?.anchorNode;
      while (n && n !== editorRef.current) {
        if (n.nodeName === 'LI') { li = n as HTMLLIElement; break; }
        n = n.parentNode;
      }
    } else {
      const parent = li.parentElement;
      if (parent && parent.nodeName === 'OL') {
        document.execCommand('insertUnorderedList');
        let n = window.getSelection()?.anchorNode;
        while (n && n !== editorRef.current) {
          if (n.nodeName === 'LI') { li = n as HTMLLIElement; break; }
          n = n.parentNode;
        }
      }
    }
    if (li) {
      li.classList.add('todo-item-line');
      ensureTodoListIntegrity(editorRef.current);
      handleInput();
    }
  };

  /* ─── Find the LI ancestor of the current selection ─── */
  const findCaretLi = (): HTMLLIElement | null => {
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0 || !editorRef.current) return null;
    let node = sel.anchorNode;
    while (node && node !== editorRef.current) {
      if (node.nodeName === 'LI') return node as HTMLLIElement;
      node = node.parentNode;
    }
    return null;
  };

  /* ─── Strip checkbox from an LI (if present) ─── */
  const stripCheckbox = (li: HTMLLIElement) => {
    const cb = li.querySelector('.notebook-todo-cb');
    if (cb) cb.remove();
    li.classList.remove('todo-item-line');
  };

  /* ─── Block type conversions ─── */
  const changeBlockType = (type: string) => {
    if (readOnly || !editorRef.current) return;

    const fmt = getActiveFormatAtCaret();
    const isCaretList = ['todo', 'bullet', 'number'].includes(fmt);
    const isCaretHeading = ['h1', 'h2', 'h3'].includes(fmt);

    editorRef.current.focus();

    // ── HEADING targets ──
    if (['h1', 'h2', 'h3'].includes(type)) {
      // Toggle off: same heading → plain div
      if (fmt === type) {
        document.execCommand('formatBlock', false, 'div');
        handleInput();
        return;
      }

      // List → Heading: extract text from LI, create heading in-place
      if (isCaretList) {
        const selection = window.getSelection();
        if (!selection || selection.rangeCount === 0) return;
        const li = findCaretLi();
        let extractedHtml = '';
        if (li) {
          const clone = li.cloneNode(true) as HTMLElement;
          const cb = clone.querySelector('.notebook-todo-cb');
          if (cb) cb.remove();
          extractedHtml = clone.innerHTML.trim();
          if (!extractedHtml || extractedHtml === '&nbsp;') extractedHtml = '<br>';
        }

        const headingEl = document.createElement(type);
        headingEl.innerHTML = extractedHtml;

        if (li) {
          const ul = li.closest('ul, ol');
          if (ul) {
            const parent = ul.parentElement;
            if (parent) {
              const prevUl = document.createElement(ul.tagName);
              prevUl.className = ul.className;
              const nextUl = document.createElement(ul.tagName);
              nextUl.className = ul.className;
              let isAfter = false;
              Array.from(ul.children).forEach((child) => {
                if (child === li) { isAfter = true; }
                else if (isAfter) { nextUl.appendChild(child.cloneNode(true)); }
                else { prevUl.appendChild(child.cloneNode(true)); }
              });
              if (prevUl.children.length > 0) parent.insertBefore(prevUl, ul);
              parent.insertBefore(headingEl, ul);
              if (nextUl.children.length > 0) parent.insertBefore(nextUl, ul);
              ul.remove();
            }
          } else {
            li.parentNode?.replaceChild(headingEl, li);
          }
        }

        const range = document.createRange();
        range.selectNodeContents(headingEl);
        range.collapse(false);
        selection.removeAllRanges();
        selection.addRange(range);
        handleInput();
        return;
      }

      // Default: heading or plain text → target heading
      document.execCommand('formatBlock', false, type.toUpperCase());
      handleInput();
      return;
    }

    // ── LIST targets ──
    if (['todo', 'bullet', 'number'].includes(type)) {
      // Heading → List: strip heading first, then apply list
      if (isCaretHeading) {
        document.execCommand('formatBlock', false, 'div');
        setTimeout(() => {
          if (type === 'todo') {
            makeCurrentLineTodo();
          } else if (type === 'bullet') {
            if (!document.queryCommandState('insertUnorderedList'))
              document.execCommand('insertUnorderedList');
          } else if (type === 'number') {
            if (!document.queryCommandState('insertOrderedList'))
              document.execCommand('insertOrderedList');
          }
          ensureTodoListIntegrity(editorRef.current!);
          handleInput();
        }, 0);
        return;
      }

      // Strip checkbox if switching between list types
      const li = findCaretLi();
      if (li) stripCheckbox(li);

      if (type === 'bullet') {
        if (!document.queryCommandState('insertUnorderedList'))
          document.execCommand('insertUnorderedList');
      } else if (type === 'number') {
        if (!document.queryCommandState('insertOrderedList'))
          document.execCommand('insertOrderedList');
      } else if (type === 'todo') {
        makeCurrentLineTodo();
        return; // makeCurrentLineTodo calls handleInput
      }

      ensureTodoListIntegrity(editorRef.current);
      handleInput();
      return;
    }

    // ── TEXT (normal) target ──
    if (type === 'text') {
      if (isCaretHeading) {
        document.execCommand('formatBlock', false, 'div');
      } else {
        const li = findCaretLi();
        if (li) stripCheckbox(li);
        document.execCommand('formatBlock', false, 'div');
        if (document.queryCommandState('insertUnorderedList'))
          document.execCommand('insertUnorderedList');
        if (document.queryCommandState('insertOrderedList'))
          document.execCommand('insertOrderedList');
      }
      handleInput();
    }
  };

  /* ─── Keyboard handling ─── */
  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (readOnly) return;

    if (e.key === 'Enter' && !e.shiftKey) {
      const selection = window.getSelection();
      if (selection && selection.rangeCount > 0) {
        const range = selection.getRangeAt(0);
        let node = selection.anchorNode;
        let lineEl: HTMLElement | null = null;
        while (node && node !== e.currentTarget) {
          if (node.nodeType === Node.ELEMENT_NODE) {
            const tag = (node as HTMLElement).tagName.toUpperCase();
            if (['LI', 'H1', 'H2', 'H3'].includes(tag)) {
              lineEl = node as HTMLElement;
              break;
            }
          }
          node = node.parentNode;
        }

        if (lineEl) {
          const tag = lineEl.tagName.toUpperCase();

          // Enter at end of heading → new plain div
          if (['H1', 'H2', 'H3'].includes(tag)) {
            const isAtEnd =
              range.endContainer === lineEl ||
              (range.endContainer.nodeType === Node.TEXT_NODE &&
                range.endOffset === range.endContainer.textContent?.length);
            if (isAtEnd) {
              e.preventDefault();
              const newDiv = document.createElement('div');
              newDiv.innerHTML = '<br>';
              if (lineEl.nextSibling) lineEl.parentNode?.insertBefore(newDiv, lineEl.nextSibling);
              else lineEl.parentNode?.appendChild(newDiv);
              const nr = document.createRange();
              nr.selectNodeContents(newDiv);
              nr.collapse(true);
              selection.removeAllRanges();
              selection.addRange(nr);
              handleInput();
              return;
            }
          }

          // LI handling
          if (tag === 'LI') {
            const textContent = lineEl.textContent?.trim() || '';
            const hasCheckbox = lineEl.querySelector('.notebook-todo-cb');

            // Exit list on empty enter
            if (textContent === '' && (hasCheckbox || !lineEl.textContent)) {
              e.preventDefault();
              const ul = lineEl.closest('ul, ol');
              const newDiv = document.createElement('div');
              newDiv.innerHTML = '<br>';
              if (ul) {
                if (lineEl.nextSibling) {
                  const newUl = document.createElement(ul.tagName);
                  newUl.className = ul.className;
                  while (lineEl.nextSibling) newUl.appendChild(lineEl.nextSibling);
                  ul.parentNode?.insertBefore(newDiv, ul.nextSibling);
                  ul.parentNode?.insertBefore(newUl, newDiv.nextSibling);
                } else {
                  ul.parentNode?.insertBefore(newDiv, ul.nextSibling);
                }
                lineEl.remove();
                if (ul.children.length === 0) ul.remove();
              } else {
                lineEl.parentNode?.replaceChild(newDiv, lineEl);
              }
              const nr = document.createRange();
              nr.selectNodeContents(newDiv);
              nr.collapse(true);
              selection.removeAllRanges();
              selection.addRange(nr);
              handleInput();
              return;
            } else if (lineEl.classList.contains('todo-item-line')) {
              const editor = e.currentTarget as HTMLDivElement;
              setTimeout(() => ensureTodoListIntegrity(editor), 10);
            }
          }
        }
      }
    }

    if (e.key === 'Backspace') {
      const selection = window.getSelection();
      if (selection && selection.rangeCount > 0) {
        const range = selection.getRangeAt(0);
        let node = selection.anchorNode;
        let lineEl: HTMLElement | null = null;
        while (node && node !== e.currentTarget) {
          if (node.nodeType === Node.ELEMENT_NODE) {
            const tag = (node as HTMLElement).tagName.toUpperCase();
            if (['LI', 'H1', 'H2', 'H3'].includes(tag)) {
              lineEl = node as HTMLElement;
              break;
            }
          }
          node = node.parentNode;
        }

        if (lineEl) {
          const tag = lineEl.tagName.toUpperCase();

          // Backspace at start of heading → convert to div
          if (['H1', 'H2', 'H3'].includes(tag)) {
            const preRange = range.cloneRange();
            preRange.selectNodeContents(lineEl);
            preRange.setEnd(range.startContainer, range.startOffset);
            if (preRange.toString().length === 0) {
              e.preventDefault();
              const newDiv = document.createElement('div');
              newDiv.innerHTML = lineEl.innerHTML || '<br>';
              lineEl.parentNode?.replaceChild(newDiv, lineEl);
              const nr = document.createRange();
              nr.selectNodeContents(newDiv);
              nr.collapse(true);
              selection.removeAllRanges();
              selection.addRange(nr);
              handleInput();
              return;
            }
          }

          // Backspace at start of LI → convert to div
          if (tag === 'LI') {
            const checkbox = lineEl.querySelector('.notebook-todo-cb');
            const preRange = range.cloneRange();
            if (checkbox) preRange.setStartBefore(checkbox.nextSibling || checkbox);
            else preRange.setStart(lineEl, 0);
            preRange.setEnd(range.startContainer, range.startOffset);
            const cbLen = checkbox ? checkbox.textContent?.length || 0 : 0;
            const before = preRange.toString();
            if (before.length <= cbLen && before.trim() === '') {
              e.preventDefault();
              const ul = lineEl.closest('ul, ol');
              const newDiv = document.createElement('div');
              newDiv.innerHTML = lineEl.innerHTML;
              const cbInNew = newDiv.querySelector('.notebook-todo-cb');
              if (cbInNew) cbInNew.remove();
              if (newDiv.innerHTML.trim() === '' || newDiv.innerHTML === '&nbsp;') newDiv.innerHTML = '<br>';

              if (ul) {
                if (lineEl.nextSibling) {
                  const newUl = document.createElement(ul.tagName);
                  newUl.className = ul.className;
                  while (lineEl.nextSibling) newUl.appendChild(lineEl.nextSibling);
                  ul.parentNode?.insertBefore(newDiv, ul.nextSibling);
                  ul.parentNode?.insertBefore(newUl, newDiv.nextSibling);
                } else {
                  ul.parentNode?.insertBefore(newDiv, ul.nextSibling);
                }
                lineEl.remove();
                if (ul.children.length === 0) ul.remove();
              } else {
                lineEl.parentNode?.replaceChild(newDiv, lineEl);
              }

              const nr = document.createRange();
              nr.selectNodeContents(newDiv);
              nr.collapse(true);
              selection.removeAllRanges();
              selection.addRange(nr);
              handleInput();
              return;
            }
          }
        }
      }
    }
  };

  /* ─── Click handling ─── */
  const handleEditorClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement;

    // Delete buttons for attachment blocks
    const deleteBtn = target.closest('.j-block-delete-btn, .j-block-delete-btn-static');
    if (deleteBtn) {
      e.preventDefault();
      e.stopPropagation();
      const blockEl = deleteBtn.closest('.j-image-block, .j-audio-block, .j-reminder-block');
      if (blockEl) { blockEl.remove(); handleInput(); }
      return;
    }

    // Checklist toggles
    const todoCb = target.closest('.notebook-todo-cb');
    if (todoCb) {
      e.preventDefault();
      e.stopPropagation();
      todoCb.classList.toggle('done');
      const isDone = todoCb.classList.contains('done');
      const parentLine = todoCb.closest('.todo-item-line');
      if (parentLine) parentLine.classList.toggle('done', isDone);
      todoCb.innerHTML = isDone
        ? '<svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" class="tabler-icon tabler-icon-check"><path d="M5 12l5 5l10 -10"></path></svg>'
        : '<div class="checkbox-inner"></div>';
      handleInput();
      return;
    }
  };

  const handleEditorChange = (e: React.FormEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement;
    if (target.classList.contains('j-reminder-input')) {
      const val = (target as HTMLInputElement).value;
      const block = target.closest('.j-reminder-block');
      if (block) {
        block.setAttribute('data-reminder', val);
        const timeEl = block.querySelector('.j-reminder-time');
        if (timeEl) timeEl.textContent = val ? new Date(val).toLocaleString() : 'No date set';
        handleInput();
      }
    }
  };

  /* ─── Alignment ─── */
  const applyAlignment = (align: 'left' | 'center' | 'right') => {
    if (readOnly || !editorRef.current) return;
    editorRef.current.focus();
    if (align === 'left') document.execCommand('justifyLeft');
    else if (align === 'center') document.execCommand('justifyCenter');
    else if (align === 'right') document.execCommand('justifyRight');
    setActiveAlign(align);
    handleInput();
  };

  /* ─── Image insertion ─── */
  const handleAddImage = () => {
    if (readOnly) return;
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (re) => {
          const base64 = re.target?.result as string;
          if (base64 && editorRef.current) {
            const imgHtml = `<div class="j-image-block" contenteditable="false"><img src="${base64}" alt="Attachment" class="j-image-preview" /><button type="button" class="j-block-delete-btn" title="Delete image"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 7l16 0" /><path d="M10 11l0 6" /><path d="M14 11l0 6" /><path d="M5 7l1 12a2 2 0 0 0 2 2h8a2 2 0 0 0 2 -2l1 -12" /><path d="M9 7v-3a1 1 0 0 1 1 -1h4a1 1 0 0 1 1 1v3" /></svg></button></div><div><br></div>`;
            editorRef.current.focus();
            insertHtmlAtCaret(imgHtml);
            handleInput();
          }
        };
        reader.readAsDataURL(file);
      }
    };
    input.click();
  };

  /* ─── Voice recording ─── */
  const startRecording = async () => {
    if (readOnly) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mr = new MediaRecorder(stream);
      mediaRecorderRef.current = mr;
      audioChunksRef.current = [];
      mr.ondataavailable = (ev) => { if (ev.data.size > 0) audioChunksRef.current.push(ev.data); };
      mr.onstop = () => {
        const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const reader = new FileReader();
        reader.onload = (re) => {
          const base64 = re.target?.result as string;
          if (base64 && editorRef.current) {
            const audioHtml = `<div class="j-audio-block" contenteditable="false"><audio src="${base64}" controls class="j-audio-player" /><button type="button" class="j-block-delete-btn" title="Delete voice note"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 7l16 0" /><path d="M10 11l0 6" /><path d="M14 11l0 6" /><path d="M5 7l1 12a2 2 0 0 0 2 2h8a2 2 0 0 0 2 -2l1 -12" /><path d="M9 7v-3a1 1 0 0 1 1 -1h4a1 1 0 0 1 1 1v3" /></svg></button></div><div><br></div>`;
            editorRef.current.focus();
            insertHtmlAtCaret(audioHtml);
            handleInput();
          }
        };
        reader.readAsDataURL(blob);
        stream.getTracks().forEach((t) => t.stop());
      };
      mr.start();
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

  /* ─── Reminder insertion ─── */
  const handleAddReminder = () => {
    if (readOnly) return;
    const tmr = new Date();
    tmr.setDate(tmr.getDate() + 1);
    tmr.setHours(9, 0, 0, 0);
    const tmrStr = tmr.toISOString().slice(0, 16);
    const fmtDate = tmr.toLocaleString();
    const reminderHtml = `<div class="j-reminder-block" contenteditable="false" data-reminder="${tmrStr}"><div class="j-reminder-card"><svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="j-reminder-bell"><path d="M10 5a2 2 0 1 1 4 0a7 7 0 0 1 4 6v3a4 4 0 0 0 2 3H4a4 4 0 0 0 2-3v-3a7 7 0 0 1 4-6" /><path d="M9 17a3 3 0 0 0 6 0" /></svg><div class="j-reminder-info"><div class="j-reminder-label">Reminder Set</div><div class="j-reminder-time">${fmtDate}</div></div><div class="j-reminder-actions"><input type="datetime-local" class="j-reminder-input" value="${tmrStr}" /><button type="button" class="j-block-delete-btn-static" title="Delete reminder"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 7l16 0" /><path d="M10 11l0 6" /><path d="M14 11l0 6" /><path d="M5 7l1 12a2 2 0 0 0 2 2h8a2 2 0 0 0 2 -2l1 -12" /><path d="M9 7v-3a1 1 0 0 1 1 -1h4a1 1 0 0 1 1 1v3" /></svg></button></div></div></div><div><br></div>`;
    if (editorRef.current) {
      editorRef.current.focus();
      insertHtmlAtCaret(reminderHtml);
      handleInput();
    }
  };

  /* ─── Title Enter → focus body ─── */
  const handleTitleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      editorRef.current?.focus();
    }
  };

  /* ─── Close expanded toolbar ─── */
  const handleCloseTab = (ev: React.MouseEvent) => {
    ev.preventDefault();
    if (isRecording) stopRecording();
    setActiveTab(null);
  };

  /* ─── Toolbar button helper ─── */
  const TB = ({
    active,
    onPress,
    title: t,
    className,
    children,
  }: {
    active?: boolean;
    onPress: () => void;
    title: string;
    className?: string;
    children: React.ReactNode;
  }) => (
    <button
      type="button"
      className={`keep-toolbar-btn ${className || ''} ${active ? 'active' : ''}`}
      onMouseDown={(ev) => { ev.preventDefault(); ev.stopPropagation(); onPress(); }}
      title={t}
    >
      {children}
    </button>
  );

  /* ─── Render ─── */
  return (
    <div className="keep-editor">
      {/* Title */}
      <textarea
        ref={titleRef}
        className="keep-editor-title"
        value={title}
        onChange={(e) => onTitleChange?.(e.target.value)}
        onKeyDown={handleTitleKeyDown}
        placeholder="Title"
        readOnly={readOnly}
        rows={1}
      />

      {/* Body */}
      <div
        ref={editorRef}
        className="keep-editor-body j-content"
        contentEditable={!readOnly}
        suppressContentEditableWarning
        data-placeholder={!readOnly ? 'Note' : ''}
        onClick={handleEditorClick}
        onKeyDown={handleKeyDown}
        onInput={handleInput}
        onBlur={handleInput}
        onChange={handleEditorChange}
      />

      {/* ─── Bottom Toolbar ─── */}
      {!readOnly && (
        <div className="keep-toolbar" ref={bottomBarRef}>
          <div className="keep-toolbar-inner">
            {isRecording ? (
              /* ── Recording state ── */
              <div className="keep-toolbar-expanded">
                <div className="keep-toolbar-scrollable">
                  <div className="recording-status-container">
                    <span className="recording-indicator animate-pulse" />
                    <span className="recording-text">Recording…</span>
                    <button
                      type="button"
                      className="recording-stop-btn"
                      onMouseDown={(ev) => { ev.preventDefault(); ev.stopPropagation(); stopRecording(); }}
                    >
                      Stop
                    </button>
                  </div>
                </div>
                <button type="button" className="keep-toolbar-close" onMouseDown={handleCloseTab} title="Close">
                  <IconX size={16} />
                </button>
              </div>
            ) : activeTab === null ? (
              /* ── Collapsed: 3 category buttons ── */
              <div className="keep-toolbar-categories">
                <button
                  type="button"
                  className="keep-toolbar-cat-btn"
                  onMouseDown={(ev) => { ev.preventDefault(); ev.stopPropagation(); setActiveTab('text'); }}
                  title="Text Formatting"
                >
                  <IconTextSize size={18} />
                </button>
                <button
                  type="button"
                  className="keep-toolbar-cat-btn"
                  onMouseDown={(ev) => { ev.preventDefault(); ev.stopPropagation(); setActiveTab('list'); }}
                  title="Lists"
                >
                  <IconList size={18} />
                </button>
                <button
                  type="button"
                  className="keep-toolbar-cat-btn"
                  onMouseDown={(ev) => { ev.preventDefault(); ev.stopPropagation(); setActiveTab('attachment'); }}
                  title="Attachments"
                >
                  <IconPaperclip size={18} />
                </button>
              </div>
            ) : activeTab === 'text' ? (
              /* ── Expanded: Text Formatting ── */
              <div className="keep-toolbar-expanded">
                <div className="keep-toolbar-scrollable">
                  <TB active={activeFormat === 'h1'} onPress={() => changeBlockType(activeFormat === 'h1' ? 'text' : 'h1')} title="Heading 1">
                    H1
                  </TB>
                  <TB active={activeFormat === 'h2'} onPress={() => changeBlockType(activeFormat === 'h2' ? 'text' : 'h2')} title="Heading 2">
                    H2
                  </TB>
                  <TB active={activeFormat === 'h3'} onPress={() => changeBlockType(activeFormat === 'h3' ? 'text' : 'h3')} title="Heading 3">
                    H3
                  </TB>
                  <TB active={activeFormat === 'text'} onPress={() => changeBlockType('text')} title="Normal Text">
                    <span className="aa-label">Aa</span>
                  </TB>

                  <div className="keep-toolbar-divider" />

                  <TB active={isBold} className="format-btn-b" onPress={() => { document.execCommand('bold'); setIsBold(document.queryCommandState('bold')); }} title="Bold">
                    B
                  </TB>
                  <TB active={isItalic} className="format-btn-i" onPress={() => { document.execCommand('italic'); setIsItalic(document.queryCommandState('italic')); }} title="Italic">
                    I
                  </TB>
                  <TB active={isUnderline} className="format-btn-u" onPress={() => { document.execCommand('underline'); setIsUnderline(document.queryCommandState('underline')); }} title="Underline">
                    U
                  </TB>

                  <div className="keep-toolbar-divider" />

                  <TB active={activeAlign === 'left'} onPress={() => applyAlignment('left')} title="Align Left">
                    <IconAlignLeft size={16} />
                  </TB>
                  <TB active={activeAlign === 'center'} onPress={() => applyAlignment('center')} title="Align Center">
                    <IconAlignCenter size={16} />
                  </TB>
                  <TB active={activeAlign === 'right'} onPress={() => applyAlignment('right')} title="Align Right">
                    <IconAlignRight size={16} />
                  </TB>
                </div>

                <button type="button" className="keep-toolbar-close" onMouseDown={handleCloseTab} title="Close">
                  <IconX size={16} />
                </button>
              </div>
            ) : activeTab === 'list' ? (
              /* ── Expanded: Lists ── */
              <div className="keep-toolbar-expanded">
                <div className="keep-toolbar-scrollable">
                  <TB active={activeFormat === 'todo'} onPress={() => changeBlockType(activeFormat === 'todo' ? 'text' : 'todo')} title="Checkbox">
                    <IconSquareCheck size={18} />
                  </TB>
                  <TB active={activeFormat === 'bullet'} onPress={() => changeBlockType(activeFormat === 'bullet' ? 'text' : 'bullet')} title="Bullet List">
                    <IconList size={18} />
                  </TB>
                  <TB active={activeFormat === 'number'} onPress={() => changeBlockType(activeFormat === 'number' ? 'text' : 'number')} title="Numbered List">
                    <IconListNumbers size={18} />
                  </TB>
                </div>

                <button type="button" className="keep-toolbar-close" onMouseDown={handleCloseTab} title="Close">
                  <IconX size={16} />
                </button>
              </div>
            ) : activeTab === 'attachment' ? (
              /* ── Expanded: Attachments ── */
              <div className="keep-toolbar-expanded">
                <div className="keep-toolbar-scrollable">
                  <TB onPress={handleAddImage} title="Add Image">
                    <IconPhoto size={18} />
                  </TB>
                  <TB onPress={startRecording} title="Voice Recording">
                    <IconMicrophone size={18} />
                  </TB>
                  <TB onPress={handleAddReminder} title="Add Reminder">
                    <IconBell size={18} />
                  </TB>
                </div>

                <button type="button" className="keep-toolbar-close" onMouseDown={handleCloseTab} title="Close">
                  <IconX size={16} />
                </button>
              </div>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
}
