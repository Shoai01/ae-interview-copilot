import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Box, Paper, TextField, Typography } from '@mui/material';
import toast from 'react-hot-toast';

const handlePaste = (e) => {
  e.preventDefault();
  toast.error("Pasting is not allowed during the exam.");
};

const handleCopy = (e) => e.preventDefault();
const handleCut = (e) => e.preventDefault();

const handleDrop = (e) => {
  e.preventDefault();
  toast.error("Drag and drop is not allowed.");
};

// Deepgram delivers text in phrase-sized bursts. Showing each burst instantly
// looks jumpy, so the box reveals it progressively instead. Display-only: the
// real transcript state (and what gets submitted) is untouched.
//   - Growth ("hello" -> "hello world") is typed in; the step scales with the
//     backlog so a big burst catches up quickly instead of lagging behind.
//   - A revision ("hello wor" -> "Hello world.") rewinds to the last unchanged
//     word and re-types from there, so only the changed tail animates.
//   - Anything that isn't live speech (Enhance result, draft restore, question
//     reset, user typing) snaps immediately.
const CATCH_UP_RATIO = 0.12;
const prefersReducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

function commonPrefixLength(a, b) {
  const max = Math.min(a.length, b.length);
  let i = 0;
  while (i < max && a[i] === b[i]) i += 1;
  return i;
}

function useSmoothText(target, animate) {
  const [shown, setShown] = useState(target);
  const shownRef = useRef(target);
  const autoScrollRef = useRef(false);

  const snapTo = useCallback((text) => {
    shownRef.current = text;
    autoScrollRef.current = false;
    setShown(text);
  }, []);

  useEffect(() => {
    let current = shownRef.current;
    if (current === target) return undefined;

    if (!target.startsWith(current)) {
      if (!animate || prefersReducedMotion()) {
        snapTo(target);
        return undefined;
      }
      let keep = commonPrefixLength(current, target);
      if (keep > 0 && keep < target.length && target[keep - 1] !== ' ') {
        keep = target.lastIndexOf(' ', keep - 1) + 1;
      }
      current = target.slice(0, keep);
      shownRef.current = current;
      setShown(current);
    } else if (prefersReducedMotion()) {
      snapTo(target);
      return undefined;
    }

    let frame = requestAnimationFrame(function step() {
      const backlog = target.length - shownRef.current.length;
      if (backlog <= 0) return;
      const next = target.slice(0, shownRef.current.length + Math.max(1, Math.ceil(backlog * CATCH_UP_RATIO)));
      shownRef.current = next;
      autoScrollRef.current = true;
      setShown(next);
      if (next.length < target.length) frame = requestAnimationFrame(step);
    });
    return () => cancelAnimationFrame(frame);
  }, [target, animate, snapTo]);

  return { shown, snapTo, autoScrollRef };
}

// Isolated so Deepgram's interim transcript updates only re-render this
// subtree, not the whole exam page (timer, video PiP, soundwave, etc.).
const TranscriptPanel = React.memo(function TranscriptPanel({ value, isRecording, hasLiveText, onChange }) {
  const { shown, snapTo, autoScrollRef } = useSmoothText(value, isRecording);
  const inputRef = useRef(null);

  // Keep the newest words in view while text is being revealed.
  useEffect(() => {
    const el = inputRef.current;
    if (autoScrollRef.current && el) el.scrollTop = el.scrollHeight;
  }, [shown, autoScrollRef]);

  // User edits apply immediately — animating them would fight the caret.
  const handleChange = (e) => {
    snapTo(e.target.value);
    onChange(e);
  };

  return (
    <Paper
      elevation={0}
      sx={{
        width: '100%',
        p: 2,
        borderRadius: 2.5,
        border: isRecording ? '1.5px solid #F26522' : '1px solid #E2E8F0',
        bgcolor: '#FFFFFF',
        boxShadow: isRecording ? '0 0 16px rgba(242, 101, 34, 0.12)' : '0 1px 3px rgba(0, 0, 0, 0.04)',
        position: 'relative',
        transition: 'border-color 0.25s ease, box-shadow 0.25s ease',
      }}
    >
      <TextField
        id="transcript-field"
        fullWidth
        multiline
        minRows={5}
        maxRows={5}
        variant="outlined"
        placeholder="Your spoken answer will appear here in real time..."
        value={shown}
        inputRef={inputRef}
        onChange={handleChange}
        onPaste={handlePaste}
        onCopy={handleCopy}
        onCut={handleCut}
        onDrop={handleDrop}
        sx={{
          '& .MuiOutlinedInput-root': {
            fontSize: '0.975rem',
            color: '#0F172A',
            lineHeight: 1.7,
            '& fieldset': { border: 'none' },
            p: 0.5,
          },
        }}
      />
      {isRecording && hasLiveText && (
        <Box
          sx={{
            position: 'absolute',
            bottom: 10,
            right: 14,
            display: 'flex',
            alignItems: 'center',
            gap: 0.75,
            bgcolor: 'rgba(239, 68, 68, 0.08)',
            px: 1,
            py: 0.25,
            borderRadius: 1,
          }}
        >
          <Box
            sx={{
              width: 5,
              height: 5,
              borderRadius: '50%',
              bgcolor: '#EF4444',
              animation: 'pulse 1.5s infinite',
            }}
          />
          <Typography variant="caption" sx={{ color: '#EF4444', fontSize: '0.72rem', fontWeight: 600}}>
            listening...
          </Typography>
        </Box>
      )}
    </Paper>
  );
});

export default TranscriptPanel;
