import { useState, useRef, useCallback } from 'react';
import { globalState } from '../store';

export function useSpeechRecognition() {
  const [liveText, setLiveText] = useState('');
  const [finalText, setFinalText] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  
  const mediaRecorderRef = useRef(null);
  const socketRef = useRef(null);

  const startRecording = useCallback(() => {
    const apiKey = import.meta.env.VITE_DEEPGRAM_API_KEY;
    if (!apiKey || apiKey === 'your_deepgram_api_key_here') {
      alert("Please configure VITE_DEEPGRAM_API_KEY in frontend/.env!");
      return;
    }

    setFinalText('');
    setLiveText('');
    
    // Using v1 parameters for better results
    const socket = new WebSocket('wss://api.deepgram.com/v1/listen?model=nova-2&language=en-US&smart_format=true&interim_results=true&endpointing=300', ['token', apiKey]);
    socketRef.current = socket;

    socket.onopen = () => {
      setIsRecording(true);
      if (globalState.mediaStream) {
        const mediaRecorder = new MediaRecorder(globalState.mediaStream);
        mediaRecorder.ondataavailable = (event) => {
          if (event.data.size > 0 && socket.readyState === WebSocket.OPEN) {
            socket.send(event.data);
          }
        };
        mediaRecorder.start(250);
        mediaRecorderRef.current = mediaRecorder;
      }
    };

    socket.onmessage = (message) => {
      const received = JSON.parse(message.data);
      const alt = received?.channel?.alternatives?.[0];
      if (!alt) return;

      if (received.is_final && alt.transcript.trim()) {
        setFinalText(prev => prev + (prev ? ' ' : '') + alt.transcript);
        setLiveText('');
      } else if (!received.is_final && alt.transcript.trim()) {
        setLiveText(alt.transcript);
      }
    };

    socket.onerror = (error) => {
      console.error("Deepgram WebSocket Error:", error);
      alert("Deepgram Connection Error. Please check your API Key and internet connection.");
      setIsRecording(false);
    };
    
    socket.onclose = () => {
      setIsRecording(false);
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop();
      }
    };
  }, []);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify({ type: 'CloseStream' }));
    } else {
      setIsRecording(false);
    }
    
    // Merge any leftover liveText into finalText
    setFinalText(prev => prev + (prev && liveText ? ' ' : '') + liveText);
    setLiveText('');
  }, [liveText]);

  const toggleRecording = useCallback(() => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  }, [isRecording, startRecording, stopRecording]);

  const resetTranscript = useCallback(() => {
    setFinalText('');
    setLiveText('');
  }, []);

  return {
    isRecording,
    liveText,
    finalText,
    setFinalText,
    toggleRecording,
    stopRecording,
    startRecording,
    resetTranscript
  };
}
