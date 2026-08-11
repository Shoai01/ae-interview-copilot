import { useCallback } from 'react';

export function useSpeechSynthesis() {
  const speakQuestion = useCallback((text) => {
    // Cancel any ongoing speech
    window.speechSynthesis.cancel();
    
    if (!text) return;
    
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.95;
    
    // You can customize the voice here if needed
    // const voices = window.speechSynthesis.getVoices();
    // utterance.voice = voices.find(voice => voice.name === 'Google US English') || voices[0];
    
    window.speechSynthesis.speak(utterance);
  }, []);

  const cancelSpeech = useCallback(() => {
    window.speechSynthesis.cancel();
  }, []);

  return { speakQuestion, cancelSpeech };
}
