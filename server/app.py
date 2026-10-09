import eventlet
eventlet.monkey_patch()
import os
import secrets
import copy
import time
from functools import wraps
from uuid import uuid4
from assets.room_protocol import metadata, minimum_tasks, start_error_detail, lobby_state, room_state
from flask import Flask, request, send_from_directory, abort
from flask_socketio import SocketIO, emit, join_room, leave_room
from flask_cors import CORS
from assets.game_manager import GameManager
from assets.sonosHandler import SonosController
from assets.utils import *
from assets.taskHandler import *
from assets.task_list_manager import TaskListManager
from assets.selfie_store import SelfieStore
from config import (
    LOCATIONS, VOTE_TIME, VOTE_THRESHOLD, MELTDOWN_TIME, CODE_PERCENT,
    NUMBER_OF_INTRUDERS, CARD_DRAW_PROBABILITY, STARTING_CARDS, TASK_RATIO,
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
    'NUMBER_OF_INTRUDERS': NUMBER_OF_INTRUDERS,
    'CARD_DRAW_PROBABILITY': CARD_DRAW_PROBABILITY,
    'STARTING_CARDS': STARTING_CARDS,
    'TASK_RATIO': TASK_RATIO,
}

# Shared speaker controller (disabled for hosted multi-game mode typically)
speaker = SonosController(enabled=SONOS_ENABLED, default_volume=SPEAKER_VOLUME, ignore_bedroom_speakers=IGNORE_BEDROOM_SPEAKERS)

# Photos expire independently of room activity, including after a restart.
SELFIES_DIR = os.path.join(os.path.dirname(__file__), 'selfies')
selfie_store = SelfieStore(SELFIES_DIR)
selfie_store.cleanup_expired()

# Game manager handles multiple concurrent games
game_manager = GameManager(socketio, speaker, game_config, selfie_store=selfie_store)

# Task list manager for persistent task lists
task_list_manager = TaskListManager()

client_metrics_by_sid = {}
selfie_tokens_by_sid = {}


# Flask route to serve selfie images
@app.route('/selfies/<filename>')
def serve_selfie(filename):
    """Serve a current room photo with a connection-specific access token."""
    sid = request.args.get('sid', '')
    provided = request.args.get('token', '')
    expected = selfie_tokens_by_sid.get(sid)
    if not expected or not secrets.compare_digest(provided.encode(), expected.encode()):
        abort(404)
    game, room_code = game_manager.get_game_by_sid(sid)
    if not game:
        abort(404)
    with game.state_lock:
        viewer = (sid in (game.creator_sid, game.reactor_sid)
                  or any(player.sid == sid and player.active for player in game.players))
        if (game_manager.get_game(room_code) is not game or not viewer
                or not any(player.selfie == filename for player in game.players)):
            abort(404)
        if selfie_store.expired(filename):
            selfie_store.delete(filename)
            abort(404)
        return send_from_directory(SELFIES_DIR, filename, mimetype='image/jpeg',
                                   conditional=False, etag=False, max_age=0)


@app.after_request
def protect_photo_response(response):
    if request.path.startswith('/selfies/'):
        response.headers['Cache-Control'] = 'private, no-store, max-age=0'
        response.headers['Referrer-Policy'] = 'no-referrer'
        response.headers['X-Content-Type-Options'] = 'nosniff'
        response.headers['X-Robots-Tag'] = 'noindex, noimageindex'
    return response


def get_game_and_player(player_id):
    """Helper to get game and player from player_id."""
    game, room_code = game_manager.get_game_by_player_id(player_id)
    if game:
        player = game.getPlayerById(player_id)
        return game, player, room_code
    return None, None, None


def broadcast_lobby(game):
    if not game.game_running:
        socketio.emit('lobby_state', lobby_state(game), room=game.room_code)


def sendPlayerList(game, room_code, action='player_list'):
    game.emit_to_room('game_data', {'action': action, 'list': [p.to_json() for p in game.players]})
    broadcast_lobby(game)


def get_min_tasks_needed(game):
    return minimum_tasks(game)


def record_usage(event, game=None, player_id=None, resolve_game=True, **fields):
    """Record allowlisted metadata without a gameplay dependency on stats writes."""
    try:
        if game is None and resolve_game:
            game, _ = game_manager.get_game_by_sid(request.sid)
        game_manager.stats_tracker.record_event(
            event, game, player_id, connection_id=request.sid,
            phase='ended' if game and game.end_state else 'round' if game and game.game_running else 'lobby',
            **client_metrics_by_sid.get(request.sid, {}), **fields)
    except Exception:
        logger.exception('Usage event write failed')


def record_reconnect(game, player):
    disconnected_at = getattr(player, 'disconnected_at', None)
    record_usage('player_reconnected' if not player.active else 'session_resumed', game, player.player_id,
                 was_disconnected=not player.active,
                 recovery_seconds=round(max(0, time.time() - disconnected_at), 3) if disconnected_at else None)
    player.disconnected_at = None


def command_error(message, game=None, player=None, reason='condition_not_met'):
    record_usage('command_rejected', game, player.player_id if player else None,
                 command=(getattr(request, 'event', {}) or {}).get('message'), reason=reason)
    emit('error', {'message': message})
    result = {'ok': False, 'error': message}
    if game and (player or game.reactor_sid == request.sid or game.creator_sid == request.sid):
        result['state'] = room_state(game, player, request.sid)
    return result


def room_entry_error(code, room_code, message):
    record_usage('join_rejected', game_manager.get_game(room_code),
                 resolve_game=False, room_code=room_code, reason=code,
                 command=(getattr(request, 'event', {}) or {}).get('message'))
    emit('error', {
        'scope': 'room_entry', 'code': code,
        'room_code': room_code, 'message': message,
    })


def room_event(mutate=True, reconnect=False):
    """Serialize a room command and reject commands from an obsolete socket."""
    def decorate(handler):
        @wraps(handler)
        def wrapped(data=None, *args):
            payload = data if isinstance(data, dict) else {}
            player_id = payload.get('player_id')
            game, player, room = get_game_and_player(player_id) if player_id else (None, None, None)
            requested_room = payload.get('room_code', '').upper()
            if not game and requested_room:
                game, room = game_manager.get_game(requested_room), requested_room
            if not game:
                game, room = game_manager.get_game_by_sid(request.sid)
            if not game:
                return handler(data, *args) if data is not None else handler(*args)
            with game.state_lock:
                if game_manager.get_game(room) is not game:
                    return command_error('The room no longer exists.', reason='room_removed')
                if requested_room and requested_room != room:
                    return command_error('The command belongs to another room.', reason='wrong_room')
                if not reconnect:
                    if player_id and (not player or player.sid != request.sid or not player.active):
                        return command_error('Reconnect before you send this command.', game, player, reason='obsolete_session')
                    if not is_sid_connected_to_room(request.sid, room):
                        return command_error('Join the room before you send this command.', game, player, reason='not_in_room')
                if mutate:
                    game.revision += 1
                    game.last_activity = time.time()
                result = handler(data, *args) if data is not None else handler(*args)
                if mutate and game_manager.get_game(room) is game:
                    broadcast_lobby(game)
                return result
        return wrapped
    return decorate


