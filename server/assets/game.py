import math
import random
from uuid import uuid4
from assets.player import Player
from assets.taskHandler import *
import time
from threading import Thread
from flask_socketio import emit

class Game:

    def __init__(self):
        self.players = []
        self.tasks = read_task_file()
        self.crew_score = 0
        self.sus_score = 10 # DEBUG this should b 0
        self.game_running = False
        self.active_hack = 0
        self.active_meltdown = 0
        self.meeting = False
        self.numImposters = None
        self.taskGoal = None
        self.backgrounds = list(range(0, 17 + 1))  

        # crewmate to imposter ratio
        self.sus_ratio = 5
        # tasks per player
        self.task_ratio = 10

    def start_hack(self, duration):
        if self.active_hack > 0:
            return  # Prevent overlapping hacks

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
            random_number = random.randint(1, 11)
        else:
            random_number = random.choice(self.backgrounds)
            print(random_number)
            self.backgrounds.remove(random_number)

        new_player = Player(sid=sid, player_id=player_id, username=username, pic=random_number)
        self.players.append(new_player)

        return new_player
    
    def getTask(self):
        if(len(self.tasks) < 1):
            return 'No tasks remaining'
        
        random_index = random.randint(0, len(self.tasks) - 1)
        task = self.tasks.pop(random_index)
        return task

    def resetRoles(self):
        for player in self.players:
            player.sus = False

    def assignRoles(self):
        self.resetRoles()
        print(self.players)
    
        # 1/5 ratio
        raw_imposters = len(self.players) / self.sus_ratio
        self.numImposters = max(1, min(math.ceil(raw_imposters), len(self.players) - 1))
        random.shuffle(self.players)
        for i in range(0, self.numImposters):
            self.players[i]
            self.players[i].sus = True ## DEBUG this should be true
        random.shuffle(self.players)
        print("assinging roles...")
        print(self.players)

        numCrew = len(self.players) - self.numImposters
        
        self.taskGoal = numCrew * self.task_ratio

        print(numCrew)
        print(self.taskGoal)
        print(self.numImposters)
    

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