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
from flask import Flask, request
from flask_socketio import SocketIO, emit, join_room, leave_room
from flask_cors import CORS
from assets.game import Game
from assets.sonosHandler import SonosController
from assets.utils import *
from assets.taskHandler import *
from uuid import uuid4

logger = setup_logging()

app = Flask(__name__)
CORS(app, resources={r"/*": {"origins": '*'}})
socketio = SocketIO(app, cors_allowed_origins="*")

rooms = {}
player_room = {}

def create_game(room_id):
    task_handler = TaskHandler(locations)
    return Game(socketio, task_handler, speaker, task_ratio, meltdown_time, code_percent, locations, vote_time, card_draw_probability, number_of_imposters, starting_cards, room=room_id)

locations.append("Other")
# big boi objects
speaker = SonosController(enabled=sonos_enabled, default_volume=speaker_volume, ignore_bedroom_speakers=ignore_bedroom_speakers)
if sonos_enabled:
    speaker.play_sound("theme")

def sendPlayerList(game, room, action='player_list'):
    logger.info(f"Sending player list to room {room}")
    player_list = [player.to_json() for player in game.players]
    logger.debug(f"Player List: {player_list}")
    emit('game_data', {'action': action, 'list': player_list, 'running': game.game_running}, room=room, json=True)

def get_game_by_player(player_id):
    room = player_room.get(player_id)
    if room:
        return rooms.get(room), room
    return None, None

@app.route('/api/rooms/<room_id>', methods=['GET'])
def api_check_room(room_id):
    """Return 200 if the room exists so the client can verify rooms via HTTP."""
    if room_id in rooms:
        logger.debug(f"API check: room {room_id} exists")
        return {'exists': True}, 200
    logger.warning(f"API check failed: room {room_id} not found")
    return {'error': 'Room not found'}, 404

@app.route('/api/rooms', methods=['POST'])
def api_create_room():
    """Create a new room and return the room id."""
    room_id = str(uuid4())[:4]
    rooms[room_id] = create_game(room_id)
    logger.info(f"Room {room_id} created via HTTP API")
    return {'room_id': room_id}, 201

@app.route('/')
def index():
    return "<h1>You shouldn't see this. Please change your port from :5000 to :3000</h1>"

@socketio.on('connect')
def handle_connect():
    logger.info(f'Client connected: {request.sid}')
    emit('task_locations', locations, json=True)

@socketio.on('create_room')
def handle_create_room():
    room_id = str(uuid4())[:4]
    rooms[room_id] = create_game(room_id)
    logger.info(f"Room {room_id} created")
    emit('room_created', {'room_id': room_id}, to=request.sid)

@socketio.on('rejoin')
def handleJoin(data):
    room_id = data.get('room_id')
    player_id = data.get('player_id')
    game = rooms.get(room_id)
    if not game:
        logger.warning(f"Rejoin failed: room {room_id} not found")
        emit('error', {'message': 'Room not found'}, to=request.sid)
        return
    player = game.getPlayerById(player_id)
    if player:
        logger.info("Existing player rejoining...")
        player.sid = request.sid
        join_room(room_id)
        player_room[player.player_id] = room_id
        sendPlayerList(game, room_id, "rejoin")

        if game.game_running:
            emit("game_start", to=player.sid)
            emit("crew_score", {"score": game.crew_score}, to=player.sid)
            emit("task_goal", game.taskGoal, to=player.sid)

            if game.end_state:
                emit("end_game", game.end_state, to=player.sid)
            if len(game.card_deck.active_cards) > 0:
                game.card_deck.emit_active_cards()

            if game.active_hack > 0:
                emit("hack", game.active_hack, to=player.sid)
            if game.meeting:
                emit("meeting", game.meeting.to_json(), to=player.sid)
                if game.meeting.stage == 'voting':
                    game.meeting.emit_vote_counts()

        if game.denied_location:
            emit('active_denial', game.denied_location, room=room_id)

        if player.meltdown_code and game.active_meltdown:
            emit("meltdown_code", player.meltdown_code, to=player.sid)
            logger.debug(f"Sent meltdown code to player {player.player_id}")

        if player.get_task():
            logger.info("Sending task to player")
            emit("task", {"task": player.get_task()}, to=player.sid)

@socketio.on('add_task')  # this should use an api and not a socket
def addTask(data):
    print(data)
    for game in rooms.values():
        game.task_handler.add_task(data)

@socketio.on("complete_task")
def handleTaskComplete(data):
    player_id = data.get('player_id')
    game, room = get_game_by_player(player_id)
    if not game:
        return
    player = game.getPlayerById(player_id)
    if player and len(game.task_handler.tasks) > 0:
        game.crew_score += 1
        emit("crew_score", {"score": game.crew_score}, room=room)
        logger.info(f"Player {player.player_id} completed a task. Crew score: {game.crew_score}")
        player.task = game.getTask()
        emit("task", {"task": player.task}, to=player.sid)
        logger.debug(f"Assigned new task to player {player.player_id}: {player.task}")
    elif player and len(game.task_handler.tasks) == 0:
        player.task = None
        emit("task", {"task": "No More Tasks"}, to=player.sid)
        logger.info(f"No more tasks available. Informed player {player.player_id}")


