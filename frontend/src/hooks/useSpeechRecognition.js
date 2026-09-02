import { useState, useRef, useCallback, useEffect } from 'react';
import { globalState } from '@/store';
import { acquireAudioGraph, releaseAudioGraph, loadPcmWorkletModule } from '@/utils/audioGraph';
import toast from 'react-hot-toast';

const DEEPGRAM_SAMPLE_RATE = 16000;
const LIVE_TEXT_FRAME_MS = 28;
const LIVE_TEXT_CHARS_PER_FRAME = 8;
const MIN_FINAL_CONFIDENCE = 0.45;
const DEFAULT_DEEPGRAM_MODEL = 'nova-3';
const DEFAULT_DEEPGRAM_LANGUAGE = 'en-IN';
const DEFAULT_DEEPGRAM_KEYTERMS = [
  'RPA',
  'ITPA',
  'IT Process Automation',
  'Robotic Process Automation',
  'AutomationEdge',
  'process automation',
  'workflow automation',
  'IT operations',
  'service desk',
  'orchestration',
];

function uniqueTerms(terms) {
  const seen = new Set();
  return terms.filter((term) => {
    const normalized = term.trim();
    if (!normalized) return false;
    const key = normalized.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function getConfiguredKeyterms() {
  const raw = import.meta.env.VITE_DEEPGRAM_KEYTERMS || '';
  return raw.split(',').map((term) => term.trim()).filter(Boolean);
}

function buildDeepgramUrl() {
  const model = import.meta.env.VITE_DEEPGRAM_MODEL || DEFAULT_DEEPGRAM_MODEL;
  const language = import.meta.env.VITE_DEEPGRAM_LANGUAGE || DEFAULT_DEEPGRAM_LANGUAGE;
  const params = new URLSearchParams({
    model,
    language,
    smart_format: 'true',
    punctuate: 'true',
    interim_results: 'true',
    endpointing: '500',
    utterance_end_ms: '1200',
    encoding: 'linear16',
    sample_rate: String(DEEPGRAM_SAMPLE_RATE),
    channels: '1',
  });

  const keyterms = uniqueTerms([...DEFAULT_DEEPGRAM_KEYTERMS, ...getConfiguredKeyterms()]);
  if (model.startsWith('nova-3')) {
    keyterms.forEach((term) => params.append('keyterm', term));
  } else if (model.startsWith('nova-2')) {
    keyterms.forEach((term) => params.append('keywords', `${term}:2`));
  }

  return `wss://api.deepgram.com/v1/listen?${params.toString()}`;
}

function getTranscriptConfidence(alt) {
  if (typeof alt.confidence === 'number') return alt.confidence;
  const words = Array.isArray(alt.words) ? alt.words : [];
  const scoredWords = words.filter((word) => typeof word.confidence === 'number');
  if (scoredWords.length === 0) return null;
  return scoredWords.reduce((sum, word) => sum + word.confidence, 0) / scoredWords.length;
}

function shouldAcceptFinalTranscript(alt, transcript) {
  if (!transcript.trim()) return false;
  const confidence = getTranscriptConfidence(alt);
  return confidence === null || confidence >= MIN_FINAL_CONFIDENCE;
}

export function useSpeechRecognition() {
  const [liveText, setLiveTextState] = useState('');
  const [finalText, setFinalTextState] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [isConnectingState, setIsConnectingState] = useState(false);

  // ---- Archival recording (WebM/Opus) — independent of the Deepgram socket lifecycle ----
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const recordedBlobRef = useRef(null);
  const recorderStopResolveRef = useRef(null);
  const isCapturingRef = useRef(false);

  // ---- Live PCM tap (Web Audio / AudioWorklet) feeding Deepgram ----
  // Taps the shared audio graph (see utils/audioGraph.js) rather than owning
  // its own AudioContext — useNoiseDetection shares the same mic tap.
  const workletNodeRef = useRef(null);
  const setupTokenRef = useRef(0); // invalidates an in-flight setup if torn down mid-load
  const pcmWarnedRef = useRef(false); // avoid re-toasting the worklet-load failure on every resume

  // ---- Deepgram socket ----
  const socketRef = useRef(null);
  const isConnectingRef = useRef(false);
  const isSendingRef = useRef(false); // gate: forward/buffer PCM frames vs. drop them
  const pendingFramesRef = useRef([]); // frames captured while a (re)connect is in flight
  const stopResolveRef = useRef(null);

  // Refs mirror state to avoid stale closures in async/event-driven code paths
  const liveTextRef = useRef('');
  const renderedLiveTextRef = useRef('');
  const finalTextRef = useRef('');
  const liveAnimationTimerRef = useRef(null);

  useEffect(() => { renderedLiveTextRef.current = liveText; }, [liveText]);
  useEffect(() => { finalTextRef.current = finalText; }, [finalText]);

  const cancelLiveAnimation = useCallback(() => {
    if (liveAnimationTimerRef.current) {
      clearTimeout(liveAnimationTimerRef.current);
      liveAnimationTimerRef.current = null;
    }
  }, []);

  const setFinalText = useCallback((valueOrUpdater) => {
    setFinalTextState((prev) => {
      const next = typeof valueOrUpdater === 'function' ? valueOrUpdater(prev) : valueOrUpdater;
      finalTextRef.current = next;
      return next;
    });
  }, []);

  const setLiveText = useCallback((valueOrUpdater) => {
    cancelLiveAnimation();
    setLiveTextState((prev) => {
      const next = typeof valueOrUpdater === 'function' ? valueOrUpdater(prev) : valueOrUpdater;
      liveTextRef.current = next;
      renderedLiveTextRef.current = next;
      return next;
    });
  }, [cancelLiveAnimation]);

  const queueLiveText = useCallback((transcript) => {
    liveTextRef.current = transcript;

    if (!transcript) {
      setLiveText('');
      return;
    }

    const tick = () => {
      const target = liveTextRef.current;
      const current = renderedLiveTextRef.current;

      if (!target) {
        renderedLiveTextRef.current = '';
        setLiveTextState('');
        liveAnimationTimerRef.current = null;
        return;
      }

      const next = target.startsWith(current)
        ? current + target.slice(current.length, current.length + LIVE_TEXT_CHARS_PER_FRAME)
        : target;

      renderedLiveTextRef.current = next;
      setLiveTextState(next);

      if (next !== target) {
        liveAnimationTimerRef.current = setTimeout(tick, LIVE_TEXT_FRAME_MS);
      } else {
        liveAnimationTimerRef.current = null;
      }
    };

    if (!liveAnimationTimerRef.current) {
      liveAnimationTimerRef.current = setTimeout(tick, LIVE_TEXT_FRAME_MS);
    }
  }, [setLiveText]);

  const teardownAudioGraph = useCallback(() => {
    setupTokenRef.current += 1; // invalidate any in-flight setupAudioGraph() call
    if (workletNodeRef.current) {
      try {
        workletNodeRef.current.port.onmessage = null;
        workletNodeRef.current.disconnect();
      } catch { /* ignore */ }
      workletNodeRef.current = null;
      releaseAudioGraph();
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        try { mediaRecorderRef.current.stop(); } catch { /* ignore */ }
      }
      if (socketRef.current) {
        try { socketRef.current.close(); } catch { /* ignore */ }
      }
      teardownAudioGraph();
      cancelLiveAnimation();
    };
  }, [teardownAudioGraph, cancelLiveAnimation]);

  // ====================================
  // LIVE PCM TAP
  // Runs continuously for the whole question (independent of pause/resume
  // and of the Deepgram socket). Frames are only forwarded when isSendingRef
  // is true; otherwise they're dropped here so a paused question doesn't
  // leak audio or grow an unbounded buffer.
  // ====================================

  const handleWorkletFrame = useCallback((event) => {
    if (!isSendingRef.current) return;
    const frame = event.data; // ArrayBuffer of 16kHz mono Int16 PCM
    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      socketRef.current.send(frame);
    } else if (isConnectingRef.current) {
      pendingFramesRef.current.push(frame);
    }
  }, []);

  const setupAudioGraph = useCallback(async () => {
    if (workletNodeRef.current) return true; // already running for this question

    const graph = acquireAudioGraph();
    if (!graph) {
      console.error("[Audio] No mediaStream available in globalState");
      return false;
    }

    const myToken = ++setupTokenRef.current;

    try {
      await loadPcmWorkletModule();
    } catch (err) {
      console.error("[Audio] Failed to load PCM worklet:", err);
      releaseAudioGraph();
      if (!pcmWarnedRef.current) {
        pcmWarnedRef.current = true;
        toast.error("Live captions are unavailable right now — your answer is still being recorded, please type it manually.");
      }
      return false;
    }

    // Bail if torn down (question ended) while the module was loading
    if (setupTokenRef.current !== myToken) {
      releaseAudioGraph();
      return false;
    }

    const worklet = new AudioWorkletNode(graph.audioContext, 'pcm-processor');
    worklet.port.onmessage = handleWorkletFrame;
    graph.sourceNode.connect(worklet);
    // Deliberately not connected to ctx.destination — we only want the raw samples, not playback.

    workletNodeRef.current = worklet;
    return true;
  }, [handleWorkletFrame]);

  // ====================================
  // AUDIO CAPTURE (archival MediaRecorder)
  // Sets up both the archival recorder and the live PCM tap. Torn down only
  // at the end of a question via stopAudioCapture — pausing/resuming Deepgram
  // mid-question never touches this.
  // ====================================

  const startAudioCapture = useCallback(() => {
    if (!globalState.mediaStream) {
      console.error("[Audio] No mediaStream available in globalState");
      return;
    }

    setupAudioGraph();

    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'paused') {
      console.log("[Audio] Resuming audio capture");
      mediaRecorderRef.current.resume();
      isCapturingRef.current = true;
      return;
    }

    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      return; // Already recording
    }

    const audioTracks = globalState.mediaStream.getAudioTracks();
    if (audioTracks.length === 0) {
      console.error("[Audio] mediaStream has no audio tracks");
      return;
    }

    console.log("[Audio] Starting fresh audio capture");
    const audioOnlyStream = new MediaStream(audioTracks);

    audioChunksRef.current = [];
    recordedBlobRef.current = null;
    pcmWarnedRef.current = false;
    isCapturingRef.current = true;

    let mimeType = 'audio/webm;codecs=opus';
    if (!MediaRecorder.isTypeSupported(mimeType)) mimeType = 'audio/webm';
    if (!MediaRecorder.isTypeSupported(mimeType)) mimeType = '';

    const recorderOptions = mimeType ? { mimeType } : {};
    const mediaRecorder = new MediaRecorder(audioOnlyStream, recorderOptions);
    mediaRecorderRef.current = mediaRecorder;

    mediaRecorder.ondataavailable = (event) => {
      if (event.data && event.data.size > 0) {
        if (mediaRecorderRef.current !== mediaRecorder) return;
        audioChunksRef.current.push(event.data);
      }
    };

    mediaRecorder.onstop = () => {
      if (mediaRecorderRef.current !== mediaRecorder) return;

      isCapturingRef.current = false;
      console.log("[Audio] MediaRecorder stopped, total chunks:", audioChunksRef.current.length);
      if (audioChunksRef.current.length > 0) {
        const mt = mediaRecorder.mimeType || 'audio/webm';
        recordedBlobRef.current = new Blob(audioChunksRef.current, { type: mt });
      }
      if (recorderStopResolveRef.current) {
        recorderStopResolveRef.current();
        recorderStopResolveRef.current = null;
      }
    };

    mediaRecorder.onerror = (e) => {
      console.error("[Audio] MediaRecorder error:", e);
    };

    mediaRecorder.start(250);
  }, [setupAudioGraph]);

  /**
   * Stops the MediaRecorder and tears down the PCM tap. Returns a Promise
   * that resolves once the archival blob has been assembled.
   */
  const stopAudioCapture = useCallback(() => {
    return new Promise((resolve) => {
      teardownAudioGraph();

      if (!mediaRecorderRef.current || mediaRecorderRef.current.state === 'inactive') {
        isCapturingRef.current = false;
        resolve();
        return;
      }
      console.log("[Audio] Stopping MediaRecorder...");
      recorderStopResolveRef.current = resolve;
      try {
        mediaRecorderRef.current.stop();
      } catch (err) {
        console.log("[Audio] Stop error:", err);
        isCapturingRef.current = false;
        recorderStopResolveRef.current = null;
        resolve();
      }
      // Safety timeout — if onstop doesn't fire within 1.5s, force resolve
      setTimeout(() => {
        if (recorderStopResolveRef.current) {
          console.warn("[Audio] MediaRecorder onstop timed out, force resolving");
          isCapturingRef.current = false;
          if (!recordedBlobRef.current && audioChunksRef.current.length > 0) {
            const mt = mediaRecorderRef.current?.mimeType || 'audio/webm';
            recordedBlobRef.current = new Blob(audioChunksRef.current, { type: mt });
          }
          recorderStopResolveRef.current();
          recorderStopResolveRef.current = null;
        }
      }, 1500);
    });
  }, [teardownAudioGraph]);

  // ====================================
  // DEEPGRAM LIVE TRANSCRIPTION
  // Streams raw 16kHz mono linear16 PCM — no container, so every (re)connect
  // is a clean slate for Deepgram's decoder. No header/timecode state is
  // ever carried between connections.
  // ====================================

  const flushPendingFrames = useCallback((socket) => {
    const frames = pendingFramesRef.current;
    pendingFramesRef.current = [];
    for (const frame of frames) {
      if (socket.readyState === WebSocket.OPEN) socket.send(frame);
    }
  }, []);

  const startRecording = useCallback(() => {
    // Prevent double execution
    if (isConnectingRef.current || isRecording) return;

    const apiKey = import.meta.env.VITE_DEEPGRAM_API_KEY;
    if (!apiKey || apiKey === 'your_deepgram_api_key_here') {
      toast.error("Please configure VITE_DEEPGRAM_API_KEY in frontend/.env!");
      return;
    }

    if (!globalState.mediaStream || globalState.mediaStream.getAudioTracks().length === 0) {
      toast.error("Microphone is not available. Please check your camera/mic permissions and try again.");
      return;
    }

    // Ensure the archival recorder + PCM tap are running first
    startAudioCapture();

    isConnectingRef.current = true;
    isSendingRef.current = true;
    pendingFramesRef.current = []; // fresh pre-connect buffer for this (re)connect
    setIsConnectingState(true);

    // Only clear transcription text on the FIRST mic activation per question.
    // On resume (chunks already exist), preserve the previously transcribed text.
    if (audioChunksRef.current.length === 0) {
      setFinalText('');
      setLiveText('');
      liveTextRef.current = '';
      finalTextRef.current = '';
    }

    console.log("[Deepgram] Connecting to WebSocket...");

    const socket = new WebSocket(buildDeepgramUrl(), ['token', apiKey]);
    socketRef.current = socket;

    socket.onopen = () => {
      console.log("[Deepgram] WebSocket connected successfully");
      isConnectingRef.current = false;
      setIsConnectingState(false);
      setIsRecording(true);
      // Flush whatever PCM frames accumulated while we were connecting/reconnecting
      flushPendingFrames(socket);
    };

    socket.onmessage = (message) => {
      try {
        const received = JSON.parse(message.data);

        if (received.type === "Error") {
          console.error("[Deepgram] Server error:", received);
          return;
        }

        if (received.type === "Metadata") {
          console.log("[Deepgram] Metadata received:", received);
          return;
        }

        if (received.type === "UtteranceEnd") {
          // Treat UtteranceEnd as a display boundary only. Keep the visible
          // interim text until Deepgram either finalizes or revises it.
          return;
        }

        const alt = received?.channel?.alternatives?.[0];
        if (!alt) return;

        const transcript = alt.transcript || '';

        if (received.is_final) {
          if (shouldAcceptFinalTranscript(alt, transcript)) {
            console.log("[Deepgram] FINAL transcript:", transcript);
            setFinalText(prev => {
              const updated = prev + (prev ? ' ' : '') + transcript;
              finalTextRef.current = updated;
              return updated;
            });
          } else if (transcript.trim()) {
            console.warn("[Deepgram] Ignoring low-confidence final transcript:", transcript);
          }
          setLiveText('');
          liveTextRef.current = '';
        } else if (transcript.trim()) {
          // Show interim text only; final text is updated from Deepgram is_final results.
          queueLiveText(transcript);
        }
      } catch (e) {
        console.error("[Deepgram] Message parse error:", e);
      }
    };

    socket.onerror = (error) => {
      console.error("[Deepgram] WebSocket error:", error);
      isConnectingRef.current = false;
      isSendingRef.current = false;
      pendingFramesRef.current = [];
      setIsConnectingState(false);
      setIsRecording(false);

      if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
        mediaRecorderRef.current.pause();
      }

      if (stopResolveRef.current) {
        stopResolveRef.current();
        stopResolveRef.current = null;
      }
    };

    socket.onclose = (event) => {
      console.log("[Deepgram] WebSocket closed, code:", event.code, "reason:", event.reason);
      isConnectingRef.current = false;
      isSendingRef.current = false;
      pendingFramesRef.current = [];
      setIsConnectingState(false);
      setIsRecording(false);

      if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
        mediaRecorderRef.current.pause();
      }

      // Drop any unfinalized interim guess. CloseStream should produce final
      // chunks before close; keeping stale interim text is worse than omitting
      // a low-confidence tail.
      setLiveText('');
      liveTextRef.current = '';

      if (stopResolveRef.current) {
        stopResolveRef.current();
        stopResolveRef.current = null;
      }
    };
  }, [isRecording, startAudioCapture, flushPendingFrames, setFinalText, setLiveText, queueLiveText]);

  /**
   * Stops forwarding PCM to Deepgram, closes the socket, and pauses the
   * archival recorder. Returns a Promise that resolves once the WebSocket
   * has fully closed.
   */
  const stopRecording = useCallback(() => {
    return new Promise((resolve) => {
      console.log("[Deepgram] Stopping transcription and pausing recorder...");

      isSendingRef.current = false;

      if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
        mediaRecorderRef.current.pause();
      }

      // Send CloseStream to Deepgram and wait for the socket to close
      if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
        stopResolveRef.current = resolve;
        socketRef.current.send(JSON.stringify({ type: 'CloseStream' }));
        // Safety timeout — if Deepgram doesn't close in 2s, force-close
        setTimeout(() => {
          if (socketRef.current && socketRef.current.readyState !== WebSocket.CLOSED) {
            console.warn("[Deepgram] Force-closing socket after timeout");
            socketRef.current.close();
          }
        }, 2000);
      } else {
        setIsRecording(false);
        resolve();
      }
    });
  }, []); // No deps needed — uses refs for everything

  const toggleRecording = useCallback(() => {
    if (isRecording) {
      stopRecording();
    } else if (!isConnectingRef.current) {
      startRecording();
    }
  }, [isRecording, startRecording, stopRecording]);

  const resetTranscript = useCallback(() => {
    setFinalText('');
    setLiveText('');
    liveTextRef.current = '';
    finalTextRef.current = '';
    audioChunksRef.current = [];
    recordedBlobRef.current = null;
    pendingFramesRef.current = [];
  }, [setFinalText, setLiveText]);

  /**
   * Cancels an in-progress Deepgram WebSocket handshake and pauses the recorder.
   * Safe to call even if nothing is connecting.
   */
  const cancelConnecting = useCallback(() => {
    if (isConnectingRef.current || (socketRef.current && socketRef.current.readyState === WebSocket.CONNECTING)) {
      console.log("[Deepgram] Cancelling in-progress connection...");
      if (socketRef.current) {
        try { socketRef.current.close(); } catch { /* ignore */ }
        socketRef.current = null;
      }
      isConnectingRef.current = false;
      isSendingRef.current = false;
      pendingFramesRef.current = [];
      setIsConnectingState(false);
      setIsRecording(false);

      if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
        mediaRecorderRef.current.pause();
      }
    }
  }, []);

  const getAudioBlob = useCallback(() => {
    // First check if onstop already created the blob
    if (recordedBlobRef.current && recordedBlobRef.current.size > 0) {
      return recordedBlobRef.current;
    }
    // Fallback: build from chunks directly
    if (audioChunksRef.current && audioChunksRef.current.length > 0) {
      const mimeType = mediaRecorderRef.current?.mimeType || 'audio/webm';
      const b = new Blob(audioChunksRef.current, { type: mimeType });
      recordedBlobRef.current = b;
      return b;
    }
    return null;
  }, []);

  /**
   * Returns the latest transcript text from refs (not stale render state).
   * Use this in async handlers to avoid reading stale closure values.
   */
  const getTranscriptText = useCallback(() => {
    const final = finalTextRef.current || '';
    const live = liveTextRef.current || '';
    const combined = final + (live ? (final ? ' ' : '') + live : '');
    return combined.trim() || "(No answer provided)";
  }, []);

  return {
    isRecording,
    isConnecting: isConnectingState,
    liveText,
    setLiveText,
    finalText,
    setFinalText,
    toggleRecording,
    stopRecording,
    startRecording,
    cancelConnecting,
    resetTranscript,
    getAudioBlob,
    getTranscriptText,
    startAudioCapture,
    stopAudioCapture,
  };
}
