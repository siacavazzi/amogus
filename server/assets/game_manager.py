import random
import string
import time
from threading import Thread, Lock
from assets.game import Game
from assets.taskHandler import TaskHandler


class GameManager:
    """
    Manages multiple concurrent game instances.
    Each game is identified by a unique room code.
    """

    def __init__(self, socketio, speaker, config):
        self.socketio = socketio
        self.speaker = speaker
        self.config = config
        self.games = {}  # {room_code: Game}
        self.player_to_game = {}  # {player_id: room_code}
        self.sid_to_game = {}  # {socket_sid: room_code}
        self.lock = Lock()
        
        # Start cleanup thread for inactive games
        self._start_cleanup_thread()

    def _generate_room_code(self, length=4):
        """Generate a unique room code."""
        while True:
            code = ''.join(random.choices(string.ascii_uppercase, k=length))
            if code not in self.games:
                return code

    def create_game(self, sid):
        """Create a new game and return the room code."""
        with self.lock:
            room_code = self._generate_room_code()
            
            # Create locations list
            locations = self.config['LOCATIONS'].copy()
            locations.append("Other")
            
            # Create a task handler for this game
            task_handler = TaskHandler(locations)
            # Clear default tasks - players must load a task list or create tasks collaboratively
            task_handler.tasks = []
            
            # Create the game instance
            game = Game(
                socket=self.socketio,
                task_handler=task_handler,
                speaker=self.speaker,
                task_ratio=self.config['TASK_RATIO'],
                meltdown_time=self.config['MELTDOWN_TIME'],
                code_percent=self.config['CODE_PERCENT'],
                locations=locations,
                vote_time=self.config['VOTE_TIME'],
                card_draw_probability=self.config['CARD_DRAW_PROBABILITY'],
                numImposters=self.config['NUMBER_OF_IMPOSTERS'],
                starting_cards=self.config['STARTING_CARDS'],
                vote_threshold=self.config['VOTE_THRESHOLD'],
                room_code=room_code  # Pass room code for scoped emissions
            )
            
            self.games[room_code] = game
            self.sid_to_game[sid] = room_code
            
            return room_code, game

    def get_game(self, room_code):
        """Get a game by room code."""
        return self.games.get(room_code)

    def get_game_by_player_id(self, player_id):
        """Get the game a player belongs to."""
        room_code = self.player_to_game.get(player_id)
        if room_code:
            return self.games.get(room_code), room_code
        return None, None

    def get_game_by_sid(self, sid):
        """Get the game associated with a socket ID."""
        room_code = self.sid_to_game.get(sid)
        if room_code:
            return self.games.get(room_code), room_code
        return None, None

    def register_player(self, player_id, room_code, sid):
        """Register a player to a game."""
        with self.lock:
            self.player_to_game[player_id] = room_code
            self.sid_to_game[sid] = room_code

    def unregister_sid(self, sid):
        """Remove a socket ID mapping (on disconnect)."""
        with self.lock:
            if sid in self.sid_to_game:
                del self.sid_to_game[sid]

    def update_sid(self, player_id, new_sid):
        """Update socket ID for a player (on reconnect)."""
        with self.lock:
            room_code = self.player_to_game.get(player_id)
            if room_code:
                self.sid_to_game[new_sid] = room_code

    def unregister_player(self, player_id):
        """Remove a player from tracking."""
        with self.lock:
            if player_id in self.player_to_game:
                del self.player_to_game[player_id]

    def remove_game(self, room_code):
        """Remove a game (alias for delete_game)."""
        self.delete_game(room_code)

    def delete_game(self, room_code):
        """Delete a game and clean up all references."""
        with self.lock:
            if room_code not in self.games:
                return
            
            game = self.games[room_code]
            
            # Remove player mappings
            players_to_remove = [
                pid for pid, rc in self.player_to_game.items() 
                if rc == room_code
            ]
            for pid in players_to_remove:
                del self.player_to_game[pid]
            
            # Remove sid mappings
            sids_to_remove = [
                sid for sid, rc in self.sid_to_game.items() 
                if rc == room_code
            ]
            for sid in sids_to_remove:
                del self.sid_to_game[sid]
            
            # Delete the game
            del self.games[room_code]
            print(f"Game {room_code} deleted")

    def get_all_games(self):
        """Get info about all active games."""
        return {
            code: {
                'player_count': len(game.players),
                'running': game.game_running,
                'created': getattr(game, 'created_at', None)
            }
            for code, game in self.games.items()
        }

    def _start_cleanup_thread(self):
        """Start a background thread to clean up inactive games."""
        def cleanup_loop():
            while True:
                time.sleep(300)  # Check every 5 minutes
                self._cleanup_inactive_games()
        
        thread = Thread(target=cleanup_loop, daemon=True)
        thread.start()

    def _cleanup_inactive_games(self):
        """Remove games that have been inactive for too long."""
        current_time = time.time()
        games_to_remove = []
        
        with self.lock:
            for room_code, game in self.games.items():
                # Check if game has been inactive for 1 hour
                last_activity = getattr(game, 'last_activity', current_time)
                if current_time - last_activity > 3600:  # 1 hour
                    games_to_remove.append(room_code)
                
                # Also remove games that ended more than 30 minutes ago
                if game.end_state and hasattr(game, 'end_time'):
                    if game.end_time and current_time - game.end_time > 1800:  # 30 minutes
                        if room_code not in games_to_remove:
                            games_to_remove.append(room_code)
        
        for room_code in games_to_remove:
            # Notify clients before removing
            game = self.games.get(room_code)
            if game:
                self.socketio.emit('room_disbanded', {
                    'message': 'Room closed due to inactivity'
                }, room=room_code)
            self.delete_game(room_code)
            print(f"Cleaned up inactive game: {room_code}")
