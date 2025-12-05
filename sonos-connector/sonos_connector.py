#!/usr/bin/env python3
"""
Among Us Sonos Connector
========================
A lightweight client that connects to the hosted Among Us game server
and plays sounds on your local Sonos speakers.

Usage:
    python sonos_connector.py [room_code]
    
    Or run the executable:
    ./sonos_connector [room_code]

Requirements:
    pip install python-socketio soco requests
"""

import sys
import time
import logging
import argparse
from threading import Thread, Lock

try:
    import socketio
except ImportError:
    print("Missing dependency: python-socketio")
    print("Install with: pip install python-socketio")
    sys.exit(1)

try:
    from soco import discover, SoCoException
    from requests.exceptions import ReadTimeout, ConnectTimeout, Timeout
except ImportError:
    print("Missing dependency: soco")
    print("Install with: pip install soco")
    sys.exit(1)


# ============ Configuration ============
DEFAULT_SERVER = "https://amogus-party.duckdns.org"
AUDIO_BASE_URL = "https://raw.githubusercontent.com/siacavazzi/amogus_assets/main/audio/"

# Audio file mapping
AUDIO_FILES = {
    "test": "test.mp3",
    "theme": "theme.mp3",
    "meeting": "meeting.mp3",
    "start": "start.mp3",
    "meltdown": "meltdown.mp3",
    "sus_victory": "sus_victory.mp3",
    "crew_victory": "victory.mp3",
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

# ============ Logging Setup ============
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[logging.StreamHandler()]
)
logger = logging.getLogger(__name__)


# ============ Sonos Controller ============
class SonosController:
    """Controls Sonos speakers on the local network."""
    
    def __init__(self, volume=30, ignore_bedroom=True):
        self.volume = volume
        self.ignore_bedroom = ignore_bedroom
        self.speakers = []
        self.master_speaker = None
        self.ready = False
        self.stop_loop = False
        self.loop_thread = None
        self.lock = Lock()
        
        self._discover_speakers()
        
    def _discover_speakers(self):
        """Discover and initialize Sonos speakers."""
        logger.info("🔍 Discovering Sonos speakers...")
        
        try:
            discovered = discover(timeout=10)
            if not discovered:
                logger.error("❌ No Sonos speakers found!")
                return
            
            discovered = list(discovered)
            logger.info(f"Found {len(discovered)} speaker(s)")
            
            # Filter unreachable speakers
            reachable = []
            for speaker in discovered:
                try:
                    name = speaker.player_name
                    reachable.append(speaker)
                    logger.info(f"  ✓ {name}")
                except Exception as e:
                    logger.warning(f"  ✗ Speaker at {speaker.ip_address} unreachable")
            
            # Filter bedroom speakers if requested
            if self.ignore_bedroom:
                self.speakers = [s for s in reachable if 'suite' not in s.player_name.lower()]
            else:
                self.speakers = reachable
            
            if not self.speakers:
                logger.error("❌ No usable speakers after filtering!")
                return
            
            # Initialize master speaker
            self._initialize_master()
            
        except Exception as e:
            logger.error(f"❌ Error discovering speakers: {e}")
    
    def _initialize_master(self):
        """Set up master speaker and join others."""
        for speaker in self.speakers:
            try:
                self.master_speaker = speaker
                logger.info(f"🔊 Master speaker: {speaker.player_name}")
                
                # Join other speakers
                for other in self.speakers:
                    if other != speaker:
                        try:
                            other.join(speaker)
                            logger.info(f"  ↳ Joined: {other.player_name}")
                        except Exception as e:
                            logger.warning(f"  ↳ Failed to join {other.player_name}: {e}")
                
                # Set volume
                speaker.volume = self.volume
                logger.info(f"🔈 Volume set to {self.volume}%")
                
                self.ready = True
                return
                
            except Exception as e:
                logger.warning(f"Failed with {speaker.player_name}, trying next...")
        
        logger.error("❌ Could not initialize any speaker as master")
    
    def play_sound(self, sound, interrupt=True):
        """Play a sound on the Sonos system."""
        if not self.ready:
            logger.warning("Sonos not ready!")
            return False
        
        if sound not in AUDIO_FILES:
            logger.error(f"Unknown sound: {sound}")
            return False
        
        if interrupt:
            self.stop()
        
        try:
            uri = AUDIO_BASE_URL + AUDIO_FILES[sound]
            self.master_speaker.play_uri(uri)
            logger.info(f"🎵 Playing: {sound}")
            return True
        except Exception as e:
            logger.error(f"Failed to play {sound}: {e}")
            return False
    
    def loop_sound(self, sound, duration):
        """Loop a sound for a duration."""
        if not self.ready or sound not in AUDIO_FILES:
            return False
        
        self.stop()
        self.stop_loop = False
        
        def loop_task():
            with self.lock:
                try:
                    uri = AUDIO_BASE_URL + AUDIO_FILES[sound]
                    end_time = time.time() + duration
                    
                    while time.time() < end_time and not self.stop_loop:
                        self.master_speaker.play_uri(uri)
                        logger.info(f"🔁 Looping: {sound}")
                        
                        # Wait for track to finish
                        while not self.stop_loop:
                            info = self.master_speaker.get_current_transport_info()
                            state = info.get('current_transport_state', '').lower()
                            if state not in ('playing', 'transitioning'):
                                break
                            time.sleep(0.5)
                    
                except Exception as e:
                    logger.error(f"Loop error: {e}")
        
        self.loop_thread = Thread(target=loop_task, daemon=True)
        self.loop_thread.start()
        return True
    
    def stop(self):
        """Stop all playback."""
        self.stop_loop = True
        if self.ready and self.master_speaker:
            try:
                self.master_speaker.stop()
                if self.loop_thread and self.loop_thread.is_alive():
                    self.loop_thread.join(timeout=2)
            except Exception:
                pass