@socketio.on('get_room_state')
@room_event(mutate=False)
def handle_room_state(data):
    game, player, room = get_game_and_player(data.get('player_id'))
    if not game:
        game, room = game_manager.get_game_by_sid(request.sid)
    if not game:
        return command_error('Game session not found.')
    return {'ok': True, 'state': room_state(game, player, request.sid)}


def get_connected_player_ids(game, room_code):
    """Return player IDs whose current socket is still registered in this room."""
    return {
        player.player_id
        for player in game.players
        if player.sid and game_manager.sid_to_game.get(player.sid) == room_code
    }


def is_sid_connected_to_room(sid, room_code):
    return bool(sid and game_manager.sid_to_game.get(sid) == room_code)


def set_room_creator(game, room_code, player, notify=False):
    """Assign the persistent room creator to a connected player."""
    game.creator_player_id = player.player_id
    game.creator_sid = player.sid
    logger.info(f"Set creator_player_id to {player.player_id} for room {room_code}")
    if notify:
        socketio.emit(
            'player_id',
            {'player_id': player.player_id, 'pic': player.pic, 'is_creator': True},
            to=player.sid,
        )


def reassign_room_creator(game, room_code):
    """Promote a remaining connected player when the current host leaves."""
    for player in game.players:
        if is_sid_connected_to_room(player.sid, room_code):
            set_room_creator(game, room_code, player, notify=True)
            logger.info(f"Reassigned room creator to {player.player_id} for room {room_code}")
            return player

    game.creator_player_id = None
    if not is_sid_connected_to_room(game.creator_sid, room_code):
        game.creator_sid = None
    logger.info(f"Room {room_code} has no connected player available for host reassignment")
    return None


def admin_required(handler):
    @wraps(handler)
    def protected(*args, **kwargs):
        expected = os.environ.get('ADMIN_PASSWORD')
        if not expected:
            return {'error': 'admin endpoint disabled (set ADMIN_PASSWORD env var)'}, 503
        provided = request.headers.get('X-Admin-Password') or request.args.get('password', '')
        if not secrets.compare_digest(provided.encode(), expected.encode()):
            return {'error': 'unauthorized'}, 401
        return handler(*args, **kwargs)
    return protected


@app.route('/api/games')
@admin_required
def list_games():
    """API endpoint to list all active games (for debugging/admin)."""
    return game_manager.get_all_games()


@app.route('/api/admin/stats')
@admin_required
def admin_stats():
    """Password-protected usage stats for the hidden /dashboard page.

    Auth: send the password in the `X-Admin-Password` header (or `?password=`
    query param). Set the `ADMIN_PASSWORD` env var on the server to enable.
    If `ADMIN_PASSWORD` is unset the endpoint stays disabled.
    """
    try:
        task_list_count = len(task_list_manager.index.get('code_to_name', {}))
    except Exception:
        task_list_count = 0

    return game_manager.get_admin_stats(task_list_count=task_list_count)


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
def handle_create_game(data=None):
    """Create a new game room and return the room code."""
    sid = request.sid
    acquisition = data.get('acquisition') if isinstance(data, dict) else None
    room_code, game = game_manager.create_game(sid, acquisition)
    game.creator_sid = sid  # Track room creator
    record_usage('host_entered', game, flush=True)
    join_room(room_code)
    
    logger.info(f"Game created with room code: {room_code}")
    emit('game_created', {'room_code': room_code, 'is_creator': True})
    emit('game_config', game.get_config())


@socketio.on('get_game_config')
@room_event(mutate=False)
def handle_get_game_config(data):
    """Get the current game configuration."""
    room_code = data.get('room_code', '').upper() if data else None
    
    if not room_code:
        room_code = game_manager.sid_to_game.get(request.sid)
    
    game = game_manager.get_game(room_code)
    if game:
        emit('game_config', game.get_config())


@socketio.on('update_game_config')
@room_event()
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
    socketio.emit('task_locations', game.locations, room=room_code)


@socketio.on('open_room')
@room_event()
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
    
    if not game.is_open:
        game.room_opened_at = time.time()
        record_usage('room_opened', game, flush=True,
                     setup_seconds=round(max(0, time.monotonic() - game.lobby_started_monotonic), 3))
    game.is_open = True
    logger.info(f"Room {room_code} is now open for players")
    emit('room_opened', {'room_code': room_code})
    emit('task_locations', game.locations)


@socketio.on('join_game')
@room_event(reconnect=True)
def handle_join_game(data):
    """Join an existing game room by room code."""
    sid = request.sid
    room_code = data.get('room_code', '').upper()
    player_id = data.get('player_id')  # Optional: for reconnecting players
    
    game = game_manager.get_game(room_code)
    if not game:
        room_entry_error('room_not_found', room_code,
                         'We cannot find this room. Check the code, or ask the host for a new invite.')
        logger.warning(f"Join attempt for non-existent room: {room_code}")
        return
    
    if not game.is_open:
        room_entry_error('room_not_open', room_code,
                         'This room is not open yet. Ask the host to open it, then try again.')
        logger.warning(f"Join attempt for not-yet-open room: {room_code}")
        return
    
    if game.game_running:
        room_entry_error('round_in_progress', room_code,
                         'This round already started. New players can join when the host returns to the lobby.')
        logger.warning(f"Join attempt for running game: {room_code}")
        return
    
    join_room(room_code)
    game_manager.sid_to_game[sid] = room_code
    
    # Check if this player is the creator (for reconnecting players)
    is_creator = False
    if player_id and game.creator_player_id == player_id:
        is_creator = True
        game.creator_sid = sid  # Update the socket ID
        logger.info(f"Creator {player_id} reconnected to room {room_code}")
    elif game.creator_player_id is None and (
        sid == game.creator_sid or not is_sid_connected_to_room(game.creator_sid, room_code)
    ):
        is_creator = True
        game.creator_sid = sid
        logger.info(f"Creator socket refreshed for room {room_code}")
    
    emit('game_joined', {'room_code': room_code, 'is_creator': is_creator})
    emit('task_locations', game.locations)
    # Lets the avatar picker show which avatars are taken before this socket joins as a player.
    emit('game_data', {**metadata(game), 'action': 'player_list', 'list': [p.to_json() for p in game.players]})
    record_usage('room_entered', game, is_creator=is_creator)
    logger.info(f"Client {sid} joined room {room_code}, is_creator={is_creator}")


# ============ SONOS CONNECTOR ============

