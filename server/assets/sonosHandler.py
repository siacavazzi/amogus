import time
import logging
from threading import Thread, Lock

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)


class SonosController:
    """
    SonosController that emits sound events to connected Sonos clients.
    
    In hosted mode (enabled=False), it's just a placeholder.
    The actual sound emission happens via GameSpeaker per-game.
    """
    
    def __init__(self, max_retries=3, retry_delay=2, default_volume=30, enabled=False, ignore_bedroom_speakers=True):
        self.enabled = enabled
        self.default_volume = default_volume
        
        if not enabled:
            logger.info("SonosController is disabled (hosted mode).")
            return

        # Local Sonos initialization would go here if enabled
        logger.info("SonosController initialized.")

    def play_sound(self, sound, interrupt=True):
        """Placeholder - actual sound is handled by GameSpeaker."""
        pass

    def loop_sound(self, sound, duration, interrupt=True):
        """Placeholder - actual sound is handled by GameSpeaker."""
        pass

    def stop(self):
        """Placeholder - actual sound is handled by GameSpeaker."""
        pass


class GameSpeaker:
    """
    A per-game speaker that routes sound events to Sonos connectors for that game.
    Each game gets its own GameSpeaker instance.
    """
    
    def __init__(self, socketio, room_code):
        self.socketio = socketio
        self.room_code = room_code
        self.audio = {
            "test": "test.mp3",
            "theme": "theme.mp3",
            "meeting": "meeting.mp3",
            "start": "start.mp3",
            "meltdown": "meltdown.mp3",
            "sus_victory": "sus_victory.mp3",
            "crew_victory": "victory.mp3",
            "victory": "victory.mp3",
            "meltdown_fail": "meltdown_fail.mp3",
            "meltdown_over": "meltdown_over.mp3",
            "dead": "dead.mp3",
            "hack": "hack.mp3",
            "sus": "sus.mp3",
            "brainrot": "brainrot.mp3",
            "annoying_notif": "annoying_notif.mp3",
            "meow": "meow.mp3",
            "hurry": "hurry.mp3",
            "veto": "veto.mp3",
            "fear": "fear.mp3"
        }

    def _emit_to_sonos_connectors(self, event, data):
        """Emit an event to all Sonos connectors in the room."""
        if self.socketio and self.room_code:
            sonos_room = f"sonos_{self.room_code}"
            self.socketio.emit(event, data, room=sonos_room)
            logger.debug(f"Emitted {event} to {sonos_room}")

    def play_sound(self, sound, interrupt=True):
        """Play a sound on connected Sonos systems."""
        if sound not in self.audio:
            logger.warning(f"Unknown sound: {sound}")
            return False
        self._emit_to_sonos_connectors('play_sound', {'sound': sound})
        logger.info(f"Emitting play_sound: {sound} to room {self.room_code}")
        return True

    def loop_sound(self, sound, duration, interrupt=True):
        """Loop a sound for a duration."""
        if sound not in self.audio:
            return False
        self._emit_to_sonos_connectors('loop_sound', {'sound': sound, 'duration': duration})
        return True

    def stop(self):
        """Stop all playback."""
        self._emit_to_sonos_connectors('stop_sound', {})
