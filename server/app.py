import eventlet
eventlet.monkey_patch()
import os
import base64
from flask import Flask, request, send_from_directory
from flask_socketio import SocketIO, emit, join_room, leave_room
from flask_cors import CORS
from assets.game_manager import GameManager
from assets.sonosHandler import SonosController
from assets.utils import *
from assets.taskHandler import *
from assets.task_list_manager import TaskListManager
from config import (
    LOCATIONS, VOTE_TIME, VOTE_THRESHOLD, MELTDOWN_TIME, CODE_PERCENT,
    NUMBER_OF_IMPOSTERS, CARD_DRAW_PROBABILITY, STARTING_CARDS, TASK_RATIO,
    SONOS_ENABLED, SPEAKER_VOLUME, IGNORE_BEDROOM_SPEAKERS
)

logger = setup_logging()

# Serve React build files
CLIENT_BUILD_DIR = os.path.join(os.path.dirname(__file__), '..', 'client', 'build')

app = Flask(__name__, static_folder=CLIENT_BUILD_DIR, static_url_path='')
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

# Task list manager for persistent task lists
task_list_manager = TaskListManager()

# Directory for storing selfie images
SELFIES_DIR = os.path.join(os.path.dirname(__file__), 'selfies')
os.makedirs(SELFIES_DIR, exist_ok=True)


# Flask route to serve selfie images
@app.route('/selfies/<filename>')
def serve_selfie(filename):
    """Serve selfie images from the selfies directory."""
    return send_from_directory(SELFIES_DIR, filename)


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


@app.route('/api/games')
def list_games():
    """API endpoint to list all active games (for debugging/admin)."""
    return game_manager.get_all_games()


@app.route('/health')
def health_check():
    """Health check endpoint for load balancers and monitoring."""
    return {'status': 'healthy', 'games': len(game_manager.games)}, 200


