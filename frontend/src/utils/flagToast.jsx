import toast from 'react-hot-toast';

const DEFAULT_DURATION_MS = 6000;

// id -> pending hard-dismiss timer
const dismissTimers = new Map();

/**
 * Warning toast for a proctoring flag: has a close (×) button and is always
 * dismissed after `duration`, even if the library's own timer is paused or
 * lost (e.g. the toast is re-shown under the same id by a repeat reminder).
 * Using a fixed `id` makes a repeat reminder replace the previous toast
 * instead of stacking.
 */
export function showFlagToast(id, message, duration = DEFAULT_DURATION_MS) {
  clearTimeout(dismissTimers.get(id));

  toast.error(
    (t) => (
      <span style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <span style={{ flex: 1 }}>{message}</span>
        <button
          type="button"
          onClick={() => toast.dismiss(t.id)}
          aria-label="Close notification"
          style={{
            background: 'transparent', border: 'none', cursor: 'pointer',
            fontSize: 20, lineHeight: 1, padding: '0 4px', color: '#64748B',
          }}
        >
          ×
        </button>
      </span>
    ),
    { id, duration }
  );

  dismissTimers.set(
    id,
    setTimeout(() => {
      toast.dismiss(id);
      dismissTimers.delete(id);
    }, duration + 500)
  );
}
