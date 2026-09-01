import { useState, useRef, useCallback, useEffect } from 'react';
import { globalState } from '@/store';
import toast from 'react-hot-toast';

export function useSpeechRecognition() {
  const [liveText, setLiveText] = useState('');
  const [finalText, setFinalText] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [isConnectingState, setIsConnectingState] = useState(false);
  
  const mediaRecorderRef = useRef(null);
  const socketRef = useRef(null);
  const isConnectingRef = useRef(false);
  const audioChunksRef = useRef([]);
  const recordedBlobRef = useRef(null);
  // Use refs to avoid stale closures — these always hold the latest value
  const liveTextRef = useRef('');
  const finalTextRef = useRef('');
  const stopResolveRef = useRef(null);
  const recorderStopResolveRef = useRef(null);
  const isCapturingRef = useRef(false);

  // Keep refs in sync with state
  useEffect(() => { liveTextRef.current = liveText; }, [liveText]);
  useEffect(() => { finalTextRef.current = finalText; }, [finalText]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        try { mediaRecorderRef.current.stop(); } catch { /* ignore */ }
      }
      if (socketRef.current) {
        try { socketRef.current.close(); } catch { /* ignore */ }
      }
    };
  }, []);

  // ====================================
  // AUDIO CAPTURE (MediaRecorder only)
  // Runs independently of Deepgram.
  // ====================================

  const webmHeaderRef = useRef(null);

  const startAudioCapture = useCallback(() => {
    if (!globalState.mediaStream) {
      console.error("[Audio] No mediaStream available in globalState");
      return;
    }

    // If it's already paused, simply resume it
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

    // Clear everything on a fresh start
    webmHeaderRef.current = null;
    audioChunksRef.current = [];
    recordedBlobRef.current = null;
    isCapturingRef.current = true;

    let mimeType = 'audio/webm;codecs=opus';
    if (!MediaRecorder.isTypeSupported(mimeType)) mimeType = 'audio/webm';
    if (!MediaRecorder.isTypeSupported(mimeType)) mimeType = '';

    const recorderOptions = mimeType ? { mimeType } : {};
    const mediaRecorder = new MediaRecorder(audioOnlyStream, recorderOptions);
    mediaRecorderRef.current = mediaRecorder;

    let isFirstChunk = true;
    mediaRecorder.ondataavailable = (event) => {
      if (event.data && event.data.size > 0) {
        // Only push chunks if this is still the active recorder
        if (mediaRecorderRef.current !== mediaRecorder) return;
        
        if (isFirstChunk) {
          webmHeaderRef.current = event.data;
          isFirstChunk = false;
        }

        audioChunksRef.current.push(event.data);
        
        if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
          socketRef.current.send(event.data);
        }
      }
    };

    mediaRecorder.onstop = () => {
      // Ignore stale onstop events from previous recorders
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
  }, []);

  /**
   * Stops the MediaRecorder and returns a Promise that resolves once
   * the `onstop` event has fired and the blob has been assembled.
   */
  const stopAudioCapture = useCallback(() => {
    return new Promise((resolve) => {
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
          // Build the blob from whatever chunks we have
          if (!recordedBlobRef.current && audioChunksRef.current.length > 0) {
            const mt = mediaRecorderRef.current?.mimeType || 'audio/webm';
            recordedBlobRef.current = new Blob(audioChunksRef.current, { type: mt });
          }
          recorderStopResolveRef.current();
          recorderStopResolveRef.current = null;
        }
      }, 1500);
    });
  }, []);

  // ====================================
  // DEEPGRAM LIVE TRANSCRIPTION
  // Connects Deepgram on top of the already-running MediaRecorder.
  // ====================================

  const startRecording = useCallback(() => {
    // Prevent double execution
    if (isConnectingRef.current || isRecording) return;
    
    const apiKey = import.meta.env.VITE_DEEPGRAM_API_KEY;
    if (!apiKey || apiKey === 'your_deepgram_api_key_here') {
      toast.error("Please configure VITE_DEEPGRAM_API_KEY in frontend/.env!");
      return;
    }

    // Ensure audio capture is running first
    startAudioCapture();

    isConnectingRef.current = true;
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
    
    const socket = new WebSocket(
      'wss://api.deepgram.com/v1/listen?model=nova-2&language=en-US&smart_format=true&interim_results=true&endpointing=300',
      ['token', apiKey]
    );
    socketRef.current = socket;

    socket.onopen = () => {
      console.log("[Deepgram] WebSocket connected successfully");
      isConnectingRef.current = false;
      setIsConnectingState(false);
      setIsRecording(true);
      
      // Send the cached WebM header to initialize the new Deepgram stream
      if (webmHeaderRef.current) {
        console.log("[Deepgram] Sending cached WebM header");
        socket.send(webmHeaderRef.current);
      }
    };

    socket.onmessage = (message) => {
      try {
        const received = JSON.parse(message.data);
        
        if (received.type === "Error") {
          console.error("[Deepgram] Server error:", received);
          return;
        }

        // Log metadata messages
        if (received.type === "Metadata") {
          console.log("[Deepgram] Metadata received:", received);
          return;
        }

        const alt = received?.channel?.alternatives?.[0];
        if (!alt) return;

        const transcript = alt.transcript || '';
        
        if (received.is_final) {
          if (transcript.trim()) {
            console.log("[Deepgram] FINAL transcript:", transcript);
            setFinalText(prev => {
              const updated = prev + (prev ? ' ' : '') + transcript;
              finalTextRef.current = updated;
              return updated;
            });
          }
          setLiveText('');
          liveTextRef.current = '';
        } else {
          if (transcript.trim()) {
            setLiveText(transcript);
            liveTextRef.current = transcript;
          }
        }
      } catch (e) {
        console.error("[Deepgram] Message parse error:", e);
      }
    };

    socket.onerror = (error) => {
      console.error("[Deepgram] WebSocket error:", error);
      isConnectingRef.current = false;
      setIsConnectingState(false);
      setIsRecording(false);
      
      // Pause audio capture when transcription fails
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
      setIsConnectingState(false);
      setIsRecording(false);
      
      // Pause audio capture when transcription stops
      if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
        mediaRecorderRef.current.pause();
      }

      // Flush any remaining live text into final text using refs
      const currentLive = liveTextRef.current;
      if (currentLive) {
        setFinalText(prev => {
          const updated = prev + (prev ? ' ' : '') + currentLive;
          finalTextRef.current = updated;
          return updated;
        });
        setLiveText('');
        liveTextRef.current = '';
      }

      if (stopResolveRef.current) {
        stopResolveRef.current();
        stopResolveRef.current = null;
      }
    };
  }, [isRecording, startAudioCapture]);

  /**
   * Stops the Deepgram transcription and pauses the MediaRecorder.
   * Returns a Promise that resolves once the WebSocket has fully closed.
   */
  const stopRecording = useCallback(() => {
    return new Promise((resolve) => {
      console.log("[Deepgram] Stopping transcription and pausing recorder...");

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
  }, []);

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
