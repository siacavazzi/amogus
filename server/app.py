import eventlet
eventlet.monkey_patch()
from flask import Flask, request
from flask_socketio import SocketIO, emit, join_room, leave_room
from flask_cors import CORS
from assets.game_manager import GameManager
from assets.sonosHandler import SonosController
from assets.utils import *
from assets.taskHandler import *
from config import (
    LOCATIONS, VOTE_TIME, VOTE_THRESHOLD, MELTDOWN_TIME, CODE_PERCENT,
    NUMBER_OF_IMPOSTERS, CARD_DRAW_PROBABILITY, STARTING_CARDS, TASK_RATIO,
    SONOS_ENABLED, SPEAKER_VOLUME, IGNORE_BEDROOM_SPEAKERS
)

logger = setup_logging()

app = Flask(__name__)
CORS(app, resources={r"/*": {"origins": '*'}})
socketio = SocketIO(app, cors_allowed_origins="*")

# Configuration dictionary for game creation
game_config = {
    'LOCATIONS': LOCATIONS,
    'VOTE_TIME': VOTE_TIME,
    'VOTE_THRESHOLD': VOTE_THRESHOLD,
    'MELTDOWN_TIME': MELTDOWN_TIME,
    'CODE_PERCENT': CODE_PERCENT,
    'NUMBER_OF_IMPOSTERS': NUMBER_OF_IMPOSTERS,
    'CARD_DRAW_PROBABILITY': CARD_DRAW_PROBABILITY,
    'STARTING_CARDS': STARTING_CARDS,
    'TASK_RATIO': TASK_RATIO,
}

# Shared speaker controller (disabled for hosted multi-game mode typically)
speaker = SonosController(enabled=SONOS_ENABLED, default_volume=SPEAKER_VOLUME, ignore_bedroom_speakers=IGNORE_BEDROOM_SPEAKERS)

# Game manager handles multiple concurrent games
game_manager = GameManager(socketio, speaker, game_config)


def get_game_and_player(player_id):
    """Helper to get game and player from player_id."""
    game, room_code = game_manager.get_game_by_player_id(player_id)
    if game:
        player = game.getPlayerById(player_id)
        return game, player, room_code
    return None, None, None


def sendPlayerList(game, room_code, action='player_list'):
    """Send player list to all clients in a game room."""
    logger.info(f"Sending player list to room {room_code}")
    player_list = [player.to_json() for player in game.players]
    logger.debug(f"Player List: {player_list}")
    socketio.emit('game_data', {'action': action, 'list': player_list}, room=room_code)


@app.route('/')
def index():
    return "<h1>Among Us IRL Server</h1><p>Connect via the client application.</p>"


@app.route('/api/games')
def list_games():
    """API endpoint to list all active games (for debugging/admin)."""
    return game_manager.get_all_games()


# ============ ROOM MANAGEMENT ============

@socketio.on('create_game')
def handle_create_game():
    """Create a new game room and return the room code."""
    sid = request.sid
    room_code, game = game_manager.create_game(sid)
    game.creator_sid = sid  # Track room creator
    join_room(room_code)
    
    logger.info(f"Game created with room code: {room_code}")
    emit('game_created', {'room_code': room_code, 'is_creator': True})
    emit('game_config', game.get_config())


@socketio.on('get_game_config')
def handle_get_game_config(data):
    """Get the current game configuration."""
    room_code = data.get('room_code', '').upper() if data else None
    
    if not room_code:
        room_code = game_manager.sid_to_game.get(request.sid)
    
    game = game_manager.get_game(room_code)
    if game:
        emit('game_config', game.get_config())


@socketio.on('update_game_config')
def handle_update_game_config(data):
    """Update game configuration (only room creator can do this)."""
    sid = request.sid
    room_code = data.get('room_code', '').upper()
    config = data.get('config', {})
    
    game = game_manager.get_game(room_code)
    if not game:
        emit('error', {'message': 'Game not found'})
        return
    
    if game.creator_sid != sid:
        emit('error', {'message': 'Only the room creator can change settings'})
        return
    
    if game.game_running:
        emit('error', {'message': 'Cannot change settings while game is running'})
        return
    
    game.update_config(config)
    logger.info(f"Game {room_code} config updated: {config}")
    emit('game_config', game.get_config())


