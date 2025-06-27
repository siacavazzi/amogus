"""Socket event handlers supporting multiple game rooms."""

import random
import string
from flask import request
from flask_socketio import emit, join_room, SocketIO

from assets.game import Game
from assets.taskHandler import TaskHandler


def register_socket_handlers(socketio: SocketIO, speaker, config, logger):
    """Register all socket.io event handlers."""

    rooms = {}
    player_rooms = {}
    sid_map = {}
    locations = config["locations"]

    def generate_room_code():
        return "".join(random.choices(string.ascii_uppercase + string.digits, k=4))

    def get_game_by_player(player_id):
        room = player_rooms.get(player_id)
        if room:
            return rooms.get(room)["game"], room
        return None, None

    def get_game_by_sid(sid):
        player = sid_map.get(sid)
        if player:
            return get_game_by_player(player)
        return None, None

    def send_player_list(game, room, action="player_list"):
        logger.info("Sending player list to room %s", room)
        player_list = [player.to_json() for player in game.players]
        socketio.emit("game_data", {"action": action, "list": player_list}, room=room, json=True)

    @socketio.on("connect")
    def handle_connect():
        logger.info("Client connected: %s", request.sid)
        emit("task_locations", locations, json=True)

    @socketio.on("create_room")
    def handle_create_room():
        code = generate_room_code()
        while code in rooms:
            code = generate_room_code()

        task_handler = TaskHandler(locations)
        game = Game(
            socketio,
            task_handler,
            speaker,
            config["task_ratio"],
            config["meltdown_time"],
            config["code_percent"],
            locations,
            config["vote_time"],
            config["card_draw_probability"],
            config["number_of_imposters"],
            config["starting_cards"],
            room=code,
        )
        rooms[code] = {"game": game, "task_handler": task_handler}
        emit("room_created", {"room": code})

    @socketio.on("rejoin")
    def handle_rejoin(data):
        player_id = data.get("player_id")
        room = data.get("room") or player_rooms.get(player_id)
        if not room or room not in rooms:
            return

        game = rooms[room]["game"]
        join_room(room)
        sid_map[request.sid] = player_id
        player = game.getPlayerById(player_id)
        if player:
            player.sid = request.sid
            send_player_list(game, room, "rejoin")

            if game.denied_location:
                emit("active_denial", game.denied_location, room=room)

            if player.meltdown_code and game.active_meltdown:
                emit("meltdown_code", player.meltdown_code, to=player.sid)

            if player.get_task():
                emit("task", {"task": player.get_task()}, to=player.sid)

            if game.game_running:
                emit("game_start", room=player.sid)
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
                    if game.meeting.stage == "voting":
                        game.meeting.emit_vote_counts()

    @socketio.on("add_task")
    def add_task(data):
        game, room = get_game_by_sid(request.sid)
        if not game:
            return
        rooms[room]["task_handler"].add_task(data)

    @socketio.on("complete_task")
    def handle_task_complete(data):
        game, room = get_game_by_player(data.get("player_id"))
        if not game:
            return
        task_handler = rooms[room]["task_handler"]
        player = game.getPlayerById(data.get("player_id"))
        if player and len(task_handler.tasks) > 0:
            game.crew_score += 1
            emit("crew_score", {"score": game.crew_score}, room=room)
            player.task = game.getTask()
            emit("task", {"task": player.task}, to=player.sid)
        elif player and len(task_handler.tasks) == 0:
            player.task = None
            emit("task", {"task": "No More Tasks"}, to=player.sid)

    @socketio.on("play_card")
    def play_card(data):
        game, _ = get_game_by_player(data.get("player_id"))
        if not game:
            return
        player = game.getPlayerById(data.get("player_id"))
        card = player.get_card(data.get("card_id")) if player else None
        if card:
            card.play_card(player)

    @socketio.on("meeting")
    def handle_meeting(data):
        game, room = get_game_by_player(data.get("player_id"))
        if game and not game.meeting:
            speaker.play_sound("meeting")
            player = game.getPlayerById(data.get("player_id"))
            game.start_meeting(player)
            logger.info("Meeting started")

    @socketio.on("ready")
    def handle_ready(data):
        game, room = get_game_by_player(data.get("player_id"))
        if not game:
            return
        player = game.getPlayerById(data.get("player_id"))
        if player:
            player.ready = True
            send_player_list(game, room)
            game.try_start_voting()

    @socketio.on("vote")
    def handle_vote(data):
        game, _ = get_game_by_player(data.get("player_id"))
        if not game:
            return
        voting_player = game.getPlayerById(data.get("player_id"))
        voted_for = game.getPlayerById(data.get("votedFor"))
        if voting_player:
            game.meeting.register_vote(voting_player, voted_for)

    @socketio.on("veto")
    def handle_veto(data):
        game, _ = get_game_by_player(data.get("player_id"))
        if not game:
            return
        voting_player = game.getPlayerById(data.get("player_id"))
        if voting_player:
            game.meeting.register_vote(voting_player, veto=True)

    @socketio.on("end_meeting")
    def handle_end_meeting():
        game, room = get_game_by_sid(request.sid)
        if game and game.meeting:
            emit("end_meeting", room=room)
            game.meeting = False

    @socketio.on("meltdown")
    def handle_meltdown():
        game, _ = get_game_by_sid(request.sid)
        if game:
            game.start_meltdown()

    @socketio.on("pin_entry")
    def handle_pin_entry(data):
        game, _ = get_game_by_sid(request.sid)
        if game:
            game.check_pin(data)

    @socketio.on("player_dead")
    def handle_death(data):
        game, _ = get_game_by_player(data.get("player_id"))
        if game:
            game.kill_player(data.get("player_id"))

    @socketio.on("reset")
    def reset_game():
        game, room = get_game_by_sid(request.sid)
        if not game:
            return
        for player in game.players:
            player.reset()
        send_player_list(game, room)

    @socketio.on("start_game")
    def handle_start(data):
        game, room = get_game_by_player(data.get("player_id"))
        if not game:
            return
        task_handler = rooms[room]["task_handler"]
        if game.game_running:
            return
        speaker.play_sound("theme")
        game.game_running = True
        game.assignRoles()
        send_player_list(game, room, "start_game")
        emit("task_goal", game.taskGoal, room=room)
        for player in game.players:
            if not player.sus and len(task_handler.tasks) > 0:
                player.task = game.getTask()
                emit("task", {"task": player.task}, to=player.sid)

    @socketio.on("join")
    def handle_join(data):
        room = data.get("room")
        username = data.get("username")
        player_id = data.get("player_id")
        sid = request.sid

        if not room or room not in rooms:
            emit("error", {"message": "Invalid room"}, to=sid)
            return
        game = rooms[room]["game"]
        join_room(room)

        if not username:
            emit("error", {"message": "Username is required"}, to=sid)
            return

        if player_id:
            player = game.getPlayerById(player_id)
            if player:
                player.sid = sid
                player.username = username
            else:
                if game.game_running:
                    return
                player = game.addPlayer(sid, username)
                emit("player_id", {"player_id": player.player_id, "room": room}, to=sid)
        else:
            if game.game_running:
                return
            player = game.addPlayer(sid, username)
            emit("player_id", {"player_id": player.player_id, "room": room, "pic": player.pic}, to=sid)

        player_rooms[player.player_id] = room
        sid_map[sid] = player.player_id
        send_player_list(game, room)

    @socketio.on("disconnect")
    def handle_disconnect():
        logger.info("Client disconnected: %s", request.sid)
        sid_map.pop(request.sid, None)