# Catch-all route for React client - serves index.html for client-side routing
@app.route('/', defaults={'path': ''})
@app.route('/<path:path>')
def serve_client(path):
    """Serve the React client application."""
    # If file exists, Flask's static_folder will serve it
    # Otherwise serve index.html for React routing
    if path and os.path.isfile(os.path.join(CLIENT_BUILD_DIR, path)):
        return app.send_static_file(path)
    return app.send_static_file('index.html')


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
    
    # Allow re-registration if already the reactor (e.g., after reconnect)
    # Only block new reactors from registering while game is running
    if game.game_running and game.reactor_sid != sid and game.reactor_sid is not None:
        emit('error', {'message': 'Cannot register reactor after game has started'})
        return
    
    # Register this client as the reactor
    game.has_reactor = True
    game.reactor_sid = sid
    
    # Join the Socket.IO room so reactor receives room-wide events
    join_room(room_code)
    game_manager.sid_to_game[sid] = room_code
    
    logger.info(f"Reactor registered for room {room_code} (sid: {sid})")
    emit('reactor_registered', {'room_code': room_code})
    
    # If game is running, send current game state to reactor
    if game.game_running:
        emit("game_start")
        emit("crew_score", {"score": game.crew_score})
        emit("task_goal", game.taskGoal)
        if game.active_meltdown:
            emit("meltdown_update", game.active_meltdown.time_left)


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
    selfie_data = data.get('selfie')  # Base64 encoded image data
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

    # Save selfie if provided
    selfie_filename = None
    if selfie_data:
        try:
            # Remove data URL prefix if present (e.g., "data:image/jpeg;base64,")
            if ',' in selfie_data:
                selfie_data = selfie_data.split(',')[1]
            
            # Generate unique filename
            import uuid
            selfie_filename = f"{uuid.uuid4().hex}.jpg"
            selfie_path = os.path.join(SELFIES_DIR, selfie_filename)
            
            # Decode and save
            with open(selfie_path, 'wb') as f:
                f.write(base64.b64decode(selfie_data))
            
            logger.info(f"Saved selfie for {username}: {selfie_filename}")
        except Exception as e:
            logger.error(f"Failed to save selfie for {username}: {e}")
            selfie_filename = None

    player = game.addPlayer(sid, username, selfie_filename)
    game_manager.register_player(player.player_id, room_code, sid)
    join_room(room_code)
    
    emit('player_id', {'player_id': player.player_id, 'pic': player.pic}, to=sid)
    logger.info(f"New player {username} joined room {room_code} with ID {player.player_id}")
    
    # Send player list to all players in the room
    sendPlayerList(game, room_code)
    
    # Also send directly to the joining player to avoid race condition
    player_list = [p.to_json() for p in game.players]
    emit('game_data', {'action': 'player_list', 'list': player_list}, to=sid)


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

    # Calculate minimum tasks needed
    min_tasks = max(len(game.players) * 3, 10)
    
    # Log current state for debugging
    logger.info(f"Start game check - task_list_applied={game.task_list_applied}, task_handler.tasks={len(game.task_handler.tasks)}, min_tasks={min_tasks}")
    
    # Enter collaborative task creation mode if:
    # 1. No task list was explicitly applied, OR
    # 2. There aren't enough tasks in the task handler
    if not game.task_list_applied or len(game.task_handler.tasks) < min_tasks:
        game.task_creation_mode = True
        socketio.emit('enter_task_creation', {
            'min_tasks': min_tasks,
            'current_tasks': len(game.collaborative_tasks),
            'tasks': game.collaborative_tasks,
            'locations': game.locations,
            'task_list_code': game.collaborative_task_list_code
        }, room=room_code)
        logger.info(f"Game {room_code} entering collaborative task creation mode (task_list_applied={game.task_list_applied}, need {min_tasks} tasks, have {len(game.task_handler.tasks)})")
        return

    # We have enough tasks - start the game
    logger.info(f"Starting game {room_code} with {len(game.task_handler.tasks)} tasks from applied task list")
    speaker.play_sound("theme")
    game.game_running = True
    game.assignRoles()
    sendPlayerList(game, room_code, 'start_game')
    socketio.emit("game_start", room=room_code)
    socketio.emit("task_goal", game.taskGoal, room=room_code)
    logger.info(f"Game started in room {room_code}")

    # Send a different task to each crewmate
    for p in game.players:
        if not p.sus and len(game.task_handler.tasks) > 0:
            p.task = game.getTask()
            socketio.emit("task", {"task": p.task}, to=p.sid)
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
    
    # If no players left, delete the room
    if len(game.players) == 0:
        game_manager.remove_game(room_code)
        logger.info(f"Room {room_code} deleted (no players remaining)")
    else:
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
    sid = request.sid
    game = None
    room_code = None
    
    # First try to find game by player_id (mobile player triggering)
    if data and data.get('player_id'):
        player_id = data.get('player_id')
        game, player, room_code = get_game_and_player(player_id)
    
    # If not found, try by room_code (reactor triggering)
    if not game and data and data.get('room_code'):
        room_code = data.get('room_code', '').upper()
        game = game_manager.get_game(room_code)
    
    # Finally, try by SID (reactor registered to a room)
    if not game:
        game, room_code = game_manager.get_game_by_sid(sid)
    
    if game:
        # Verify this is either a reactor or a player in the game
        if game.reactor_sid == sid or (data and data.get('player_id')):
            game.start_meltdown()
            logger.warning(f"Meltdown started in room {room_code} (triggered by sid: {sid})")
        else:
            logger.warning(f"Meltdown rejected - unauthorized sid: {sid}")
    else:
        logger.warning(f"Meltdown failed - game not found for sid: {sid}")


@socketio.on("pin_entry")
def handlePinEntry(data):
    """Handle meltdown PIN entry."""
    player_id = data.get('player_id')
    pin = data.get('pin')
    room_code = data.get('room_code', '').upper() if data.get('room_code') else None
    sid = request.sid
    
    logger.info(f"PIN entry attempt: player_id={player_id}, room_code={room_code}, pin={pin}")
    
    game = None
    
    # Try to find game by player_id first
    if player_id:
        game, player, room_code = get_game_and_player(player_id)
    
    # If not found, try by room_code
    if not game and room_code:
        game = game_manager.get_game(room_code)
    
    # Finally try by SID (for reactor)
    if not game:
        game, room_code = game_manager.get_game_by_sid(sid)
    
    if not game:
        logger.warning(f"PIN entry failed: game not found")
        return
    
    if not game.active_meltdown:
        logger.warning(f"PIN entry failed: no active meltdown in room {room_code}")
        return
    
    logger.info(f"Checking PIN {pin} in room {room_code}")
    game.check_pin(pin)
    logger.debug(f"PIN check complete")


