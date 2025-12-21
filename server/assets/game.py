import random
from uuid import uuid4
from assets.player import Player
from assets.taskHandler import *
from assets.meltdown import *
from assets.card import *
from assets.meeting import *
import time
from threading import Thread
from flask_socketio import emit
from assets.utils import *


class Game:

    def __init__(self, socket, task_handler, speaker, task_ratio, meltdown_time, code_percent, locations, vote_time, card_draw_probability, numIntruders, starting_cards, vote_threshold, room_code=None):
        self.players = []
        self.task_handler = task_handler
        self.crew_score = 0
        self.game_running = False
        self.active_hack = 0
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
        }

    def update_config(self, config):
        """Update game configuration from a dict."""
        if 'locations' in config:
            self.locations = config['locations'].copy()
            if 'Other' not in self.locations:
                self.locations.append('Other')
            self.task_handler.locations = self.locations
            # Only reset task handler if no task list was explicitly applied
            # Otherwise we'd lose the loaded task list!
            if not self.task_list_applied:
                self.task_handler.reset()  # Reload tasks with new locations
            # Rebuild card deck with new locations
            self.card_deck = CardDeck(self.locations, self.socket, self)
        
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

    def emit_to_room(self, event, data=None):
        """Emit an event to all players in this game's room."""
        self.last_activity = time.time()
        if self.room_code:
            if data is not None:
                self.socket.emit(event, data, room=self.room_code)
            else:
                self.socket.emit(event, room=self.room_code)
        else:
            # Fallback for single-game mode (backwards compatibility)
            if data is not None:
                self.socket.emit(event, data)
            else:
                self.socket.emit(event)

    def start_meltdown(self):
        self.speaker.loop_sound("meltdown", self.meltdown_time - self.meltdown_time_mod)
        self.active_meltdown = Meltdown(self.players, self.meltdown_time - self.meltdown_time_mod, self.socket, self.speaker, self.code_percent)
        self.meltdown_time_mod = 0
        for card in self.active_cards:
            if card.action == 'reduce_meltdown':
                self.active_cards.remove(card)
        self.active_meltdown.game = self
        self.active_meltdown.start_countdown()

    def check_pin(self, pin):
        self.active_meltdown.check_pin(pin)

    def meltdown(self): # call when meltdown fails
        self.active_meltdown = None
        
        # Kill all crew members (intruders survive the meltdown because they're built different)
        for player in self.players:
            if player.alive and not player.sus:
                player.set_death('meltdown')
        
        self.end_state = "meltdown_fail"
        self.end_time = time.time()
        # Emit player list BEFORE end_game so clients have updated death info
        self.emit_player_list()
        self.emit_to_room("end_game", self.end_state)

        if self.speaker:
            self.speaker.play_sound("sus_victory")

    def emit_player_list(self):
        player_list = [player.to_json() for player in self.players]
        self.emit_to_room('game_data', {'action': 'player_list', 'list': player_list})

    def start_hack(self, duration):
        if self.active_hack > 0:
            return
        self.speaker.play_sound('hack')
        self.active_hack = duration
        self.emit_to_room("hack", duration)

        # Start a background thread to handle the countdown
        Thread(target=self._hack_countdown).start()

    def _hack_countdown(self):
        while self.active_hack > 0:
            time.sleep(1)  # Wait 1 second
            self.active_hack -= 1


    def addPlayer(self, sid, username, selfie_filename=None):
        player_id = str(uuid4())
        random_number = 1

        if not self.backgrounds:
            random_number = random.randint(1, len(self.backgrounds) - 1)
        else:
            random_number = random.choice(self.backgrounds)
            print(random_number)
            self.backgrounds.remove(random_number)

        new_player = Player(sid=sid, player_id=player_id, username=username, pic=random_number, selfie=selfie_filename)
        self.players.append(new_player)

        return new_player
    
    def getTask(self):
        if self.completed_tasks >= self.taskGoal:
            self.end_state = 'victory'
            self.speaker.play_sound('victory')
        return self.task_handler.get_task(self.denied_location)

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
                self.players[i].cards.append(self.card_deck.draw_card())

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
        """Full reset - clears players and all game state."""
        self.players = []
        self.crew_score = 0
        self.game_running = False
        self.active_hack = 0
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
        self.card_deck = CardDeck(self.locations, self.socket, self)
        self.task_handler.reset()
        self.last_activity = time.time()

    def reset_game_state(self):
        """Reset game state but keep players - for playing again."""
        self.crew_score = 0
        self.game_running = False
        self.active_hack = 0
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
        self.card_deck = CardDeck(self.locations, self.socket, self)
        self.reset_votes = set()  # Clear reset votes
        
        # Only reset task handler if no task list was applied
        # Otherwise preserve the loaded tasks for replaying
        if not self.task_list_applied:
            self.task_handler.reset()
            # Also reset collaborative task state
            self.collaborative_tasks = []
            self.collaborative_task_list_code = None
        else:
            # Restore tasks from collaborative_tasks (which has the full set)
            if self.collaborative_tasks:
                self.task_handler.tasks = [task.copy() for task in self.collaborative_tasks]
        
        self.task_creation_mode = False
        self.last_activity = time.time()
        
        # Reset backgrounds for new profile pics
        self.backgrounds = list(range(0, 16 + 1))
        # Remove used backgrounds from available pool
        for player in self.players:
            if player.pic in self.backgrounds:
                self.backgrounds.remove(player.pic)

    def start_meeting(self, player_who_started_it):
        self.meeting = Meeting(self.vote_time, self.socket, player_who_started_it, self)
        self.speaker.play_sound('meeting')
        self.emit_to_room("meeting", self.meeting.to_json())

    def get_num_living_players(self):
        living_players = 0
        for player in self.players:
            if player.alive:
                living_players += 1

        return living_players

    def try_start_voting(self):
        if self.meeting.stage != 'waiting':
            return 
        
        for player in self.players:
            if player.alive and not player.ready:
                return 
            
        self.meeting.start_voting()
        for player in self.players:
            player.ready = False


    def kill_player(self, player_id, death_cause='unknown', task_name=None):
        """
        Kill a player and set their death cause.
        
        Args:
            player_id: The ID of the player to kill
            death_cause: The cause of death (e.g., 'voted_out', 'murdered', 'meltdown', etc.)
            task_name: Optional task name if they died during a task
        """
        player = self.getPlayerById(player_id)
        if not player:
            return
        
        # Set death cause and message using the player's method
        death_message = player.set_death(death_cause, task_name)
        print(f"Player {player.username} died: {death_cause} - {death_message}")

        if not player.sus:
            self.numCrew -= 1
            if self.numCrew <= 0:
                self.end_state = 'sus_victory'
                self.end_time = time.time()
                self.speaker.play_sound('sus_victory')
                # Emit player list BEFORE end_game so clients have updated death info
                self.emit_player_list()
                self.emit_to_room("end_game", self.end_state)
                return
    
            
        else:
            self.numIntruders -= 1
            if self.numIntruders <= 0:
                self.end_state = 'victory'
                self.end_time = time.time()
                self.speaker.play_sound('crew_victory')
                # Emit player list BEFORE end_game so clients have updated death info
                self.emit_player_list()
                self.emit_to_room("end_game", self.end_state)
                return
                
        if self.meeting:
            self.try_start_voting()

        self.emit_player_list()


