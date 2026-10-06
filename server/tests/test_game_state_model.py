import json
import sys
import threading
import unittest
from collections import OrderedDict
from pathlib import Path
from unittest.mock import patch


SERVER_DIR = Path(__file__).resolve().parents[1]
if str(SERVER_DIR) not in sys.path:
    sys.path.insert(0, str(SERVER_DIR))

from assets.card import Card  # noqa: E402
from assets.game import Game  # noqa: E402
from assets.player import Player  # noqa: E402


class FakeSocket:
    def __init__(self):
        self.events = []

    def emit(self, event, *args, **kwargs):
        self.events.append((event, args, kwargs))


class FakeSpeaker:
    def play_sound(self, *_args, **_kwargs):
        pass

    def loop_sound(self, *_args, **_kwargs):
        pass

    def stop(self):
        pass


class FakeTaskHandler:
    def __init__(self, tasks=()):
        self.tasks = [dict(task) for task in tasks]

    def get_task(self, _denied_location=None):
        return self.tasks.pop(0)

    def reset(self):
        self.tasks = []


class InlineThread:
    def __init__(self, target, args=()):
        self.target = target
        self.args = args

    def start(self):
        self.target(*self.args)


def make_game(player_count=0):
    socket = FakeSocket()
    game = Game(
        socket=socket,
        task_handler=FakeTaskHandler(),
        speaker=FakeSpeaker(),
        task_ratio=1,
        meltdown_time=30,
        code_percent=0.5,
        locations=["Kitchen", "Other"],
        vote_time=30,
        card_draw_probability=0,
        numIntruders=1,
        starting_cards=0,
        vote_threshold=0.5,
        room_code="ROOM1",
    )
    for index in range(player_count):
        game.players.append(
            Player(
                sid=f"sid-{index}",
                player_id=f"player-{index}",
                username=f"Player {index}",
                pic=index,
            )
        )
    return game, socket


