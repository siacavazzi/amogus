##### GAME VARIABLES #######

# Task locations. This can be whatever you want as long as they correspond to real places
locations = [
    'Basement',
    '1st Floor',
    '2nd Floor',
    '3rd Floor',
] # 'Other' will always be included as a location

# length of voting during meetings
vote_time = 180 # s

# how long players have to stop a meltdown without card modifications(seconds)
meltdown_time = 60 # s

# fraction of players who need to enter a code to end meltdown (ex if 0.4 - 4 of 10 players need to enter codes)
code_percent = 0.7

#Imposter stuff
number_of_imposters = 2
# probability of imposter drawing a card out of 1 (reduce this if the imposter is OP)
card_draw_probability = 0.90 # / 1
starting_cards = 8

# number of tasks each player need to finish to win (on average)
task_ratio = 12

# SOUND SETTINGS
sonos_enabled = False
speaker_volume = 80 # %
# dont play sounds on speakers with 'bed' in the name
ignore_bedroom_speakers = True

#############################


import eventlet
eventlet.monkey_patch()
from flask import Flask
from flask_socketio import SocketIO
from flask_cors import CORS
from assets.game import Game
from assets.sonosHandler import SonosController
from assets.utils import setup_logging, get_local_ip, write_ip_to_file
from assets.taskHandler import TaskHandler
from socket_handlers import register_socket_handlers

logger = setup_logging()

app = Flask(__name__)
CORS(app, resources={r"/*": {"origins": '*'}})
socketio = SocketIO(app, cors_allowed_origins="*")

locations.append("Other")
# big boi objects
speaker = SonosController(enabled=sonos_enabled, default_volume=speaker_volume, ignore_bedroom_speakers=ignore_bedroom_speakers)
if sonos_enabled:
    speaker.play_sound("theme")

taskHandler = TaskHandler(locations)
game = Game(socketio, taskHandler, speaker, task_ratio, meltdown_time, code_percent, locations, vote_time, card_draw_probability, number_of_imposters, starting_cards)

@app.route('/')
def index():
    return "<h1>You shouldn't see this. Please change your port from :5000 to :3000</h1>"

register_socket_handlers(socketio, game, taskHandler, speaker, locations, logger)

if __name__ == '__main__':
    local_ip = get_local_ip()
    write_ip_to_file(f"{local_ip}:5000")
    logger.info("Starting server...")
    logger.info(f" * Please set ENDPOINT to: http://{local_ip}:5000")
    logger.info("Press CTRL+C to quit")
    socketio.run(app, host='0.0.0.0', port=5000, debug=False)