@socketio.on('sonos_join')
def handle_sonos_join(data):
    """Handle a Sonos connector joining a game room."""
    sid = request.sid
    room_code = data.get('room_code', '').upper() if data else None
    
    if not room_code:
        emit('sonos_error', {'message': 'Room code is required'})
        return
    
    game = game_manager.get_game(room_code)
    if not game:
        emit('sonos_error', {'message': f'Game room {room_code} not found'})
        return
    
    # Join the special Sonos room for this game
    sonos_room = f"sonos_{room_code}"
    join_room(sonos_room)
    
    logger.info(f"Sonos connector {sid} joined room {room_code}")
    emit('sonos_joined', {'room_code': room_code, 'message': f'Connected to game {room_code}'})


@socketio.on('register_reactor')
@room_event(reconnect=True)
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
    if not game.creator_player_id and game.creator_sid not in game_manager.sid_to_game:
        game.creator_sid = sid
    
    # Join the Socket.IO room so reactor receives room-wide events
    join_room(room_code)
    game_manager.sid_to_game[sid] = room_code
    
    logger.info(f"Reactor registered for room {room_code} (sid: {sid})")
    emit('reactor_registered', {
        'room_code': room_code,
        'is_open': game.is_open,
        'is_creator': game.creator_sid == sid,
    })
    emit('task_locations', game.locations)
    emit('game_data', {**metadata(game), 'action': 'rejoin', 'list': [player.to_json() for player in game.players]})
    
    # If game is running, send current game state to reactor
    if game.game_running:
        emit("game_start")
        emit("crew_score", {**metadata(game), "score": game.crew_score})
        emit("task_goal", game.taskGoal)
        if game.end_state:
            emit('end_game', {'result': game.end_state, 'stats': game.stats})
        emit('active_cards', [card.export() for card in game.card_deck.active_cards])
        if game.active_hack > 0:
            emit('hack', game.active_hack)
        if game.meeting and not game.end_state:
            emit('meeting', game.meeting.to_json())
            if game.meeting.stage == 'voting':
                emit('vote_update', {
                    'votes': game.meeting.compute_vote_counts(),
                    'vetoVotes': len(game.meeting.veto_votes),
                })
        if game.denied_location:
            emit('active_denial', game.denied_location)
        if game.intruders_revealed:
            intruders = [player for player in game.players if player.sus and player.alive]
            emit('intruders_revealed', {
                'intruder_names': [player.username for player in intruders],
                'intruder_ids': [player.player_id for player in intruders],
            })
        if game.active_meltdown:
            emit("meltdown_update", game.active_meltdown.time_left)
            emit('codes_needed', max(game.active_meltdown.codes_needed - game.active_meltdown.codes_entered, 0))
    emit('room_state', room_state(game, sid=sid))


# ============ CONNECTION HANDLING ============

@socketio.on('connect')
def handle_connect(auth=None):
    token = secrets.token_urlsafe(32)
    selfie_tokens_by_sid[request.sid] = token
    emit('selfie_access', {'sid': request.sid, 'token': token})
    user_agent = request.headers.get('User-Agent', '').lower()
    device = ('tablet' if 'ipad' in user_agent or ('android' in user_agent and 'mobile' not in user_agent)
              else 'mobile' if any(value in user_agent for value in ('mobile', 'iphone', 'ipod'))
              else 'desktop' if user_agent else 'unknown')
    offset = auth.get('utc_offset_minutes') if isinstance(auth, dict) else None
    client_metrics_by_sid[request.sid] = {
        'device_class': device,
        'utc_offset_minutes': offset if type(offset) is int and -840 <= offset <= 840 else None,
    }
    record_usage('connection_opened')
    logger.info(f'Client connected: {request.sid}')
    # Don't auto-join any room on connect - client must create or join


@socketio.on_error_default
def handle_socket_error(error):
    logger.exception('Socket handler failed')
    event = (getattr(request, 'event', {}) or {}).get('message')
    record_usage('socket_error', command=event, reason=type(error).__name__, flush=True)
    emit('error', {'message': 'The action failed. Try again, or reconnect to the room.'})
    return {'ok': False, 'error': 'The action failed.'}


@socketio.on('rejoin')
@room_event(reconnect=True)
def handleRejoin(data):
    """Handle player reconnection to their game."""
    player_id = data.get('player_id')
    if not player_id:
        return
    
    game, player, room_code = get_game_and_player(player_id)
    if not game or not player:
        record_usage('reconnect_failed', reason='session_not_found')
        emit('rejoin_failed', {'message': 'Your previous session is no longer available. Ask the host for a new invite.'})
        return
    
    logger.info(f"Player {player_id} rejoining room {room_code}, creator_player_id={game.creator_player_id}")
    record_reconnect(game, player)
    player.sid = request.sid
    player.active = True
    game_manager.update_sid(player_id, request.sid)
    join_room(room_code)
    
    # Check if this player is the creator
    is_creator = (player_id == game.creator_player_id)
    if is_creator:
        game.creator_sid = request.sid  # Update the socket ID
        logger.info(f"Creator {player_id} reconnected to room {room_code}")
    else:
        logger.info(f"Non-creator {player_id} rejoined room {room_code}")
    
    # Send current game state
    emit('game_joined', {'room_code': room_code, 'is_creator': is_creator})
    emit('task_locations', game.locations)
    sendPlayerList(game, room_code, "rejoin")
    
    if game.game_running:
        emit("game_start")
        emit("crew_score", {**metadata(game), "score": game.crew_score})
        emit("task_goal", game.taskGoal)
        
        if game.end_state:
            logger.info(f"Game over: {game.end_state}")
            emit("end_game", {'result': game.end_state, 'stats': game.stats})
        
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
        
        if game.intruders_revealed:
            # Re-send intruders revealed state
            intruder_names = [p.username for p in game.players if p.sus and p.alive]
            intruder_ids = [p.player_id for p in game.players if p.sus and p.alive]
            emit('intruders_revealed', {
                'intruder_names': intruder_names,
                'intruder_ids': intruder_ids,
                'message': f"TASKS COMPLETE! The intruder{'s are' if len(intruder_names) > 1 else ' is'}: {', '.join(intruder_names)}!"
            })
        
        if player.meltdown_code and game.active_meltdown:
            emit("meltdown_code", player.meltdown_code, to=player.sid)
            logger.debug(f"Sent meltdown code to player {player.player_id}")
        
        if player.get_task():
            logger.info("Sending task to player")
            emit("task", {**metadata(game), "task": player.get_task()}, to=player.sid)

    emit('room_state', room_state(game, player, request.sid))
    return {'ok': True, 'state': room_state(game, player, request.sid)}


