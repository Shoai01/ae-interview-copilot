import React from 'react';
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

// Isolated so Deepgram's interim transcript updates only re-render this
// subtree, not the whole exam page (timer, video PiP, soundwave, etc.).
const TranscriptPanel = React.memo(function TranscriptPanel({ value, isRecording, hasLiveText, onChange }) {
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
        minRows={3}
        maxRows={7}
        variant="outlined"
        placeholder="Your spoken answer will appear here in real time..."
        value={value}
        onChange={onChange}
        onPaste={handlePaste}
        onCopy={handleCopy}
        onCut={handleCut}
        onDrop={handleDrop}
        sx={{
          '& .MuiOutlinedInput-root': {
            fontSize: '0.975rem',
            fontFamily: 'DM Sans, sans-serif',
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
          <Typography variant="caption" sx={{ color: '#EF4444', fontSize: '0.72rem', fontWeight: 600, fontFamily: 'DM Sans, sans-serif' }}>
            listening...
          </Typography>
        </Box>
      )}
    </Paper>
  );
});

export default TranscriptPanel;