# ============ PLAYER STATUS ============

@socketio.on('player_dead')
def handleDeath(data):
    """Handle player death."""
    player_id = data.get('player_id')
    game, player, room_code = get_game_and_player(player_id)
    
    if game:
        game.kill_player(player_id)


# ============ TASK LIST MANAGEMENT ============

@socketio.on('get_my_task_lists')
def handle_get_my_task_lists(data):
    """Get all task lists created by the current player."""
    player_id = data.get('player_id')
    if not player_id:
        emit('error', {'message': 'Player ID required'})
        return
    
    lists = task_list_manager.get_player_task_lists(player_id)
    emit('my_task_lists', {'lists': lists})


@socketio.on('load_task_list')
def handle_load_task_list(data):
    """Load a task list by its code."""
    code = data.get('code', '').upper()
    if not code:
        emit('error', {'message': 'Task list code required'})
        return
    
    task_list = task_list_manager.get_task_list(code)
    if not task_list:
        emit('error', {'message': f'Task list not found: {code}'})
        return
    
    emit('task_list_loaded', {'task_list': task_list})


@socketio.on('create_task_list')
def handle_create_task_list(data):
    """Create a new task list."""
    player_id = data.get('player_id')
    name = data.get('name', 'My Task List')
    tasks = data.get('tasks', [])
    locations = data.get('locations')
    from_default = data.get('from_default', False)
    
    if not player_id:
        emit('error', {'message': 'Player ID required'})
        return
    
    if from_default:
        code = task_list_manager.import_from_default(player_id, name)
    else:
        code = task_list_manager.create_task_list(player_id, name, tasks, locations)
    
    if code:
        task_list = task_list_manager.get_task_list(code)
        emit('task_list_created', {'task_list': task_list})
        logger.info(f"Task list created: {code} by player {player_id}")
    else:
        emit('error', {'message': 'Failed to create task list'})


@socketio.on('update_task_list')
def handle_update_task_list(data):
    """Update a task list (name, tasks, or locations)."""
    player_id = data.get('player_id')
    code = data.get('code', '').upper()
    updates = data.get('updates', {})
    
    if not code:
        emit('error', {'message': 'Task list code required'})
        return
    
    success = task_list_manager.update_task_list(code, updates, player_id)
    if success:
        task_list = task_list_manager.get_task_list(code)
        emit('task_list_updated', {'task_list': task_list})
    else:
        emit('error', {'message': 'Failed to update task list. You may not be the owner.'})


@socketio.on('add_task_to_list')
def handle_add_task_to_list(data):
    """Add a single task to a task list."""
    player_id = data.get('player_id')
    code = data.get('code', '').upper()
    task_obj = data.get('task')
    
    if not code or not task_obj:
        emit('error', {'message': 'Code and task required'})
        return
    
    success = task_list_manager.add_task(code, task_obj, player_id)
    if success:
        task_list = task_list_manager.get_task_list(code)
        emit('task_list_updated', {'task_list': task_list})
    else:
        emit('error', {'message': 'Failed to add task'})


@socketio.on('remove_task_from_list')
def handle_remove_task_from_list(data):
    """Remove a task from a task list by index."""
    player_id = data.get('player_id')
    code = data.get('code', '').upper()
    task_index = data.get('task_index')
    
    if not code or task_index is None:
        emit('error', {'message': 'Code and task index required'})
        return
    
    success = task_list_manager.remove_task(code, task_index, player_id)
    if success:
        task_list = task_list_manager.get_task_list(code)
        emit('task_list_updated', {'task_list': task_list})
    else:
        emit('error', {'message': 'Failed to remove task'})