@socketio.on('disconnect')
@room_event(reconnect=True)
def handle_disconnect(reason=None):
    sid = request.sid
    logger.info(f"Client disconnected: {sid}")
    game, room_code = game_manager.get_game_by_sid(sid)
    player = game.getPlayerBySid(sid) if game else None
    disconnect_reason = reason if reason in {
        'transport close', 'transport error', 'ping timeout', 'client disconnect',
        'server disconnect', 'client namespace disconnect', 'server namespace disconnect',
    } else 'unknown'
    record_usage('connection_closed', game, player.player_id if player else None, reason=disconnect_reason)
    client_metrics_by_sid.pop(sid, None)
    selfie_tokens_by_sid.pop(sid, None)
    game_manager.unregister_sid(sid)
    if game and game.reactor_sid == sid:
        game.reactor_sid = None
    player = game.getPlayerBySid(sid) if game else None
    if player:
        player.disconnected_at = time.time()
        player.disconnect()
        player.ready = False
        if game.meeting and not game.end_state:
            game.try_start_voting()
        sendPlayerList(game, room_code)


# ============ PLAYER MANAGEMENT ============

@socketio.on('join')
@room_event(reconnect=True)
def handle_join(data):
    """Handle player joining/creating within a game room."""
    player_id = data.get('player_id')
    username = data.get('username')
    room_code = data.get('room_code', '').upper()
    selfie_data = data.get('selfie')  # Base64 encoded image data
    pic = data.get('pic')  # Chosen avatar index; the server assigns a free one if missing or taken
    sid = request.sid

    if not username:
        record_usage('join_rejected', resolve_game=False, reason='username_required', room_code=room_code, command='join')
        emit('error', {'message': 'Username is required'}, to=sid)
        logger.warning(f"Join attempt without username from SID: {sid}")
        return

    # If player_id is provided, try to reconnect
    if player_id:
        game, player, existing_room = get_game_and_player(player_id)
        if player:
            record_reconnect(game, player)
            player.sid = sid
            player.active = True
            player.username = username
            game_manager.update_sid(player_id, sid)
            join_room(existing_room)
            
            # Update creator_sid if this player is the creator
            is_creator = (player.player_id == game.creator_player_id)
            if is_creator:
                game.creator_sid = sid
                logger.info(f"Updated creator_sid to {sid} for room {existing_room}")
            
            logger.info(f"Player {player.username} (ID: {player.player_id}) reconnected, is_creator={is_creator}")
            emit('player_id', {'player_id': player.player_id, 'pic': player.pic, 'is_creator': is_creator}, to=sid)
            sendPlayerList(game, existing_room)
            return

    # New player joining a room
    game = game_manager.get_game(room_code)
    if not game:
        room_entry_error('room_not_found', room_code,
                         'We cannot find this room. Check the code, or ask the host for a new invite.')
        return

    if not game.is_open and sid != game.creator_sid:
        room_entry_error('room_not_open', room_code,
                         'This room is not open yet. Ask the host to open it, then try again.')
        return

    if game.game_running:
        room_entry_error('round_in_progress', room_code,
                         'This round already started. New players can join when the host returns to the lobby.')
        logger.warning(f"Join attempt while game running: {username}")
        return

    # Save selfie if provided
    selfie_filename = None
    if selfie_data:
        try:
            selfie_filename = selfie_store.save(selfie_data)
        except (ValueError, OSError):
            logger.warning('Photo upload failed. The player will use a default avatar.')

    player = game.addPlayer(sid, username, selfie_filename, pic=pic)
    game_manager.register_player(player.player_id, room_code, sid)
    join_room(room_code)
    
    # Bind the persistent creator player to the creator socket. If the original
    # creator socket is gone before a player exists, let the room recover by
    # making the next joining player the host.
    if game.creator_player_id is None and (
        sid == game.creator_sid or not is_sid_connected_to_room(game.creator_sid, room_code)
    ):
        set_room_creator(game, room_code, player)
    
    # Check if this player is the creator
    is_creator = (player.player_id == game.creator_player_id)
    record_usage('player_joined', game, player.player_id, is_creator=is_creator,
                 player_count=len(game.players), flush=True)
    
    emit('player_id', {'player_id': player.player_id, 'pic': player.pic, 'is_creator': is_creator}, to=sid)
    logger.info(f"New player {username} joined room {room_code} with ID {player.player_id}, is_creator={is_creator}")
    
    # Send player list to all players in the room
    sendPlayerList(game, room_code)
    
    # Also send directly to the joining player to avoid race condition
    player_list = [p.to_json() for p in game.players]
    emit('game_data', {**metadata(game), 'action': 'player_list', 'list': player_list}, to=sid)


# ============ GAME FLOW ============

def start_room(game):
    if game.creator_sid != request.sid:
        record_usage('start_rejected', game, reason='not_host')
        return command_error('Only the host can start the game.')
    reason, error = start_error_detail(game)
    if error:
        record_usage('start_rejected', game, reason=reason, player_count=len(game.players),
                     task_count=len(game.collaborative_tasks), min_tasks=minimum_tasks(game))
        if len(game.collaborative_tasks) < minimum_tasks(game):
            socketio.emit('enter_task_creation', {**lobby_state(game), 'current_tasks': len(game.collaborative_tasks)}, room=game.room_code)
        return command_error(error)
    from assets.card import CardDeck
    game.begin_round()
    game.task_handler.tasks = [task.copy() for task in game.collaborative_tasks]
    game.task_creation_mode = False
    game.card_deck = CardDeck(game.locations, game.socket, game)
    game.game_running = True
    game.assignRoles()
    game_manager.stats_tracker.record_game_started(game)
    record_usage('round_host_started', game, game.creator_player_id)
    for player in game.players:
        if not player.sus:
            game.assign_task(player)
    sendPlayerList(game, game.room_code, 'start_game')
    game.emit_to_room('game_start', metadata(game))
    socketio.emit('task_goal', game.taskGoal, room=game.room_code)
    for player in game.players:
        if player.sid:
            socketio.emit('room_state', room_state(game, player, player.sid), to=player.sid)
            if player.task:
                socketio.emit('task', {**metadata(game), 'task': player.task}, to=player.sid)
    game.speaker.play_sound('theme')
    return {'ok': True}


@socketio.on('start_game')
@room_event()
def handle_start(data):
    game, player, room = get_game_and_player(data.get('player_id'))
    if not game:
        return command_error('Game not found.')
    return start_room(game)