class GameStateModelTests(unittest.TestCase):
    def test_game_has_room_lock_revision_round_and_completion_cache(self):
        game, _socket = make_game()

        self.assertTrue(hasattr(game.state_lock, "acquire"))
        self.assertEqual(0, game.revision)
        self.assertTrue(game.round_id)
        self.assertIsInstance(game.command_results, OrderedDict)

    def test_round_change_clears_command_results_and_advances_identity(self):
        game, _socket = make_game()
        first_round = game.round_id
        first_revision = game.revision
        game.command_results["command"] = {"ok": True}

        game.begin_round()

        self.assertNotEqual(first_round, game.round_id)
        self.assertGreater(game.revision, first_revision)
        self.assertEqual(OrderedDict(), game.command_results)

    def test_replay_restores_unsaved_room_tasks_after_pool_depletion(self):
        room_tasks = [
            {"task": "Calibrate engine", "location": "Kitchen"},
            {"task": "Check beacon", "location": "Kitchen"},
        ]
        game, _socket = make_game()
        game.task_list_applied = False
        game.collaborative_tasks = [dict(task) for task in room_tasks]
        game.task_handler.tasks = []

        game.reset_game_state()

        self.assertEqual(room_tasks, game.collaborative_tasks)
        self.assertEqual(room_tasks, game.task_handler.tasks)

    def test_task_assignment_refills_saved_room_tasks_with_fresh_ids(self):
        room_tasks = [
            {"task": "Calibrate engine", "location": "Kitchen"},
            {"task": "Check beacon", "location": "Kitchen"},
        ]
        game, _socket = make_game()
        game.collaborative_tasks = [dict(task) for task in room_tasks]
        game.task_handler.tasks = [dict(room_tasks[0])]
        player = Player("sid", "player", "Crew", 0)

        first = game.assign_task(player)
        second = game.assign_task(player)

        self.assertEqual("Calibrate engine", first["task"])
        self.assertIn(second["task"], {task["task"] for task in room_tasks})
        self.assertNotEqual(first["assignment_id"], second["assignment_id"])
        self.assertEqual(game.round_id, first["round_id"])
        self.assertEqual(game.round_id, second["round_id"])
        self.assertEqual(room_tasks, game.collaborative_tasks)
        self.assertIs(second, player.task)

    def test_fake_task_assignment_preserves_content_and_adds_round_identity(self):
        game, _socket = make_game()
        player = Player("sid", "player", "Crew", 0)
        fake_task = {
            "task": "Dance by the airlock",
            "location": "Other",
            "is_fake": True,
        }

        assigned = game.assign_task(player, fake_task)

        self.assertEqual(fake_task, {key: assigned[key] for key in fake_task})
        self.assertTrue(assigned["assignment_id"])
        self.assertEqual(game.round_id, assigned["round_id"])
        self.assertIs(assigned, player.task)

    def test_new_meeting_requires_active_living_caller_and_resets_readiness(self):
        game, _socket = make_game(3)
        caller = game.players[0]
        caller.sus = True
        for player in game.players:
            player.ready = True

        self.assertFalse(game.start_meeting(caller))
        game.game_running = True
        caller.alive = False
        self.assertFalse(game.start_meeting(caller))
        caller.alive = True

        self.assertTrue(game.start_meeting(caller))
        self.assertTrue(caller.sus)
        self.assertTrue(all(not player.ready for player in game.players))
        self.assertFalse(game.start_meeting(caller))

    def test_disconnected_living_player_must_be_ready_before_voting(self):
        game, _socket = make_game(13)
        game.game_running = True
        meeting_caller = game.players[0]
        meeting_caller.ready = True
        game.start_meeting(meeting_caller)
        meeting = game.meeting
        meeting._vote_countdown = lambda: None
        disconnected = game.players[-1]
        disconnected.active = False
        for player in game.players[:-1]:
            player.ready = True

        with patch("assets.meeting.Thread", InlineThread):
            game.try_start_voting()

        self.assertEqual("waiting", meeting.stage)
        disconnected.ready = True
        with patch("assets.meeting.Thread", InlineThread):
            game.try_start_voting()
        self.assertEqual("voting", meeting.stage)

    def test_concurrent_final_ready_calls_start_one_vote_countdown(self):
        game, _socket = make_game(13)
        game.game_running = True
        game.start_meeting(game.players[0])
        meeting = game.meeting
        for player in game.players:
            player.ready = True

        countdown_started = threading.Event()
        count_lock = threading.Lock()
        countdown_count = 0

        def record_countdown():
            nonlocal countdown_count
            with count_lock:
                countdown_count += 1
            countdown_started.set()

        meeting._vote_countdown = record_countdown
        barrier = threading.Barrier(len(game.players))

        def try_start():
            barrier.wait()
            game.try_start_voting()

        threads = [threading.Thread(target=try_start) for _ in game.players]
        with patch("assets.meeting.Thread", InlineThread):
            for thread in threads:
                thread.start()
            for thread in threads:
                thread.join(timeout=2)

        self.assertTrue(countdown_started.wait(timeout=1))
        self.assertEqual(1, countdown_count)
        self.assertEqual("voting", meeting.stage)

    def test_meeting_snapshot_includes_round_identity_and_revision(self):
        game, _socket = make_game(2)
        game.game_running = True
        game.start_meeting(game.players[0])

        snapshot = json.loads(game.meeting.to_json())

        self.assertEqual(game.meeting.id, snapshot["id"])
        self.assertEqual(game.round_id, snapshot["round_id"])
        self.assertEqual(game.revision, snapshot["revision"])

    def test_room_events_add_metadata_and_preserve_legacy_payloads(self):
        game, socket = make_game()

        game.emit_to_room("object", {"value": 1})
        game.emit_to_room("number", 9)
        game.emit_to_room("array", [1, 2])
        game.emit_to_room("json_array", "[1, 2]")

        object_payload = socket.events[0][1][0]
        self.assertEqual(1, object_payload["value"])
        self.assertEqual("ROOM1", object_payload["room_code"])
        self.assertEqual(game.round_id, object_payload["round_id"])
        self.assertEqual(game.revision, object_payload["revision"])
        self.assertEqual(9, socket.events[1][1][0])
        self.assertEqual([1, 2], socket.events[2][1][0])
        self.assertEqual("[1, 2]", socket.events[3][1][0])

    def test_old_card_timer_cannot_clear_a_new_round_location(self):
        game, _socket = make_game(1)
        game.game_running = True
        player = game.players[0]
        card = Card(
            "Area Denial",
            "Block a location",
            game.card_deck,
            location="Kitchen",
            duration=1,
            countdown=True,
        )
        player.cards.append(card)
        deferred = []

        class DeferredThread:
            def __init__(self, target, args=()):
                self.target = target
                self.args = args

            def start(self):
                deferred.append(self)

        with patch("assets.card.Thread", DeferredThread):
            card.play_card(player)

        game.begin_round()
        game.denied_location = "Yard"
        deferred[0].target(*deferred[0].args)

        self.assertEqual("Yard", game.denied_location)


if __name__ == "__main__":
    unittest.main()
