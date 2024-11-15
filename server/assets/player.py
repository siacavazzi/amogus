class Player():

    def __init__(self, sid, player_id,username):
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
