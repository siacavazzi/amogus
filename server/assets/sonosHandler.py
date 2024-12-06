import time
import logging
from threading import Thread, Lock
from soco import discover, SoCoException
from requests.exceptions import ReadTimeout, ConnectTimeout, Timeout

# Base URL of hosted audio files
base_url = "https://raw.githubusercontent.com/siacavazzi/amogus_assets/main/audio/"

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)


class SonosController:
    def __init__(self, max_retries=3, retry_delay=2, default_volume=30, enabled=True, ignore_bedroom_speakers=True):
        """
        Initializes the SonosController.

        :param max_retries: Maximum number of retries for joining speakers.
        :param retry_delay: Delay in seconds between retries.
        :param default_volume: Desired volume level (0-100) to set on the master speaker.
        :param enabled: Flag to enable or disable the controller.
        :param ignore_bedroom_speakers: If True, ignores any speakers with 'bed' in their name.
        """
        self.max_retries = max_retries
        self.retry_delay = retry_delay
        self.default_volume = default_volume
        self.enabled = enabled
        self.ignore_bedroom_speakers = ignore_bedroom_speakers

        if not enabled:
            logger.info("SonosController is disabled.")
            self.speakers = []
            self.master_speaker = None
            self.ready = False
            self.stop_loop = False
            self.loop_thread = None
            self.lock = Lock()
            return

        try:
            discovered_speakers = discover()
            if not discovered_speakers:
                raise ValueError("No Sonos speakers found during discovery.")

            discovered_speakers = list(discovered_speakers)
            logger.info(f"Discovered {len(discovered_speakers)} Sonos speaker(s).")

            # Filter out unreachable speakers
            discovered_speakers = self.filter_unreachable_speakers(discovered_speakers)
            if not discovered_speakers:
                raise ValueError("No reachable Sonos speakers found after filtering unreachable ones.")

            # Filter out bedroom speakers if the flag is set
            if self.ignore_bedroom_speakers:
                filtered_speakers = [
                    speaker for speaker in discovered_speakers
                    if 'bed' not in speaker.player_name.lower()
                ]
                ignored_count = len(discovered_speakers) - len(filtered_speakers)
                self.speakers = filtered_speakers
                logger.info(f"Ignored {ignored_count} bedroom speaker(s). {len(self.speakers)} speaker(s) remaining.")
            else:
                self.speakers = discovered_speakers
                logger.info("Included all discovered speakers without filtering.")

            if not self.speakers:
                raise ValueError("No Sonos speakers available after applying bedroom speaker filter.")

        except Exception as e:
            logger.error(f"Error during speaker discovery: {e}")
            self.speakers = []

        self.master_speaker = None
        self.ready = False
        self.stop_loop = False
        self.loop_thread = None
        self.lock = Lock()  # To synchronize access to shared resources

        self.audio = {
            "test": "test.mp3",
            "theme": "theme.mp3",
            "meeting": "meeting.mp3",
            "start": "start.mp3",
            "meltdown": "meltdown.mp3",
            "sus_victory": "sus_victory.mp3",
            "crew_victory": "crew_victory.mp3",
            "meltdown_fail": "meltdown_fail.mp3",
            "meltdown_over": "meltdown_over.mp3"
        }

        if self.speakers:
            # Attempt to find a suitable master speaker
            self.initialize_master_and_join_speakers()
            if self.ready:
                # Set the desired volume after successful initialization
                self.set_group_volume(self.default_volume)
        else:
            logger.warning("No Sonos speakers available to control.")

        logger.info("=== Sonos Initialization Complete ===")

    def filter_unreachable_speakers(self, speakers):
        """
        Filters out speakers that are unreachable due to timeouts.

        :param speakers: List of SoCo speaker objects.
        :return: List of reachable speakers.
        """
        reachable_speakers = []
        for speaker in speakers:
            try:
                # Attempt to get the speaker's player name as a connectivity test
                _ = speaker.player_name
                reachable_speakers.append(speaker)
            except (Timeout, ConnectTimeout, ReadTimeout):
                logger.warning(f"Speaker at {speaker.ip_address} timed out and will be skipped.")
            except SoCoException as e:
                logger.error(f"Error communicating with speaker at {speaker.ip_address}: {e}")
            except Exception as e:
                logger.error(f"Unexpected error when communicating with speaker at {speaker.ip_address}: {e}")
        return reachable_speakers

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
                if self.join_all_speakers():
                    self.ready = True
                    logger.info(f"Sonos initialization successful with master speaker: {self.master_speaker.player_name}")
                    return
                else:
                    logger.warning(f"Failed to join all speakers using master speaker: {potential_master.player_name}")
            except (Timeout, ConnectTimeout, ReadTimeout) as e:
                logger.error(f"Connection timed out when setting master speaker '{potential_master.player_name}': {e}")
                continue  # Try next potential master
            except SoCoException as e:
                logger.error(f"Error setting master speaker '{potential_master.player_name}': {e}")
            except Exception as e:
                logger.error(f"Unexpected error with speaker '{potential_master.player_name}': {e}")

        # If no master speaker could be successfully set
        logger.error("Failed to initialize SonosController: No suitable master speaker found.")

    def join_all_speakers(self):
        """
        Attempts to join all speakers in self.speakers to the current master_speaker.
        Returns True if successful, False otherwise.
        """
        for speaker in self.speakers:
            if speaker == self.master_speaker:
                continue
            if not self.try_join_speaker(speaker):
                return False
        return True

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
            except (Timeout, ConnectTimeout, ReadTimeout) as e:
                logger.warning(f"Connection timed out when trying to join speaker '{speaker.player_name}' on attempt {attempt}: {e}")
                if attempt < self.max_retries:
                    logger.info(f"Retrying to join speaker '{speaker.player_name}' in {self.retry_delay} seconds...")
                    time.sleep(self.retry_delay)
                else:
                    logger.error(f"All {self.max_retries} attempts to join speaker '{speaker.player_name}' have failed due to timeout.")
                    return False
            except SoCoException as e:
                error_code = self.extract_upnp_error_code(e)
                logger.warning(f"Attempt {attempt} to join speaker '{speaker.player_name}' failed: {e}")
                if error_code == 501:
                    logger.error(f"UPnP Error 501 encountered. The master speaker '{self.master_speaker.player_name}' may not support joining.")
                    return False
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

    def play_sound(self, sound, interrupt=True):
        """
        Plays the specified sound on the master speaker.

        :param sound: Key of the sound to play from the audio dictionary.
        :param interrupt: If True, interrupts any current playback or looping.
        :return: True if sound is played successfully, False otherwise.
        """
        if not self.enabled:
            return False
        if not self.ready:
            logger.warning("Sonos system not ready.")
            return False

        if sound not in self.audio:
            logger.error(f"Sound '{sound}' not found in audio library.")
            return False

        if interrupt:
            self.stop()  # Stop any current playback or loops

        try:
            play_sound_uri = base_url + self.audio[sound]
            self.master_speaker.play_uri(play_sound_uri)
            logger.info(f"Playing sound '{sound}'...")
            return True
        except SoCoException as e:
            logger.error(f"Failed to play sound '{sound}': {e}")
            return False
        except Exception as e:
            logger.error(f"Unexpected error when playing sound '{sound}': {e}")
            return False

    def loop_sound(self, sound, duration, interrupt=True):
        """
        Loops the specified sound for a given duration.
        Now waits for the track to fully finish by checking transport state.

        :param sound: Key of the sound to loop from the audio dictionary.
        :param duration: Duration in seconds to loop the sound.
        :param interrupt: If True, interrupts any current playback or looping.
        :return: True if looping starts successfully, False otherwise.
        """
        if not self.ready:
            logger.warning("Sonos system not ready.")
            return False

        if sound not in self.audio:
            logger.error(f"Sound '{sound}' not found in audio library.")
            return False

        if interrupt:
            self.stop()  # Stop any current playback or loops

        self.stop_loop = False  # Reset the stop flag

        def loop_task():
            with self.lock:
                try:
                    play_sound_uri = base_url + self.audio[sound]
                    end_time = time.time() + duration

                    while time.time() < end_time and not self.stop_loop:
                        self.master_speaker.play_uri(play_sound_uri)
                        logger.info(f"Playing '{sound}' on loop...")

                        # Wait until track finishes or until stop_loop is True
                        while not self.stop_loop:
                            transport_info = self.master_speaker.get_current_transport_info()
                            current_state = transport_info.get('current_transport_state', '').lower()
                            # Once the state is not playing or transitioning, track is done
                            if current_state not in ('playing', 'transitioning'):
                                break
                            time.sleep(0.5)

                    logger.info("Looping completed or interrupted.")
                except SoCoException as e:
                    logger.error(f"Failed to loop sound '{sound}': {e}")
                except Exception as e:
                    logger.error(f"Unexpected error when looping sound '{sound}': {e}")

        # Run the loop in a separate thread to allow interruption
        self.loop_thread = Thread(target=loop_task, daemon=True)
        self.loop_thread.start()
        return True

    def stop(self):
        """
        Stops any active playback or looping.
        """
        self.stop_loop = True
        if self.ready and self.master_speaker:
            try:
                self.master_speaker.stop()
                logger.info("Playback stopped.")
                if self.loop_thread and self.loop_thread.is_alive():
                    self.loop_thread.join()
                    logger.info("Looping thread has been stopped.")
            except SoCoException as e:
                logger.error(f"Failed to stop playback: {e}")
            except Exception as e:
                logger.error(f"Unexpected error when stopping playback: {e}")
        else:
            logger.warning("SonosController is not ready or no master speaker set. Nothing to stop.")
