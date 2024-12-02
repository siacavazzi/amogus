import eventlet
eventlet.monkey_patch()
from flask import Flask, request
from flask_socketio import SocketIO, emit
from flask_cors import CORS
from uuid import uuid4
from assets.game import Game
from assets.sonosHandler import SonosController
from assets.utils import *


app = Flask(__name__)
CORS(app, resources={r"/*": {"origins": '*'}})
socketio = SocketIO(app, cors_allowed_origins="*")

game = Game(socketio)
speaker = SonosController(enabled=True)
    
def sendPlayerList(action = 'player_list'):
    print("Sending player list to all clients")
    print([player.to_json() for player in game.players])
    emit('game_data', {'action':action,'list': [player.to_json() for player in game.players]}, broadcast=True, json=True)

@app.route('/')
def index():
    return "<h1>You shouldnt see this. Please change your port from :5000 to :3000</h1>"

@socketio.on('connect')
def handle_connect():
    print('Client connected:', request.sid)
    if game.game_running:
        emit("game_start")

        if(game.active_hack > 0):
            emit("hack", game.active_hack)
        if(game.meeting):
            emit("meeting")

@socketio.on('rejoin')
def handleJoin(data):
    player = game.getPlayerById(data['player_id'])
    if(player):
        print("existing player joining...")
        player.sid = request.sid
        sendPlayerList("rejoin")
        emit("crew_score", {"score":game.crew_score})
        emit("task_goal", game.taskGoal)
        emit("sus_score", game.sus_score)

        if(player.meltdown_code):
            emit("meltdown_code", player.meltdown_code, to=player.sid)

        if(player.get_task()):
            print("SENDING TASK!!")
            emit("task", {"task": player.get_task()}, to=player.sid)


@socketio.on("complete_task")
def handleTaskComplete(data):
    player = game.getPlayerById(data['player_id'])
    if(player and len(game.tasks) > 0):
        game.crew_score += 1
        emit("crew_score", {"score":game.crew_score}, broadcast=True)
        player.task = game.getTask()
        emit("task", {"task": player.task}, to=player.sid)
    elif(player and len(game.tasks) == 0):
        player.task = None
        emit("task", {"task": "No More Tasks"}, to=player.sid)

@socketio.on("hack")
def handleHack():
    if game.sus_score >= 1 and not game.active_hack and not game.meeting:
        game.sus_score -= 1
        emit("sus_score", game.sus_score, broadcast=True)
        game.start_hack(30)


@socketio.on("meeting")
def handleMeeting():
    if not game.meeting:
        speaker.play_sound("meeting")
        emit("meeting", broadcast=True)
        game.meeting = True

@socketio.on('end_meeting')
def handleEndMeeting():
    if game.meeting:
        emit("end_meeting", broadcast=True)
        game.meeting = False

@socketio.on('meltdown')
def handleMeltdown():
    game.start_meltdown()
    game.sus_score += 1
    emit("sus_score", game.sus_score, broadcast=True)

@socketio.on("pin_entry")
def handlePinEntry(data):
    print("pin entered")
    game.check_pin(data)

@socketio.on('player_dead')
def handleDeath(data):
    player = game.getPlayerById(data['player_id'])
    if player:
        player.alive = False
        if not player.sus:
            game.sus_score += 1
            emit("sus_score", game.sus_score, broadcast=True)
        sendPlayerList()

@socketio.on('reset')
def reset_game():
    for player in game.players:
        player.reset()
    sendPlayerList()

@socketio.on('start_game')
def handle_start(data):
    if(game.game_running == True):
        return
    
    speaker.play_sound("start")
    game.game_running = True
    game.assignRoles()
    sendPlayerList('start_game')
    emit("task_goal", game.taskGoal, broadcast=True)

    # send a different task to each crewmate
    for player in game.players:
        if not player.sus and len(game.tasks) > 0:
            player.task = game.getTask()
            emit("task", {"task": player.get_task()}, to=player.sid)

@socketio.on('join')
def handle_join(data):
    player_id = data.get('player_id')
    username = data.get('username')
    sid = request.sid

    if not username:
        emit('error', {'message': 'Username is required'}, to=sid)
        return

    if player_id:
        player = game.getPlayerById(player_id)
        if player:
            # Player reconnected
            player.sid = sid
            player.username = username  # Update username on reconnect
            print(f"Player {player.username} reconnected with new username")
        else:
            # Invalid player_id, create new player
            if game.game_running:
                return
            player = game.addPlayer(sid, username)
            emit('player_id', {'player_id': player.player_id}, to=sid)
            print(f"New player {username} joined with new ID {player_id}")
    else:
        # New player
        if game.game_running:
            return
        player = game.addPlayer(sid, username)
        emit('player_id', {'player_id': player.player_id, 'pic':player.pic}, to=sid)
        print(f"New player {username} joined with ID {player_id}")

    sendPlayerList()

@socketio.on('disconnect')
def handle_disconnect():
    print("Client disconnected:", request.sid)
    # player = game.getPlayerBySid(request.sid)
    # if player:
    #     sendPlayerList()

if __name__ == '__main__':
    local_ip = get_local_ip()
    write_ip_to_file(local_ip + ":5000")
    print("Starting server...")
    print(f" * Please set ENDPOINT to: http://{local_ip}:5000")
    print("Press CTRL+C to quit")
    socketio.run(app, host='0.0.0.0', port=5000, debug=False)