@socketio.on('reset')
@room_event()
def reset_game(data):
    """Vote to reset a game - when all players vote, game resets to lobby."""
    sid = request.sid
    player_id = data.get('player_id') if isinstance(data, dict) else None
    room_code = data.get('room_code', '').upper() if isinstance(data, dict) else None
    force = data.get('force', False) if isinstance(data, dict) else False
    
    game = None
    player = None
    
    # Try to find game by player_id first
    if player_id:
        game, player, room_code = get_game_and_player(player_id)
    
    # If no game found, try by room_code (for reactor)
    if not game and room_code:
        game = game_manager.get_game(room_code)
    
    # If still no game, try by sid
    if not game:
        game, room_code = game_manager.get_game_by_sid(sid)
    
    if not game:
        emit('error', {'message': 'Game not found'})
        return
    
    # If force reset (from reactor/host), reset immediately
    if force and sid not in (game.creator_sid, game.reactor_sid):
        return command_error('Only the host or reactor can reset the game.')
    if force:
        game._record_abandoned_round('host_reset')
        record_usage('round_reset', game, player_id, reason='host_reset', flush=True)
        for p in game.players:
            p.reset()
        game.reset_game_state(reason='host_reset')
        socketio.emit('game_reset', {'room_code': room_code}, room=room_code)
        sendPlayerList(game, room_code)
        logger.info(f"Game {room_code} has been force reset to lobby")
        return
    
    connected_player_ids = get_connected_player_ids(game, room_code)
    game.reset_votes.intersection_update(connected_player_ids)

    # Add this player's vote only if they are currently connected to this room.
    if player_id and player_id in connected_player_ids:
        game.reset_votes.add(player_id)
    
    # Count how many players are in the game (excluding those who left)
    total_players = len(connected_player_ids)
    votes_needed = total_players
    current_votes = len(game.reset_votes)
    
    # Broadcast the vote update to all players
    socketio.emit('reset_vote_update', {
        'room_code': room_code,
        'current_votes': current_votes,
        'votes_needed': votes_needed,
        'voters': list(game.reset_votes)
    }, room=room_code)
    
    logger.info(f"Game {room_code}: Reset vote from {player_id}. {current_votes}/{votes_needed} votes.")
    
    # If all players have voted, reset the game
    if votes_needed > 0 and current_votes >= votes_needed:
        game._record_abandoned_round('unanimous_reset')
        record_usage('round_reset', game, player_id, reason='unanimous_reset', flush=True)
        for p in game.players:
            p.reset()
        game.reset_game_state(reason='unanimous_reset')
        socketio.emit('game_reset', {'room_code': room_code}, room=room_code)
        sendPlayerList(game, room_code)
        logger.info(f"Game {room_code} has been reset to lobby (all players voted)")


@socketio.on('disband_room')
@room_event()
def disband_room(data):
    """Disband a room completely - all players return to main lobby."""
    sid = request.sid
    player_id = data.get('player_id') if isinstance(data, dict) else None
    room_code = data.get('room_code', '').upper() if isinstance(data, dict) else None
    
    game = None
    
    # Try to find game by player_id first
    if player_id:
        game, player, room_code = get_game_and_player(player_id)
    
    # If no game found, try by room_code (for reactor)
    if not game and room_code:
        game = game_manager.get_game(room_code)
    
    # If still no game, try by sid
    if not game:
        game, room_code = game_manager.get_game_by_sid(sid)
    
    if not game:
        return
    
    if sid not in (game.creator_sid, game.reactor_sid):
        return command_error('Only the host or reactor can close the room.')

    # Notify all clients to leave and go back to lobby
    socketio.emit('room_disbanded', {'message': 'Room has been closed'}, room=room_code)
    
    # Clean up the game
    game_manager.remove_game(room_code, reason='host_disband')
    logger.info(f"Room {room_code} has been disbanded")


@socketio.on('leave_room')
@room_event()
def leave_room_handler(data):
    """Handle a player or reactor leaving the room."""
    sid = request.sid
    player_id = data.get('player_id') if isinstance(data, dict) else None
    room_code = data.get('room_code', '').upper() if isinstance(data, dict) else None
    
    game = None
    player = None
    
    # Try to find the game by player_id first
    if player_id:
        game, player, room_code = get_game_and_player(player_id)
    
    # If no player found, try by room_code (for reactor/desktop clients)
    if not game and room_code:
        game = game_manager.get_game(room_code)
    
    # If still no game, try by sid
    if not game:
        game, room_code = game_manager.get_game_by_sid(sid)
    
    if not game:
        emit('left_room')  # Still emit so client can reset
        return
    
    # Check if this is the reactor leaving
    is_reactor = (game.reactor_sid == sid)
    
    # Check if this is the room creator (before becoming a player)
    is_creator_socket = (game.creator_sid == sid)
    
    was_creator_player = bool(player and player.player_id == game.creator_player_id)
    record_usage('player_left' if player else 'room_exited', game, player_id,
                 is_creator=was_creator_player or is_creator_socket, is_reactor=is_reactor,
                 player_count=len(game.players), flush=True)

    if player:
        selfie_store.delete(player.selfie)
        player.selfie = None
        # During an active round, leaving counts as dying. After the round ends,
        # remove the player so reset votes only wait on people still in the room.
        if game.game_running and not game.end_state and player.alive:
            game.kill_player(player.player_id, death_cause='left_game')
            logger.info(f"Player {player.username} left during active game - marked as dead in room {room_code}")
        else:
            # Game not running or player already dead - remove them from the game
            if player in game.players:
                game.players.remove(player)
                if (player.pic not in game.backgrounds and
                        not any(other.pic == player.pic for other in game.players)):
                    game.backgrounds.append(player.pic)
            logger.info(f"Player {player.username} left room {room_code}")
        
        player.sid = None
        game_manager.unregister_player(player_id)

        if was_creator_player:
            reassign_room_creator(game, room_code)
    
    if is_reactor:
        game.reactor_sid = None
        game.has_reactor = False
        logger.info(f"Reactor left room {room_code}")
    
    # Clean up sid mapping and leave the socket.io room
    game_manager.unregister_sid(sid)
    leave_room(room_code)
    
    # Notify the leaving client
    emit('left_room')
    
    # If no players left and no reactor, delete the room
    # OR if the creator left before opening the room
    should_delete = False
    if len(game.players) == 0 and not game.reactor_sid:
        should_delete = True
    elif is_creator_socket and not game.is_open:
        # Creator left during room setup
        should_delete = True
    
    if should_delete:
        # Notify any remaining clients
        socketio.emit('room_disbanded', {'message': 'Room has been closed'}, room=room_code)
        game_manager.remove_game(room_code, reason='host_left_setup' if is_creator_socket and not game.is_open else 'no_players')
        logger.info(f"Room {room_code} deleted")
    elif player:
        # Notify remaining players
        sendPlayerList(game, room_code)


# ============ TASK HANDLING ============

@socketio.on('add_task')
@room_event()
def addTask(data):
    """Add a task (should probably use API instead)."""
    player_id = data.get('player_id')
    game, player, room_code = get_game_and_player(player_id)
    
    if game:
        game.task_handler.add_task(data)
        print(data)