# ============ Socket.IO Client ============
class SonosConnector:
    """Connects to the game server and plays sounds on Sonos."""
    
    def __init__(self, server_url, room_code, volume=30):
        self.server_url = server_url
        self.room_code = room_code.upper()
        self.sonos = SonosController(volume=volume)
        self.sio = socketio.Client(reconnection=True, reconnection_attempts=0)
        self.connected = False
        
        self._setup_handlers()
    
    def _setup_handlers(self):
        """Set up Socket.IO event handlers."""
        
        @self.sio.event
        def connect():
            logger.info(f"✅ Connected to server!")
            self.connected = True
            # Join the game room as a Sonos controller
            self.sio.emit('sonos_join', {'room_code': self.room_code})
        
        @self.sio.event
        def disconnect():
            logger.info("❌ Disconnected from server")
            self.connected = False
        
        @self.sio.event
        def connect_error(data):
            logger.error(f"Connection error: {data}")
        
        @self.sio.on('sonos_joined')
        def on_joined(data):
            logger.info(f"🎮 Joined room: {self.room_code}")
            if self.sonos.ready:
                self.sonos.play_sound('test')
        
        @self.sio.on('sonos_error')
        def on_error(data):
            logger.error(f"❌ {data.get('message', 'Unknown error')}")
        
        # Sound events from the game
        @self.sio.on('play_sound')
        def on_play_sound(data):
            sound = data.get('sound')
            if sound:
                self.sonos.play_sound(sound)
        
        @self.sio.on('loop_sound')
        def on_loop_sound(data):
            sound = data.get('sound')
            duration = data.get('duration', 60)
            if sound:
                self.sonos.loop_sound(sound, duration)
        
        @self.sio.on('stop_sound')
        def on_stop_sound(data=None):
            self.sonos.stop()
    
    def connect(self):
        """Connect to the game server."""
        if not self.sonos.ready:
            logger.error("❌ Sonos not ready - cannot connect")
            return False
        
        try:
            logger.info(f"🔌 Connecting to {self.server_url}...")
            self.sio.connect(self.server_url, transports=['websocket', 'polling'])
            return True
        except Exception as e:
            logger.error(f"❌ Connection failed: {e}")
            return False
    
    def disconnect(self):
        """Disconnect from the server."""
        self.sonos.stop()
        if self.connected:
            self.sio.disconnect()
    
    def wait(self):
        """Wait for the connection to end."""
        try:
            self.sio.wait()
        except KeyboardInterrupt:
            logger.info("\n👋 Shutting down...")
            self.disconnect()


# ============ Main ============
def print_banner():
    print("""
╔═══════════════════════════════════════════════════════════╗
║                                                           ║
║     🎮 AMONG US - SONOS CONNECTOR 🔊                      ║
║                                                           ║
║     Connect your Sonos speakers to the game!              ║
║                                                           ║
╚═══════════════════════════════════════════════════════════╝
    """)


def main():
    print_banner()
    
    parser = argparse.ArgumentParser(description='Connect Sonos speakers to Among Us game')
    parser.add_argument('room_code', nargs='?', help='Game room code to join')
    parser.add_argument('--server', default=DEFAULT_SERVER, help='Game server URL')
    parser.add_argument('--volume', type=int, default=30, help='Speaker volume (0-100)')
    parser.add_argument('--include-bedroom', action='store_true', help='Include bedroom speakers')
    
    args = parser.parse_args()
    
    # Get room code interactively if not provided
    room_code = args.room_code
    if not room_code:
        room_code = input("Enter room code: ").strip()
    
    if not room_code:
        logger.error("Room code is required!")
        sys.exit(1)
    
    # Create connector and connect
    connector = SonosConnector(
        server_url=args.server,
        room_code=room_code,
        volume=args.volume
    )
    
    if connector.connect():
        logger.info("🎧 Listening for game events... (Ctrl+C to quit)")
        connector.wait()
    else:
        sys.exit(1)


if __name__ == '__main__':
    main()
