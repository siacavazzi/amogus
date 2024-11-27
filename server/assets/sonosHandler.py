from soco import discover


class SonosController:

    def __init__(self):
        self.speakers = list(discover())
        self.master_speaker
        self.ready = False

        self.audio = {
            "test":"",
        }

        if self.speakers:
            self.master_speaker = self.speakers[0]
            print(f"Master speaker: {self.master_speaker.player_name}")

            for speaker in self.speakers[1:]:
                speaker.join(self.master_speaker)

    # # Play an audio file
    # audio_url = "http://<your_computer_ip>:8000/your_audio_file.mp3"
    # master_speaker.play_uri(audio_url)
            self.ready = True
            print(f"Sonos initialization success! {self.master_speaker}")
        else:
            print("No Sonos speakers found.")

    def play_sound(self, sound):




SonosController()