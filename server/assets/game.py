import random
import json
from collections import OrderedDict
from uuid import uuid4
from assets.player import Player
from assets.taskHandler import *
from assets.meltdown import *
from assets.card import *
from assets.meeting import *
import time
from threading import RLock, Thread
from flask_socketio import emit
from assets.utils import *


class Game:

    def __init__(self, socket, task_handler, speaker, task_ratio, meltdown_time, code_percent, locations, vote_time, card_draw_probability, numIntruders, starting_cards, vote_threshold, room_code=None):
        self.state_lock = RLock()
        self.revision = 0
        self.round_id = str(uuid4())
        self.command_results = OrderedDict()
        self.players = []
        self.task_handler = task_handler
        self.crew_score = 0
        self.game_running = False
        self.active_hack = 0
        self.hack_id = None
        self.active_meltdown = None
        self.meeting = False
        self.starting_cards = starting_cards
        self.numIntruders = numIntruders
        self.initial_numIntruders = numIntruders  # Store initial value for reset
        self.numCrew = None
        self.taskGoal = None
        self.completed_tasks = 0
        self.backgrounds = list(range(0, 16 + 1))  
        self.socket = socket
        self.end_state = None
        self.speaker = speaker
        self.denied_location = None
        self.locations = locations
        self.active_cards = []
        self.card_draw_probability = card_draw_probability
        self.card_deck_preset = 'default'
        self.card_deck_counts = DEFAULT_CARD_DECK_COUNTS.copy()

        # Tasks per player
        self.task_ratio = task_ratio
        self.meltdown_time = meltdown_time
        self.meltdown_time_mod = 0
        self.code_percent = code_percent
        self.vote_time = vote_time
        self.vote_threshold = vote_threshold
        
        # Multi-game support
        self.room_code = room_code
        self.created_at = time.time()
        self.last_activity = time.time()
        self.end_time = None

        # Optional callback fired the first time end_game is emitted
        # (used by GameManager to record usage stats)
        self.on_end_callback = None
        self._stats_start_recorded = False
        self._stats_recorded = False
        self.is_open = False  # Room not open until creator configures it
        self.creator_sid = None  # Track who created the room (socket id, can change on reconnect)
        self.creator_player_id = None  # Track who created the room (player id, persistent)
        
        # Reactor (desktop) support - must be set before CardDeck is created
        self.has_reactor = False
        self.reactor_sid = None
        
        # Collaborative task creation (Jackbox-style)
        self.collaborative_tasks = []
        self.task_creation_mode = False
        self.task_list_applied = False  # Track if a task list was explicitly applied
        self.collaborative_task_list_code = None  # Code if collaborative tasks have been saved
        self.collaborative_task_list_name = None  # Name of the task list
        self.collaborative_mode = False  # If True, all players can add tasks; if False, only host
        
        # Reset voting system
        self.reset_votes = set()  # Player IDs who want to play again
        
        # Intruder reveal - when tasks are 100% complete, identities are revealed
        self.intruders_revealed = False
        
        # Game statistics tracking
        self.stats = {
            'meetings_called': 0,
            'players_voted_out': 0,
            'cards_played': 0,
            'meltdowns_triggered': 0,
            'tasks_completed': 0,
            'fake_tasks_sent': [],  # List of {sender_name, target_name, task_text, task_location}
            'fake_tasks_completed': [],  # List of {player_name, task_text}
            'taunts_sent': [],  # List of {sender_name, target_name, message}
        }
        
        # Create card deck after has_reactor is set
        self.card_deck = CardDeck(locations, socket, self)

    def get_config(self):
        """Return the current game configuration as a dict."""
        return {
            'locations': [loc for loc in self.locations if loc != 'Other'],
            'vote_time': self.vote_time,
            'vote_threshold': self.vote_threshold,
            'meltdown_time': self.meltdown_time,
            'code_percent': self.code_percent,
            'num_intruders': self.numIntruders,
            'card_draw_probability': self.card_draw_probability,
            'starting_cards': self.starting_cards,
            'task_ratio': self.task_ratio,
            'card_deck_preset': self.card_deck_preset,
            'card_deck_counts': self.card_deck_counts.copy(),
            'card_deck_count_keys': CARD_DECK_COUNT_KEYS,
            'card_deck_presets': get_available_card_deck_presets(),
        }

    def update_config(self, config):
        """Update game configuration from a dict."""
        rebuild_card_deck = False

        if 'locations' in config:
            self.locations = config['locations'].copy()
            if 'Other' not in self.locations:
                self.locations.append('Other')
            self.task_handler.locations = self.locations
            # Only reset task handler if no task list was explicitly applied
            # Otherwise we'd lose the loaded task list!
            if not self.task_list_applied:
                self.task_handler.reset()  # Reload tasks with new locations
            rebuild_card_deck = True

        if 'card_deck_preset' in config:
            self.card_deck_preset = sanitize_card_deck_preset(config['card_deck_preset'])
            rebuild_card_deck = True

        if 'card_deck_counts' in config:
            self.card_deck_counts = sanitize_card_deck_counts(config['card_deck_counts'])
            rebuild_card_deck = True
        
        if 'vote_time' in config:
            self.vote_time = int(config['vote_time'])
        if 'vote_threshold' in config:
            self.vote_threshold = float(config['vote_threshold'])
        if 'meltdown_time' in config:
            self.meltdown_time = int(config['meltdown_time'])
        if 'code_percent' in config:
            self.code_percent = float(config['code_percent'])
        if 'num_intruders' in config:
            self.numIntruders = int(config['num_intruders'])
            self.initial_numIntruders = self.numIntruders
        if 'card_draw_probability' in config:
            self.card_draw_probability = float(config['card_draw_probability'])
        if 'starting_cards' in config:
            self.starting_cards = int(config['starting_cards'])
        if 'task_ratio' in config:
            self.task_ratio = int(config['task_ratio'])

        if rebuild_card_deck:
            self.card_deck = CardDeck(self.locations, self.socket, self)

    def emit_to_room(self, event, data=None):
        """Emit an event to all players in this game's room."""
        with self.state_lock:
            self.last_activity = time.time()
            if event == 'end_game':
                self.cancel_meltdown()

            # Fire end-of-game stats callback once when the game ends
            if event == 'end_game' and not self._stats_recorded:
                if self.on_end_callback:
                    try:
                        self.on_end_callback(self)
                    except Exception:
                        self._stats_recorded = True
                else:
                    self._stats_recorded = True

            payload = self._add_state_metadata(data)
            if self.room_code:
                if payload is not None:
                    self.socket.emit(event, payload, room=self.room_code)
                else:
                    self.socket.emit(event, room=self.room_code)
            else:
                # Fallback for single-game mode (backwards compatibility)
                if payload is not None:
                    self.socket.emit(event, payload)
                else:
                    self.socket.emit(event)

    def _add_state_metadata(self, data):
        if isinstance(data, dict):
            payload = data.copy()
        elif isinstance(data, str):
            try:
                payload = json.loads(data)
            except (TypeError, ValueError):
                return data
            if not isinstance(payload, dict):
                return data
        else:
            return data

        payload.update({
            'room_code': self.room_code,
            'revision': self.revision,
            'round_id': self.round_id,
        })
        return json.dumps(payload) if isinstance(data, str) else payload

    def begin_round(self):
        """Invalidate snapshots and command results from the previous round."""
        with self.state_lock:
            self.round_id = str(uuid4())
            self.command_results.clear()
            self.revision += 1
            return self.round_id

    def start_meltdown(self):
        with self.state_lock:
            if not self.game_running or self.end_state or self.meeting or self.active_meltdown:
                return False
            self.stats['meltdowns_triggered'] += 1
            meltdown_duration = max(self.meltdown_time - self.meltdown_time_mod, 1)
            meltdown = Meltdown(self.players, meltdown_duration, self.socket, self.speaker, self.code_percent)
            meltdown.game = self
            meltdown.round_id = self.round_id
            self.active_meltdown = meltdown
            self.meltdown_time_mod = 0
            self.card_deck.active_cards = [
                card for card in self.card_deck.active_cards
                if card.action != 'Shorten Meltdown'
            ]
            self.revision += 1
            self.speaker.loop_sound("meltdown", meltdown_duration)
            self.card_deck.emit_active_cards()
            meltdown.start_countdown()
            return True

    def cancel_meltdown(self):
        with self.state_lock:
            if not self.active_meltdown:
                return False
            self.active_meltdown.meltdown_active = False
            self.active_meltdown = None
            self.revision += 1
            self.speaker.stop()
            return True

    def check_pin(self, pin):
        with self.state_lock:
            if not self.active_meltdown:
                return False
            return self.active_meltdown.check_pin(pin)

    def meltdown(self, meltdown=None): # call when meltdown fails
        with self.state_lock:
            if meltdown and (self.active_meltdown is not meltdown or meltdown.round_id != self.round_id):
                return False
            if self.end_state:
                return False
            self.active_meltdown = None

            # Kill all crew members (intruders survive the meltdown because they're built different)
            for player in self.players:
                if player.alive and not player.sus:
                    player.set_death('meltdown')

            self.revision += 1
            self.end_state = "meltdown_fail"
            self.end_time = time.time()
            # Emit player list BEFORE end_game so clients have updated death info
            self.emit_player_list()
            self.emit_to_room("end_game", {'result': self.end_state, 'stats': self.stats})

            if self.speaker:
                self.speaker.play_sound("sus_victory")
            return True

    def emit_player_list(self):
        player_list = [player.to_json() for player in self.players]
        self.emit_to_room('game_data', {'action': 'player_list', 'list': player_list})

    def start_hack(self, duration):
        with self.state_lock:
            if self.active_hack > 0 or not self.game_running or self.end_state:
                return False
            self.speaker.play_sound('hack')
            self.active_hack = duration
            hack_id = str(uuid4())
            round_id = self.round_id
            self.hack_id = hack_id
            self.revision += 1
            self.emit_to_room("hack", duration)

            # Start a background thread to handle the countdown
            Thread(target=self._hack_countdown, args=(hack_id, round_id)).start()
            return True

    def _hack_countdown(self, hack_id=None, round_id=None):
        with self.state_lock:
            hack_id = hack_id or self.hack_id
            round_id = round_id or self.round_id
        while True:
            with self.state_lock:
                if round_id != self.round_id or hack_id != self.hack_id:
                    return
                if self.active_hack <= 0:
                    self.hack_id = None
                    return
            time.sleep(1)  # Wait 1 second without holding the room lock.
            with self.state_lock:
                if round_id != self.round_id or hack_id != self.hack_id:
                    return
                if self.active_hack <= 0:
                    self.hack_id = None
                    return
                self.active_hack -= 1
                self.revision += 1
                if self.active_hack == 0:
                    self.hack_id = None


    def addPlayer(self, sid, username, selfie_filename=None):
        player_id = str(uuid4())
        random_number = 1

        if not self.backgrounds:
            random_number = random.randint(0, 16)
        else:
            random_number = random.choice(self.backgrounds)
            print(random_number)
            self.backgrounds.remove(random_number)

        new_player = Player(sid=sid, player_id=player_id, username=username, pic=random_number, selfie=selfie_filename)
        self.players.append(new_player)

        return new_player
    
    def getTask(self):
        """Get the next task for a player."""
        return self.task_handler.get_task(self.denied_location)

    def assign_task(self, player, task=None):
        """Assign a room task or queued fake task with round-scoped identity."""
        with self.state_lock:
            if task is None:
                if not self.task_handler.tasks and self.collaborative_tasks:
                    self.task_handler.tasks = [saved_task.copy() for saved_task in self.collaborative_tasks]
                    random.shuffle(self.task_handler.tasks)
                assigned_task = self.getTask()
            else:
                assigned_task = task.copy()

            assigned_task['assignment_id'] = str(uuid4())
            assigned_task['round_id'] = self.round_id
            player.task = assigned_task
            self.revision += 1
            return assigned_task
    
    def reveal_intruders(self):
        """Reveal intruder identities to all players when tasks reach 100%.
        
        This doesn't end the game - intruders can still win by eliminating crew
        or triggering a meltdown. It just creates chaos by revealing who they are!
        """
        if self.intruders_revealed:
            return  # Already revealed
        
        self.intruders_revealed = True
        
        # Get list of intruder names
        intruder_names = [p.username for p in self.players if p.sus and p.alive]
        intruder_ids = [p.player_id for p in self.players if p.sus and p.alive]
        
        # Play a dramatic sound
        self.speaker.play_sound('intruders_revealed')
        
        # Emit the reveal event to all players
        self.emit_to_room('intruders_revealed', {
            'intruder_names': intruder_names,
            'intruder_ids': intruder_ids,
            'message': f"TASKS COMPLETE! The intruder{'s are' if len(intruder_names) > 1 else ' is'}: {', '.join(intruder_names)}!"
        })
        
        # Update player list so clients can show who is sus
        self.emit_player_list()

    def resetRoles(self):
        for player in self.players:
            player.sus = False

    def drawCards(self, probability=1):
        for i in range(0, len(self.players)):
            if self.players[i].sus and self.players[i].alive:
                card = self.card_deck.draw_card(probability)
                if card:
                    self.players[i].cards.append(card)
                    send_message_to_player(self.socket, self.players[i].player_id, f"You drew {card.action}")

        self.emit_player_list()


    def assignRoles(self):
        self.resetRoles()
        
        # Rebuild the card deck now that we know if there's a reactor
        self.card_deck._build_deck()

        if self.numIntruders > len(self.players):
            self.numIntruders = len(self.players)
    
        self.numCrew = len(self.players) - self.numIntruders
        random.shuffle(self.players)
        for i in range(0, self.numIntruders):
            self.players[i].sus = True
            for _ in range(0, self.starting_cards):
                card = self.card_deck.draw_card()
                if card:
                    self.players[i].cards.append(card)

        random.shuffle(self.players)
        print("assigning roles...")
        print(self.players)

        numCrew = len(self.players) - self.numIntruders
        
        self.taskGoal = numCrew * self.task_ratio

        print(f"{numCrew} crew and {self.numIntruders} intruders (reactor: {self.has_reactor})")

    def getPlayerBySid(self, sid):
        for player in self.players:
            if player.sid == sid:
                return player
        return None

    def getPlayerById(self, player_id):
        for player in self.players:
            if player.player_id == player_id:
                return player
        return None
    
    def reset(self):
        with self.state_lock:
            self.cancel_meltdown()
            self.begin_round()
            self._reset_locked()

    def _reset_locked(self):
        """Clear players and all game state while the room lock is held."""
        self.players = []
        self.crew_score = 0
        self.game_running = False
        self.active_hack = 0
        self.hack_id = None
        self.active_meltdown = None
        self.meeting = False
        self.numIntruders = self.initial_numIntruders  # Restore to config value
        self.numCrew = None
        self.taskGoal = None
        self.completed_tasks = 0
        self.backgrounds = list(range(0, 16 + 1))  
        self.end_state = None
        self.end_time = None
        self.denied_location = None
        self.meltdown_time_mod = 0
        self.active_cards = []
        self.intruders_revealed = False
        self.card_deck = CardDeck(self.locations, self.socket, self)
        self.task_handler.reset()
        self.last_activity = time.time()
        self._stats_start_recorded = False
        self._stats_recorded = False

    def reset_game_state(self):
        with self.state_lock:
            self.cancel_meltdown()
            self.begin_round()
            self._reset_game_state_locked()

    def _reset_game_state_locked(self):
        """Reset round state but keep players while the room lock is held."""
        self.crew_score = 0
        self.game_running = False
        self.active_hack = 0
        self.hack_id = None
        self.active_meltdown = None
        self.meeting = False
        self.taskGoal = None
        self.completed_tasks = 0
        self.end_state = None
        self.end_time = None
        self.denied_location = None
        self.meltdown_time_mod = 0
        self.active_cards = []  # Clear active cards (Area Denial, etc.)
        self.numIntruders = self.initial_numIntruders  # Restore initial intruder count
        self.numCrew = None  # Will be recalculated on game start
        self.intruders_revealed = False
        self.card_deck = CardDeck(self.locations, self.socket, self)
        self.reset_votes = set()  # Clear reset votes
        self._stats_start_recorded = False
        self._stats_recorded = False  # Allow next end to record stats
        
        # Reset game statistics
        self.stats = {
            'meetings_called': 0,
            'players_voted_out': 0,
            'cards_played': 0,
            'meltdowns_triggered': 0,
            'tasks_completed': 0,
            'fake_tasks_sent': [],
            'fake_tasks_completed': [],
            'taunts_sent': [],
        }
        
        # Keep the full room task pool for replay, even when no saved list exists.
        if self.collaborative_tasks:
            self.task_handler.tasks = [task.copy() for task in self.collaborative_tasks]
        else:
            self.task_handler.reset()
            if not self.task_list_applied:
                self.collaborative_task_list_code = None
        
        self.task_creation_mode = False
        self.last_activity = time.time()
        
        # Reset backgrounds for new profile pics
        self.backgrounds = list(range(0, 16 + 1))
        # Remove used backgrounds from available pool
        for player in self.players:
            if player.pic in self.backgrounds:
                self.backgrounds.remove(player.pic)

    def start_meeting(self, player_who_started_it):
        with self.state_lock:
            if not self.game_running or self.end_state or self.meeting:
                return False
            if player_who_started_it not in self.players or not player_who_started_it.alive:
                return False
            for player in self.players:
                player.ready = not player.alive
            self.meeting = Meeting(self.vote_time, self.socket, player_who_started_it, self)
            self.revision += 1
            self.stats['meetings_called'] += 1
            self.speaker.play_sound('meeting')
            self.emit_to_room("meeting", self.meeting.to_json())
            return True

    def get_num_living_players(self):
        with self.state_lock:
            return sum(1 for player in self.players if player.alive)

    def try_start_voting(self):
        with self.state_lock:
            meeting = self.meeting
            if not meeting or meeting.stage != 'waiting' or meeting.round_id != self.round_id:
                return False

            living_players = [player for player in self.players if player.alive]
            if not living_players or any(not player.ready for player in living_players):
                return False

            started = meeting.start_voting()
            if started:
                for player in self.players:
                    player.ready = not player.alive
            return started


    def kill_player(self, player_id, death_cause='unknown', task_name=None):
        with self.state_lock:
            return self._kill_player_locked(player_id, death_cause, task_name)

    def _kill_player_locked(self, player_id, death_cause='unknown', task_name=None):
        """
        Kill a player while the room lock is held.
        
        Args:
            player_id: The ID of the player to kill
            death_cause: The cause of death (e.g., 'voted_out', 'murdered', 'meltdown', etc.)
            task_name: Optional task name if they died during a task
        """
        player = self.getPlayerById(player_id)
        if not player or not player.alive:
            return
        
        # Set death cause and message using the player's method
        death_message = player.set_death(death_cause, task_name)
        self.revision += 1
        print(f"Player {player.username} died: {death_cause} - {death_message}")

        if self.end_state:
            self.emit_player_list()
            return

        if not player.sus:
            self.numCrew -= 1
            if self.numIntruders > 0 and self.numCrew <= self.numIntruders:
                self.end_state = 'sus_victory'
                self.end_time = time.time()
                self.cancel_meltdown()
                self.speaker.play_sound('sus_victory')
                if self.meeting:
                    self.meeting.on_player_death()
                # Emit player list BEFORE end_game so clients have updated death info
                self.emit_player_list()
                self.emit_to_room("end_game", {'result': self.end_state, 'stats': self.stats})
                return
    
            
        else:
            self.numIntruders -= 1
            if self.numIntruders <= 0:
                self.end_state = 'victory'
                self.end_time = time.time()
                self.cancel_meltdown()
                self.speaker.play_sound('crew_victory')
                if self.meeting:
                    self.meeting.on_player_death()
                # Emit player list BEFORE end_game so clients have updated death info
                self.emit_player_list()
                self.emit_to_room("end_game", {'result': self.end_state, 'stats': self.stats})
                return
                
        self.emit_player_list()
        if self.meeting:
            if self.meeting.stage == 'voting':
                self.meeting.on_player_death()
            else:
                self.try_start_voting()
