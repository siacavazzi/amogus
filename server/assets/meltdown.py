import random
import eventlet

class Meltdown:
    def __init__(self, num_players, time, socketio):
        self.socketio = socketio
        self.time_left = time
        self.codes_needed = max(int(num_players * 0.4), 1)  # Ensure at least 1 code is needed
        self.valid_pins = [random.randint(1000, 9999) for _ in range(num_players)]
        self.codes_entered = 0
        self.meltdown_active = True

    def start_countdown(self):
        """Starts the countdown timer."""
        print(f"Meltdown initiated! {self.time_left} seconds remaining.")
        while self.time_left > 0:
            if self.codes_entered >= self.codes_needed:
                self.end_meltdown(success=True)
                return
            eventlet.sleep(1)  # Asynchronous delay
            self.time_left -= 1
            self.socketio.emit('meltdown_update', {'time_left': self.time_left}, broadcast=True)

        # If the countdown reaches 0 and the meltdown is still active
        if self.meltdown_active:
            self.end_meltdown(success=False)

    def check_pin(self, input_pin):
        """Validates a PIN and increments codes entered if successful."""
        if input_pin in self.valid_pins:
            self.valid_pins.remove(input_pin)
            self.codes_entered += 1
            self.socketio.emit(
                'meltdown_code_entered', 
                {'codes_entered': self.codes_entered, 'codes_needed': self.codes_needed}, 
                broadcast=True
            )
            return True
        return False

    def end_meltdown(self, success):
        """Ends the meltdown and emits the result."""
        self.meltdown_active = False
        if success:
            print("Meltdown averted!")
            self.socketio.emit('meltdown_end', {'success': True}, broadcast=True)
        else:
            print("Meltdown failed!")
            self.socketio.emit('meltdown_end', {'success': False}, broadcast=True)


