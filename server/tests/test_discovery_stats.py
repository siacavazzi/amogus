import json
import tempfile
import unittest
from pathlib import Path
from types import SimpleNamespace

from server.assets.stats_tracker import StatsTracker


class DiscoveryStatsTests(unittest.TestCase):
    def test_source_counts_survive_reload_and_count_replays_once_per_round(self):
        with tempfile.TemporaryDirectory() as folder:
            path = str(Path(folder) / 'stats.json')
            tracker = StatsTracker(path)
            acquisition = {'source': 'google', 'landing_page': '/among-us-irl-task-generator'}
            tracker.record_game_created('TEST', acquisition)
            game = SimpleNamespace(players=[1, 2, 3], acquisition=acquisition)
            tracker.record_game_started(game)
            tracker.record_game_started(game)
            game._stats_start_recorded = False
            tracker.record_game_started(game)
            row = StatsTracker(path).snapshot()['acquisition'][0]
            self.assertEqual(1, row['rooms_created'])
            self.assertEqual(1, row['rooms_started'])
            self.assertEqual(2, row['rounds_started'])
            self.assertEqual('google', row['source'])

    def test_small_rounds_do_not_count_as_playable_room_starts(self):
        with tempfile.TemporaryDirectory() as folder:
            tracker = StatsTracker(str(Path(folder) / 'stats.json'))
            acquisition = {'source': 'chatgpt', 'landing_page': '/'}
            tracker.record_game_created('TEST', acquisition)
            tracker.record_game_started(SimpleNamespace(players=[1, 2], acquisition=acquisition))
            self.assertEqual(0, tracker.snapshot()['acquisition'][0]['rooms_started'])

    def test_completed_round_keeps_its_source_count_after_player_departures(self):
        with tempfile.TemporaryDirectory() as folder:
            tracker = StatsTracker(str(Path(folder) / 'stats.json'))
            game = SimpleNamespace(players=[1, 2, 3], acquisition={'source': 'google', 'landing_page': '/'})
            tracker.record_game_started(game)
            game.players = [1, 2]
            tracker.record_game_ended(game)
            tracker.record_game_ended(game)
            self.assertEqual(1, tracker.snapshot()['acquisition'][0]['rounds_completed'])

    def test_untrusted_source_fields_do_not_enter_the_report(self):
        with tempfile.TemporaryDirectory() as folder:
            tracker = StatsTracker(str(Path(folder) / 'stats.json'))
            tracker.record_game_created('TEST', {'source': ['bad'], 'landing_page': '/play?room=SECRET', 'referrer': 'private.example/user'})
            row = tracker.snapshot()['acquisition'][0]
            self.assertEqual('unknown', row['source'])
            self.assertEqual('/play', row['landing_page'])
            self.assertNotIn('SECRET', json.dumps(row))
            self.assertNotIn('private.example', json.dumps(row))

    def test_old_stats_files_keep_existing_counters(self):
        with tempfile.TemporaryDirectory() as folder:
            path = Path(folder) / 'stats.json'
            path.write_text(json.dumps({'total_games_created': 42, 'total_games_completed': 10}))
            tracker = StatsTracker(str(path))
            tracker.record_game_created('TEST')
            self.assertEqual(43, tracker.snapshot()['total_games_created'])
            self.assertEqual(10, tracker.snapshot()['total_games_completed'])
            self.assertEqual(1, len(tracker.snapshot()['acquisition']))
