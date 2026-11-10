import json
import tempfile
from pathlib import Path
from unittest.mock import patch

from server.tests.integration_helpers import SocketGameTestCase, server_app
from assets.stats_tracker import StatsTracker


class GameFeedbackTests(SocketGameTestCase):
    def setUp(self):
        super().setUp()
        self.folder = tempfile.TemporaryDirectory()
        self.addCleanup(self.folder.cleanup)
        self.path = str(Path(self.folder.name) / 'stats.json')
        self.tracker = StatsTracker(self.path)
        self.addCleanup(lambda: [handler.close() for handler in self.tracker.event_logger.handlers])
        server_app.game_manager.stats_tracker = self.tracker
        self.clients, self.room, self.ids, self.game = self.setup_started_game(3)

    def finish(self):
        self.game.end_state = 'victory'
        self.game.emit_to_room('end_game', {'result': 'victory', 'stats': self.game.stats})
        self.drain_all(self.clients)

    def submit(self, client=None, **overrides):
        payload = {'room_code': self.room, 'player_id': self.ids[0], 'round_id': self.game.round_id,
                   'rating': 'fun', 'comment': 'The tasks were fun.'}
        payload.update(overrides)
        return (client or self.clients[0]).emit('submit_feedback', payload, callback=True)

    def test_feedback_requires_an_ended_round_and_a_current_participant(self):
        self.assertFalse(self.submit()['ok'])
        self.finish()
        outsider = self.make_client()
        self.assertFalse(self.submit(outsider)['ok'])
        self.assertFalse(self.submit(round_id='old-round')['ok'])
        self.assertEqual([], self.tracker.snapshot()['game_feedback'])
        self.assertTrue(self.submit()['ok'])

    def test_feedback_persists_once_and_omits_participant_identifiers(self):
        self.finish()
        self.assertTrue(self.submit()['ok'])
        self.assertTrue(self.submit()['ok'])
        self.assertTrue(self.submit(self.clients[1], player_id=self.ids[1], rating=None, comment='More time for tasks.')['ok'])
        reloaded = StatsTracker(self.path)
        self.addCleanup(lambda: [handler.close() for handler in reloaded.event_logger.handlers])
        rows = reloaded.snapshot()['game_feedback']
        self.assertEqual(2, len(rows))
        self.assertEqual('fun', rows[0]['rating'])
        self.assertEqual('The tasks were fun.', rows[0]['comment'])
        self.assertNotIn('player_id', json.dumps(rows))
        self.assertNotIn('browser', json.dumps(rows))
        self.assertNotIn('room_code', json.dumps(rows))
        self.assertNotIn('round_id', json.dumps(rows))
        self.assertNotIn(self.ids[0], json.dumps(rows))
        self.assertNotIn('The tasks were fun.', Path(self.tracker.events_path).read_text())

    def test_feedback_validates_rating_text_and_empty_submissions(self):
        self.finish()
        for fields in [dict(rating='bad-value'), dict(rating=[]), dict(comment={}),
                       dict(comment='x' * 1001), dict(rating=None, comment='   ')]:
            with self.subTest(fields=fields):
                self.assertFalse(self.submit(**fields)['ok'])
        self.assertEqual([], self.tracker.snapshot()['game_feedback'])
        self.assertTrue(self.submit(comment='')['ok'])

    def test_feedback_remains_available_after_a_reconnect_without_duplicates(self):
        self.finish()
        self.assertTrue(self.submit()['ok'])
        self.clients[0].disconnect()
        replacement = self.make_client()
        replacement.emit('rejoin', {'player_id': self.ids[0]})
        self.assertTrue(self.submit(replacement)['ok'])
        self.assertEqual(1, len(self.tracker.snapshot()['game_feedback']))

    def test_failed_storage_does_not_claim_success_or_prevent_a_retry(self):
        self.finish()
        with patch.object(self.tracker, '_save_locked', return_value=False):
            self.assertFalse(self.submit()['ok'])
        self.assertEqual([], self.tracker.snapshot()['game_feedback'])
        self.assertTrue(self.submit()['ok'])
        self.assertEqual(1, len(self.tracker.snapshot()['game_feedback']))

    def test_admin_report_protects_feedback_and_marks_excluded_rooms(self):
        self.game.test_mode = True  # a solo test game is marked as excluded
        self.finish()
        self.assertTrue(self.submit()['ok'])
        with patch.dict('os.environ', {'ADMIN_PASSWORD': 'feedback-test-password'}):
            http = self.flask_app.test_client()
            self.assertEqual(401, http.get('/api/admin/stats').status_code)
            report = http.get('/api/admin/stats', headers={'X-Admin-Password': 'feedback-test-password'}).get_json()
        self.assertTrue(report['game_feedback'][0]['analytics_excluded'])
        self.assertEqual('The tasks were fun.', report['game_feedback'][0]['comment'])

    def test_another_round_accepts_new_feedback_and_rejects_the_previous_round(self):
        self.finish()
        previous_round = self.game.round_id
        self.assertTrue(self.submit()['ok'])
        self.clients[0].emit('reset', {'room_code': self.room, 'player_id': self.ids[0], 'force': True})
        self.drain_all(self.clients)
        self.start_game(self.clients[0], self.ids[0], self.clients)
        self.assertNotEqual(previous_round, self.game.round_id)
        self.finish()
        self.assertFalse(self.submit(round_id=previous_round)['ok'])
        self.assertTrue(self.submit(comment='Another fun round.')['ok'])
        self.assertEqual(2, len(self.tracker.snapshot()['game_feedback']))


    def reset_to_lobby(self):
        self.clients[0].emit('reset', {'room_code': self.room, 'player_id': self.ids[0], 'force': True})
        self.drain_all(self.clients)

    def events(self):
        return [json.loads(line) for line in Path(self.tracker.events_path).read_text().splitlines() if line.strip()]

    def test_a_player_still_writing_when_play_again_resets_the_room_can_send_it(self):
        self.finish()
        ended_round = self.game.round_id
        self.reset_to_lobby()
        self.assertIsNone(self.game.end_state)
        self.assertNotEqual(ended_round, self.game.round_id)
        self.assertTrue(self.submit(round_id=ended_round, comment='Typed while the others tapped Play Again.')['ok'])
        # Still one answer per player for that round, even after the reset.
        self.assertTrue(self.submit(round_id=ended_round, comment='Sent twice.')['ok'])
        rows = self.tracker.snapshot()['game_feedback']
        self.assertEqual(1, len(rows))
        self.assertEqual('victory', rows[0]['outcome'])
        self.assertTrue(rows[0]['after_reset'])
        # The lobby itself is not a round that ended.
        self.assertFalse(self.submit(round_id=self.game.round_id)['ok'])

    def test_late_feedback_closes_after_fifteen_minutes_or_once_the_next_round_ends(self):
        self.finish()
        ended_round = self.game.round_id
        self.reset_to_lobby()
        self.game.last_ended_round['reset_at'] -= server_app.FEEDBACK_AFTER_RESET_SECONDS + 1
        self.assertFalse(self.submit(round_id=ended_round)['ok'])
        self.game.last_ended_round['reset_at'] += server_app.FEEDBACK_AFTER_RESET_SECONDS + 1
        self.start_game(self.clients[0], self.ids[0], self.clients)
        self.assertTrue(self.submit(self.clients[1], player_id=self.ids[1], round_id=ended_round)['ok'])
        self.finish()
        self.assertFalse(self.submit(round_id=ended_round)['ok'])

    def test_feedback_lifecycle_is_logged_without_the_rating_or_the_text(self):
        self.assertFalse(self.submit(comment='Too early to say.')['ok'])
        self.finish()
        ended_round = self.game.round_id
        for action in ['feedback_shown', 'feedback_open', 'feedback_later', 'feedback_snoozed',
                       'feedback_abandoned', 'feedback_kept_open', 'not_an_action']:
            self.clients[1].emit('client_metric', {'kind': 'end_screen_action', 'action': action})
        self.reset_to_lobby()
        self.assertTrue(self.submit(round_id=ended_round, rating='needs_work', comment='Secret words here.')['ok'])
        events = self.events()
        rejected = [e for e in events if e['event'] == 'feedback_rejected']
        self.assertEqual(['wrong_round'], [e['reason'] for e in rejected])
        saved = [e for e in events if e['event'] == 'feedback_saved']
        self.assertEqual([True], [e['after_reset'] for e in saved])
        actions = [e['action'] for e in events if e['event'] == 'end_screen_action']
        self.assertEqual(['feedback_shown', 'feedback_open', 'feedback_later', 'feedback_snoozed',
                          'feedback_abandoned', 'feedback_kept_open'], actions)
        log = Path(self.tracker.events_path).read_text()
        for text in ['Secret words here.', 'Too early to say.', 'needs_work']:
            self.assertNotIn(text, log)
