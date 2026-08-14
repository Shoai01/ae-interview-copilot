import { useState, useRef, useCallback, useEffect } from 'react';
import { globalState } from '../store';

export function useSpeechRecognition() {
  const [liveText, setLiveText] = useState('');
  const [finalText, setFinalText] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [isConnectingState, setIsConnectingState] = useState(false);
  
  const mediaRecorderRef = useRef(null);
  const socketRef = useRef(null);
  const isConnectingRef = useRef(false);
  // Use refs to avoid stale closures — these always hold the latest value
  const liveTextRef = useRef('');
  const finalTextRef = useRef('');
  const stopResolveRef = useRef(null);

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

  const startRecording = useCallback(() => {
    // Prevent double execution
    if (isConnectingRef.current || isRecording) return;
    
    const apiKey = import.meta.env.VITE_DEEPGRAM_API_KEY;
    if (!apiKey || apiKey === 'your_deepgram_api_key_here') {
      alert("Please configure VITE_DEEPGRAM_API_KEY in frontend/.env!");
      return;
    }

    // Verify we have audio tracks available
    if (!globalState.mediaStream) {
      console.error("[Deepgram] No mediaStream available in globalState");
      alert("No microphone stream found. Please go back and allow microphone access.");
      return;
    }

    const audioTracks = globalState.mediaStream.getAudioTracks();
    if (audioTracks.length === 0) {
      console.error("[Deepgram] mediaStream has no audio tracks");
      alert("No audio track found in the microphone stream.");
      return;
    }

    console.log("[Deepgram] Audio tracks found:", audioTracks.length, audioTracks.map(t => t.label));

    // Create an AUDIO-ONLY stream — this is critical!
    // MediaRecorder would encode video frames too, which Deepgram can't parse easily over websocket.
    const audioOnlyStream = new MediaStream(audioTracks);

    isConnectingRef.current = true;
    setIsConnectingState(true);
    setFinalText('');
    setLiveText('');
    liveTextRef.current = '';
    finalTextRef.current = '';
    
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
      
      try {
        // Pick a supported audio mimeType
        let mimeType = 'audio/webm;codecs=opus';
        if (!MediaRecorder.isTypeSupported(mimeType)) {
          mimeType = 'audio/webm';
        }
        if (!MediaRecorder.isTypeSupported(mimeType)) {
          mimeType = ''; // let browser pick default
        }
        
        console.log("[Deepgram] Using MediaRecorder mimeType:", mimeType || '(browser default)');
        
        const recorderOptions = mimeType ? { mimeType } : {};
        const mediaRecorder = new MediaRecorder(audioOnlyStream, recorderOptions);
        mediaRecorderRef.current = mediaRecorder;
        
        let chunkCount = 0;
        mediaRecorder.ondataavailable = (event) => {
          if (event.data.size > 0 && socket.readyState === WebSocket.OPEN) {
            chunkCount++;
            if (chunkCount <= 5 || chunkCount % 20 === 0) {
              console.log(`[Deepgram] Sending audio chunk #${chunkCount}, size: ${event.data.size} bytes`);
            }
            socket.send(event.data);
          }
        };

        mediaRecorder.onerror = (e) => {
          console.error("[Deepgram] MediaRecorder error:", e);
        };
        
        // Use 250ms timeslice to ensure stable chunk delivery without browser buffering overhead
        mediaRecorder.start(250);
        console.log("[Deepgram] MediaRecorder started, sending chunks every 250ms");
      } catch (e) {
        console.error("[Deepgram] MediaRecorder start error:", e);
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
      
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        try { mediaRecorderRef.current.stop(); } catch (err) { console.log(err); }
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
  }, [isRecording]);

  /**
   * Stops recording and returns a Promise that resolves once the WebSocket
   * has fully closed. This lets callers `await stopRecording()` before
   * reading the final transcript.
   */
  const stopRecording = useCallback(() => {
    return new Promise((resolve) => {
      console.log("[Deepgram] Stopping recording...");
      
      // Stop the MediaRecorder first so no more audio is sent
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        try { mediaRecorderRef.current.stop(); } catch (err) { console.log(err); }
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
    resetTranscript
  };
}
