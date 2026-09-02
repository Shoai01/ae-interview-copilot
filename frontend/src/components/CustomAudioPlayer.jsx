import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Box,
  Typography,
  IconButton,
  Slider,
  Tooltip,
  Button,
  Stack,
  Menu,
  MenuItem
} from '@mui/material';
import PlayArrowRoundedIcon from '@mui/icons-material/PlayArrowRounded';
import PauseRoundedIcon from '@mui/icons-material/PauseRounded';
import Replay5RoundedIcon from '@mui/icons-material/Replay5Rounded';
import Forward5RoundedIcon from '@mui/icons-material/Forward5Rounded';
import VolumeUpRoundedIcon from '@mui/icons-material/VolumeUpRounded';
import VolumeOffRoundedIcon from '@mui/icons-material/VolumeOffRounded';
import DownloadRoundedIcon from '@mui/icons-material/DownloadRounded';
import SpeedRoundedIcon from '@mui/icons-material/SpeedRounded';

const PLAYBACK_RATES = [1.0, 1.25, 1.5, 1.75, 2.0];

export default function CustomAudioPlayer({ src, title = "Candidate Spoken Answer" }) {
  const audioRef = useRef(null);
  
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1.0);
  const [isSeeking, setIsSeeking] = useState(false);
  const [seekValue, setSeekValue] = useState(0);
  const [speedAnchorEl, setSpeedAnchorEl] = useState(null);

  // Exact audio duration calculation via Web Audio API (decodes actual audio frames)
  useEffect(() => {
    if (!src) return;
    let isCancelled = false;

    fetch(src)
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.arrayBuffer();
      })
      .then((arrayBuffer) => {
        const AudioCtxClass = window.AudioContext || window.webkitAudioContext;
        if (!AudioCtxClass) return;
        const ctx = new AudioCtxClass();
        return ctx.decodeAudioData(
          arrayBuffer,
          (decodedBuffer) => {
            if (!isCancelled && decodedBuffer) {
              const exactDuration = decodedBuffer.duration;
              if (isFinite(exactDuration) && exactDuration > 0) {
                setDuration(exactDuration);
              }
            }
            ctx.close().catch(() => {});
          },
          () => {
            ctx.close().catch(() => {});
          }
        );
      })
      .catch(() => {
        // Fallback handled by HTML5 audio metadata events
      });

    return () => {
      isCancelled = true;
    };
  }, [src]);

  // Sync duration on metadata load
  const handleLoadedMetadata = () => {
    if (!audioRef.current) return;
    const d = audioRef.current.duration;
    if (isFinite(d) && !isNaN(d) && d > 0) {
      setDuration(d);
    }
  };

  const handleDurationChange = () => {
    if (audioRef.current) {
      const d = audioRef.current.duration;
      if (isFinite(d) && !isNaN(d) && d > 0) {
        setDuration(d);
      }
    }
  };

  const handleTimeUpdate = () => {
    if (!audioRef.current || isSeeking) return;
    const cur = audioRef.current.currentTime || 0;
    setCurrentTime(cur);
    
    // Auto-expand duration if current playhead exceeds initial duration
    if ((!isFinite(duration) || duration === 0 || duration < cur) && isFinite(cur) && cur > 0) {
      if (audioRef.current.duration && isFinite(audioRef.current.duration)) {
        setDuration(audioRef.current.duration);
      } else {
        setDuration(cur);
      }
    }
  };

  const handleEnded = () => {
    setIsPlaying(false);
    setCurrentTime(0);
  };

  const togglePlayPause = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      const playPromise = audioRef.current.play();
      if (playPromise !== undefined) {
        playPromise
          .then(() => {
            setIsPlaying(true);
          })
          .catch((err) => {
            console.error("Audio playback error:", err);
            setIsPlaying(false);
          });
      }
    }
  };

  const handleSeekChange = (_, value) => {
    setIsSeeking(true);
    setSeekValue(Number(value));
  };

  const handleSeekCommitted = (_, value) => {
    const target = Number(value);
    if (audioRef.current && isFinite(target)) {
      audioRef.current.currentTime = target;
      setCurrentTime(target);
    }
    setIsSeeking(false);
  };

  const handleSkip = (seconds) => {
    if (audioRef.current) {
      const cur = audioRef.current.currentTime || 0;
      const maxTime = (isFinite(duration) && duration > 0) ? duration : 60;
      const nextTime = Math.min(Math.max(0, cur + seconds), maxTime);
      audioRef.current.currentTime = nextTime;
      setCurrentTime(nextTime);
    }
  };

  const toggleMute = () => {
    if (audioRef.current) {
      audioRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };

  const handleSpeedSelect = (rate) => {
    setPlaybackRate(rate);
    if (audioRef.current) {
      audioRef.current.playbackRate = rate;
    }
    setSpeedAnchorEl(null);
  };

  const formatTime = (secs) => {
    if (!isFinite(secs) || isNaN(secs) || secs < 0) return '0:00';
    const totalSecs = Math.floor(secs);
    const mins = Math.floor(totalSecs / 60);
    const remainingSecs = totalSecs % 60;
    return `${mins}:${remainingSecs < 10 ? '0' : ''}${remainingSecs}`;
  };

  // Ensure only one audio plays at a time across the screen
  useEffect(() => {
    const handleGlobalPlay = (e) => {
      if (audioRef.current && e.target !== audioRef.current && !audioRef.current.paused) {
        audioRef.current.pause();
        setIsPlaying(false);
      }
    };

    document.addEventListener('play', handleGlobalPlay, true);
    return () => {
      document.removeEventListener('play', handleGlobalPlay, true);
      if (audioRef.current && !audioRef.current.paused) {
        audioRef.current.pause();
      }
    };
  }, []);

  // Keep playbackRate synced if src changes
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.playbackRate = playbackRate;
      audioRef.current.muted = isMuted;
    }
    setIsPlaying(false);
    setCurrentTime(0);
  }, [src, playbackRate, isMuted]);

  return (
    <Box
      sx={{
        bgcolor: '#FFFFFF',
        border: '1px solid #E2E8F0',
        borderRadius: 2.5,
        p: { xs: 1.5, sm: 2 },
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.03)',
        transition: 'all 0.2s ease',
        '&:hover': {
          borderColor: '#CBD5E1',
          boxShadow: '0 4px 14px rgba(0, 0, 0, 0.05)',
        }
      }}
    >
      <audio
        ref={audioRef}
        src={src}
        preload="metadata"
        crossOrigin="anonymous"
        onLoadedMetadata={handleLoadedMetadata}
        onDurationChange={handleDurationChange}
        onTimeUpdate={handleTimeUpdate}
        onEnded={handleEnded}
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
      />

      {/* Top Meta Bar */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
        <Stack direction="row" spacing={1.2} alignItems="center">
          {/* Animated Mini Waveform Bars */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: '3px', height: 16 }}>
            {[0.1, 0.3, 0.2, 0.4, 0.15, 0.35, 0.25].map((delay, idx) => (
              <Box
                key={idx}
                sx={{
                  width: 3,
                  height: isPlaying ? '14px' : '4px',
                  borderRadius: 1,
                  bgcolor: isPlaying ? 'primary.main' : '#CBD5E1',
                  animation: isPlaying ? 'audio-wave 1s infinite ease-in-out alternate' : 'none',
                  animationDelay: `${delay}s`,
                  transition: 'height 0.2s ease, background-color 0.2s ease',
                  '@keyframes audio-wave': {
                    '0%': { height: '4px' },
                    '100%': { height: '16px' }
                  }
                }}
              />
            ))}
          </Box>
          <Typography variant="caption" sx={{ color: '#0F172A', fontWeight: 700, fontFamily: 'DM Sans, sans-serif', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            {title}
          </Typography>
        </Stack>

        <Stack direction="row" spacing={0.5} alignItems="center">
          {/* Speed Selector Pill */}
          <Button
            size="small"
            variant="outlined"
            onClick={(e) => setSpeedAnchorEl(e.currentTarget)}
            startIcon={<SpeedRoundedIcon sx={{ fontSize: 14 }} />}
            sx={{
              height: 26,
              fontSize: '0.75rem',
              fontWeight: 700,
              fontFamily: 'DM Sans, sans-serif',
              textTransform: 'none',
              px: 1,
              py: 0,
              borderRadius: 1.5,
              borderColor: '#E2E8F0',
              color: playbackRate !== 1.0 ? 'primary.main' : '#64748B',
              bgcolor: playbackRate !== 1.0 ? 'rgba(242, 101, 34, 0.08)' : '#F8FAFC',
              '&:hover': {
                borderColor: 'primary.main',
                bgcolor: 'rgba(242, 101, 34, 0.04)',
              }
            }}
          >
            {playbackRate}x
          </Button>
          <Menu
            anchorEl={speedAnchorEl}
            open={Boolean(speedAnchorEl)}
            onClose={() => setSpeedAnchorEl(null)}
            slotProps={{
              paper: {
                sx: {
                  minWidth: 100,
                  borderRadius: 2,
                  boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
                  border: '1px solid #E2E8F0'
                }
              }
            }}
          >
            {PLAYBACK_RATES.map((rate) => (
              <MenuItem
                key={rate}
                selected={playbackRate === rate}
                onClick={() => handleSpeedSelect(rate)}
                sx={{
                  fontFamily: 'DM Sans, sans-serif',
                  fontSize: '0.8rem',
                  fontWeight: playbackRate === rate ? 700 : 500,
                  color: playbackRate === rate ? 'primary.main' : '#0F172A',
                  py: 0.5
                }}
              >
                {rate}x {rate === 1.0 && '(Normal)'}
              </MenuItem>
            ))}
          </Menu>

          {/* Mute Toggle */}
          <Tooltip title={isMuted ? "Unmute" : "Mute"} arrow>
            <IconButton
              size="small"
              onClick={toggleMute}
              sx={{
                width: 28,
                height: 28,
                color: isMuted ? '#EF4444' : '#64748B',
                '&:hover': { color: 'primary.main', bgcolor: 'rgba(242, 101, 34, 0.06)' }
              }}
            >
              {isMuted ? <VolumeOffRoundedIcon sx={{ fontSize: 16 }} /> : <VolumeUpRoundedIcon sx={{ fontSize: 16 }} />}
            </IconButton>
          </Tooltip>

          {/* Direct Download Button */}
          <Tooltip title="Download recording (.webm/.wav)" arrow>
            <IconButton
              size="small"
              component="a"
              href={src}
              download="candidate_answer"
              target="_blank"
              rel="noopener noreferrer"
              sx={{
                width: 28,
                height: 28,
                color: '#64748B',
                '&:hover': { color: 'primary.main', bgcolor: 'rgba(242, 101, 34, 0.06)' }
              }}
            >
              <DownloadRoundedIcon sx={{ fontSize: 16 }} />
            </IconButton>
          </Tooltip>
        </Stack>
      </Box>

      {/* Main Controls Row */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: { xs: 1.5, sm: 2 } }}>
        {/* Play/Pause Button */}
        <IconButton
          onClick={togglePlayPause}
          aria-label={isPlaying ? "Pause" : "Play"}
          sx={{
            width: 44,
            height: 44,
            flexShrink: 0,
            background: 'linear-gradient(90deg, #e8581a 0%, #F26522 50%, #ff8c42 100%)',
            color: '#FFFFFF',
            boxShadow: '0 4px 12px rgba(242, 101, 34, 0.3)',
            transition: 'all 0.15s ease',
            '&:hover': {
              transform: 'scale(1.05)',
              boxShadow: '0 6px 16px rgba(242, 101, 34, 0.4)',
            }
          }}
        >
          {isPlaying ? (
            <PauseRoundedIcon sx={{ fontSize: 24 }} />
          ) : (
            <PlayArrowRoundedIcon sx={{ fontSize: 26, ml: '2px' }} />
          )}
        </IconButton>

        {/* Skip Buttons */}
        <Stack direction="row" spacing={0.25} sx={{ display: { xs: 'none', sm: 'flex' } }}>
          <Tooltip title="Rewind 5s" arrow>
            <IconButton
              size="small"
              onClick={() => handleSkip(-5)}
              sx={{ color: '#64748B', '&:hover': { color: '#0F172A', bgcolor: 'rgba(0,0,0,0.04)' } }}
            >
              <Replay5RoundedIcon sx={{ fontSize: 20 }} />
            </IconButton>
          </Tooltip>
          <Tooltip title="Skip 5s" arrow>
            <IconButton
              size="small"
              onClick={() => handleSkip(5)}
              sx={{ color: '#64748B', '&:hover': { color: '#0F172A', bgcolor: 'rgba(0,0,0,0.04)' } }}
            >
              <Forward5RoundedIcon sx={{ fontSize: 20 }} />
            </IconButton>
          </Tooltip>
        </Stack>

        {/* Timeline Slider & Time Label */}
        <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, px: 0.5 }}>
          <Slider
            size="small"
            value={isSeeking ? seekValue : currentTime}
            min={0}
            max={(isFinite(duration) && duration > 0) ? duration : 100}
            onChange={handleSeekChange}
            onChangeCommitted={handleSeekCommitted}
            aria-label="Audio Timeline"
            sx={{
              color: 'primary.main',
              height: 5,
              padding: '10px 0',
              '& .MuiSlider-thumb': {
                width: 13,
                height: 13,
                transition: '0.2s cubic-bezier(.47,1.64,.41,.8)',
                '&:before': {
                  boxShadow: '0 2px 6px rgba(0,0,0,0.2)',
                },
                '&:hover, &.Mui-focusVisible': {
                  boxShadow: '0px 0px 0px 6px rgba(242, 101, 34, 0.16)',
                },
                '&.Mui-active': {
                  width: 15,
                  height: 15,
                },
              },
              '& .MuiSlider-rail': {
                bgcolor: '#E2E8F0',
                opacity: 1,
              },
              '& .MuiSlider-track': {
                border: 'none',
                bgcolor: 'primary.main',
              }
            }}
          />

          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: -0.5 }}>
            <Typography variant="caption" sx={{ color: '#64748B', fontFamily: 'DM Sans, monospace', fontSize: '0.75rem', fontWeight: 600 }}>
              {formatTime(isSeeking ? seekValue : currentTime)}
            </Typography>
            <Typography variant="caption" sx={{ color: '#94A3B8', fontFamily: 'DM Sans, monospace', fontSize: '0.75rem', fontWeight: 500 }}>
              {formatTime(duration)}
            </Typography>
          </Box>
        </Box>
      </Box>
    </Box>
  );
}
