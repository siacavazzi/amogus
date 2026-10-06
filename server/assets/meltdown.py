import random
from contextlib import nullcontext

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
        self.round_id = None
        self.speaker = speaker

    def _state_lock(self):
        return self.game.state_lock if self.game else nullcontext()

    def _is_current_locked(self):
        return self.meltdown_active and (
            self.game is None
            or (
                self.game.active_meltdown is self
                and self.game.round_id == self.round_id
                and self.game.game_running
                and not self.game.end_state
            )
        )

    def emit_to_room(self, event, data=None):
        """Emit through the owning game when this meltdown belongs to a room."""
        if self.game:
            self.game.emit_to_room(event, data)
        elif data is not None:
            self.socketio.emit(event, data)
        else:
            self.socketio.emit(event)

    def start_countdown(self):
        """Start the countdown in a background greenlet."""
        eventlet.spawn(self._countdown_loop)

    def _countdown_loop(self):
        """Update the countdown without holding the room lock during sleeps."""
        with self._state_lock():
            if not self._is_current_locked():
                return
            print(f"Meltdown initiated! {self.time_left} seconds remaining.")
            self.emit_to_room("codes_needed", self.codes_needed)
            self.distribute_codes()

        while True:
            with self._state_lock():
                if not self._is_current_locked():
                    return
                if self.codes_entered >= self.codes_needed:
                    self.end_meltdown(success=True)
                    return
                if self.time_left <= 0:
                    self.end_meltdown(success=False)
                    return

            eventlet.sleep(1)

            with self._state_lock():
                if not self._is_current_locked():
                    return
                if self.codes_entered >= self.codes_needed:
                    self.end_meltdown(success=True)
                    return
                self.time_left -= 1
                if self.game:
                    self.game.revision += 1
                self.emit_to_room('meltdown_update', self.time_left)
                if self.time_left <= 0:
                    self.end_meltdown(success=self.codes_entered >= self.codes_needed)
                    return

    def distribute_codes(self):
        with self._state_lock():
            if not self._is_current_locked():
                return
            for index, player in enumerate(self.living_players):
                player.meltdown_code = self.valid_pins[index]
                self.socketio.emit("meltdown_code", self.valid_pins[index], to=player.sid)
                print(f"sending code {self.valid_pins[index]} to {player.sid}")
            if self.game:
                self.game.revision += 1

    def check_pin(self, input_pin):
        """Validate a PIN once while this meltdown still owns the room."""
        with self._state_lock():
            if not self._is_current_locked():
                return False
            try:
                input_pin = int(input_pin)
            except (TypeError, ValueError):
                print("Invalid PIN format. PIN should be a number.")
                self.emit_to_room("code_incorrect")
                return False

            if input_pin not in self.valid_pins:
                self.emit_to_room("code_incorrect")
                return False

            self.valid_pins.remove(input_pin)
            self.codes_entered += 1
            if self.game:
                self.game.revision += 1
            print("Valid PIN entered!")
            self.emit_to_room("code_correct", self.codes_needed - self.codes_entered)
            if self.codes_entered >= self.codes_needed:
                self.end_meltdown(success=True)
            return True

    def end_meltdown(self, success):
        """End this meltdown only while it still owns the active round."""
        with self._state_lock():
            if not self._is_current_locked():
                return False
            self.meltdown_active = False
            if self.game:
                self.game.revision += 1
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
                    self.game.meltdown(meltdown=self)
            return True
