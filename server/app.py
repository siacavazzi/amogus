############################
##### GAME VARIABLES #######

# how long players have to stop a meltdown (seconds)
meltdown_time = 60 # s

# how long hacks work for
hack_length = 30 # s

# fraction of players who need to enter a code to end meltdown (ex if 0.4 - 4 of 10 players need to enter codes)
code_percent = 0.4

# crewmate to imposter ratio (crewmates per imposter). 
sus_ratio = 5 

# number of tasks each player need to finish to win (on average)
task_ratio = 10 

# SOUND SETTINGS
sonos_enabled = True
speaker_volume = 30 # %
# dont play sounds on speakers with 'bed' in the name
ignore_bedroom_speakers = True

############################


import eventlet
eventlet.monkey_patch()
from flask import Flask, request
from flask_socketio import SocketIO, emit
from flask_cors import CORS
from uuid import uuid4
from assets.game import Game
from assets.sonosHandler import SonosController
from assets.utils import *

logger = setup_logging()

app = Flask(__name__)
CORS(app, resources={r"/*": {"origins": '*'}})
socketio = SocketIO(app, cors_allowed_origins="*")

speaker = SonosController(enabled=sonos_enabled, default_volume=speaker_volume, ignore_bedroom_speakers=ignore_bedroom_speakers)
game = Game(socketio, speaker, sus_ratio, task_ratio, meltdown_time, code_percent)

def sendPlayerList(action='player_list'):
    logger.info("Sending player list to all clients")
    player_list = [player.to_json() for player in game.players]
    logger.debug(f"Player List: {player_list}")
    emit('game_data', {'action': action, 'list': player_list}, broadcast=True, json=True)

@app.route('/')
def index():
    return "<h1>You shouldn't see this. Please change your port from :5000 to :3000</h1>"

@socketio.on('connect')
def handle_connect():
    logger.info(f'Client connected: {request.sid}')
    if game.game_running:
        emit("game_start")

        if game.end_state:
            logger.info(f"Game over: {game.end_state}")
            emit("end_game", game.end_state)

        if game.active_hack > 0:
            emit("hack", game.active_hack)
            logger.debug(f"Active hack: {game.active_hack}")
        if game.meeting:
            emit("meeting")
            logger.debug("Meeting is active")

@socketio.on('rejoin')
def handleJoin(data):
    player = game.getPlayerById(data.get('player_id'))
    if player:
        logger.info("Existing player rejoining...")
        player.sid = request.sid
        sendPlayerList("rejoin")
        emit("crew_score", {"score": game.crew_score})
        emit("task_goal", game.taskGoal)
        emit("sus_score", game.sus_score)

        if player.meltdown_code and game.active_meltdown:
            emit("meltdown_code", player.meltdown_code, to=player.sid)
            logger.debug(f"Sent meltdown code to player {player.player_id}")

        if player.get_task():
            logger.info("Sending task to player")
            emit("task", {"task": player.get_task()}, to=player.sid)

@socketio.on("complete_task")
def handleTaskComplete(data):
    player = game.getPlayerById(data.get('player_id'))
    if player and len(game.tasks) > 0:
        game.crew_score += 1
        emit("crew_score", {"score": game.crew_score}, broadcast=True)
        logger.info(f"Player {player.player_id} completed a task. Crew score: {game.crew_score}")
        player.task = game.getTask()
        emit("task", {"task": player.task}, to=player.sid)
        logger.debug(f"Assigned new task to player {player.player_id}: {player.task}")
    elif player and len(game.tasks) == 0:
        player.task = None
        emit("task", {"task": "No More Tasks"}, to=player.sid)
        logger.info(f"No more tasks available. Informed player {player.player_id}")

@socketio.on("hack")
def handleHack():
    if game.sus_score >= 1 and not game.active_hack and not game.meeting:
        game.sus_score -= 1
        emit("sus_score", game.sus_score, broadcast=True)
        logger.info(f"Hack initiated. Sus score decreased to {game.sus_score}")
        game.start_hack(hack_length)
        speaker.play_sound('hack')
        logger.debug("Hack started with a duration of 30 seconds")

@socketio.on("meeting")
def handleMeeting():
    if not game.meeting:
        speaker.play_sound("meeting")
        emit("meeting", broadcast=True)
        game.meeting = True
        logger.info("Meeting started")