@socketio.on("complete_task")
@room_event()
def handleTaskComplete(data):
    game, player, room = get_game_and_player(data.get('player_id'))
    if not game or not player:
        return command_error('Game session not found.')
    request_id, assignment_id, round_id = (data.get(key) for key in ('request_id', 'assignment_id', 'round_id'))
    if not all(isinstance(value, str) and 0 < len(value) <= 128 for value in (request_id, assignment_id, round_id)):
        return command_error('Reload the page to restore the task command.', game, player, reason='invalid_task_command')
    if round_id != game.round_id:
        return command_error('This command belongs to an earlier round.', game, player, reason='stale_round')
    key = (player.player_id, request_id)
    cached = game.command_results.get(key)
    if cached:
        if cached['assignment_id'] != assignment_id:
            return command_error('The request ID belongs to another task.', game, player, reason='request_id_conflict')
        return copy.deepcopy(cached['response'])
    if not game.game_running or game.end_state or not player.alive or player.sus:
        return command_error('This player cannot complete a task now.', game, player, reason='inactive_task_player')
    if game.meeting or game.active_hack > 0 or game.active_meltdown:
        return command_error('Wait until the current event ends before you complete the task.', game, player, reason='task_blocked_by_event')
    if not player.task or player.task.get('assignment_id') != assignment_id:
        return command_error('This task already changed. Use the current task.', game, player, reason='stale_assignment')
    is_fake = bool(player.task.get('is_fake'))
    if is_fake:
        game.stats['fake_tasks_completed'].append({'player_name': player.username, 'task_text': player.task.get('task', '')})
        emit('fake_task_completed', {**metadata(game), 'task': player.task.get('task'), 'location': player.task.get('location')})
    else:
        previous = game.crew_score / game.taskGoal * 100 if game.taskGoal else 0
        game.crew_score += 1
        game.stats['tasks_completed'] += 1
        game.emit_to_room('crew_score', {'score': game.crew_score})
        percentage = game.crew_score / game.taskGoal * 100 if game.taskGoal else 0
        for threshold in (20, 50, 80, 95):
            if previous < threshold <= percentage:
                game.speaker.play_sound(f'{threshold}_percent_tasks')
                break
        if percentage >= 100 and not game.intruders_revealed:
            game.reveal_intruders()
    queued_task = player.fake_task
    player.fake_task = None
    game.assign_task(player, queued_task)
    emit('task', {**metadata(game), 'task': player.task})
    response = {'ok': True, 'request_id': request_id, 'state': room_state(game, player, request.sid)}
    game.command_results[key] = {'assignment_id': assignment_id, 'response': copy.deepcopy(response)}
    while len(game.command_results) > 256:
        game.command_results.popitem(last=False)
    record_usage('task_completed', game, player.player_id, is_fake=is_fake, crew_score=game.crew_score,
                 task_goal=game.taskGoal)
    return response


# ============ CARD HANDLING ============

@socketio.on("play_card")
@room_event()
def playCard(data):
    """Handle card being played."""
    player_id = data.get('player_id')
    game, player, room_code = get_game_and_player(player_id)
    
    if not game or not player or not game.game_running or game.end_state or not player.alive or not player.sus or game.meeting:
        return command_error('This player cannot play a card now.')
    
    card = player.get_card(data.get('card_id'))
    if card:
        # Pass extra_data for cards that require additional input (e.g., Fake Task)
        extra_data = data.get('extra_data')
        had_meeting, had_meltdown = bool(game.meeting), bool(game.active_meltdown)
        accepted = card.play_card(player, extra_data)
        record_usage('card_played' if accepted else 'card_rejected', game, player_id,
                     card_action=card.action, **({} if accepted else {'reason': 'effect_unavailable'}))
        if not had_meeting and game.meeting:
            record_usage('meeting_started', game, player_id, trigger='card')
        if not had_meltdown and game.active_meltdown:
            record_usage('meltdown_started', game, player_id, trigger='card')
        print(data)
    else:
        record_usage('card_rejected', game, player_id, reason='card_not_in_hand')


# ============ MEETING HANDLING ============

def current_phase_player(data, stage=None):
    game, player, room = get_game_and_player(data.get('player_id'))
    if not game or not player or not game.game_running or game.end_state or not player.alive:
        return None, None
    if data.get('round_id') != game.round_id:
        return None, None
    if stage and (not game.meeting or game.meeting.stage != stage or data.get('meeting_id') != game.meeting.id):
        return None, None
    return game, player


@socketio.on("meeting")
@room_event()
def handleMeeting(data):
    game, player = current_phase_player(data)
    if not game or not game.start_meeting(player):
        return command_error('A meeting cannot start now.')
    record_usage('meeting_started', game, player.player_id)
    return {'ok': True}


@socketio.on("ready")
@room_event()
def handleReady(data):
    game, player = current_phase_player(data, 'waiting')
    if not game:
        return command_error('This meeting is no longer in the ready phase.')
    player.ready = True
    sendPlayerList(game, game.room_code)
    game.try_start_voting()
    return {'ok': True}


@socketio.on("vote")
@room_event()
def handleVote(data):
    game, player = current_phase_player(data, 'voting')
    voted_for = game.getPlayerById(data.get('votedFor')) if game else None
    if not game or not voted_for or not voted_for.alive:
        return command_error('This vote is no longer valid.')
    game.meeting.register_vote(player, voted_for)
    return {'ok': True}


@socketio.on("veto")
@room_event()
def handleVeto(data):
    game, player = current_phase_player(data, 'voting')
    if not game:
        return command_error('This vote is no longer valid.')
    game.meeting.register_vote(player, veto=True)
    return {'ok': True}


@socketio.on('end_meeting')
@room_event()
def handleEndMeeting(data=None):
    game, player = current_phase_player(data or {})
    if not game or game.creator_sid != request.sid or not game.meeting or data.get('meeting_id') != game.meeting.id:
        return command_error('Only the host can end the current meeting.')
    game.meeting.end_meeting()
    return {'ok': True}


# ============ MELTDOWN HANDLING ============

@socketio.on('meltdown')
@room_event()
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
            if game.start_meltdown():
                record_usage('meltdown_started', game, data.get('player_id') if data else None)
                logger.warning(f"Meltdown started in room {room_code} (triggered by sid: {sid})")
        else:
            logger.warning(f"Meltdown rejected - unauthorized sid: {sid}")
    else:
        logger.warning(f"Meltdown failed - game not found for sid: {sid}")


@socketio.on("pin_entry")
@room_event()
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
@room_event()
def handleDeath(data):
    """Handle player reporting their own death (I'm Dead button)."""
    game, player = current_phase_player(data)
    if not game:
        return command_error('This death report belongs to an inactive player or round.')
    meeting_id = data.get('meeting_id')
    if meeting_id and (not game.meeting or game.meeting.id != meeting_id):
        return command_error('This death report belongs to an earlier meeting.')
    current_task = player.get_task()
    task_name = current_task.get('task') if current_task else None
    game.kill_player(player.player_id, death_cause='murdered_during_task', task_name=task_name)
    return {'ok': True}


