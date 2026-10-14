import { useEffect, useState } from 'react';
import { vivaService } from '@/services/api';
import { captureFrameBlob, mapToCoverBox } from '@/utils/faceCapture';

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const FAILURES_BEFORE_GIVING_UP = 3;

/**
 * Live feedback for the identity-photo step. While `active`, sends a small
 * camera frame to the server about 3-4 times a second and exposes what it says:
 *
 *   live        last server verdict ({ ok, face_found, checks, message, ... }) or null
 *   eyes        the two eye positions as 0-1 fractions of the preview box (already
 *               mirrored/cropped to match what is on screen), or null
 *   passStreak  consecutive frames that passed, so one lucky frame can't enable capture
 *   available   false once the service keeps failing; the caller then stops gating on it
 *
 * The server uses the same rules as the final capture check, so a green guide
 * can't be followed by a rejected photo for a reason the guide didn't show.
 */
export function useLiveFaceCheck(videoRef, frameRef, active, intervalMs = 250) {
  const [state, setState] = useState({ live: null, eyes: null, passStreak: 0, available: true });

  useEffect(() => {
    if (!active) return undefined;
    let stopped = false;
    let failures = 0;
    let streak = 0;

    (async () => {
      while (!stopped) {
        if (document.hidden) {
          await sleep(500);
          continue;
        }
        try {
          const video = videoRef.current;
          const blob = await captureFrameBlob(video, 640, 0.7);
          if (blob && !stopped) {
            const result = await vivaService.liveCheckFace(blob);
            if (stopped) return;
            failures = 0;
            streak = result.ok ? streak + 1 : 0;

            let eyes = null;
            const box = frameRef.current;
            if (result.eyes && box && video.videoWidth) {
              eyes = result.eyes.map((p) => mapToCoverBox(p, video.videoWidth, video.videoHeight, box.clientWidth, box.clientHeight));
            }
            setState({ live: result, eyes, passStreak: streak, available: true });
          }
        } catch {
          failures += 1;
          streak = 0;
          if (failures >= FAILURES_BEFORE_GIVING_UP && !stopped) {
            setState({ live: null, eyes: null, passStreak: 0, available: false });
          }
        }
        await sleep(failures >= FAILURES_BEFORE_GIVING_UP ? 3000 : intervalMs);
      }
    })();

    return () => { stopped = true; };
  }, [active, videoRef, frameRef, intervalMs]);

  return state;
}
