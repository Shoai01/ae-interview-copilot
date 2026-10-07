import { useCallback, useEffect, useMemo, useRef } from 'react';
import { vivaService } from '@/services/api';

/**
 * Tracks integrity-flag *episodes* (a continuous window such as "face absent
 * from 10:00:05 to 10:00:19") instead of reporting one event per detection.
 *
 * Callers decide whether detection is still enabled (e.g. the session is
 * ending) before calling start().
 *
 * - start(type): opens an episode unless one of that type is already open
 *   (returns true only when newly opened, so callers toast/log once).
 * - end(type): closes it (returns true if one was open).
 *
 * An episode that begins before any question is active is held and reported
 * as soon as one becomes active. When the active question changes mid-episode,
 * the episode is closed on the old question and reopened on the new one, so
 * every question's flags carry their own start/end window. Anything still open
 * is closed on unmount (session over).
 */
export function useFlagEpisodes(sessionId, activeQuestionId) {
  const sessionIdRef = useRef(sessionId);
  const questionIdRef = useRef(activeQuestionId);
  // type -> question id the START was reported on (null = not reported yet)
  const openRef = useRef(new Map());

  const start = useCallback((type) => {
    if (openRef.current.has(type)) return false;
    const sId = sessionIdRef.current;
    const qId = questionIdRef.current;
    if (sId && qId) {
      openRef.current.set(type, qId);
      vivaService.reportFraudFlag(sId, qId, type, 'START');
    } else {
      openRef.current.set(type, null);
    }
    return true;
  }, []);

  const end = useCallback((type) => {
    if (!openRef.current.has(type)) return false;
    const qId = openRef.current.get(type);
    openRef.current.delete(type);
    if (qId && sessionIdRef.current) {
      vivaService.reportFraudFlag(sessionIdRef.current, qId, type, 'END');
    }
    return true;
  }, []);

  useEffect(() => {
    const sId = sessionId;
    sessionIdRef.current = sId;
    questionIdRef.current = activeQuestionId;
    if (!sId || !activeQuestionId) return;
    openRef.current.forEach((reportedOn, type) => {
      if (reportedOn === activeQuestionId) return;
      if (reportedOn) vivaService.reportFraudFlag(sId, reportedOn, type, 'END');
      vivaService.reportFraudFlag(sId, activeQuestionId, type, 'START');
      openRef.current.set(type, activeQuestionId);
    });
  }, [sessionId, activeQuestionId]);

  useEffect(() => {
    const open = openRef.current;
    return () => {
      open.forEach((reportedOn, type) => {
        if (reportedOn && sessionIdRef.current) {
          vivaService.reportFraudFlag(sessionIdRef.current, reportedOn, type, 'END');
        }
      });
      open.clear();
    };
  }, []);

  // Stable identity so consumers can list it in effect/callback deps.
  return useMemo(() => ({ start, end }), [start, end]);
}
