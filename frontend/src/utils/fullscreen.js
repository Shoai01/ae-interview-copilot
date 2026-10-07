import toast from 'react-hot-toast';

/**
 * Leave fullscreen if the page is in it.
 *
 * Works for fullscreen entered through the Fullscreen API (what the exam start
 * uses). Browser "kiosk" fullscreen (F11) can't be left from script, so in that
 * case the user is told to press F11 instead of being left stuck without a hint.
 */
export function exitFullscreen() {
  try {
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => {});
      return;
    }
    if (document.webkitFullscreenElement && document.webkitExitFullscreen) {
      document.webkitExitFullscreen();
      return;
    }
  } catch {
    // fall through to the F11 hint
  }
  if (window.matchMedia && window.matchMedia('(display-mode: fullscreen)').matches) {
    toast('Press F11 to exit full screen.', { icon: 'ℹ️', id: 'exit-fullscreen-hint' });
  }
}
