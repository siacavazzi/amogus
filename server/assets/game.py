import math
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


class Game:

    def __init__(self, socket, task_handler, speaker, sus_ratio, task_ratio, meltdown_time, code_percent, locations, vote_time):
        self.players = []
        self.task_handler = task_handler
        self.crew_score = 0
        self.sus_score = 10
        self.game_running = False
        self.active_hack = 0
        self.active_meltdown = None
        self.meeting = False
        self.numImposters = None
        self.numCrew = None
        self.taskGoal = None
        self.completed_tasks = 0
        self.backgrounds = list(range(0, 16 + 1))  
        self.socket = socket
        self.end_state = None
        self.speaker = speaker
        self.denied_location = None
        self.card_deck = CardDeck(locations)

        # Crewmate to imposter ratio
        self.sus_ratio = sus_ratio
        # Tasks per player
        self.task_ratio = task_ratio
        self.meltdown_time = meltdown_time
        self.meltdown_time_mod = 0
        self.code_percent = code_percent
        self.vote_time = vote_time

    def start_meltdown(self):
        self.active_meltdown = Meltdown(self.players, self.meltdown_time - self.meltdown_time_mod, self.socket, self.speaker, self.code_percent)
        self.meltdown_time_mod = 0
        self.active_meltdown.game = self
        self.active_meltdown.start_countdown()

    def check_pin(self, pin):
        self.active_meltdown.check_pin(pin)

    def meltdown(self):
        self.active_meltdown = None
        self.end_state = "meltdown_fail"
        self.socket.emit("end_game", self.end_state)

        if self.speaker:
            self.speaker.play_sound("sus_victory")

    def start_hack(self, duration):
        if self.active_hack > 0:
            return
        self.active_hack = duration
        emit("hack", duration, broadcast=True)

        # Start a background thread to handle the countdown
        Thread(target=self._hack_countdown).start()

    def _hack_countdown(self):
        while self.active_hack > 0:
            time.sleep(1)  # Wait 1 second
            self.active_hack -= 1
        
        # Hack has ended
        emit("end_hack", broadcast=True)

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
            if self.players[i].sus:
                self.players[i].cards.append(self.card_deck.draw_card(probability))


    def assignRoles(self):
        self.resetRoles()
    
        raw_imposters = len(self.players) / self.sus_ratio
        self.numImposters = max(1, min(math.ceil(raw_imposters), len(self.players) - 1))
        self.numCrew = len(self.players) - self.numImposters
        random.shuffle(self.players)
        for i in range(0, self.numImposters):
            self.players[i].sus = True  # DEBUG: this should be true
            self.players[i].cards.append(self.card_deck.draw_card())

            ### DEBUG
            self.players[i].cards.append(self.card_deck.draw_card())
            self.players[i].cards.append(self.card_deck.draw_card())
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
        self.sus_score = 0
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

    def deny_location(self, location: str, duration: int):
        """
        Deny access to a specified location for a given duration.

        Args:
            location (str): The location to be denied.
            duration (int): Duration in seconds for which the location is denied.
        """
        self.denied_location = location
        self.socket.emit('active_denial', self.denied_location)
        print(f"Location '{location}' denied for {duration} seconds.")

        Thread(target=self._reset_denied_location, args=(duration,)).start()

    def _reset_denied_location(self, duration: int):
        """
        Helper method to reset the denied_location after a delay.

        Args:
            duration (int): Duration in seconds to wait before resetting.
        """
        time.sleep(duration)
        self.denied_location = None
        self.socket.emit('active_denial', 'none')
        print(f"Location '{self.denied_location}' is now allowed again.")

    def start_meeting(self, player_who_started_it):
        self.meeting = Meeting(self.vote_time, self.socket, player_who_started_it)
        self.socket.emit("meeting", self.meeting.to_json())


    def try_start_voting(self):
        if self.meeting.stage != 'waiting':
            return 
        
        for player in self.players:
            if player.alive and not player.ready:
                return 
            
        self.meeting.start_voting()




