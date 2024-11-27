

class Meltdown:

    def __init__(self, num_players):
        self.time_left = 60
        self.codes_needed = int(num_players * 0.4)
        if self.codes_needed < 0:
            self.codes_needed = 1
