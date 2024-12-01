import time
import logging
from threading import Thread
from soco import discover, SoCoException

# Base URL of hosted audio files
base_url = "https://raw.githubusercontent.com/siacavazzi/amogus_assets/main/audio/"

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler()
        # You can add FileHandler or other handlers here if needed
    ]
)
logger = logging.getLogger(__name__)


class SonosController:
    def __init__(self, max_retries=3, retry_delay=2, default_volume=50):
        """
        Initializes the SonosController.

        :param max_retries: Maximum number of retries for joining speakers.
        :param retry_delay: Delay in seconds between retries.
        :param default_volume: Desired volume level (0-100) to set on the master speaker.
        """
        self.max_retries = max_retries
        self.retry_delay = retry_delay
        self.default_volume = default_volume

        try:
            self.speakers = list(discover())
            if not self.speakers:
                raise ValueError("No Sonos speakers found during discovery.")
            logger.info(f"Discovered {len(self.speakers)} Sonos speaker(s).")
        except Exception as e:
            logger.error(f"Error during speaker discovery: {e}")
            self.speakers = []

        self.master_speaker = None
        self.ready = False
        self.stop_loop = False

        self.audio = {
            "test": "test.mp3",
            "theme": "theme.mp3",
            "meeting": "meeting.mp3",
            "start": "start.mp3",
        }

        if self.speakers:
            # Attempt to find a suitable master speaker
            self.initialize_master_and_join_speakers()
            if self.ready:
                # Set the desired volume after successful initialization
                self.set_group_volume(self.default_volume)
        else:
            logger.warning("No Sonos speakers found.")

        logger.info("=== Sonos Initialization Complete ===")

    def initialize_master_and_join_speakers(self):
        """
        Attempts to initialize a master speaker and join other speakers to it.
        Tries each speaker as the master until successful.
        """
        for potential_master in self.speakers:
            logger.info(f"Attempting to set '{potential_master.player_name}' as the master speaker.")
            try:
                # Reset group by setting the speaker to itself
                potential_master.group.coordinator = potential_master
                self.master_speaker = potential_master
                logger.info(f"Selected master speaker: {self.master_speaker.player_name}")

                # Attempt to join other speakers to the master
                join_success = True
                for speaker in self.speakers:
                    if speaker == self.master_speaker:
                        continue
                    if not self.try_join_speaker(speaker):
                        join_success = False
                        break  # If joining fails, try the next master
                if join_success:
                    self.ready = True
                    logger.info(f"Sonos initialization successful with master speaker: {self.master_speaker.player_name}")
                    return
                else:
                    logger.warning(f"Failed to join all speakers using master speaker: {potential_master.player_name}")
            except SoCoException as e:
                logger.error(f"Error setting master speaker '{potential_master.player_name}': {e}")
            except Exception as e:
                logger.error(f"Unexpected error with speaker '{potential_master.player_name}': {e}")

        # If no master speaker could be successfully set
        logger.error("Failed to initialize SonosController: No suitable master speaker found.")

    def try_join_speaker(self, speaker):
        """
        Attempts to join a speaker to the master speaker with retries.

        :param speaker: The SoCo speaker object to join.
        :return: True if joined successfully, False otherwise.
        """
        for attempt in range(1, self.max_retries + 1):
            try:
                speaker.join(self.master_speaker)
                logger.info(f"Successfully joined speaker '{speaker.player_name}' to master '{self.master_speaker.player_name}' on attempt {attempt}.")
                return True
            except SoCoException as e:
                error_code = self.extract_upnp_error_code(e)
                logger.warning(f"Attempt {attempt} to join speaker '{speaker.player_name}' failed: {e}")
                if error_code == 501:
                    logger.error(f"UPnP Error 501 encountered. The master speaker '{self.master_speaker.player_name}' may not support joining.")
                    return False  # Trigger master selection to try a different master
                if attempt < self.max_retries:
                    logger.info(f"Retrying to join speaker '{speaker.player_name}' in {self.retry_delay} seconds...")
                    time.sleep(self.retry_delay)
                else:
                    logger.error(f"All {self.max_retries} attempts to join speaker '{speaker.player_name}' have failed.")
        return False

    @staticmethod
    def extract_upnp_error_code(exception):
        """
        Extracts the UPnP error code from a SoCoException message.

        :param exception: The SoCoException instance.
        :return: The UPnP error code as an integer, or None if not found.
        """
        try:
            message = str(exception)
            # Example message: "UPnP Error 501 received: Action Failed from 192.168.1.16"
            parts = message.split("UPnP Error")
            if len(parts) > 1:
                code_part = parts[1].strip().split()[0]
                return int(code_part)
        except:
            pass
        return None

    def set_group_volume(self, volume):
        """
        Sets the volume for the entire group (managed by the master speaker).

        :param volume: Desired volume level (0-100).
        """
        if not self.ready or not self.master_speaker:
            logger.warning("SonosController is not ready. Cannot set volume.")
            return

        if not (0 <= volume <= 100):
            logger.error("Volume must be between 0 and 100.")
            return

        try:
            self.master_speaker.volume = volume
            logger.info(f"Set volume to {volume}% on master speaker '{self.master_speaker.player_name}'.")
        except SoCoException as e:
            logger.error(f"Failed to set volume on master speaker '{self.master_speaker.player_name}': {e}")
        except Exception as e:
            logger.error(f"Unexpected error when setting volume: {e}")

    def play_sound(self, sound):
        """
        Plays the specified sound on the master speaker.

        :param sound: Key of the sound to play from the audio dictionary.
        :return: True if sound is played successfully, False otherwise.
        """
        if not self.ready:
            logger.warning("Sonos system not ready.")
            return False

        self.stop_loop = True

        try:
            play_sound_uri = base_url + self.audio[sound]
            self.master_speaker.play_uri(play_sound_uri)
            logger.info(f"Playing sound '{sound}'...")
            return True
        except KeyError:
            logger.error(f"Sound '{sound}' not found in audio library.")
            return False
        except SoCoException as e:
            logger.error(f"Failed to play sound '{sound}': {e}")
            return False
        except Exception as e:
            logger.error(f"Unexpected error when playing sound '{sound}': {e}")
            return False

    def loop_sound(self, sound, duration):
        """
        Loops the specified sound for a given duration.

        :param sound: Key of the sound to loop from the audio dictionary.
        :param duration: Duration in seconds to loop the sound.
        :return: True if looping starts successfully, False otherwise.
        """
        if not self.ready:
            logger.warning("Sonos system not ready.")
            return False

        if sound not in self.audio:
            logger.error(f"Sound '{sound}' not found in audio library.")
            return False

        self.stop_loop = False  # Reset the stop flag

        def loop_task():
            try:
                play_sound_uri = base_url + self.audio[sound]
                end_time = time.time() + duration

                while time.time() < end_time and not self.stop_loop:
                    self.master_speaker.play_uri(play_sound_uri)
                    logger.info(f"Playing '{sound}' on loop...")

                    # Wait until playback ends or the loop is interrupted
                    while (self.master_speaker.get_current_transport_info()['current_transport_state'] == 'PLAYING'
                           and not self.stop_loop):
                        time.sleep(1)

                logger.info("Looping completed or interrupted.")
            except SoCoException as e:
                logger.error(f"Failed to loop sound '{sound}': {e}")
            except Exception as e:
                logger.error(f"Unexpected error when looping sound '{sound}': {e}")

        # Run the loop in a separate thread to allow interruption
        Thread(target=loop_task, daemon=True).start()
        return True

    def stop(self):
        """
        Stops any active playback or looping.
        """
        self.stop_loop = True
        if self.ready:
            try:
                self.master_speaker.stop()
                logger.info("Playback stopped.")
            except SoCoException as e:
                logger.error(f"Failed to stop playback: {e}")
            except Exception as e:
                logger.error(f"Unexpected error when stopping playback: {e}")
        else:
            logger.warning("SonosController is not ready. Nothing to stop.")
