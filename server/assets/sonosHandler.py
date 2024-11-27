import time
from soco import discover
from threading import Thread

# base url of hosted audio files
base_url = "https://raw.githubusercontent.com/siacavazzi/amogus_assets/main/audio/"

class SonosController:
    def __init__(self):
        self.speakers = list(discover())
        self.master_speaker = None
        self.ready = False
        self.stop_loop = False  # Flag to break the loop

        self.audio = {
            "test": "test.mp3",
            "theme": "theme.mp3"
        }

        if self.speakers:
            self.master_speaker = self.speakers[0]
            print(f"Master speaker: {self.master_speaker.player_name}")

            for speaker in self.speakers[1:]:
                print(f"Discovered {speaker.player_name}")
                speaker.join(self.master_speaker)

            self.ready = True
            print(f"Sonos initialization success! {self.master_speaker}")
            print(self.master_speaker.get_speaker_info())
        else:
            print("No Sonos speakers found.")

    def play_sound(self, sound):
        if not self.ready:
            print("Sonos system not ready.")
            return False

        self.stop_loop = True  # Break any active loops

        try:
            play_sound = base_url + self.audio[sound]
            self.master_speaker.play_uri(play_sound)
            print("Playing sound...")
            return True
        except Exception as e:
            print(f"Failed to play sound: {e}")
            return False

    def loop_sound(self, sound, duration):
        if not self.ready:
            print("Sonos system not ready.")
            return False

        if sound not in self.audio:
            print(f"Sound '{sound}' not found in audio library.")
            return False

        self.stop_loop = False  # Reset the stop flag

        def loop_task():
            try:
                play_sound = base_url + self.audio[sound]
                end_time = time.time() + duration

                while time.time() < end_time and not self.stop_loop:
                    self.master_speaker.play_uri(play_sound)
                    print(f"Playing {sound} on loop...")

                    # Wait until playback ends or the loop is interrupted
                    while (self.master_speaker.get_current_transport_info()['current_transport_state'] == 'PLAYING'
                           and not self.stop_loop):
                        time.sleep(1)

                print("Looping completed or interrupted.")
            except Exception as e:
                print(f"Failed to loop sound: {e}")

        # Run the loop in a separate thread to allow interruption
        Thread(target=loop_task, daemon=True).start()

    def stop(self):
        """Stops any active playback or looping."""
        self.stop_loop = True
        if self.ready:
            self.master_speaker.stop()
            print("Playback stopped.")