@socketio.on('open_room')
def handle_open_room(data):
    """Open the room for other players to join."""
    sid = request.sid
    room_code = data.get('room_code', '').upper()
    
    game = game_manager.get_game(room_code)
    if not game:
        emit('error', {'message': 'Game not found'})
        return
    
    if game.creator_sid != sid:
        emit('error', {'message': 'Only the room creator can open the room'})
        return
    
    game.is_open = True
    logger.info(f"Room {room_code} is now open for players")
    emit('room_opened', {'room_code': room_code})
    emit('task_locations', game.locations)


@socketio.on('join_game')
def handle_join_game(data):
    """Join an existing game room by room code."""
    sid = request.sid
    room_code = data.get('room_code', '').upper()
    
    game = game_manager.get_game(room_code)
    if not game:
        emit('error', {'message': 'Game not found. Check the room code.'})
        logger.warning(f"Join attempt for non-existent room: {room_code}")
        return
    
    if not game.is_open:
        emit('error', {'message': 'This room is not open yet. The host is still configuring.'})
        logger.warning(f"Join attempt for not-yet-open room: {room_code}")
        return
    
    if game.game_running:
        emit('error', {'message': 'Game already in progress. Cannot join.'})
        logger.warning(f"Join attempt for running game: {room_code}")
        return
    
    join_room(room_code)
    game_manager.sid_to_game[sid] = room_code
    
    emit('game_joined', {'room_code': room_code})
    emit('task_locations', game.locations)
    logger.info(f"Client {sid} joined room {room_code}")


@socketio.on('register_reactor')
def handle_register_reactor(data):
    """Register a desktop client as the reactor for a game room."""
    sid = request.sid
    room_code = data.get('room_code', '').upper() if data else None
    
    # Try to get room from data or from sid mapping
    if not room_code:
        room_code = game_manager.sid_to_game.get(sid)
    
    if not room_code:
        emit('error', {'message': 'Not in a game room'})
        return
    
    game = game_manager.get_game(room_code)
    if not game:
        emit('error', {'message': 'Game not found'})
        return
    
    if game.game_running:
        emit('error', {'message': 'Cannot register reactor after game has started'})
        return
    
    # Register this client as the reactor
    game.has_reactor = True
    game.reactor_sid = sid
    logger.info(f"Reactor registered for room {room_code} (sid: {sid})")
    emit('reactor_registered', {'room_code': room_code})


# ============ CONNECTION HANDLING ============

@socketio.on('connect')
def handle_connect():
    logger.info(f'Client connected: {request.sid}')
    # Don't auto-join any room on connect - client must create or join


@socketio.on('rejoin')
def handleRejoin(data):
    """Handle player reconnection to their game."""
    player_id = data.get('player_id')
    if not player_id:
        return
    
    game, player, room_code = get_game_and_player(player_id)
    if not game or not player:
        emit('rejoin_failed', {'message': 'Game session not found'})
        return
    
    logger.info(f"Player {player_id} rejoining room {room_code}")
    player.sid = request.sid
    game_manager.update_sid(player_id, request.sid)
    join_room(room_code)
    
    # Send current game state
    emit('game_joined', {'room_code': room_code})
    emit('task_locations', game.locations)
    sendPlayerList(game, room_code, "rejoin")
    
    if game.game_running:
        emit("game_start")
        emit("crew_score", {"score": game.crew_score})
        emit("task_goal", game.taskGoal)
        
        if game.end_state:
            logger.info(f"Game over: {game.end_state}")
            emit("end_game", game.end_state)
        
        if len(game.card_deck.active_cards) > 0:
            game.card_deck.emit_active_cards()
        
        if game.active_hack > 0:
            emit("hack", game.active_hack)
            logger.debug(f"Active hack: {game.active_hack}")
        
        if game.meeting:
            emit("meeting", game.meeting.to_json())
            if game.meeting.stage == 'voting':
                game.meeting.emit_vote_counts()
            logger.debug("Meeting is active")
        
        if game.denied_location:
            emit('active_denial', game.denied_location)
        
        if player.meltdown_code and game.active_meltdown:
            emit("meltdown_code", player.meltdown_code, to=player.sid)
            logger.debug(f"Sent meltdown code to player {player.player_id}")
        
        if player.get_task():
            logger.info("Sending task to player")
            emit("task", {"task": player.get_task()}, to=player.sid)


@socketio.on('disconnect')
def handle_disconnect():
    sid = request.sid
    logger.info(f"Client disconnected: {sid}")
    game_manager.unregister_sid(sid)


# ============ PLAYER MANAGEMENT ============