# ============ TASK LIST MANAGEMENT ============

@socketio.on('get_my_task_lists')
def handle_get_my_task_lists(data):
    """Get all task lists created by the current player."""
    player_id = data.get('player_id')
    if not player_id:
        emit('error', {'message': 'Player ID required'})
        return
    
    lists = task_list_manager.get_player_task_lists(player_id)
    starter_template = task_list_manager.get_default_task_list_template()
    emit('my_task_lists', {'lists': lists, 'starter_template': starter_template})


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


@socketio.on('save_task_list_to_user')
def handle_save_task_list_to_user(data):
    """Save an external task list to the user's saved lists (without duplicating)."""
    player_id = data.get('player_id')
    code = data.get('code', '').upper()
    
    if not player_id:
        emit('error', {'message': 'Player ID required'})
        return
    
    if not code:
        emit('error', {'message': 'Task list code required'})
        return
    
    success = task_list_manager.save_to_player_list(code, player_id)
    if success:
        lists = task_list_manager.get_player_task_lists(player_id)
        emit('my_task_lists', {'lists': lists})
        logger.info(f"Task list {code} saved to player {player_id}'s list")
    else:
        emit('error', {'message': f'Task list not found: {code}'})


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
        # Validate locations before creating
        if not locations or len(locations) < 2:
            emit('error', {'message': 'At least 2 locations are required to create a task list'})
            return
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
    """Remove a task list from the player's saved lists (does not delete the file)."""
    player_id = data.get('player_id')
    code = data.get('code', '').upper()
    
    if not player_id or not code:
        emit('error', {'message': 'Player ID and code required'})
        return
    
    # Only remove from player's list, don't delete the actual file
    success = task_list_manager.remove_from_player_list(code, player_id)
    if success:
        emit('task_list_deleted', {'code': code})
        logger.info(f"Task list {code} removed from player {player_id}'s saved lists")
    else:
        emit('error', {'message': 'Task list not in your saved lists.'})


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
@room_event()
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
    game.collaborative_tasks = [dict(task, task_id=str(uuid4())) for task in task_list['tasks']]
    game.collaborative_task_list_code = task_list_code  # Track the code
    game.collaborative_task_list_name = task_list['name']  # Track the name
    
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
    
    # Broadcast locations to all players in the room so they have the updated locations
    socketio.emit('task_locations', game.locations, room=room_code)


# ============ COLLABORATIVE TASK CREATION ============

@socketio.on('toggle_task_creation_mode')
@room_event()
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
        min_tasks = get_min_tasks_needed(game)
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
@room_event(mutate=False)
def handle_get_collaborative_tasks(data):
    """Get current collaborative tasks for a room."""
    room_code = data.get('room_code', '').upper()
    device_id = data.get('device_id')  # To check ownership
    
    game = game_manager.get_game(room_code)
    if not game:
        emit('error', {'message': 'Game not found'})
        return
    
    # Check if user owns the current task list
    is_owner = True  # Default to true for new/empty lists
    if game.collaborative_task_list_code and device_id:
        task_list = task_list_manager.get_task_list(game.collaborative_task_list_code)
        if task_list:
            stored_creator = task_list.get('creator_id')
            is_owner = (stored_creator == device_id)
            logger.info(f"Ownership check for {game.collaborative_task_list_code}: stored_creator={stored_creator}, device_id={device_id}, is_owner={is_owner}")
    elif game.collaborative_task_list_code and not device_id:
        # No device_id provided - can't determine ownership
        is_owner = False
        logger.warning(f"No device_id provided for ownership check of {game.collaborative_task_list_code}")
    
    min_tasks = get_min_tasks_needed(game)
    emit('collaborative_tasks', {
        'tasks': game.collaborative_tasks,
        'min_tasks': min_tasks,
        'task_list_code': game.collaborative_task_list_code,
        'task_list_name': game.collaborative_task_list_name,
        'collaborative_mode': game.collaborative_mode,
        'is_owner': is_owner
    })


@socketio.on('toggle_collaborative_mode')
@room_event()
def handle_toggle_collaborative_mode(data):
    """Toggle whether all players can add tasks or just the host."""
    room_code = data.get('room_code', '').upper()
    enabled = data.get('enabled', False)
    sid = request.sid
    
    game = game_manager.get_game(room_code)
    if not game:
        emit('error', {'message': 'Game not found'})
        return
    
    # Only host can toggle collaborative mode
    if game.creator_sid != sid:
        emit('error', {'message': 'Only the host can change this setting'})
        return
    
    game.collaborative_mode = enabled
    
    # Broadcast the change to all players
    socketio.emit('collaborative_mode_changed', {
        'enabled': enabled
    }, room=room_code)
    
    logger.info(f"Collaborative mode {'enabled' if enabled else 'disabled'} in room {room_code}")


@socketio.on('add_collaborative_task')
@room_event()
def handle_add_collaborative_task(data):
    """Add a task during collaborative creation phase."""
    room_code = data.get('room_code', '').upper()
    task = data.get('task', {})
    sid = request.sid
    
    game = game_manager.get_game(room_code)
    if not game:
        emit('error', {'message': 'Game not found'})
        return
    
    # Allow task addition when room is open and game hasn't started
    if game.game_running:
        emit('error', {'message': 'Cannot add tasks while game is running'})
        return
    
    if not game.is_open:
        emit('error', {'message': 'Room is not open yet'})
        return
    
    # Check permissions: only host can add tasks unless collaborative_mode is enabled
    is_host = (game.creator_sid == sid)
    if not is_host and not game.collaborative_mode:
        emit('error', {'message': 'Only the host can add tasks. Ask them to enable collaborative mode.'})
        return
    
    # Validate task
    if not task.get('task'):
        emit('error', {'message': 'Task description required'})
        return
    
    # Set defaults
    task.setdefault('location', 'Other')
    task.pop('difficulty', None)
    task['task_id'] = str(uuid4())
    
    # Add to collaborative tasks
    game.collaborative_tasks.append(task)
    
    # Broadcast to all players in the room
    min_tasks = get_min_tasks_needed(game)
    socketio.emit('collaborative_task_added', {
        'task': task,
        'total_tasks': len(game.collaborative_tasks),
        'min_tasks': min_tasks
    }, room=room_code)
    
    logger.info(f"Collaborative task added in room {room_code}: {task.get('task')[:50]}")


