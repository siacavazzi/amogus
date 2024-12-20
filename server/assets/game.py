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

    def __init__(self, socket, task_handler, speaker, task_ratio, meltdown_time, code_percent, locations, vote_time, card_draw_probability, numImposters, starting_cards):
        self.players = []
        self.task_handler = task_handler
        self.crew_score = 0
        self.game_running = False
        self.active_hack = 0
        self.active_meltdown = None
        self.meeting = False
        self.starting_cards = starting_cards
        self.numImposters = numImposters
        self.numCrew = None
        self.taskGoal = None
        self.completed_tasks = 0
        self.backgrounds = list(range(0, 16 + 1))  
        self.socket = socket
        self.end_state = None
        self.speaker = speaker
        self.denied_location = None
        self.card_deck = CardDeck(locations, socket, self)
        self.active_cards = []
        self.card_draw_probability = card_draw_probability

        # Tasks per player
        self.task_ratio = task_ratio
        self.meltdown_time = meltdown_time
        self.meltdown_time_mod = 0
        self.code_percent = code_percent
        self.vote_time = vote_time

    def start_meltdown(self):
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
        self.end_state = "meltdown_fail"
        self.socket.emit("end_game", self.end_state)

        if self.speaker:
            self.speaker.play_sound("sus_victory")

    def emit_player_list(self):
        player_list = [player.to_json() for player in self.players]
        self.socket.emit('game_data', {'action': 'player_list', 'list': player_list})

    def start_hack(self, duration):
        if self.active_hack > 0:
            return
        self.speaker.play_sound('hack')
        self.active_hack = duration
        emit("hack", duration, broadcast=True)

        # Start a background thread to handle the countdown
        Thread(target=self._hack_countdown).start()

    def _hack_countdown(self):
        while self.active_hack > 0:
            time.sleep(1)  # Wait 1 second
            self.active_hack -= 1


    def addPlayer(self, sid, username):
        player_id = str(uuid4())
        random_number = 1

        if not self.backgrounds:
            random_number = random.randint(1, len(self.backgrounds) - 1)
        else:
            random_number = random.choice(self.backgrounds)
            print(random_number)
            self.backgrounds.remove(random_number)

        new_player = Player(sid=sid, player_id=player_id, username=username, pic=random_number)
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

        if self.numImposters > len(self.players):
            self.numImposters = len(self.players)
    
        self.numCrew = len(self.players) - self.numImposters
        random.shuffle(self.players)
        for i in range(0, self.numImposters):
            self.players[i].sus = True
            for _ in range(0, self.starting_cards):
                self.players[i].cards.append(self.card_deck.draw_card())


        random.shuffle(self.players)
        print("assigning roles...")
        print(self.players)

        numCrew = len(self.players) - self.numImposters
        
        self.taskGoal = numCrew * self.task_ratio

        print(f"{numCrew} crew and {self.numImposters} impostors")

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
        self.players = []
        self.crew_score = 0
        self.game_running = False
        self.active_hack = 0
        self.active_meltdown = None
        self.meeting = False
        self.numImposters = None
        self.numCrew = None
        self.taskGoal = None
        self.backgrounds = list(range(0, 16 + 1))  
        self.end_state = None
        self.denied_location = None
        self.card_deck = CardDeck(self.locations)
        self.task_handler.reset()

    def start_meeting(self, player_who_started_it):
        self.meeting = Meeting(self.vote_time, self.socket, player_who_started_it, self)
        self.speaker.play_sound('meeting')
        self.socket.emit("meeting", self.meeting.to_json())

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


    def kill_player(self, player_id):
        player = self.getPlayerById(player_id)
        if not player:
            return
        
        player.alive = False
        player.ready = True

        if not player.sus:
            self.numCrew -= 1
            if self.numCrew <= 0:
                self.end_state = 'sus_victory'
                self.speaker.play_sound('sus_victory')
                self.socket.emit("end_game", self.end_state)
                return
    
            
        else:
            self.numImposters -= 1
            if self.numImposters <= 0:
                self.end_state = 'victory'
                self.speaker.play_sound('crew_victory')
                self.socket.emit("end_game", self.end_state)
                return
                
        if self.meeting:
            self.try_start_voting()

        self.emit_player_list()
        