@socketio.on('join')
def handle_join(data):
    """Handle player joining/creating within a game room."""
    player_id = data.get('player_id')
    username = data.get('username')
    room_code = data.get('room_code', '').upper()
    sid = request.sid

    if not username:
        emit('error', {'message': 'Username is required'}, to=sid)
        logger.warning(f"Join attempt without username from SID: {sid}")
        return

    # If player_id is provided, try to reconnect
    if player_id:
        game, player, existing_room = get_game_and_player(player_id)
        if player:
            player.sid = sid
            player.username = username
            game_manager.update_sid(player_id, sid)
            join_room(existing_room)
            logger.info(f"Player {player.username} (ID: {player.player_id}) reconnected")
            sendPlayerList(game, existing_room)
            return

    # New player joining a room
    game = game_manager.get_game(room_code)
    if not game:
        emit('error', {'message': 'Game not found'}, to=sid)
        return

    if game.game_running:
        emit('error', {'message': 'Game already in progress'}, to=sid)
        logger.warning(f"Join attempt while game running: {username}")
        return

    player = game.addPlayer(sid, username)
    game_manager.register_player(player.player_id, room_code, sid)
    join_room(room_code)
    
    emit('player_id', {'player_id': player.player_id, 'pic': player.pic}, to=sid)
    logger.info(f"New player {username} joined room {room_code} with ID {player.player_id}")
    
    sendPlayerList(game, room_code)


# ============ GAME FLOW ============

@socketio.on('start_game')
def handle_start(data):
    """Start the game in a room."""
    player_id = data.get('player_id')
    game, player, room_code = get_game_and_player(player_id)
    
    if not game:
        emit('error', {'message': 'Game not found'})
        return

    if game.game_running:
        logger.warning("Start game attempted but game is already running")
        return

    speaker.play_sound("theme")
    game.game_running = True
    game.assignRoles()
    sendPlayerList(game, room_code, 'start_game')
    socketio.emit("task_goal", game.taskGoal, room=room_code)
    logger.info(f"Game started in room {room_code}")

    # Send a different task to each crewmate
    for p in game.players:
        if not p.sus and len(game.task_handler.tasks) > 0:
            p.task = game.getTask()
            emit("task", {"task": p.task}, to=p.sid)
            logger.debug(f"Assigned task to player {p.player_id}: {p.task}")


@socketio.on('reset')
def reset_game(data):
    """Reset a game to lobby state - keeps players but restarts game."""
    player_id = data.get('player_id') if isinstance(data, dict) else None
    
    if player_id:
        game, player, room_code = get_game_and_player(player_id)
    else:
        return
    
    if not game:
        return
    
    # Reset all players but keep them in the game
    for p in game.players:
        p.reset()
    
    game.reset_game_state()
    
    # Notify all clients to go back to players page
    socketio.emit('game_reset', {'room_code': room_code}, room=room_code)
    sendPlayerList(game, room_code)
    logger.info(f"Game {room_code} has been reset to lobby")


@socketio.on('disband_room')
def disband_room(data):
    """Disband a room completely - all players return to main lobby."""
    player_id = data.get('player_id') if isinstance(data, dict) else None
    
    if not player_id:
        return
    
    game, player, room_code = get_game_and_player(player_id)
    
    if not game:
        return
    
    # Notify all clients to leave and go back to lobby
    socketio.emit('room_disbanded', {'message': 'Room has been closed'}, room=room_code)
    
    # Clean up the game
    game_manager.remove_game(room_code)
    logger.info(f"Room {room_code} has been disbanded")


@socketio.on('leave_room')
def leave_room_handler(data):
    """Handle a player leaving the room."""
    player_id = data.get('player_id') if isinstance(data, dict) else None
    
    if not player_id:
        return
    
    game, player, room_code = get_game_and_player(player_id)
    
    if not game or not player:
        return
    
    # Remove player from game
    game.players.remove(player)
    game_manager.unregister_player(player_id)
    leave_room(room_code)
    
    # Notify the leaving player
    emit('left_room')
    
    # Notify remaining players
    sendPlayerList(game, room_code)
    logger.info(f"Player {player.username} left room {room_code}")


# ============ TASK HANDLING ============

@socketio.on('add_task')
def addTask(data):
    """Add a task (should probably use API instead)."""
    player_id = data.get('player_id')
    game, player, room_code = get_game_and_player(player_id)
    
    if game:
        game.task_handler.add_task(data)
        print(data)


