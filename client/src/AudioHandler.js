// AudioHandler.js
import React, { useEffect, useContext, useCallback, useRef, useState } from 'react';
import { DataContext } from './GameContext';
import { Howl, Howler } from 'howler';
import { Volume2, X } from 'lucide-react';
import { isMobile } from 'react-device-detect';

// Import local audio files
import start from './audio/start.mp3';
import test from './audio/test.mp3';
import meeting from './audio/meeting.mp3';
import select from './audio/select.wav';
import complete_task from './audio/task_complete.mp3';
import hack from './audio/hack.mp3';
import theme from './audio/theme.mp3';

// Remote audio base URL for sounds not bundled locally
const REMOTE_AUDIO_BASE = 'https://raw.githubusercontent.com/siacavazzi/amogus_assets/main/audio/';

// Local sound files (bundled with the app)
const localSoundFiles = {
  start: { src: [start], preload: true },
  test: { src: [test], preload: true },
  meeting: { src: [meeting], preload: true },
  select: { src: [select], preload: true },
  complete_task: { src: [complete_task], preload: true },
  hack: { src: [hack], preload: true },
  theme: { src: [theme], preload: true },
};

// Remote sound files (loaded from GitHub - matching Sonos sounds)
const remoteSoundFiles = {
  meltdown: { src: [`${REMOTE_AUDIO_BASE}meltdown.mp3`], preload: false, html5: true },
  sus_victory: { src: [`${REMOTE_AUDIO_BASE}sus_victory.mp3`], preload: false, html5: true },
  crew_victory: { src: [`${REMOTE_AUDIO_BASE}victory.mp3`], preload: false, html5: true },
  victory: { src: [`${REMOTE_AUDIO_BASE}victory.mp3`], preload: false, html5: true },
  meltdown_fail: { src: [`${REMOTE_AUDIO_BASE}meltdown_fail.mp3`], preload: false, html5: true },
  meltdown_over: { src: [`${REMOTE_AUDIO_BASE}meltdown_over.mp3`], preload: false, html5: true },
  dead: { src: [`${REMOTE_AUDIO_BASE}dead.mp3`], preload: false, html5: true },
  sus: { src: [`${REMOTE_AUDIO_BASE}sus.mp3`], preload: false, html5: true },
  brainrot: { src: [`${REMOTE_AUDIO_BASE}brainrot.mp3`], preload: false, html5: true },
  annoying_notif: { src: [`${REMOTE_AUDIO_BASE}annoying_notif.mp3`], preload: false, html5: true },
  meow: { src: [`${REMOTE_AUDIO_BASE}meow.mp3`], preload: false, html5: true },
  hurry: { src: [`${REMOTE_AUDIO_BASE}hurry.mp3`], preload: false, html5: true },
  veto: { src: [`${REMOTE_AUDIO_BASE}veto.mp3`], preload: false, html5: true },
  fear: { src: [`${REMOTE_AUDIO_BASE}fear.mp3`], preload: false, html5: true },

  twenty_perc: { src: [`${REMOTE_AUDIO_BASE}20_percent_tasks.mp3`], preload: false, html5: true },
  fifty_perc: { src: [`${REMOTE_AUDIO_BASE}50_percent_tasks.mp3`], preload: false, html5: true },
  eighty_perc: { src: [`${REMOTE_AUDIO_BASE}80_percent_tasks.mp3`], preload: false, html5: true },
  ninety_perc: { src: [`${REMOTE_AUDIO_BASE}95_percent_tasks.mp3`], preload: false, html5: true },
  intruders_revealed: { src: [`${REMOTE_AUDIO_BASE}intruders_revealed.mp3`], preload: false, html5: true },
  // Aliases to match backend sound names
  '20_percent_tasks': { src: [`${REMOTE_AUDIO_BASE}20_percent_tasks.mp3`], preload: false, html5: true },
  '50_percent_tasks': { src: [`${REMOTE_AUDIO_BASE}50_percent_tasks.mp3`], preload: false, html5: true },
  '80_percent_tasks': { src: [`${REMOTE_AUDIO_BASE}80_percent_tasks.mp3`], preload: false, html5: true },
  '95_percent_tasks': { src: [`${REMOTE_AUDIO_BASE}95_percent_tasks.mp3`], preload: false, html5: true },
};

// Combined sound files
const soundFiles = { ...localSoundFiles, ...remoteSoundFiles };

// Singleton sound instances
let sounds = null;
const initializeSounds = () => {
  if (!sounds) {
    sounds = {};
    Object.entries(soundFiles).forEach(([key, config]) => {
      sounds[key] = new Howl({
        ...config,
        html5: config.html5 || false, // Use Web Audio API for local, HTML5 for remote
        pool: 5, // Allow multiple simultaneous plays
      });
    });
  }
  return sounds;
};

// Reference to currently looping sound
let loopingSound = null;
let loopTimeout = null;

export const AudioHandler = () => {
  const { 
    audio,
    setAudio,
    audioEnabled,
    setAudioEnabled,
    inRoom,
    socket,
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

  // Helper function to play a sound by name
  const playSound = useCallback((soundName) => {
    if (!soundsRef.current?.[soundName]) {
      console.warn(`Sound not found: ${soundName}`);
      return;
    }
    if (audioEnabled) {
      try {
        soundsRef.current[soundName].play();
      } catch (err) {
        console.warn('Failed to play sound:', err);
      }
    }
  }, [audioEnabled]);

  // Helper function to stop all sounds
  const stopAllSounds = useCallback(() => {
    // Stop any looping sound
    if (loopingSound && soundsRef.current?.[loopingSound]) {
      soundsRef.current[loopingSound].stop();
      loopingSound = null;
    }
    if (loopTimeout) {
      clearTimeout(loopTimeout);
      loopTimeout = null;
    }
  }, []);

  // Helper function to loop a sound for a duration
  const loopSound = useCallback((soundName, duration) => {
    if (!soundsRef.current?.[soundName]) {
      console.warn(`Sound not found: ${soundName}`);
      return;
    }
    
    // Stop any currently looping sound
    stopAllSounds();
    
    if (audioEnabled) {
      loopingSound = soundName;
      const sound = soundsRef.current[soundName];
      sound.loop(true);
      sound.play();
      
      // Stop after duration (in seconds)
      if (duration) {
        loopTimeout = setTimeout(() => {
          sound.stop();
          sound.loop(false);
          loopingSound = null;
        }, duration * 1000);
      }
    }
  }, [audioEnabled, stopAllSounds]);

  // Listen for socket sound events from the server
  useEffect(() => {
    if (!socket) return;

    const handlePlaySound = (data) => {
      console.log('Received play_sound event:', data);
      if (data?.sound) {
        playSound(data.sound);
      }
    };

    const handleLoopSound = (data) => {
      console.log('Received loop_sound event:', data);
      if (data?.sound) {
        loopSound(data.sound, data.duration);
      }
    };

    const handleStopSound = () => {
      console.log('Received stop_sound event');
      stopAllSounds();
    };

    socket.on('play_sound', handlePlaySound);
    socket.on('loop_sound', handleLoopSound);
    socket.on('stop_sound', handleStopSound);

    return () => {
      socket.off('play_sound', handlePlaySound);
      socket.off('loop_sound', handleLoopSound);
      socket.off('stop_sound', handleStopSound);
    };
  }, [socket, playSound, loopSound, stopAllSounds]);

  // Play audio when `audio` changes (legacy support for setAudio calls)
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
