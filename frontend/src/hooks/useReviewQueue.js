import { useEffect, useMemo, useState } from 'react';
import { vivaService } from '@/services/api';

const PENDING_STATUS = 'Pending Review';

/**
 * The trainer's review queue: sessions that are finished but have no trainer decision yet,
 * oldest first (the sessions list comes newest-first), plus where `sessionId` sits in that line.
 *
 * `next` is the session after this one, or the first pending session when this one is not in the
 * queue (e.g. it was already reviewed). `prev` is the one before it. Both are null at the ends.
 */
export default function useReviewQueue(sessionId) {
  const [sessions, setSessions] = useState(null);

  useEffect(() => {
    let cancelled = false;
    vivaService
      .getAllSessions()
      .then((data) => {
        if (!cancelled) setSessions(data);
      })
      .catch(() => {
        // The queue is a convenience: without it the page just behaves as before.
        if (!cancelled) setSessions([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return useMemo(() => {
    const pending = (sessions || []).filter((s) => s.status === PENDING_STATUS).reverse();
    const id = Number(sessionId);
    const index = pending.findIndex((s) => s.id === id);
    return {
      ready: sessions !== null,
      total: pending.length,
      index,
      prev: index > 0 ? pending[index - 1] : null,
      next: index >= 0 ? pending[index + 1] ?? null : pending[0] ?? null,
    };
  }, [sessions, sessionId]);
}