@socketio.on("play_card")
def playCard(data):
    print(data)
    player_id = data.get('player_id')
    game, _ = get_game_by_player(player_id)
    if not game:
        return
    player = game.getPlayerById(player_id)
    card = player.get_card(data.get('card_id'))
    if card:
        card.play_card(player)

@socketio.on("meeting")
def handleMeeting(data):
    player_id = data.get('player_id')
    game, room = get_game_by_player(player_id)
    if not game or game.meeting:
        return
    speaker.play_sound("meeting")
    player = game.getPlayerById(player_id)
    game.start_meeting(player)

    # emit("meeting", broadcast=True)
    # game.meeting = True
    logger.info("Meeting started")

@socketio.on("ready")
def handleReady(data):
    player_id = data.get('player_id')
    game, room = get_game_by_player(player_id)
    if not game:
        return
    player = game.getPlayerById(player_id)
    player.ready = True
    sendPlayerList(game, room)
    game.try_start_voting() # only starts if all players are ready

@socketio.on("vote")
def handleVote(data):
    voting_player_id = data.get('player_id')
    voted_for_id = data.get('votedFor')
    game, _ = get_game_by_player(voting_player_id)
    if not game:
        return
    voting_player = game.getPlayerById(voting_player_id)
    voted_for = game.getPlayerById(voted_for_id)
    game.meeting.register_vote(voting_player, voted_for)

@socketio.on("veto")
def handleVote(data):
    voting_player_id = data.get('player_id')
    game, _ = get_game_by_player(voting_player_id)
    if not game:
        return
    voting_player = game.getPlayerById(voting_player_id)
    game.meeting.register_vote(voting_player, veto=True)
        

@socketio.on('end_meeting')
def handleEndMeeting():
    # Determine room by meeting owner's game
    for room_id, game in rooms.items():
        if game.meeting:
            emit("end_meeting", room=room_id)
            game.meeting = False
            logger.info("Meeting ended")


@socketio.on('meltdown')
def handleMeltdown(data):
    player_id = data.get('player_id')
    game, _ = get_game_by_player(player_id)
    if not game:
        return
    game.start_meltdown()
    logger.warning("Meltdown occurred.")

@socketio.on("pin_entry")
def handlePinEntry(data):
    logger.info("Pin entered")
    player_id = data.get('player_id')
    game, _ = get_game_by_player(player_id)
    if not game:
        return
    game.check_pin(data)
    logger.debug(f"Pin data: {data}")

@socketio.on('player_dead')
def handleDeath(data):
    player_id = data.get('player_id')
    game, _ = get_game_by_player(player_id)
    if not game:
        return
    game.kill_player(player_id)

@socketio.on('reset')
def reset_game(data):
    room_id = data.get('room_id')
    game = rooms.get(room_id)
    if not game:
        return
    for player in game.players:
        player.reset()
    sendPlayerList(game, room_id)
    logger.info("Game has been reset")

@socketio.on('start_game')
def handle_start(data):
    room_id = data.get('room_id')
    game = rooms.get(room_id)
    if not game:
        return
    if game.game_running:
        logger.warning("Start game attempted but game is already running")
        return

    speaker.play_sound("theme")
    game.game_running = True
    game.assignRoles()
    sendPlayerList(game, room_id, 'start_game')
    emit("task_goal", game.taskGoal, room=room_id)
    logger.info("Game started")

    for player in game.players:
        if not player.sus and len(game.task_handler.tasks) > 0:
            player.task = game.getTask()
            emit("task", {"task": player.task}, to=player.sid)
            logger.debug(f"Assigned task to player {player.player_id}: {player.task}")


@socketio.on('join')
def handle_join(data):
    player_id = data.get('player_id')
    username = data.get('username')
    room_id = data.get('room_id')
    sid = request.sid

    game = rooms.get(room_id)
    if not game:
        emit('error', {'message': 'Room not found'}, to=sid)
        return
    join_room(room_id)
    logger.info(f"Player attempting to join room {room_id}")

    if not username:
        emit('error', {'message': 'Username is required'}, to=sid)
        logger.warning(f"Join attempt without username from SID: {sid}")
        return

    if player_id:
        player = game.getPlayerById(player_id)
        if player:
            player.sid = sid
            player.username = username
            logger.info(f"Player {player.username} (ID: {player.player_id}) reconnected with new SID: {sid}")
        else:
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

    player_room[player.player_id] = room_id
    logger.info(f"Player {player.username} joined room {room_id}")
    sendPlayerList(game, room_id)

@socketio.on('leave_room')
def handle_leave(data):
    room_id = data.get('room_id')
    player_id = data.get('player_id')
    game = rooms.get(room_id)
    if not game:
        return
    player = game.getPlayerById(player_id)
    if player:
        logger.info(f"Player {player.username} leaving room {room_id}")
        game.players.remove(player)
        player_room.pop(player_id, None)
        leave_room(room_id, sid=player.sid)
        if len(game.players) == 0:
            logger.info(f"Room {room_id} is empty and will be removed")
            del rooms[room_id]
    sendPlayerList(game, room_id)

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
