# Socket event handlers for the game

from flask import request
from flask_socketio import emit, SocketIO


def register_socket_handlers(socketio: SocketIO, game, task_handler, speaker, locations, logger):
    """Register all socket.io event handlers."""

    def send_player_list(action='player_list'):
        logger.info("Sending player list to all clients")
        player_list = [player.to_json() for player in game.players]
        emit('game_data', {'action': action, 'list': player_list}, broadcast=True, json=True)

    @socketio.on('connect')
    def handle_connect():
        logger.info(f'Client connected: {request.sid}')
        emit('task_locations', locations, json=True)

        if game.game_running:
            emit('game_start')
            emit('crew_score', {'score': game.crew_score})
            emit('task_goal', game.taskGoal)

            if game.end_state:
                logger.info(f'Game over: {game.end_state}')
                emit('end_game', game.end_state)
            if len(game.card_deck.active_cards) > 0:
                game.card_deck.emit_active_cards()

            if game.active_hack > 0:
                emit('hack', game.active_hack)
                logger.debug(f'Active hack: {game.active_hack}')
            if game.meeting:
                emit('meeting', game.meeting.to_json())
                if game.meeting.stage == 'voting':
                    game.meeting.emit_vote_counts()
                logger.debug('Meeting is active')

    @socketio.on('rejoin')
    def handle_join_rejoin(data):
        player = game.getPlayerById(data.get('player_id'))
        if player:
            logger.info('Existing player rejoining...')
            player.sid = request.sid
            send_player_list('rejoin')

            if game.denied_location:
                emit('active_denial', game.denied_location)

            if player.meltdown_code and game.active_meltdown:
                emit('meltdown_code', player.meltdown_code, to=player.sid)
                logger.debug(f'Sent meltdown code to player {player.player_id}')

            if player.get_task():
                logger.info('Sending task to player')
                emit('task', {'task': player.get_task()}, to=player.sid)

    @socketio.on('add_task')
    def add_task(data):
        task_handler.add_task(data)

    @socketio.on('complete_task')
    def handle_task_complete(data):
        player = game.getPlayerById(data.get('player_id'))
        if player and len(task_handler.tasks) > 0:
            game.crew_score += 1
            emit('crew_score', {'score': game.crew_score}, broadcast=True)
            logger.info(f'Player {player.player_id} completed a task. Crew score: {game.crew_score}')
            player.task = game.getTask()
            emit('task', {'task': player.task}, to=player.sid)
            logger.debug(f'Assigned new task to player {player.player_id}: {player.task}')
        elif player and len(task_handler.tasks) == 0:
            player.task = None
            emit('task', {'task': 'No More Tasks'}, to=player.sid)
            logger.info(f'No more tasks available. Informed player {player.player_id}')

    def handle_hack(hack_length=30):
        if not game.active_hack and not game.meeting:
            logger.info('Hack initiated.')
            game.start_hack(hack_length)
            speaker.play_sound('hack')
            logger.debug('Hack started with a duration of 30 seconds')

    @socketio.on('play_card')
    def play_card(data):
        player = game.getPlayerById(data.get('player_id'))
        card = player.get_card(data.get('card_id'))
        if card:
            card.play_card(player)

    @socketio.on('meeting')
    def handle_meeting(data):
        if not game.meeting:
            speaker.play_sound('meeting')
            player = game.getPlayerById(data.get('player_id'))
            game.start_meeting(player)
            logger.info('Meeting started')

    @socketio.on('ready')
    def handle_ready(data):
        player = game.getPlayerById(data.get('player_id'))
        player.ready = True
        send_player_list()
        game.try_start_voting()  # only starts if all players are ready

    @socketio.on('vote')
    def handle_vote(data):
        voting_player = game.getPlayerById(data.get('player_id'))
        voted_for = game.getPlayerById(data.get('votedFor'))
        game.meeting.register_vote(voting_player, voted_for)

    @socketio.on('veto')
    def handle_veto(data):
        voting_player = game.getPlayerById(data.get('player_id'))
        game.meeting.register_vote(voting_player, veto=True)

    @socketio.on('end_meeting')
    def handle_end_meeting():
        if game.meeting:
            emit('end_meeting', broadcast=True)
            game.meeting = False
            logger.info('Meeting ended')

    @socketio.on('meltdown')
    def handle_meltdown():
        game.start_meltdown()
        logger.warning('Meltdown occurred.')

    @socketio.on('pin_entry')
    def handle_pin_entry(data):
        logger.info('Pin entered')
        game.check_pin(data)
        logger.debug(f'Pin data: {data}')

    @socketio.on('player_dead')
    def handle_death(data):
        game.kill_player(data.get('player_id'))

    @socketio.on('reset')
    def reset_game():
        for player in game.players:
            player.reset()
        send_player_list()
        logger.info('Game has been reset')

    @socketio.on('start_game')
    def handle_start(data):
        if game.game_running:
            logger.warning('Start game attempted but game is already running')
            return

        speaker.play_sound('theme')
        game.game_running = True
        game.assignRoles()
        send_player_list('start_game')
        emit('task_goal', game.taskGoal, broadcast=True)
        logger.info('Game started')

        for player in game.players:
            if not player.sus and len(task_handler.tasks) > 0:
                player.task = game.getTask()
                emit('task', {'task': player.task}, to=player.sid)
                logger.debug(f'Assigned task to player {player.player_id}: {player.task}')

    @socketio.on('join')
    def handle_join(data):
        player_id = data.get('player_id')
        username = data.get('username')
        sid = request.sid

        if not username:
            emit('error', {'message': 'Username is required'}, to=sid)
            logger.warning(f'Join attempt without username from SID: {sid}')
            return

        if player_id:
            player = game.getPlayerById(player_id)
            if player:
                player.sid = sid
                player.username = username
                logger.info(f'Player {player.username} (ID: {player.player_id}) reconnected with new SID: {sid}')
            else:
                if game.game_running:
                    logger.warning(f'Join attempt with invalid player_id: {player_id} while game is running')
                    return
                player = game.addPlayer(sid, username)
                emit('player_id', {'player_id': player.player_id}, to=sid)
                logger.info(f'New player {username} joined with new ID {player.player_id}')
        else:
            if game.game_running:
                logger.warning(f'Join attempt without player_id while game is running for username: {username}')
                return
            player = game.addPlayer(sid, username)
            emit('player_id', {'player_id': player.player_id, 'pic': player.pic}, to=sid)
            logger.info(f'New player {username} joined with ID {player.player_id}')

        send_player_list()

    @socketio.on('disconnect')
    def handle_disconnect():
        logger.info(f'Client disconnected: {request.sid}')

