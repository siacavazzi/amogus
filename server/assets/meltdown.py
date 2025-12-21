import random
import eventlet

class Meltdown:
    def __init__(self, players, time, socketio, speaker, code_percent):
        self.players = players
        self.socketio = socketio
        self.time_left = time
        self.living_players = [player for player in players if player.alive]
        self.num_players = len(self.living_players)
        self.codes_needed = max(int(self.num_players * code_percent), 1)
        self.valid_pins = [random.randint(1000, 9999) for _ in range(self.num_players)]
        self.codes_entered = 0
        self.meltdown_active = True
        self.game = None  # Set after creation
        self.speaker = speaker

    def emit_to_room(self, event, data=None):
        """Emit to the game's room if available, otherwise broadcast."""
        if self.game and self.game.room_code:
            if data is not None:
                self.socketio.emit(event, data, room=self.game.room_code)
            else:
                self.socketio.emit(event, room=self.game.room_code)
        else:
            if data is not None:
                self.socketio.emit(event, data)
            else:
                self.socketio.emit(event)

    def start_countdown(self):
        """Starts the countdown timer in a background greenlet."""
        # Spawn the actual countdown in a background greenlet so it doesn't block
        eventlet.spawn(self._countdown_loop)
    
    def _countdown_loop(self):
        """The actual countdown logic running in a background greenlet."""
        print(f"Meltdown initiated! {self.time_left} seconds remaining.")
        self.emit_to_room("codes_needed", self.codes_needed)
        self.distribute_codes()
        while self.time_left > 0:
            if self.codes_entered >= self.codes_needed:
                self.end_meltdown(success=True)
                return
            eventlet.sleep(1)  # Asynchronous delay
            self.time_left -= 1
            self.emit_to_room('meltdown_update', self.time_left)

        # If the countdown reaches 0 and the meltdown is still active
        if self.meltdown_active:
            self.end_meltdown(success=False)

    def distribute_codes(self):
        for i in range(0, self.num_players):
            self.living_players[i - 1].meltdown_code = self.valid_pins[i - 1]
            self.socketio.emit("meltdown_code", self.valid_pins[i - 1], to=self.living_players[i - 1].sid)
            print(f"sending code {self.valid_pins[i - 1]} to {self.living_players[i - 1].sid}")


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
            self.emit_to_room("code_incorrect")
            return False
    
        if input_pin in self.valid_pins:
            print("Valid PIN entered!")
            self.valid_pins.remove(input_pin)
            self.codes_entered += 1
            self.emit_to_room("code_correct", self.codes_needed - self.codes_entered)
            return True
    
        print("Invalid PIN")
        self.emit_to_room("code_incorrect")
        return False


    def end_meltdown(self, success):
        """Ends the meltdown and emits the result."""
        self.meltdown_active = False
        # Stop the looping meltdown alarm first
        self.speaker.stop()
        if success:
            if self.game:
                self.game.active_meltdown = None
            self.speaker.play_sound("meltdown_over")
            self.emit_to_room('meltdown_end')
        else:
            print("Meltdown failed!")
            self.speaker.play_sound("meltdown_fail")
            if self.game:
                self.game.meltdown()


