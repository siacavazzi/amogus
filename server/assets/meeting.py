import json

class Meeting:

    def __init__(self, vote_time, socket, player_who_started_it):
        self.stage = 'waiting'
        self.time_left = vote_time
        self.socket = socket
        self.player_who_started_it = player_who_started_it

    def start_voting(self):
        self.stage = 'voting'

    def to_json(self):
        return json.dumps({
            "stage": self.stage,
            "player_who_started_it": self.player_who_started_it.username

        })

    
