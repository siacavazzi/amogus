import React, { useEffect, useRef } from 'react';
import start from './audio/start.mp3';
import test from './audio/test.mp3';
import meeting from './audio/meeting.mp3'

export const AudioHandler = ({ audio, setAudio }) => {
  // Use refs to persist audio objects across renders
  const startAudioRef = useRef(null);
  const testAudioRef = useRef(null);
  const meetingAudioRef = useRef(null);

  useEffect(() => {
    // Initialize the audio objects once
    startAudioRef.current = new Audio(start);
    testAudioRef.current = new Audio(test);
    meetingAudioRef.current = new Audio(meeting)

    return () => {
      // Clean up audio objects to prevent memory leaks
      startAudioRef.current = null;
      testAudioRef.current = null;
      meetingAudioRef.current = null;
    };
  }, []); // Only runs on initial render

  useEffect(() => {
    // Play the correct audio based on the `audio` prop
    if (audio) {
      if (audio === 'test') {
        testAudioRef.current?.play().catch((err) => console.error('Error playing test audio:', err));
      } else if (audio === 'start') {
        startAudioRef.current?.play().catch((err) => console.error('Error playing start audio:', err));
      } else if(audio === 'meeting') {
        meetingAudioRef.current?.play().catch((err) => console.error('Error playing start audio:', err));
      }
      setAudio(undefined)
    }
  }, [audio]); // Runs whenever `audio` changes

  return <div></div>;
};
