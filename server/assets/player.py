class Player():

    def __init__(self, id, name):
        self.id = sid
        self.name = name
        self.active = True

        self.sus = False
        self.alive = True

    def disconnect(self):
        self.active = False

    def setImposter(self):
        self.sus = True