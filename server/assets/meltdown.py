import random
import eventlet

class Meltdown:
    def __init__(self, players, time, socketio, speaker, code_percent):
        self.players = players
        self.num_players = len(players)
        self.socketio = socketio
        self.time_left = time
        self.codes_needed = max(int(self.num_players * code_percent), 1)
        self.valid_pins = [random.randint(1000, 9999) for _ in range(self.num_players)]
        self.codes_entered = 0
        self.meltdown_active = True
        self.game = None
        self.speaker = speaker

    def start_countdown(self):
        """Starts the countdown timer."""
        print(f"Meltdown initiated! {self.time_left} seconds remaining.")
        self.socketio.emit("codes_needed", self.codes_needed)
        self.distribute_codes()
        while self.time_left > 0:
            if self.codes_entered >= self.codes_needed:
                self.end_meltdown(success=True)
                return
            eventlet.sleep(1)  # Asynchronous delay
            self.time_left -= 1
            self.socketio.emit('meltdown_update', self.time_left)

        # If the countdown reaches 0 and the meltdown is still active
        if self.meltdown_active:
            self.end_meltdown(success=False)

    def distribute_codes(self):
        for i in range(0, self.num_players):
            self.players[i - 1].meltdown_code = self.valid_pins[i - 1]
            self.socketio.emit("meltdown_code", self.valid_pins[i - 1], to=self.players[i - 1].sid)
            print(f"sending code {self.valid_pins[i - 1]} to {self.players[i - 1].sid}")


    def check_pin(self, input_pin):
        print(f"Input PIN: {input_pin} (type: {type(input_pin)})")
        print(f"Valid PINs: {self.valid_pins} (types: {[type(pin) for pin in self.valid_pins]})")
    
        """Validates a PIN and increments codes entered if successful."""
        try:
            # Convert input_pin to integer if it's not already
            input_pin = int(input_pin)
        except ValueError:
            # Handle the case where conversion fails
            print("Invalid PIN format. PIN should be a number.")
            self.socketio.emit("code_incorrect")
            return False
    
        if input_pin in self.valid_pins:
            print("Valid PIN entered!")
            self.valid_pins.remove(input_pin)
            self.codes_entered += 1
            self.socketio.emit("code_correct", self.codes_needed - self.codes_entered)
            return True
    
        print("Invalid PIN")
        self.socketio.emit("code_incorrect")
        return False


    def end_meltdown(self, success):
        """Ends the meltdown and emits the result."""
        self.meltdown_active = False
        if success:
            if self.game:
                self.game.active_meltdown = None
            self.speaker.play_sound("meltdown_over")
            self.socketio.emit('meltdown_end')
        else:
            print("Meltdown failed!")
            self.speaker.play_sound("meltdown_fail")
            if self.game:
                self.game.meltdown()


