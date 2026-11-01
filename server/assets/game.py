import math
import random
import json
import logging
from collections import OrderedDict
from uuid import uuid4
from assets.player import Player
from assets.taskHandler import *
from assets.meltdown import *
from assets.card import *
from assets.meeting import *
from assets.meeting import MEETING_QUORUM, QUORUM_MIN_PLAYERS
import time
from threading import RLock, Thread
from flask_socketio import emit
from assets.utils import *
from assets.scaling import (MAX_CARD_DRAWS_PER_MEETING, SOLO_INTRUDER_STARTING_CARDS, auto_intruder_count,
                            auto_tasks_per_crewmate)

# Number of built-in player avatars (client/src/components/Avatar.js); Player.pic is an index into them.
AVATAR_COUNT = 18
LAST_STAND_TASKS = 3  # Tasks the last crewmate needs to finish to win a last stand


def is_avatar_id(pic):
    return isinstance(pic, int) and not isinstance(pic, bool) and 0 <= pic < AVATAR_COUNT


class Game:

    def __init__(self, socket, task_handler, speaker, task_ratio, meltdown_time, code_percent, locations, vote_time, card_draw_probability, numIntruders, starting_cards, vote_threshold, room_code=None, auto_intruders=False):
        self.state_lock = RLock()
        self.revision = 0
        self.round_id = str(uuid4())
        self.room_session_id = str(uuid4())
        self.round_number = 0
        self.command_results = OrderedDict()
        self.players = []
        # Phones that arrived mid-round. They are kept out of self.players, so no role, vote,
        # meltdown code or win check counts them, and join the lobby when the round ends.
        self.waiting_players = []
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
        # Auto: the intruder count is worked out from the headcount at each Start (see assets/scaling.py)
        self.auto_intruders = auto_intruders
        self.round_intruder_count = None  # Intruders dealt this round, for stats
        self.numCrew = None
        self.taskGoal = None
        self.completed_tasks = 0
        self.backgrounds = list(range(AVATAR_COUNT))
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
        # Rooms over QUORUM_MIN_PLAYERS - 1 open voting once MEETING_QUORUM of them slide ready;
        # a host who wants everyone at every meeting turns this off in Advanced Settings.
        self.meeting_quorum = True
        
        # Multi-game support
        self.room_code = room_code
        self.created_at = time.time()
        self.lobby_started_at = self.created_at
        self.lobby_started_monotonic = time.monotonic()
        self.room_opened_at = None
        self.round_started_at = None
        self.round_started_monotonic = None
        self.round_ended_monotonic = None
        self.last_gameplay_at = None
        self._round_metrics = {}
        self.last_activity = time.time()
        self.end_time = None

        # Optional callback fired the first time end_game is emitted
        # (used by GameManager to record usage stats)
        self.on_end_callback = None
        self.on_abort_callback = None
        # Optional callback(event, game, player_id=None, **fields) for the gameplay event log
        self.on_event_callback = None
        self.task_seconds = []  # Assignment-to-done seconds for this round's real tasks
        self._stats_start_recorded = False
        self._stats_recorded = False
        self.is_open = False  # Room not open until creator configures it
        self.creator_sid = None  # Track who created the room (socket id, can change on reconnect)
        self.creator_player_id = None  # Track who created the room (player id, persistent)
        # Secret handed to the creating socket, so a host who reconnects or reloads during
        # setup (before they have a player) can take the room back.
        self.host_token = None
        
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

        # Test game - one or two players trying the game, kept out of stats
        self.test_mode = False
        # 'last_stand' for 3-player, 1-intruder rounds (see assignRoles); set per round.
        self.ruleset = 'standard'
        self.last_stand = False  # True once it's down to 1 intruder vs 1 crew
        
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
            'win_condition': None,
        }
        
        # Create card deck after has_reactor is set
        self.card_deck = CardDeck(locations, socket, self)

    def get_config(self):
        """Return the current game configuration as a dict."""
        return {
            'locations': [loc for loc in self.locations if loc != 'Other'],
            'vote_time': self.vote_time,
            'vote_threshold': self.vote_threshold,
            'meeting_quorum': self.meeting_quorum,
            'meltdown_time': self.meltdown_time,
            'code_percent': self.code_percent,
            'num_intruders': 'auto' if self.auto_intruders else self.initial_numIntruders,
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
        if 'meeting_quorum' in config:
            self.meeting_quorum = config['meeting_quorum'] is True
        if 'meltdown_time' in config:
            self.meltdown_time = int(config['meltdown_time'])
        if 'code_percent' in config:
            self.code_percent = float(config['code_percent'])
        if 'num_intruders' in config:
            if config['num_intruders'] == 'auto':
                self.auto_intruders = True
            else:
                self.auto_intruders = False
                self.numIntruders = int(config['num_intruders'])
                self.initial_numIntruders = self.numIntruders
        if 'card_draw_probability' in config:
            self.card_draw_probability = float(config['card_draw_probability'])
        if 'starting_cards' in config:
            self.starting_cards = int(config['starting_cards'])
        if 'task_ratio' in config:
            self.task_ratio = 'auto' if config['task_ratio'] == 'auto' else int(config['task_ratio'])

        if rebuild_card_deck:
            self.card_deck = CardDeck(self.locations, self.socket, self)

    def emit_to_room(self, event, data=None):
        """Emit an event to all players in this game's room."""
        with self.state_lock:
            self.last_activity = time.time()
            if event == 'end_game':
                self.cancel_meltdown()
                if self.meeting:
                    self.meeting.log_end(self.meeting.reason or 'round_ended')

            # Fire end-of-game stats callback once when the game ends
            if event == 'end_game' and not self._stats_recorded:
                if self.on_end_callback:
                    try:
                        self.on_end_callback(self)
                    except Exception:
                        logging.getLogger('app_logger').exception('Round stats callback failed')
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

    def log_event(self, event, player_id=None, **fields):
        """Write a gameplay event without letting a stats failure touch the round."""
        if not self.on_event_callback:
            return
        try:
            self.on_event_callback(event, self, player_id=player_id, **fields)
        except Exception:
            logging.getLogger('app_logger').exception('Gameplay event write failed')

    def round_seconds(self):
        start = getattr(self, 'round_started_monotonic', None)
        return round(max(0, time.monotonic() - start), 3) if start is not None else None

    def living_counts(self):
        living = [player for player in self.players if player.alive]
        return {
            'living_crew': sum(1 for player in living if not player.sus),
            'living_intruders': sum(1 for player in living if player.sus),
        }

    def task_summary(self):
        """Task timing for the round summary: no task text, only durations and counts."""
        seconds = sorted(self.task_seconds)
        now = time.monotonic()
        held = [now - player.task_assigned_monotonic for player in self.players
                if player.alive and not player.sus and player.task
                and getattr(player, 'task_assigned_monotonic', None) is not None]
        return {
            'median_task_seconds': round(seconds[len(seconds) // 2], 1) if seconds else None,
            'slowest_task_seconds': round(seconds[-1], 1) if seconds else None,
            # No skip button exists, so a task held this long is the "gave up on it" signal.
            'tasks_held_over_5_min_at_end': sum(1 for value in held if value >= 300),
        }

    def task_source(self):
        """Where this room's tasks came from, without their text."""
        if self.task_list_applied:
            return 'generator' if getattr(self, 'setup_origin', None) == 'generator' else 'saved_list'
        if self.collaborative_tasks:
            return 'group' if self.collaborative_mode else 'typed'
        return 'builtin'

    def begin_round(self):
        """Invalidate snapshots and command results from the previous round."""
        with self.state_lock:
            self.round_id = str(uuid4())
            self.command_results.clear()
            self.revision += 1
            return self.round_id

    def _record_abandoned_round(self, reason):
        if self.on_abort_callback and self.round_started_at is not None and not self._stats_recorded:
            try:
                self.on_abort_callback(self, reason)
            except Exception:
                logging.getLogger('app_logger').exception('Interrupted round stats callback failed')

    def _reset_round_clock(self):
        self.lobby_started_at = time.time()
        self.lobby_started_monotonic = time.monotonic()
        self.round_started_at = None
        self.round_started_monotonic = None
        self.round_ended_monotonic = None
        self.last_gameplay_at = None
        self._round_metrics = {}

    def start_meltdown(self, trigger='reactor'):
        with self.state_lock:
            if not self.game_running or self.end_state or self.meeting or self.active_meltdown:
                return False
            if not self.reactor_sid:
                return False  # Codes are typed in at the reactor; without one a meltdown can't be stopped.
            self.stats['meltdowns_triggered'] += 1
            # Shorten Meltdown cards stack, but always leave half the time to reach the reactor.
            meltdown_duration = max(self.meltdown_time - self.meltdown_time_mod, math.ceil(self.meltdown_time / 2), 1)
            meltdown = Meltdown(self.players, meltdown_duration, self.socket, self.speaker, self.code_percent)
            meltdown.game = self
            meltdown.round_id = self.round_id
            meltdown.trigger = trigger
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
            if self.active_meltdown.meltdown_active:
                self.active_meltdown.log_end('round_ended')
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
            self.stats['win_condition'] = 'meltdown'
            self.end_time = time.time()
            self.round_ended_monotonic = time.monotonic()
            # Emit player list BEFORE end_game so clients have updated death info
            self.emit_player_list()
            self.emit_to_room("end_game", {'result': self.end_state, 'stats': self.stats})

            if self.speaker:
                self.speaker.play_sound("sus_victory")
            return True

    def player_view(self, viewer=None):
        """The player list as `viewer` may see it (None: the reactor or anyone not playing).

        A phone sees its own role, cards and code. Roles of others show only once they're
        known: to fellow intruders, for the dead, for exposed intruders, and at game over.
        """
        viewer_is_intruder = bool(viewer and viewer.sus)
        view = []
        for player in self.players:
            own = viewer is player
            show_role = (own or bool(self.end_state) or not player.alive
                         or (player.sus and (viewer_is_intruder or self.intruders_revealed)))
            view.append(player.to_json(show_role=show_role, show_secrets=own))
        return view

    def emit_player_list(self, action='player_list'):
        """Send each phone its own view of the player list, and everyone else the public one."""
        with self.state_lock:
            self.last_activity = time.time()
            player_sids = [player.sid for player in self.players if player.sid]
            public = self._add_state_metadata({'action': action, 'list': self.player_view()})
            if self.room_code:
                self.socket.emit('game_data', public, room=self.room_code, skip_sid=player_sids or None)
            for player in self.players:
                if player.sid:
                    self.socket.emit('game_data', self._add_state_metadata(
                        {'action': action, 'list': self.player_view(player)}), to=player.sid)

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


    def _new_player(self, sid, username, selfie_filename=None, pic=None):
        player_id = str(uuid4())

        # Honor the player's chosen avatar while it's free. Once every avatar is
        # taken, duplicates are allowed, so the chosen one is still honored.
        if is_avatar_id(pic) and (pic in self.backgrounds or not self.backgrounds):
            avatar = pic
        elif self.backgrounds:
            avatar = random.choice(self.backgrounds)
        else:
            avatar = random.randint(0, AVATAR_COUNT - 1)
        if avatar in self.backgrounds:
            self.backgrounds.remove(avatar)

        return Player(sid=sid, player_id=player_id, username=username, pic=avatar, selfie=selfie_filename)

    def addPlayer(self, sid, username, selfie_filename=None, pic=None):
        new_player = self._new_player(sid, username, selfie_filename, pic)
        self.players.append(new_player)
        return new_player

    def add_waiting_player(self, sid, username, selfie_filename=None, pic=None):
        """A phone that arrived mid-round: it plays from the next round."""
        new_player = self._new_player(sid, username, selfie_filename, pic)
        new_player.waiting = True
        self.waiting_players.append(new_player)
        self.revision += 1
        return new_player

    def get_waiting_player(self, player_id=None, sid=None):
        for player in self.waiting_players:
            if (player_id and player.player_id == player_id) or (sid and player.sid == sid):
                return player
        return None

    def remove_waiting_player(self, player):
        """Take a waiting phone off the list and free its avatar. Returns True if it was there."""
        if player not in self.waiting_players:
            return False
        self.waiting_players.remove(player)
        in_use = any(other.pic == player.pic for other in self.players + self.waiting_players)
        if player.pic not in self.backgrounds and not in_use:
            self.backgrounds.append(player.pic)
        self.revision += 1
        return True

    def admit_waiting_players(self):
        """Move the waiting phones into the room's players; called when the room returns to the lobby."""
        admitted = list(self.waiting_players)
        for player in admitted:
            player.waiting = False
            player.reset()
            self.players.append(player)
        self.waiting_players = []
        if admitted:
            self.revision += 1
        return admitted

    def waiting_view(self):
        """The waiting list as anyone may see it: names and faces only."""
        return [json.loads(player.to_json(show_role=False, show_secrets=False)) for player in self.waiting_players]

    def emit_waiting_list(self):
        if self.room_code:
            self.socket.emit('waiting_players', {**self._add_state_metadata({}), 'players': self.waiting_view()},
                             room=self.room_code)

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
            player.task_assigned_monotonic = time.monotonic()
            self.revision += 1
            return assigned_task
    
    def reveal_intruders(self):
        """Reveal intruder identities to all players when tasks reach 100%.
        
        This doesn't end the game - intruders can still win by eliminating crew
        or triggering a meltdown. It just creates chaos by revealing who they are!
        """
        if self.intruders_revealed:
            return  # Already revealed

        # Get list of intruder names
        intruder_names = [p.username for p in self.players if p.sus and p.alive]
        intruder_ids = [p.player_id for p in self.players if p.sus and p.alive]
        if not intruder_names:
            return  # Only a crew-only test game gets here; there is no one to reveal

        self.intruders_revealed = True
        
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

    def starting_hand_size(self):
        """Cards each intruder is dealt. A lone intruder gets at least 3, unless the host turned cards off."""
        if self.numIntruders == 1 and self.starting_cards > 0:
            return max(self.starting_cards, SOLO_INTRUDER_STARTING_CARDS)
        return self.starting_cards

    def tasks_per_crewmate(self):
        """The host's tasks per crewmate, or on Auto more with a lone intruder than with several."""
        if self.task_ratio == 'auto':
            return auto_tasks_per_crewmate(self.round_intruder_count or self.numIntruders)
        return self.task_ratio

    def intruder_count_for_start(self):
        """Intruders the next round deals: the host's number, or one per five players on Auto."""
        if self.auto_intruders:
            return auto_intruder_count(len(self.players))
        return self.initial_numIntruders

    def drawCards(self, probability=1):
        # A few intruders draw per meeting, so a big room isn't flooded with room-wide card effects.
        intruders = [player for player in self.players if player.sus and player.alive]
        random.shuffle(intruders)
        for intruder in intruders[:MAX_CARD_DRAWS_PER_MEETING]:
            card = self.card_deck.draw_card(probability)
            if card:
                intruder.cards.append(card)
                send_message_to_player(self.socket, intruder, f"You drew {card.action}")

        self.emit_player_list()


    def assignRoles(self):
        self.resetRoles()
        self.numIntruders = self.intruder_count_for_start()

        if self.numIntruders > len(self.players):
            self.numIntruders = len(self.players)
    
        if self.test_mode:
            # One tester starts as crew so they get tasks. Two testers get one of each role.
            self.numIntruders = min(self.numIntruders, len(self.players) - 1)

        self.numCrew = len(self.players) - self.numIntruders
        self.round_intruder_count = self.numIntruders
        # Rebuild the card deck now that we know if there's a reactor and how many intruders need hands
        self.card_deck._build_deck()
        self.ruleset = 'last_stand' if len(self.players) == 3 and self.numIntruders == 1 else 'standard'
        self.last_stand = False
        random.shuffle(self.players)
        hand_size = self.starting_hand_size()
        for i in range(0, self.numIntruders):
            self.players[i].sus = True
            for _ in range(0, hand_size):
                card = self.card_deck.draw_card()
                if card:
                    self.players[i].cards.append(card)

        random.shuffle(self.players)
        print("assigning roles...")
        print(self.players)

        numCrew = len(self.players) - self.numIntruders
        
        ratio = self.tasks_per_crewmate()
        self.taskGoal = max(numCrew, 1) * ratio if self.test_mode else numCrew * ratio

        print(f"{numCrew} crew and {self.numIntruders} intruders (reactor: {self.has_reactor})")

    def switch_test_role(self, player):
        """Flip a tester between crewmate and intruder so they can see both sides."""
        with self.state_lock:
            if not self.test_mode or not self.game_running or self.end_state or self.meeting:
                return False
            if player not in self.players or not player.alive:
                return False
            player.sus = not player.sus
            if player.sus:
                player.task = None
                if not player.cards:
                    for _ in range(0, self.starting_cards):
                        card = self.card_deck.draw_card()
                        if card:
                            player.cards.append(card)
            else:
                self.assign_task(player)
            living = [p for p in self.players if p.alive]
            self.numIntruders = sum(1 for p in living if p.sus)
            self.numCrew = len(living) - self.numIntruders
            self.revision += 1
            return True

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
            self._record_abandoned_round('full_reset')
            self.cancel_meltdown()
            self.begin_round()
            self._reset_locked()

    def _reset_locked(self):
        """Clear players and all game state while the room lock is held."""
        self.players = []
        self.waiting_players = []
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
        self.backgrounds = list(range(AVATAR_COUNT))
        self.end_state = None
        self.end_time = None
        self._reset_round_clock()
        self.denied_location = None
        self.meltdown_time_mod = 0
        self.active_cards = []
        self.intruders_revealed = False
        self.test_mode = False
        self.ruleset = 'standard'
        self.last_stand = False
        self.card_deck = CardDeck(self.locations, self.socket, self)
        self.task_handler.reset()
        self.last_activity = time.time()
        self._stats_start_recorded = False
        self._stats_recorded = False

    def reset_game_state(self, reason='lobby_reset'):
        with self.state_lock:
            if self.meeting:
                self.meeting.log_end(reason)
            self._record_abandoned_round(reason)
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
        self._reset_round_clock()
        self.denied_location = None
        self.meltdown_time_mod = 0
        self.active_cards = []  # Clear active cards (Area Denial, etc.)
        self.numIntruders = self.initial_numIntruders  # Restore initial intruder count
        self.numCrew = None  # Will be recalculated on game start
        self.intruders_revealed = False
        self.test_mode = False
        self.ruleset = 'standard'
        self.last_stand = False
        self.card_deck = CardDeck(self.locations, self.socket, self)
        self.reset_votes = set()  # Clear reset votes
        self.task_seconds = []
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
            'win_condition': None,
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
        self.backgrounds = list(range(AVATAR_COUNT))
        # Remove used backgrounds from available pool
        for player in self.players + self.waiting_players:
            if player.pic in self.backgrounds:
                self.backgrounds.remove(player.pic)

    def start_meeting(self, player_who_started_it, trigger='button'):
        with self.state_lock:
            if not self.game_running or self.end_state or self.meeting:
                return False
            if player_who_started_it not in self.players or not player_who_started_it.alive:
                return False
            if self.last_stand:
                return False  # Both players know who the intruder is; a 1-1 vote can't resolve.
            for player in self.players:
                player.ready = not player.alive
            self.meeting = Meeting(self.vote_time, self.socket, player_who_started_it, self, trigger=trigger)
            self.revision += 1
            self.stats['meetings_called'] += 1
            self.speaker.play_sound('meeting')
            self.emit_to_room("meeting", self.meeting.to_json())
            return True

    def get_num_living_players(self):
        with self.state_lock:
            return sum(1 for player in self.players if player.alive)

    def present_living_players(self):
        """Living players the room waits for: not offline past the grace period."""
        with self.state_lock:
            return [player for player in self.players if player.alive and not player.absent]

    def try_start_voting(self):
        with self.state_lock:
            meeting = self.meeting
            if not meeting or meeting.stage != 'waiting' or meeting.round_id != self.round_id:
                return False

            living_players = self.present_living_players()
            ready = sum(1 for player in living_players if player.ready)
            if not living_players or ready < self.ready_needed(len(living_players)):
                return False

            how = 'all_ready' if ready >= len(living_players) else 'quorum'
            return self._open_voting_locked(meeting, opened_by=how)

    def ready_needed(self, present):
        """How many present living players must slide ready before voting opens."""
        if self.meeting_quorum and present >= QUORUM_MIN_PLAYERS:
            return math.ceil(present * MEETING_QUORUM)
        return present

    def host_start_voting(self):
        """The host's override for a meeting stuck waiting on phones that never slid ready."""
        with self.state_lock:
            meeting = self.meeting
            if not meeting or meeting.stage != 'waiting' or meeting.round_id != self.round_id:
                return False
            if meeting.host_override_in() > 0:
                return False
            return self._open_voting_locked(meeting, started_by_host=True, opened_by='host')

    def _open_voting_locked(self, meeting, started_by_host=False, opened_by=None):
        meeting.started_by_host = started_by_host
        meeting.note_ready_snapshot(opened_by)
        started = meeting.start_voting()
        if not started:
            meeting.started_by_host = False
        else:
            for player in self.players:
                player.ready = not player.alive
        return started


    def _begin_last_stand_locked(self):
        """3-player rounds: at 1 intruder vs 1 crew the game goes on.

        The intruder must eliminate the last crewmate; the crewmate wins by
        finishing LAST_STAND_TASKS more tasks (fewer if fewer remain).
        Meetings are off since both know who's who.
        """
        self.last_stand = True
        # Shorten the goal so one crewmate being chased can realistically win.
        self.taskGoal = min(self.taskGoal, self.crew_score + LAST_STAND_TASKS)
        self.emit_to_room('task_goal', self.taskGoal)
        self.revision += 1
        self.emit_player_list()
        if self.meeting and self.meeting.stage == 'over':
            return  # A vote just ended; Meeting.end_meeting sends the notice after the results.
        if self.meeting:
            # A meeting can't resolve 1-1, so close it without a vote or card draw.
            self.meeting.stage = 'over'
            self.meeting.reason = 'last_stand'
            self.meeting.log_end('last_stand')
            self.emit_to_room('meeting', self.meeting.to_json())
            self.meeting = None
        self.send_last_stand_notice()

    def send_last_stand_notice(self):
        tasks_left = max(self.taskGoal - self.crew_score, 0)
        tasks = '1 more task' if tasks_left == 1 else f'{tasks_left} more tasks'
        self.emit_to_room('last_stand', {
            'title': 'Last stand',
            'message': f'One crewmate left. Crew wins by finishing {tasks}. The intruder wins by eliminating them. No more meetings: if you get eliminated, tap I was eliminated.',
            'tasks_left': tasks_left,
            'crew_score': self.crew_score,
            'task_goal': self.taskGoal,
        })

    def on_tasks_complete(self, finisher=None):
        """Crew hit the task goal. In last-stand rounds that wins; otherwise reveal intruders and
        call a meeting at once, so they face a vote before they can rush the last kills."""
        with self.state_lock:
            if self.end_state:
                return
            if self.ruleset != 'last_stand':
                self.reveal_intruders()
                caller = finisher if finisher and finisher.alive and not finisher.sus else next(
                    (player for player in self.players if player.alive and not player.sus), None)
                if caller and not self.meeting:
                    self.start_meeting(caller, trigger='tasks_complete')
                return
            self.end_state = 'victory'
            self.stats['win_condition'] = 'tasks'
            self.end_time = time.time()
            self.round_ended_monotonic = time.monotonic()
            self.revision += 1
            self.cancel_meltdown()
            self.speaker.play_sound('crew_victory')
            self.emit_player_list()
            self.emit_to_room('end_game', {'result': self.end_state, 'stats': self.stats})

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
        self.log_event('player_died', player.player_id, cause=death_cause,
                       role='intruder' if player.sus else 'crew',
                       during='meeting' if self.meeting else 'meltdown' if self.active_meltdown else 'round',
                       round_seconds=self.round_seconds(), **self.living_counts())
        print(f"Player {player.username} died: {death_cause} - {death_message}")

        if self.end_state:
            self.emit_player_list()
            return

        if not player.sus:
            self.numCrew -= 1
            if (self.ruleset == 'last_stand' and not self.last_stand
                    and self.numCrew == 1 and self.numIntruders == 1):
                self._begin_last_stand_locked()
                return
            if self.numIntruders > 0 and self.numCrew <= self.numIntruders:
                self.end_state = 'sus_victory'
                self.stats['win_condition'] = 'last_stand_kill' if self.last_stand else 'crew_outnumbered'
                self.end_time = time.time()
                self.round_ended_monotonic = time.monotonic()
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
                self.stats['win_condition'] = 'intruders_voted_out' if death_cause == 'voted_out_intruder' else 'intruders_eliminated'
                self.end_time = time.time()
                self.round_ended_monotonic = time.monotonic()
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
