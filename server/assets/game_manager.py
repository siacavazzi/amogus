import os
import logging
import random
import string
import time
from threading import Thread, Lock
from assets.game import Game
from assets.taskHandler import TaskHandler
from assets.sonosHandler import GameSpeaker
from assets.stats_tracker import StatsTracker


ROOM_TIMEOUT_SECONDS = 24 * 60 * 60


class GameManager:
    """
    Manages multiple concurrent game instances.
    Each game is identified by a unique room code.
    """

    def __init__(self, socketio, speaker, config, stats_path=None, selfie_store=None):
        self.socketio = socketio
        self.speaker = speaker
        self.config = config
        self.games = {}  # {room_code: Game}
        self.player_to_game = {}  # {player_id: room_code}
        self.sid_to_game = {}  # {socket_sid: room_code}
        self.lock = Lock()
        self.selfie_store = selfie_store

        # Persistent usage stats
        if stats_path is None:
            stats_path = os.path.join(os.path.dirname(__file__), '..', 'stats.json')
        self.stats_tracker = StatsTracker(stats_path)

        # Start cleanup thread for inactive games
        self._start_cleanup_thread()

    def _generate_room_code(self, length=4):
        """Generate a unique room code."""
        while True:
            code = ''.join(random.choices(string.ascii_uppercase, k=length))
            if code not in self.games:
                return code

    def create_game(self, sid, acquisition=None):
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
            
            # Create a per-game speaker for Sonos connectors
            game_speaker = GameSpeaker(self.socketio, room_code)
            
            # Create the game instance
            game = Game(
                socket=self.socketio,
                task_handler=task_handler,
                speaker=game_speaker,
                task_ratio=self.config['TASK_RATIO'],
                meltdown_time=self.config['MELTDOWN_TIME'],
                code_percent=self.config['CODE_PERCENT'],
                locations=locations,
                vote_time=self.config['VOTE_TIME'],
                card_draw_probability=self.config['CARD_DRAW_PROBABILITY'],
                numIntruders=self.config['NUMBER_OF_INTRUDERS'],
                starting_cards=self.config['STARTING_CARDS'],
                vote_threshold=self.config['VOTE_THRESHOLD'],
                room_code=room_code  # Pass room code for scoped emissions
            )
            
            # Hook end-of-game reporting via Game's optional callback
            game.on_end_callback = self.stats_tracker.record_game_ended
            game.on_abort_callback = self.stats_tracker.record_round_abandoned
            game.acquisition = StatsTracker.normalize_acquisition(acquisition)

            self.games[room_code] = game
            self.sid_to_game[sid] = room_code

        # Record outside the lock (StatsTracker has its own lock)
        self.stats_tracker.record_game_created(room_code, game.acquisition, game)
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
        # Track unique players across all games
        self.stats_tracker.record_player_seen(player_id)

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

    def remove_game(self, room_code, reason='room_removed'):
        """Remove a game (alias for delete_game)."""
        self.delete_game(room_code, reason)

    def delete_game(self, room_code, reason='room_removed'):
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
        with game.state_lock:
            if self.selfie_store:
                for player in game.players:
                    self.selfie_store.delete(player.selfie)
                    player.selfie = None
            try:
                self.stats_tracker.record_room_closed(game, reason)
            except Exception:
                logging.getLogger('app_logger').exception('Room close stats write failed')

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

    def get_admin_stats(self, task_list_count=None):
        """Build a snapshot of usage stats for the admin dashboard."""
        snapshot = self.stats_tracker.snapshot()
        now = time.time()
        day_seconds = 24 * 60 * 60

        completed = snapshot['completed_games']
        completed_today = [g for g in completed if g.get('ended_at') and now - g['ended_at'] <= day_seconds]

        durations = [g['duration_seconds'] for g in completed
                     if g.get('duration_basis') == 'round_start' and g.get('duration_seconds') is not None]
        avg_duration = int(sum(durations) / len(durations)) if durations else None
        setup_times = [g['setup_seconds'] for g in snapshot['round_history'] if g.get('setup_seconds') is not None]

        # Live games right now
        live_games = []
        with self.lock:
            for code, game in self.games.items():
                live_games.append({
                    'room_code': code,
                    'created_at': getattr(game, 'created_at', None),
                    'last_activity': getattr(game, 'last_activity', None),
                    'running': bool(getattr(game, 'game_running', False)),
                    'in_meeting': bool(getattr(game, 'meeting', False)),
                    'player_count': len(getattr(game, 'players', [])),
                    'has_ended': bool(getattr(game, 'end_state', None)),
                    'end_state': getattr(game, 'end_state', None),
                    'task_list_applied': bool(getattr(game, 'task_list_applied', False)),
                })

        return {
            'generated_at': now,
            'totals': {
                'games_created': snapshot['total_games_created'],
                'games_completed': snapshot['total_games_completed'],
                'unique_players': snapshot['unique_player_ids_count'],
                'saved_task_lists': task_list_count if task_list_count is not None else 0,
            },
            'today': {
                'games_completed': len(completed_today),
            },
            'live': {
                'active_games': len(live_games),
                'players_in_games': sum(g['player_count'] for g in live_games),
                'games': live_games,
            },
            'averages': {
                'game_duration_seconds': avg_duration,
                'duration_sample_count': len(durations),
                'setup_seconds': int(sum(setup_times) / len(setup_times)) if setup_times else None,
            },
            'recent_games': list(reversed(completed[-25:])),
            'acquisition': sorted(snapshot['acquisition'], key=lambda row: row['rooms_created'], reverse=True),
            'acquisition_since': snapshot['acquisition_since'],
            'metrics': {
                'schema_version': snapshot['metrics_schema_version'], 'since': snapshot['metrics_since'],
                'event_counts': snapshot['event_counts'], 'failure_reasons': snapshot['failure_reasons'],
                'round_outcomes': snapshot['round_outcomes'],
                'recent_rounds': list(reversed(snapshot['round_history'][-25:])),
            },
        }

    def _start_cleanup_thread(self):
        """Start a background thread to clean up inactive games."""
        def cleanup_loop():
            while True:
                time.sleep(300)  # Check every 5 minutes
                self._cleanup_inactive_games()
                if self.selfie_store:
                    self.selfie_store.cleanup_expired()
        
        thread = Thread(target=cleanup_loop, daemon=True)
        thread.start()

    def _cleanup_inactive_games(self):
        """Recheck room activity under its lock before removal."""
        current_time = time.time()
        with self.lock:
            rooms = list(self.games.items())

        for room_code, game in rooms:
            with game.state_lock:
                if self.games.get(room_code) is not game:
                    continue
                last_activity = getattr(game, 'last_activity', current_time)
                inactive = current_time - last_activity > ROOM_TIMEOUT_SECONDS
                end_time = getattr(game, 'end_time', None)
                expired_end = bool(game.end_state and end_time and current_time - end_time > ROOM_TIMEOUT_SECONDS)
                if not inactive and not expired_end:
                    continue
                self.socketio.emit('room_disbanded', {
                    'message': 'Room closed due to inactivity'
                }, room=room_code)
                self.delete_game(room_code, reason='inactivity')
