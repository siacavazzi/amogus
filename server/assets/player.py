import json

class Player:

    def __init__(self, sid, player_id, username):
        self.sid = sid
        self.username = username
        self.player_id = player_id
        self.active = True
        self.sus = False
        self.alive = True

    def disconnect(self):
        self.active = False

    def setImposter(self):
        self.sus = True

    def to_json(self):
        # Convert the object's attributes to a dictionary
        return json.dumps({
            "sid": self.sid,
            "player_id": self.player_id,
            "username": self.username,
            "active": self.active,
            "sus": self.sus,
            "alive": self.alive
        })