@socketio.on('remove_collaborative_task')
@room_event()
def handle_remove_collaborative_task(data):
    """Remove a task during collaborative creation phase."""
    room_code = data.get('room_code', '').upper()
    task_index = data.get('task_index')
    
    game = game_manager.get_game(room_code)
    if not game:
        emit('error', {'message': 'Game not found'})
        return
    
    # Allow task removal when room is open and game hasn't started
    if game.game_running:
        emit('error', {'message': 'Cannot remove tasks while game is running'})
        return
    
    if not game.is_open:
        emit('error', {'message': 'Room is not open yet'})
        return

    if request.sid != game.creator_sid and not game.collaborative_mode:
        return command_error('Only the host can remove tasks.')

    if data.get('task_id'):
        task_index = next((index for index, task in enumerate(game.collaborative_tasks)
                           if task.get('task_id') == data['task_id']), None)
    
    if not isinstance(task_index, int) or task_index < 0 or task_index >= len(game.collaborative_tasks):
        emit('error', {'message': 'Invalid task index'})
        return
    
    removed_task = game.collaborative_tasks.pop(task_index)
    
    # Broadcast to all players in the room
    socketio.emit('collaborative_task_removed', {
        'index': task_index,
        'total_tasks': len(game.collaborative_tasks)
    }, room=room_code)
    
    logger.info(f"Collaborative task removed in room {room_code}: {removed_task.get('task', '')[:50]}")


@socketio.on('update_game_locations')
@room_event()
def handle_update_game_locations(data):
    """Update game locations during task creation mode. Only the host can do this."""
    room_code = data.get('room_code', '').upper()
    locations = data.get('locations', [])
    sid = request.sid
    
    game = game_manager.get_game(room_code)
    if not game:
        emit('error', {'message': 'Game not found'})
        return
    
    # Only host can edit locations
    if game.creator_sid != sid:
        emit('error', {'message': 'Only the host can edit locations'})
        return
    
    if game.game_running:
        emit('error', {'message': 'Cannot change locations while game is running'})
        return
    
    # Ensure 'Other' is always included
    if 'Other' not in locations:
        locations.append('Other')
    
    game.locations = locations
    game.task_handler.locations = locations
    
    # Rebuild card deck with new locations
    from assets.card import CardDeck
    game.card_deck = CardDeck(game.locations, game.socket, game)
    
    # Broadcast updated locations to all players in the room
    socketio.emit('task_locations', locations, room=room_code)
    logger.info(f"Updated locations in room {room_code}: {locations}")


@socketio.on('finalize_collaborative_tasks')
@room_event()
def handle_finalize_collaborative_tasks(data):
    game = game_manager.get_game(data.get('room_code', '').upper())
    if not game:
        return command_error('Game not found.')
    return start_room(game)


@socketio.on('save_collaborative_tasks')
@room_event()
def handle_save_collaborative_tasks(data):
    """Save the current collaborative tasks as a new or updated task list."""
    room_code = data.get('room_code', '').upper()
    name = data.get('name', 'Collaborative Task List')
    device_id = data.get('device_id')  # Use device_id for ownership
    force_new = data.get('force_new', False)  # Explicitly create a new list
    
    logger.info(f"save_collaborative_tasks called: room={room_code}, device_id={device_id}, force_new={force_new}")
    
    game = game_manager.get_game(room_code)
    if not game:
        emit('error', {'message': 'Game not found'})
        return
    
    logger.info(f"Game found, collaborative_task_list_code={game.collaborative_task_list_code}, num_tasks={len(game.collaborative_tasks)}")
    
    if len(game.collaborative_tasks) == 0:
        emit('error', {'message': 'No tasks to save'})
        return
    
    if not device_id:
        emit('error', {'message': 'Device ID required to save task list'})
        return
    
    # If we already have a code for this session and NOT forcing a new list
    if game.collaborative_task_list_code and not force_new:
        # Check ownership first before attempting update
        existing_list = task_list_manager.get_task_list(game.collaborative_task_list_code)
        if existing_list:
            stored_creator = existing_list.get('creator_id')
            logger.info(f"Existing list found: stored_creator={stored_creator}, device_id={device_id}, match={stored_creator == device_id}")
            
            if stored_creator == device_id:
                # We own it - update it
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
                    game.collaborative_task_list_name = name  # Update stored name
                    socketio.emit('collaborative_tasks_saved', {
                        'code': game.collaborative_task_list_code,
                        'name': name,
                        'task_count': len(game.collaborative_tasks),
                        'updated': True,
                        'is_owner': True
                    }, room=room_code)
                    logger.info(f"Updated collaborative task list {game.collaborative_task_list_code} in room {room_code}")
                    return
        
        # We don't own this list - notify client but don't auto-create a copy
        # Client must explicitly request a new list with force_new=True
        socketio.emit('collaborative_tasks_saved', {
            'code': game.collaborative_task_list_code,
            'name': game.collaborative_task_list_name or name,
            'task_count': len(game.collaborative_tasks),
            'updated': False,
            'is_owner': False,
            'message': 'You do not own this task list. Use "Save As New" to create your own copy.'
        }, room=room_code)
        logger.info(f"Skipped auto-save for non-owned task list {game.collaborative_task_list_code} in room {room_code}")
        return
    
    # Create new task list (either no existing code, or force_new requested)
    code = task_list_manager.create_task_list(
        device_id, 
        name, 
        game.collaborative_tasks, 
        game.locations
    )
    if code:
        game.collaborative_task_list_code = code
        game.collaborative_task_list_name = name  # Store the name
        socketio.emit('collaborative_tasks_saved', {
            'code': code,
            'name': name,
            'task_count': len(game.collaborative_tasks),
            'updated': False,
            'is_owner': True
        }, room=room_code)
        logger.info(f"Created collaborative task list {code} in room {room_code}")
    else:
        emit('error', {'message': 'Failed to save task list'})


# ============ STARTUP ============

if __name__ == '__main__':
    local_ip = get_local_ip()
    logger.info("Starting server...")
    
    # Check for development mode (disable SSL)
    dev_mode = os.environ.get('DEV', '').lower() in ('1', 'true', 'yes')
    
    # Check if SSL certificates exist
    cert_file = os.path.join(os.path.dirname(__file__), 'cert.pem')
    key_file = os.path.join(os.path.dirname(__file__), 'key.pem')
    
    use_ssl = os.path.exists(cert_file) and os.path.exists(key_file) and not dev_mode
    
    if dev_mode:
        logger.info(" * DEV MODE: SSL disabled")
    
    if use_ssl:
        logger.info(f" * Running with HTTPS at: https://{local_ip}:5001")
        logger.info(" * Note: You may need to accept the self-signed certificate in your browser")
        socketio.run(app, host='0.0.0.0', port=5001, debug=False, 
                     certfile=cert_file, keyfile=key_file)
    else:
        logger.info(f" * Running with HTTP at: http://{local_ip}:5001")
        if not dev_mode:
            logger.info(" * For HTTPS, generate certificates with:")
            logger.info("   openssl req -x509 -newkey rsa:4096 -nodes -out cert.pem -keyout key.pem -days 365")
        socketio.run(app, host='0.0.0.0', port=5001, debug=False)
