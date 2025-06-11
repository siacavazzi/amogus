// AudioHandler.js
import React, { useEffect, useContext, useCallback } from 'react';
import { DataContext } from './GameContext';
import { Howl, Howler } from 'howler';

// Import your audio files
import start from './audio/start.mp3';
import test from './audio/test.mp3';
import meeting from './audio/meeting.mp3';
import select from './audio/select.wav';
import complete_task from './audio/task_complete.mp3';
import hack from './audio/hack.mp3';

export const AudioHandler = () => {
  const { 
    audio,
    setAudio,
    audioEnabled,
    setAudioEnabled,
    setDialog,
  } = useContext(DataContext);

  // Define Howler.js sounds
  const sounds = {
    start: new Howl({ src: [start] }),
    test: new Howl({ src: [test] }),
    meeting: new Howl({ src: [meeting] }),
    select: new Howl({ src: [select] }),
    complete_task: new Howl({ src: [complete_task] }),
    hack: new Howl({ src: [hack] }),
  };

  // Function to initialize audio on user interaction
  const initializeAudio = useCallback(() => {
    // Resume the global Howler audio context
    Howler.ctx.resume().then(() => {
      setAudioEnabled(true);
      setDialog(null); // Close the dialog after enabling audio
    }).catch((err) => {
      console.error("Error resuming Howler audio context:", err);
    });
  }, [setAudioEnabled, setDialog]);

  // Prompt user to enable audio if not already enabled
  // useEffect(() => {
  //   if (!audioEnabled) {
  //     setDialog({
  //       title: "Enable Audio",
  //       content: (
  //         <button onClick={initializeAudio}>
  //           Click to Enable Audio
  //         </button>
  //       ),
  //     });
  //   }
  // }, [audioEnabled, initializeAudio, setDialog]);

  // Play audio when `audio` changes
  useEffect(() => {
    if (audio && audioEnabled && sounds[audio]) {
      sounds[audio].play();
      setAudio(undefined);
    }
  }, [audio, audioEnabled, sounds, setAudio]);

  return null;
};