@socketio.on('end_meeting')
def handleEndMeeting():
    if game.meeting:
        emit("end_meeting", broadcast=True)
        game.meeting = False
        logger.info("Meeting ended")

@socketio.on('meltdown')
def handleMeltdown():
    speaker.loop_sound("meltdown", 60)
    game.start_meltdown()
    game.sus_score += 1
    emit("sus_score", game.sus_score, broadcast=True)
    logger.warning(f"Meltdown occurred. Sus score increased to {game.sus_score}")

@socketio.on("pin_entry")
def handlePinEntry(data):
    logger.info("Pin entered")
    game.check_pin(data)
    logger.debug(f"Pin data: {data}")

@socketio.on('player_dead')
def handleDeath(data):
    player = game.getPlayerById(data.get('player_id'))
    if player:
        player.alive = False
        speaker.play_sound('dead')
        logger.info(f"Player {player.player_id} marked as dead")

        if not player.sus:
            game.sus_score += 1
            game.numCrew -= 1
            print(f"CREW LEFT: {game.numCrew}")
            if game.numCrew <= 0:
                game.end_state = 'sus_victory'
                speaker.play_sound('sus_victory')
                emit("end_game", game.end_state, broadcast=True)
                logger.info(f"Game over: {game.end_state}")
            emit("sus_score", game.sus_score, broadcast=True)
            logger.debug(f"Player {player.player_id} was not suspicious. Sus score increased to {game.sus_score}")
        else:
            game.numImposters -= 1
            print(f"IMPOSTERS LEFT: {game.numImposters}")
            if game.numImposters <= 0:
                game.end_state = 'victory'
                speaker.play_sound('crew_victory')
                emit("end_game", game.end_state, broadcast=True)
                logger.info(f"Game over: {game.end_state}")
                
        sendPlayerList()

@socketio.on('reset')
def reset_game():
    for player in game.players:
        player.reset()
    sendPlayerList()
    logger.info("Game has been reset")

@socketio.on('start_game')
def handle_start(data):
    if game.game_running:
        logger.warning("Start game attempted but game is already running")
        return

    speaker.play_sound("theme")
    game.game_running = True
    game.assignRoles()
    sendPlayerList('start_game')
    emit("task_goal", game.taskGoal, broadcast=True)
    logger.info("Game started")

    # Send a different task to each crewmate
    for player in game.players:
        if not player.sus and len(game.tasks) > 0:
            player.task = game.getTask()
            emit("task", {"task": player.get_task()}, to=player.sid)
            logger.debug(f"Assigned task to player {player.player_id}: {player.task}")

@socketio.on('join')
def handle_join(data):
    player_id = data.get('player_id')
    username = data.get('username')
    sid = request.sid

    if not username:
        emit('error', {'message': 'Username is required'}, to=sid)
        logger.warning(f"Join attempt without username from SID: {sid}")
        return

    if player_id:
        player = game.getPlayerById(player_id)
        if player:
            # Player reconnected
            player.sid = sid
            player.username = username  # Update username on reconnect
            logger.info(f"Player {player.username} (ID: {player.player_id}) reconnected with new SID: {sid}")
        else:
            # Invalid player_id, create new player
            if game.game_running:
                logger.warning(f"Join attempt with invalid player_id: {player_id} while game is running")
                return
            player = game.addPlayer(sid, username)
            emit('player_id', {'player_id': player.player_id}, to=sid)
            logger.info(f"New player {username} joined with new ID {player.player_id}")
    else:
        # New player
        if game.game_running:
            logger.warning(f"Join attempt without player_id while game is running for username: {username}")
            return
        player = game.addPlayer(sid, username)
        emit('player_id', {'player_id': player.player_id, 'pic': player.pic}, to=sid)
        logger.info(f"New player {username} joined with ID {player.player_id}")

    sendPlayerList()

@socketio.on('disconnect')
def handle_disconnect():
    logger.info(f"Client disconnected: {request.sid}")
    # Optional: Handle player disconnection logic
    # player = game.getPlayerBySid(request.sid)
    # if player:
    #     sendPlayerList()

if __name__ == '__main__':
    local_ip = get_local_ip()
    write_ip_to_file(f"{local_ip}:5000")
    logger.info("Starting server...")
    logger.info(f" * Please set ENDPOINT to: http://{local_ip}:5000")
    logger.info("Press CTRL+C to quit")
    socketio.run(app, host='0.0.0.0', port=5000, debug=False)
