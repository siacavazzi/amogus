import eventlet
eventlet.monkey_patch()
from flask import Flask, request
from flask_socketio import SocketIO, emit
from flask_cors import CORS
from uuid import uuid4
from assets.player import Player
from assets.tasks import getTasks
import socket
import random
import math


app = Flask(__name__)
CORS(app, resources={r"/*": {"origins": '*'}})
socketio = SocketIO(app, cors_allowed_origins=["http://localhost:3000", "http://192.168.68.62:3000", '*'])

players = []
tasks = []
crew_points = 0
sus_points = 0

def resetRoles():
    for player in players:
        player.sus = False

def assignRoles():
    resetRoles()
    global players
    print(players)
    
    # 1/5 ratio
    numImposters = math.ceil((len(players) / 5))
    print(numImposters)
    random.shuffle(players)
    for i in range(0, numImposters):
        players[i]
        players[i].sus = True
    random.shuffle(players)
    print("assinging roles...")
    print(players)
    

def getPlayerBySid(sid):
    for player in players:
        if player.sid == sid:
            return player
    return None

def getPlayerById(player_id):
    for player in players:
        if player.player_id == player_id:
            return player
    return None

def get_local_ip():
    try:
        # Create a temporary socket to find the local IP
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        # Use Google's public DNS server as the target
        s.connect(("8.8.8.8", 80))
        local_ip = s.getsockname()[0]
        s.close()
        return local_ip
    except Exception as e:
        print("Error getting local IP:", e)
        return "127.0.0.1"  # Fallback to localhost if unable to get IP
    
def sendPlayerList(action = 'player_list'):
    print("Sending player list to all clients")
    emit('game_data', {'action':action,'list': [player.to_json() for player in players]}, broadcast=True, json=True)

@app.route('/')
def index():
    return "<h1>Waddup</h1>"

@socketio.on('connect')
def handle_connect():
    print('Client connected:', request.sid)

@socketio.on('reset')
def reset_game():
    for player in players:
        player.reset()
    sendPlayerList()

@socketio.on('start_game')
def handle_start(data):
    global tasks

    assignRoles()
    sendPlayerList('start_game')
    tasks = getTasks()
    # send a different task to each crewmate
    for player in players:
        if not player.sus:
            emit("task", tasks.pop, to=player.sid)

@socketio.on('join')
def handle_join(data):
    player_id = data.get('player_id')
    username = data.get('username')
    sid = request.sid

    if not username:
        emit('error', {'message': 'Username is required'}, to=sid)
        return

    if player_id:
        player = getPlayerById(player_id)
        if player:
            # Player reconnected
            player.sid = sid
            player.username = username  # Update username on reconnect
            print(f"Player {player.username} reconnected with new username")
        else:
            # Invalid player_id, create new player
            player_id = str(uuid4())
            new_player = Player(sid=sid, player_id=player_id, username=username)
            players.append(new_player)
            emit('player_id', {'player_id': player_id}, to=sid)
            print(f"New player {username} joined with new ID {player_id}")
    else:
        # New player
        player_id = str(uuid4())
        new_player = Player(sid=sid, player_id=player_id, username=username)
        players.append(new_player)
        emit('player_id', {'player_id': player_id}, to=sid)
        print(f"New player {username} joined with ID {player_id}")

    sendPlayerList()

@socketio.on('disconnect')
def handle_disconnect():
    print("Client disconnected:", request.sid)
    player = getPlayerBySid(request.sid)
    if player:
        sendPlayerList()

if __name__ == '__main__':
    local_ip = get_local_ip()

    print("Starting server...")
    print(f" * Running on all addresses (0.0.0.0)")
    print(f" * Running on http://127.0.0.1:5000")
    print(f" * Running on http://{local_ip}:5000")
    print("Press CTRL+C to quit")
    socketio.run(app, host='0.0.0.0', port=5000, debug=False)