@socketio.on("complete_task")
def handleTaskComplete(data):
    """Handle task completion."""
    player_id = data.get('player_id')
    game, player, room_code = get_game_and_player(player_id)
    
    if not game or not player:
        return
    
    if len(game.task_handler.tasks) > 0:
        game.crew_score += 1
        socketio.emit("crew_score", {"score": game.crew_score}, room=room_code)
        logger.info(f"Player {player.player_id} completed a task. Crew score: {game.crew_score}")
        player.task = game.getTask()
        emit("task", {"task": player.task}, to=player.sid)
        logger.debug(f"Assigned new task to player {player.player_id}: {player.task}")
    else:
        player.task = None
        emit("task", {"task": "No More Tasks"}, to=player.sid)
        logger.info(f"No more tasks available. Informed player {player.player_id}")


# ============ CARD HANDLING ============

@socketio.on("play_card")
def playCard(data):
    """Handle card being played."""
    player_id = data.get('player_id')
    game, player, room_code = get_game_and_player(player_id)
    
    if not player:
        return
    
    card = player.get_card(data.get('card_id'))
    if card:
        card.play_card(player)
        print(data)


# ============ MEETING HANDLING ============

@socketio.on("meeting")
def handleMeeting(data):
    """Start an emergency meeting."""
    player_id = data.get('player_id')
    game, player, room_code = get_game_and_player(player_id)
    
    if not game or not player:
        return
    
    if not game.meeting:
        speaker.play_sound("meeting")
        game.start_meeting(player)
        logger.info(f"Meeting started in room {room_code}")


@socketio.on("ready")
def handleReady(data):
    """Handle player ready status during meeting."""
    player_id = data.get('player_id')
    game, player, room_code = get_game_and_player(player_id)
    
    if not game or not player:
        return
    
    player.ready = True
    sendPlayerList(game, room_code)
    game.try_start_voting()


@socketio.on("vote")
def handleVote(data):
    """Handle vote during meeting."""
    player_id = data.get('player_id')
    game, voting_player, room_code = get_game_and_player(player_id)
    
    if not game or not voting_player or not game.meeting:
        return
    
    voted_for = game.getPlayerById(data.get('votedFor'))
    if voted_for:
        game.meeting.register_vote(voting_player, voted_for)


@socketio.on("veto")
def handleVeto(data):
    """Handle veto vote during meeting."""
    player_id = data.get('player_id')
    game, voting_player, room_code = get_game_and_player(player_id)
    
    if not game or not voting_player or not game.meeting:
        return
    
    game.meeting.register_vote(voting_player, veto=True)


@socketio.on('end_meeting')
def handleEndMeeting(data=None):
    """Manually end a meeting."""
    if data:
        player_id = data.get('player_id')
        game, player, room_code = get_game_and_player(player_id)
    else:
        return
    
    if game and game.meeting:
        socketio.emit("end_meeting", room=room_code)
        game.meeting = False
        logger.info(f"Meeting ended in room {room_code}")


# ============ MELTDOWN HANDLING ============

@socketio.on('meltdown')
def handleMeltdown(data=None):
    """Start a meltdown event."""
    if data:
        player_id = data.get('player_id')
        game, player, room_code = get_game_and_player(player_id)
    else:
        return
    
    if game:
        game.start_meltdown()
        logger.warning(f"Meltdown started in room {room_code}")


@socketio.on("pin_entry")
def handlePinEntry(data):
    """Handle meltdown PIN entry."""
    player_id = data.get('player_id')
    pin = data.get('pin')
    game, player, room_code = get_game_and_player(player_id)
    
    if game and game.active_meltdown:
        logger.info("Pin entered")
        game.check_pin(pin)
        logger.debug(f"Pin data: {pin}")


# ============ PLAYER STATUS ============

@socketio.on('player_dead')
def handleDeath(data):
    """Handle player death."""
    player_id = data.get('player_id')
    game, player, room_code = get_game_and_player(player_id)
    
    if game:
        game.kill_player(player_id)


# ============ STARTUP ============

if __name__ == '__main__':
    local_ip = get_local_ip()
    write_ip_to_file(f"{local_ip}:5001")
    logger.info("Starting server...")
    logger.info(f" * Please set ENDPOINT to: http://{local_ip}:5001")
    logger.info("Press CTRL+C to quit")
    socketio.run(app, host='0.0.0.0', port=5001, debug=False)