@socketio.on('delete_task_list')
def handle_delete_task_list(data):
    """Delete a task list."""
    player_id = data.get('player_id')
    code = data.get('code', '').upper()
    
    if not player_id or not code:
        emit('error', {'message': 'Player ID and code required'})
        return
    
    success = task_list_manager.delete_task_list(code, player_id)
    if success:
        emit('task_list_deleted', {'code': code})
        logger.info(f"Task list deleted: {code} by player {player_id}")
    else:
        emit('error', {'message': 'Failed to delete task list. You may not be the owner.'})


@socketio.on('duplicate_task_list')
def handle_duplicate_task_list(data):
    """Duplicate a task list (for sharing/copying)."""
    player_id = data.get('player_id')
    code = data.get('code', '').upper()
    new_name = data.get('new_name')
    
    if not player_id or not code:
        emit('error', {'message': 'Player ID and code required'})
        return
    
    new_code = task_list_manager.duplicate_task_list(code, player_id, new_name)
    if new_code:
        task_list = task_list_manager.get_task_list(new_code)
        emit('task_list_created', {'task_list': task_list})
        logger.info(f"Task list duplicated: {code} -> {new_code} by player {player_id}")
    else:
        emit('error', {'message': 'Failed to duplicate task list'})


@socketio.on('apply_task_list_to_game')
def handle_apply_task_list_to_game(data):
    """Apply a saved task list to the current game."""
    room_code = data.get('room_code', '').upper()
    task_list_code = data.get('task_list_code', '').upper()
    sid = request.sid
    
    game = game_manager.get_game(room_code)
    if not game:
        emit('error', {'message': 'Game not found'})
        return
    
    if game.creator_sid != sid:
        emit('error', {'message': 'Only the room creator can change task settings'})
        return
    
    if game.game_running:
        emit('error', {'message': 'Cannot change tasks while game is running'})
        return
    
    task_list = task_list_manager.get_task_list(task_list_code)
    if not task_list:
        emit('error', {'message': f'Task list not found: {task_list_code}'})
        return
    
    # Update game locations and reload task handler with the task list's tasks
    game.locations = task_list['locations'].copy()
    if 'Other' not in game.locations:
        game.locations.append('Other')
    
    # Override the task handler with the loaded tasks
    game.task_handler.locations = game.locations
    game.task_handler.tasks = [task.copy() for task in task_list['tasks']]
    game.task_list_applied = True  # Mark that a task list was explicitly applied
    
    # Also populate collaborative tasks so they show in the task editor
    game.collaborative_tasks = [task.copy() for task in task_list['tasks']]
    game.collaborative_task_list_code = task_list_code  # Track the code
    
    # Rebuild card deck with new locations
    from assets.card import CardDeck
    game.card_deck = CardDeck(game.locations, game.socket, game)
    
    logger.info(f"Applied task list {task_list_code} to game {room_code}: {len(task_list['tasks'])} tasks loaded, task_list_applied={game.task_list_applied}")
    logger.info(f"Task handler now has {len(game.task_handler.tasks)} tasks")
    emit('task_list_applied', {
        'task_list_code': task_list_code,
        'task_list_name': task_list['name'],
        'task_count': len(task_list['tasks']),
        'locations': game.locations
    })
    # Also send updated config
    emit('game_config', game.get_config())


# ============ COLLABORATIVE TASK CREATION ============

@socketio.on('toggle_task_creation_mode')
def handle_toggle_task_creation_mode(data):
    """Toggle task creation mode on/off from the lobby - only affects requesting client."""
    room_code = data.get('room_code', '').upper()
    enable = data.get('enable', True)
    
    game = game_manager.get_game(room_code)
    if not game:
        emit('error', {'message': 'Game not found'})
        return
    
    if game.game_running:
        emit('error', {'message': 'Cannot toggle task creation during game'})
        return
    
    # Set task creation mode on the game (needed for task operations to work)
    game.task_creation_mode = enable
    
    if enable:
        # Only send to the requesting client, not the whole room
        min_tasks = max(len(game.players) * 3, 10)
        emit('enter_task_creation', {
            'min_tasks': min_tasks,
            'current_tasks': len(game.collaborative_tasks),
            'tasks': game.collaborative_tasks,
            'locations': game.locations,
            'task_list_code': game.collaborative_task_list_code
        })
        logger.info(f"Task creation mode enabled for client in room {room_code}")
    else:
        emit('exit_task_creation')
        logger.info(f"Task creation mode disabled for client in room {room_code}")


