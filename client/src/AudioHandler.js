// AudioHandler.js
import React, { useEffect, useContext, useCallback, useRef, useState } from 'react';
import { DataContext } from './GameContext';
import { Howl, Howler } from 'howler';
import { Volume2, X } from 'lucide-react';
import { isMobile } from 'react-device-detect';

// Import your audio files
import start from './audio/start.mp3';
import test from './audio/test.mp3';
import meeting from './audio/meeting.mp3';
import select from './audio/select.wav';
import complete_task from './audio/task_complete.mp3';
import hack from './audio/hack.mp3';

// Create sounds once, outside the component to prevent recreation on each render
const soundFiles = {
  start: { src: [start], preload: true },
  test: { src: [test], preload: true },
  meeting: { src: [meeting], preload: true },
  select: { src: [select], preload: true },
  complete_task: { src: [complete_task], preload: true },
  hack: { src: [hack], preload: true },
};

// Singleton sound instances
let sounds = null;
const initializeSounds = () => {
  if (!sounds) {
    sounds = {};
    Object.entries(soundFiles).forEach(([key, config]) => {
      sounds[key] = new Howl({
        ...config,
        html5: false, // Use Web Audio API for better mobile support
        pool: 5, // Allow multiple simultaneous plays
      });
    });
  }
  return sounds;
};

export const AudioHandler = () => {
  const { 
    audio,
    setAudio,
    audioEnabled,
    setAudioEnabled,
    inRoom,
  } = useContext(DataContext);

  const [showSoundReminder, setShowSoundReminder] = useState(false);
  const hasInteracted = useRef(false);
  const hasShownReminder = useRef(false);
  const soundsRef = useRef(null);

  // Initialize sounds on mount
  useEffect(() => {
    soundsRef.current = initializeSounds();
  }, []);

  // Show sound reminder when user joins a room (once per session, mobile only)
  useEffect(() => {
    if (inRoom && !hasShownReminder.current && isMobile) {
      hasShownReminder.current = true;
      setShowSoundReminder(true);
      
      // Auto-dismiss after 5 seconds
      const timer = setTimeout(() => {
        setShowSoundReminder(false);
      }, 5000);
      
      return () => clearTimeout(timer);
    }
  }, [inRoom]);

  // Function to initialize audio on user interaction
  const initializeAudio = useCallback(() => {
    hasInteracted.current = true;
    
    // Resume the audio context
    if (Howler.ctx && Howler.ctx.state === 'suspended') {
      Howler.ctx.resume().then(() => {
        console.log('Audio context resumed successfully');
        setAudioEnabled(true);
        
        // Play a silent sound to fully unlock audio on iOS
        if (soundsRef.current?.select) {
          soundsRef.current.select.volume(0);
          soundsRef.current.select.play();
          setTimeout(() => {
            soundsRef.current.select.volume(1);
          }, 100);
        }
      }).catch((err) => {
        console.error("Error resuming audio context:", err);
      });
    } else {
      setAudioEnabled(true);
    }
  }, [setAudioEnabled]);

  // Handle dismissing the reminder (also enables audio)
  const dismissReminder = useCallback(() => {
    setShowSoundReminder(false);
    initializeAudio();
  }, [initializeAudio]);

  // Also try to enable audio on any user interaction with the page
  useEffect(() => {
    const handleInteraction = () => {
      if (!hasInteracted.current) {
        initializeAudio();
      }
    };

    // Listen for various user interactions
    const events = ['touchstart', 'touchend', 'click', 'keydown'];
    events.forEach(event => {
      document.addEventListener(event, handleInteraction, { once: true, passive: true });
    });

    return () => {
      events.forEach(event => {
        document.removeEventListener(event, handleInteraction);
      });
    };
  }, [initializeAudio]);

  // Play audio when `audio` changes
  useEffect(() => {
    if (audio && soundsRef.current?.[audio]) {
      if (audioEnabled) {
        try {
          soundsRef.current[audio].play();
        } catch (err) {
          console.warn('Failed to play sound:', err);
        }
      }
      setAudio(undefined);
    }
  }, [audio, audioEnabled, setAudio]);

  // Sound reminder popup when joining a room
  if (showSoundReminder) {
    return (
      <div className="fixed top-4 left-4 right-4 z-50 flex justify-center pointer-events-none">
        <div 
          className="bg-indigo-600 text-white px-4 py-3 rounded-xl shadow-lg flex items-center gap-3 pointer-events-auto animate-fade-in max-w-sm"
          role="alert"
        >
          <Volume2 size={24} className="flex-shrink-0" />
          <div className="flex-1">
            <p className="font-medium text-sm">Turn off silent mode</p>
            <p className="text-xs text-indigo-200">Unmute your device for the best experience</p>
          </div>
          <button 
            onClick={dismissReminder}
            className="p-1 hover:bg-indigo-500 rounded-lg transition-colors flex-shrink-0"
            aria-label="Dismiss"
          >
            <X size={18} />
          </button>
        </div>
      </div>
    );
  }

  return null;
};
