import { useEffect, useRef } from 'react';
import { vivaService } from '@/services/api';
import { showFlagToast } from '@/utils/flagToast';

const DEFAULT_POLL_MS = 5000;

/**
 * Asks the server how many integrity points this session has and reacts:
 * a one-time "final warning" toast near the limit, and `onTerminate()` once the
 * limit is reached. The server owns the scoring (see integrity_service), so a
 * refresh can't reset it; the poll interval comes from its config.
 *
 * A failed poll is ignored — the next one retries, and it never disturbs the exam.
 */
export function useIntegrityGuard(sessionId, isEndingRef, onTerminate) {
  const onTerminateRef = useRef(onTerminate);
  useEffect(() => { onTerminateRef.current = onTerminate; }, [onTerminate]);

  useEffect(() => {
    if (!sessionId) return undefined;
    let stopped = false;
    let timer = null;
    let warned = false;
    let delay = DEFAULT_POLL_MS;

    const poll = async () => {
      if (stopped || isEndingRef?.current) return;
      try {
        const status = await vivaService.getIntegrityStatus(sessionId);
        if (stopped) return;
        if (!status.enabled) return; // feature off: stop polling
        if (status.poll_seconds) delay = status.poll_seconds * 1000;
        if (status.terminate) {
          stopped = true;
          onTerminateRef.current?.(status);
          return;
        }
        if (status.final_warning && !warned) {
          warned = true;
          showFlagToast(
            'integrity-final-warning',
            '🚨 Final warning: further violations will end your exam automatically.',
            10000
          );
        }
      } catch {
        // Retry on the next tick.
      }
      if (!stopped) timer = setTimeout(poll, delay);
    };

    timer = setTimeout(poll, delay);
    return () => {
      stopped = true;
      clearTimeout(timer);
    };
  }, [sessionId, isEndingRef]);
}