@socketio.on('get_collaborative_tasks')
def handle_get_collaborative_tasks(data):
    """Get current collaborative tasks for a room."""
    room_code = data.get('room_code', '').upper()
    
    game = game_manager.get_game(room_code)
    if not game:
        emit('error', {'message': 'Game not found'})
        return
    
    min_tasks = max(len(game.players) * 3, 10)
    emit('collaborative_tasks', {
        'tasks': game.collaborative_tasks,
        'min_tasks': min_tasks,
        'task_list_code': game.collaborative_task_list_code
    })


@socketio.on('add_collaborative_task')
def handle_add_collaborative_task(data):
    """Add a task during collaborative creation phase."""
    room_code = data.get('room_code', '').upper()
    task = data.get('task', {})
    
    game = game_manager.get_game(room_code)
    if not game:
        emit('error', {'message': 'Game not found'})
        return
    
    if not game.task_creation_mode:
        emit('error', {'message': 'Not in task creation mode'})
        return
    
    # Validate task
    if not task.get('task'):
        emit('error', {'message': 'Task description required'})
        return
    
    # Set defaults
    task.setdefault('location', 'Other')
    task.setdefault('difficulty', 2)
    
    # Add to collaborative tasks
    game.collaborative_tasks.append(task)
    
    # Broadcast to all players in the room
    min_tasks = len(game.players) * 3
    socketio.emit('collaborative_task_added', {
        'task': task,
        'total_tasks': len(game.collaborative_tasks),
        'min_tasks': min_tasks
    }, room=room_code)
    
    logger.info(f"Collaborative task added in room {room_code}: {task.get('task')[:50]}")


@socketio.on('remove_collaborative_task')
def handle_remove_collaborative_task(data):
    """Remove a task during collaborative creation phase."""
    room_code = data.get('room_code', '').upper()
    task_index = data.get('task_index')
    
    game = game_manager.get_game(room_code)
    if not game:
        emit('error', {'message': 'Game not found'})
        return
    
    if not game.task_creation_mode:
        emit('error', {'message': 'Not in task creation mode'})
        return
    
    if task_index is None or task_index < 0 or task_index >= len(game.collaborative_tasks):
        emit('error', {'message': 'Invalid task index'})
        return
    
    removed_task = game.collaborative_tasks.pop(task_index)
    
    # Broadcast to all players in the room
    socketio.emit('collaborative_task_removed', {
        'index': task_index,
        'total_tasks': len(game.collaborative_tasks)
    }, room=room_code)
    
    logger.info(f"Collaborative task removed in room {room_code}: {removed_task.get('task', '')[:50]}")


@socketio.on('finalize_collaborative_tasks')
def handle_finalize_collaborative_tasks(data):
    """Finalize collaborative tasks and start the game."""
    room_code = data.get('room_code', '').upper()
    player_id = data.get('player_id')
    
    game = game_manager.get_game(room_code)
    if not game:
        emit('error', {'message': 'Game not found'})
        return
    
    if not game.task_creation_mode:
        emit('error', {'message': 'Not in task creation mode'})
        return
    
    min_tasks = len(game.players) * 3
    if len(game.collaborative_tasks) < min_tasks:
        emit('error', {'message': f'Need at least {min_tasks} tasks to start'})
        return
    
    # Apply the collaborative tasks to the task handler
    game.task_handler.tasks = [task.copy() for task in game.collaborative_tasks]
    game.task_creation_mode = False
    
    # Now actually start the game
    speaker.play_sound("theme")
    game.game_running = True
    game.assignRoles()
    sendPlayerList(game, room_code, 'start_game')
    socketio.emit("game_start", room=room_code)  # Signal clients to exit task creation mode
    socketio.emit("task_goal", game.taskGoal, room=room_code)
    logger.info(f"Game started in room {room_code} with {len(game.task_handler.tasks)} collaborative tasks")

    # Send a different task to each crewmate
    for p in game.players:
        if not p.sus and len(game.task_handler.tasks) > 0:
            p.task = game.getTask()
            socketio.emit("task", {"task": p.task}, to=p.sid)
            logger.debug(f"Assigned task to player {p.player_id}: {p.task}")


