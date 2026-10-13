import { useEffect } from 'react';
import toast from 'react-hot-toast';

const TOAST_ID = 'exam-lockdown';
const MESSAGE = 'Copying, pasting and saving are not allowed during the exam.';

// The transcript box is the only place the candidate may place a caret, select
// and type. Everything else on the page (question text, sidebar, ...) is inert.
const isEditable = (target) =>
  target instanceof Element && !!target.closest('textarea, input, [contenteditable="true"]');

// selectstart's target can be a text node, which has no closest().
const elementOf = (target) => (target instanceof Element ? target : target?.parentElement);

const PASTE_INPUT_TYPES = new Set([
  'insertFromPaste',
  'insertFromPasteAsQuotation',
  'insertFromDrop',
  'insertFromYank',
]);

// Ctrl/Cmd + key combos that copy, paste, save, print or view source.
const BLOCKED_CTRL_KEYS = new Set(['c', 'x', 'v', 'p', 's', 'u']);
// Ctrl+Shift+ I / J / C / V: devtools panels and paste-as-plain-text.
const BLOCKED_CTRL_SHIFT_KEYS = new Set(['i', 'j', 'c', 'v']);

const LOCKDOWN_CSS = `
  body { -webkit-user-select: none; user-select: none; -webkit-touch-callout: none; }
  textarea, input, [contenteditable="true"] { -webkit-user-select: text; user-select: text; }
  @media print { body * { visibility: hidden !important; } }
`;

/**
 * Best-effort copy/paste lockdown for the exam page, active while mounted:
 *   - copy / cut / paste / drag-and-drop are cancelled everywhere (including
 *     inside the transcript box, so the answer can't be pasted in or copied out)
 *   - question text can't be selected, right-clicked or dragged
 *   - keyboard routes are blocked: Ctrl+C/X/V/P/S/U/A (A allowed inside the
 *     transcript box), Ctrl+Insert, Shift+Insert, F12, Ctrl+Shift+I/J/C/V
 *   - PrintScreen wipes the clipboard; printing renders a blank page
 *
 * A browser can't be fully locked down from a web page (screenshot tools,
 * browser menus, other devices), so this raises the effort, it isn't a seal.
 */
export function useExamLockdown() {
  useEffect(() => {
    const warn = () => toast.error(MESSAGE, { id: TOAST_ID });
    const block = (e, { notify = true } = {}) => {
      e.preventDefault();
      if (notify) warn();
    };

    const onCopyOrCut = (e) => {
      // Overwrite what the browser would put on the clipboard, in case a
      // later handler un-cancels the event.
      e.clipboardData?.setData('text/plain', '');
      block(e);
    };
    const onPaste = (e) => block(e);
    const onContextMenu = (e) => block(e, { notify: false });
    const onDragStart = (e) => block(e, { notify: false });
    const onDrop = (e) => block(e);
    const onSelectStart = (e) => {
      if (!isEditable(elementOf(e.target))) e.preventDefault();
    };
    const onBeforeInput = (e) => {
      if (PASTE_INPUT_TYPES.has(e.inputType)) block(e);
    };

    const onKeyDown = (e) => {
      const key = e.key.toLowerCase();
      const mod = e.ctrlKey || e.metaKey;

      const blocked =
        e.key === 'F12' ||
        (mod && e.shiftKey && BLOCKED_CTRL_SHIFT_KEYS.has(key)) ||
        (mod && !e.shiftKey && BLOCKED_CTRL_KEYS.has(key)) ||
        (mod && key === 'a' && !isEditable(e.target)) ||
        (mod && key === 'insert') ||
        (e.shiftKey && key === 'insert');
      if (blocked) block(e);
    };

    const onKeyUp = (e) => {
      // PrintScreen can't be cancelled, but the screenshot it puts on the
      // clipboard can be overwritten straight away (needs a focused page).
      if (e.key === 'PrintScreen') {
        navigator.clipboard?.writeText('').catch(() => {});
        warn();
      }
    };

    const style = document.createElement('style');
    style.id = '__exam_lockdown_style';
    style.textContent = LOCKDOWN_CSS;
    document.head.appendChild(style);

    // Capture phase, so this runs before any component-level handler.
    const listeners = [
      ['copy', onCopyOrCut],
      ['cut', onCopyOrCut],
      ['paste', onPaste],
      ['contextmenu', onContextMenu],
      ['dragstart', onDragStart],
      ['drop', onDrop],
      ['selectstart', onSelectStart],
      ['beforeinput', onBeforeInput],
      ['keydown', onKeyDown],
      ['keyup', onKeyUp],
    ];
    listeners.forEach(([type, fn]) => document.addEventListener(type, fn, true));

    return () => {
      listeners.forEach(([type, fn]) => document.removeEventListener(type, fn, true));
      style.remove();
      toast.dismiss(TOAST_ID);
    };
  }, []);
}
