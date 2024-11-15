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
# http://localhost:3000 is not an accepted origin. (further occurrences of this error will be logged with level INFO)
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

# @socketio.on('player_join')
# def addPlayer(data):
#     print("Player joined:", data)
#     # Check if the player already exists (reconnect scenario)
#     player = getPlayer(request.sid)
#     if player:
#         player.active = True
#         print("Existing player has rejoined")
#         return

#     # If new player, add them
#     new_player = Player(request.sid, data['username'])
#     players.append(new_player)
#     print(f"{len(players)} players now in game.")

#     # Send success response back to the client
#     emit('join_response', {'status': 'success', 'message': 'Joined successfully'}, to=request.sid)

@app.route('/player_join', methods=['POST'])
def addPlayer():
    data = request.get_json()
    username = data.get('username')
    print("Player joining...")
    if not username:
        return jsonify({"status": "error", "message": "Username is required"}), 400

    # Check if the player already exists (simulate reconnect scenario)
    existing_player = getPlayer(username)
    if existing_player:
        if existing_player.active:
            return jsonify({"status": "error", "message": "This player is still active"}), 409
        existing_player.active = True
        return jsonify({"status": "success", "message": "Rejoined successfully"}), 200

    # If new player, add them
    new_player = Player(request.remote_addr, username)  # Use IP or request context for ID
    players.append(new_player)
    print(f"{len(players)} players now in game.")
    return jsonify({"status": "success", "message": "Joined successfully"}), 200

if __name__ == '__main__':
    socketio.run(app, host='0.0.0.0', port=5000)