@socketio.on('save_collaborative_tasks')
def handle_save_collaborative_tasks(data):
    """Save the current collaborative tasks as a new or updated task list."""
    room_code = data.get('room_code', '').upper()
    name = data.get('name', 'Collaborative Task List')
    device_id = data.get('device_id')  # Use device_id for ownership
    
    game = game_manager.get_game(room_code)
    if not game:
        emit('error', {'message': 'Game not found'})
        return
    
    if len(game.collaborative_tasks) == 0:
        emit('error', {'message': 'No tasks to save'})
        return
    
    if not device_id:
        emit('error', {'message': 'Device ID required to save task list'})
        return
    
    # If we already have a code for this session, update that task list
    if game.collaborative_task_list_code:
        # Update existing task list
        success = task_list_manager.update_task_list(
            game.collaborative_task_list_code,
            {
                'name': name,
                'tasks': game.collaborative_tasks,
                'locations': game.locations
            },
            device_id
        )
        if success:
            task_list = task_list_manager.get_task_list(game.collaborative_task_list_code)
            socketio.emit('collaborative_tasks_saved', {
                'code': game.collaborative_task_list_code,
                'name': name,
                'task_count': len(game.collaborative_tasks),
                'updated': True
            }, room=room_code)
            logger.info(f"Updated collaborative task list {game.collaborative_task_list_code} in room {room_code}")
        else:
            # Ownership issue - create a new one instead
            code = task_list_manager.create_task_list(
                device_id, 
                name, 
                game.collaborative_tasks, 
                game.locations
            )
            if code:
                game.collaborative_task_list_code = code
                socketio.emit('collaborative_tasks_saved', {
                    'code': code,
                    'name': name,
                    'task_count': len(game.collaborative_tasks),
                    'updated': False
                }, room=room_code)
                logger.info(f"Created new collaborative task list {code} in room {room_code}")
    else:
        # Create new task list
        code = task_list_manager.create_task_list(
            device_id, 
            name, 
            game.collaborative_tasks, 
            game.locations
        )
        if code:
            game.collaborative_task_list_code = code
            socketio.emit('collaborative_tasks_saved', {
                'code': code,
                'name': name,
                'task_count': len(game.collaborative_tasks),
                'updated': False
            }, room=room_code)
            logger.info(f"Created collaborative task list {code} in room {room_code}")
        else:
            emit('error', {'message': 'Failed to save task list'})


# ============ STARTUP ============

if __name__ == '__main__':
    local_ip = get_local_ip()
    write_ip_to_file(f"{local_ip}:5001")
    logger.info("Starting server...")
    
    # Check if SSL certificates exist
    cert_file = os.path.join(os.path.dirname(__file__), 'cert.pem')
    key_file = os.path.join(os.path.dirname(__file__), 'key.pem')
    
    if os.path.exists(cert_file) and os.path.exists(key_file):
        logger.info(f" * Running with HTTPS at: https://{local_ip}:5001")
        logger.info(" * Note: You may need to accept the self-signed certificate in your browser")
        socketio.run(app, host='0.0.0.0', port=5001, debug=False, 
                     certfile=cert_file, keyfile=key_file)
    else:
        logger.info(f" * Running with HTTP at: http://{local_ip}:5001")
        logger.info(" * For HTTPS, generate certificates with:")
        logger.info("   openssl req -x509 -newkey rsa:4096 -nodes -out cert.pem -keyout key.pem -days 365")
        socketio.run(app, host='0.0.0.0', port=5001, debug=False)
