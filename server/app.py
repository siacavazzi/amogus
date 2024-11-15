import eventlet
eventlet.monkey_patch()
from flask import Flask, request
from flask_socketio import SocketIO, emit
from flask_cors import CORS
from uuid import uuid4
from assets.player import Player

app = Flask(__name__)
CORS(app, resources={r"/*": {"origins": '*'}})
socketio = SocketIO(app, cors_allowed_origins=["http://localhost:3000"])

players = []

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

def sendPlayerList():
    print("Sending player list to all clients")
    emit('player_list', {'list': [player.username for player in players]}, broadcast=True, json=True)

@app.route('/')
def index():
    return "<h1>Waddup</h1>"

@socketio.on('connect')
def handle_connect():
    print('Client connected:', request.sid)

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
    socketio.run(app, host='0.0.0.0', port=5000)
