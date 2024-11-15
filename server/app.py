import eventlet
eventlet.monkey_patch()
from flask import Flask, render_template, jsonify, request, session
from flask_socketio import SocketIO, send, emit
from flask_cors import CORS
from assets.player import Player

app = Flask(__name__)
#cors = CORS(app,resources={r"/*":{"origins":"*"}}) # This allows all origins. Be careful in production. Wahhh
# Set up Flask-CORS to handle HTTP requests with CORS
CORS(app, resources={r"/*": {"origins": '*'}})

# Set up SocketIO to handle WebSocket requests with CORS
socketio = SocketIO(app, cors_allowed_origins=["http://localhost:3000"])

connected_clients = set()
players = []


def getPlayer(sid):
    for player in players:
        if player.sid == sid:
            return player
    return None

def check_for_reconnect(sid, name):
    for player in players:
        if player.name == name:
            if player.active:
                msg = {
                    'type': 'error',
                    'text': 'This player is still active'
                }
                send(msg, to=sid, json=True)
                return
            player.active = True
            player.sid = sid
            msg = {
                'type': 'message',
                'text': 'Successfully rejoined'
            }
            return

def sendPlayerList():
    print("Sending player list to all clients")
    emit('player_list', {'list': [player.username for player in players]}, broadcast=True, json=True, namespace='/')


@app.route('/')
def index():
    return "<h1>Waddup</h1>"

@socketio.on('connect')
def handle_connect():
    print('Client connected:', request.sid)
    connected_clients.add(request.sid)


@socketio.on('disconnect')
def handle_disconnect():
    print("Client disconnected:", request.sid)
    connected_clients.remove(request.sid)
    player = getPlayer(request.sid)
    if player:
        player.active = False
        sendPlayerList()

@app.route('/player_join', methods=['POST'])
def addPlayer():

    data = request.get_json()
    username = data.get('username')

    if not username:
        return jsonify({"status": "error", "message": "Username is required"}), 400

    # If new player, add them
    new_player = Player(request.remote_addr, username)  # Use IP or request context for ID
    players.append(new_player)
    print(f"{len(players)} players now in game.")
    sendPlayerList()
    return jsonify({"status": "success", "message": "Joined successfully"}), 200

    

if __name__ == '__main__':
    socketio.run(app, host='0.0.0.0', port=5000)
