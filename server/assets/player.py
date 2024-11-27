import json

class Player:
    def __init__(self, sid, player_id, username, pic):
        self.sid = sid
        self.username = username
        self.player_id = player_id
        self.pic = pic
        self.active = True
        self.sus = False
        self.alive = True
        self.task = None
        self.fake_task = None
        
    def disconnect(self):
        self.active = False

    def reset(self):
        self.active = True
        self.sus = False
        self.alive = True


    def get_task(self):
        if self.fake_task is not None:
            return self.fake_task
        return self.task



    def to_json(self):
        # Convert the object's attributes to a dictionary
        return json.dumps({
            "sid": self.sid,
            "player_id": self.player_id,
            "username": self.username,
            "active": self.active,
            "sus": self.sus,
            "alive": self.alive,
            "pic": self.pic
        })

    def __str__(self):
        # Return a string representation of the object
        return (f"Player(sid={self.sid}, player_id={self.player_id}, "
                f"username={self.username}, active={self.active}, "
                f"sus={self.sus}, alive={self.alive})")

