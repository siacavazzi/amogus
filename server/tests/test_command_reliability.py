import uuid
from server.tests.integration_helpers import SocketGameTestCase


class CommandReliabilityTests(SocketGameTestCase):
    def start_round(self):
        return self.setup_started_game(13, config={'num_intruders': 4, 'starting_cards': 0, 'card_draw_probability': 0})

    def command(self, game, player):
        return {'player_id': player.player_id, 'request_id': str(uuid.uuid4()),
                'round_id': getattr(game, 'round_id', 'missing'),
                'assignment_id': player.task.get('assignment_id', 'missing')}

    def test_duplicate_completion_scores_once_and_returns_same_assignment(self):
        clients, room, ids, game = self.start_round()
        player = self.crew(game)[0]
        client = self.client_for_player(clients, ids, player)
        command = self.command(game, player)
        first = client.emit('complete_task', command, callback=True)
        second = client.emit('complete_task', command, callback=True)
        self.assertEqual(1, game.crew_score)
        self.assertTrue(first['ok'])
        self.assertEqual(first, second)
        self.assertNotEqual(command['assignment_id'], first['state']['task']['assignment_id'])

    def test_competing_requests_for_one_assignment_score_once(self):
        clients, room, ids, game = self.start_round()
        player = self.crew(game)[0]
        client = self.client_for_player(clients, ids, player)
        first = self.command(game, player)
        second = dict(first, request_id=str(uuid.uuid4()))
        self.assertTrue(client.emit('complete_task', first, callback=True)['ok'])
        self.assertFalse(client.emit('complete_task', second, callback=True)['ok'])
        self.assertEqual(1, game.crew_score)

    def test_completion_rejects_meeting_death_and_foreign_socket(self):
        clients, room, ids, game = self.start_round()
        player = self.crew(game)[0]
        client = self.client_for_player(clients, ids, player)
        command = self.command(game, player)
        foreign = next(c for c in clients if c is not client)
        self.assertFalse(foreign.emit('complete_task', command, callback=True)['ok'])
        game.start_meeting(game.players[0])
        self.assertFalse(client.emit('complete_task', command, callback=True)['ok'])
        game.meeting = None
        player.alive = False
        self.assertFalse(client.emit('complete_task', command, callback=True)['ok'])
        self.assertEqual(0, game.crew_score)

    def test_rejoin_restores_complete_lobby_and_current_minimum(self):
        clients, room, ids, game = self.setup_lobby(13)
        self.add_tasks(clients[0], room, 39)
        clients[0].emit('toggle_collaborative_mode', {'room_code': room, 'enabled': True})
        clients[0].disconnect()
        self.add_tasks(clients[1], room, 3)
        replacement = self.make_client()
        replacement.emit('rejoin', {'player_id': ids[0]})
        snapshot = self.first_event(self.drain(replacement), 'room_state')
        self.assertIsNotNone(snapshot)
        self.assertEqual(39, snapshot['collaborative_tasks']['min_tasks'])
        self.assertEqual(42, len(snapshot['collaborative_tasks']['tasks']))
        clients[-1].emit('leave_room', {'player_id': ids[-1], 'room_code': room})
        lobby = self.event_payloads(self.drain(replacement), 'lobby_state')[-1]
        self.assertEqual(36, lobby['min_tasks'])

    def test_alternate_start_cannot_bypass_task_count_or_host(self):
        clients, room, ids, game = self.setup_lobby(13, config={'num_intruders': 4})
        self.add_tasks(clients[0], room, 1)
        clients[0].emit('finalize_collaborative_tasks', {'room_code': room, 'player_id': ids[0]})
        self.assertFalse(game.game_running)
        self.add_tasks(clients[0], room, 38)
        clients[1].emit('finalize_collaborative_tasks', {'room_code': room, 'player_id': ids[1]})
        self.assertFalse(game.game_running)

    def test_stale_round_or_meeting_commands_cannot_change_current_state(self):
        clients, room, ids, game = self.start_round()
        player = self.crew(game)[0]
        client = self.client_for_player(clients, ids, player)
        old = self.command(game, player)
        game.begin_round()
        self.assertFalse(client.emit('complete_task', old, callback=True)['ok'])
        game.start_meeting(game.players[0])
        result = client.emit('ready', {'player_id': player.player_id, 'round_id': game.round_id,
                                       'meeting_id': 'old-meeting'}, callback=True)
        self.assertFalse(result['ok'])
        self.assertFalse(player.ready)

    def test_missing_command_identity_is_rejected(self):
        clients, room, ids, game = self.start_round()
        player = self.crew(game)[0]
        client = self.client_for_player(clients, ids, player)
        self.assertFalse(client.raw_emit('complete_task', {'player_id': player.player_id}, callback=True)['ok'])
        self.assertEqual(0, game.crew_score)

    def test_completion_rejects_emp_meltdown_game_over_and_intruder(self):
        clients, room, ids, game = self.start_round()
        player = self.crew(game)[0]
        client = self.client_for_player(clients, ids, player)
        command = self.command(game, player)
        game.active_hack = 10
        self.assertFalse(client.emit('complete_task', command, callback=True)['ok'])
        game.active_hack = 0
        from types import SimpleNamespace
        game.active_meltdown = SimpleNamespace(time_left=10, codes_needed=1, codes_entered=0)
        self.assertFalse(client.emit('complete_task', command, callback=True)['ok'])
        game.active_meltdown = None
        game.end_state = 'victory'
        self.assertFalse(client.emit('complete_task', command, callback=True)['ok'])
        game.end_state = None
        intruder = self.intruders(game)[0]
        self.assertFalse(self.client_for_player(clients, ids, intruder).emit(
            'complete_task', dict(command, player_id=intruder.player_id), callback=True)['ok'])
        self.assertEqual(0, game.crew_score)

    def test_replaced_socket_cannot_complete_or_ready_for_player(self):
        clients, room, ids, game = self.start_round()
        player = self.crew(game)[0]
        obsolete = self.client_for_player(clients, ids, player)
        command = self.command(game, player)
        current = self.make_client()
        current.emit('rejoin', {'player_id': player.player_id})
        self.assertFalse(obsolete.emit('complete_task', command, callback=True)['ok'])
        self.assertTrue(current.emit('complete_task', command, callback=True)['ok'])
        game.start_meeting(game.players[0])
        self.assertFalse(obsolete.emit('ready', {'player_id': player.player_id}, callback=True)['ok'])
        self.assertFalse(player.ready)

    def test_shared_start_rules_reject_one_location_and_invalid_roles(self):
        for event in ('start_game', 'finalize_collaborative_tasks'):
            clients, room, ids, game = self.setup_lobby(3, config={'num_intruders': 1, 'locations': ['Kitchen']})
            self.add_tasks(clients[0], room, 10)
            clients[0].emit(event, {'room_code': room, 'player_id': ids[0]})
            self.assertFalse(game.game_running)
            clients[0].emit('update_game_config', {'room_code': room, 'config': {'locations': ['Kitchen', 'Yard'], 'num_intruders': 2}})
            clients[0].emit(event, {'room_code': room, 'player_id': ids[0]})
            self.assertFalse(game.game_running)

    def test_cached_success_does_not_change_after_later_completion(self):
        clients, room, ids, game = self.start_round()
        player = self.crew(game)[0]
        client = self.client_for_player(clients, ids, player)
        command = self.command(game, player)
        first = client.emit('complete_task', command, callback=True)
        client.emit('complete_task', self.command(game, player), callback=True)
        duplicate = client.emit('complete_task', command, callback=True)
        self.assertEqual(first, duplicate)
        self.assertEqual(1, duplicate['state']['stats']['tasks_completed'])
        self.assertEqual(2, game.crew_score)

    def test_completion_snapshot_preserves_names_after_intruder_reveal(self):
        clients, room, ids, game = self.start_round()
        player = self.crew(game)[0]
        game.taskGoal = 1
        result = self.client_for_player(clients, ids, player).emit(
            'complete_task', self.command(game, player), callback=True)
        self.assertEqual({p.username for p in self.intruders(game)},
                         set(result['state']['intruders_revealed']['intruder_names']))

    def test_room_snapshot_restores_card_details_and_vote_counts(self):
        clients, room, ids, game = self.start_round()
        intruder = self.intruders(game)[0]
        card = self.inject_card(game, intruder, 'Area Denial', location='Kitchen', duration=30)
        game.card_deck.active_cards.append(card)
        game.start_meeting(game.players[0])
        game.meeting.stage = 'voting'
        game.meeting.register_vote(game.getPlayerById(ids[0]), game.getPlayerById(ids[1]))
        game.meeting.register_vote(game.getPlayerById(ids[2]), veto=True)
        response = clients[0].emit('get_room_state', {'room_code': room, 'player_id': ids[0]}, callback=True)
        self.assertEqual('Area Denial', response['state']['active_cards'][0]['action'])
        self.assertEqual(1, response['state']['votes'][ids[1]])
        self.assertEqual(1, response['state']['veto_votes'])

    def test_dead_intruder_cannot_play_a_delayed_emp_card(self):
        clients, room, ids, game = self.start_round()
        player = self.intruders(game)[0]
        card = self.inject_card(game, player, 'EMP', duration=10)
        player.alive = False
        self.client_for_player(clients, ids, player).emit(
            'play_card', {'player_id': player.player_id, 'card_id': card.id})
        self.assertEqual(0, game.active_hack)
        self.assertIn(card, player.cards)

    def test_death_report_from_an_old_meeting_does_not_kill_current_player(self):
        clients, room, ids, game = self.start_round()
        player = self.crew(game)[0]
        game.start_meeting(game.players[0])
        self.client_for_player(clients, ids, player).emit('player_dead', {
            'player_id': player.player_id, 'round_id': game.round_id, 'meeting_id': 'earlier-meeting',
        })
        self.assertTrue(player.alive)

    def test_remove_by_identity_does_not_remove_next_task_after_duplicate(self):
        clients, room, ids, game = self.setup_lobby(3)
        self.add_tasks(clients[0], room, 3)
        task = game.collaborative_tasks[0]
        command = {'room_code': room, 'task_id': task['task_id'], 'task_index': 0}
        clients[0].emit('remove_collaborative_task', command)
        clients[0].emit('remove_collaborative_task', command)
        self.assertEqual(2, len(game.collaborative_tasks))

    def test_ready_outside_meeting_does_not_carry_into_next_meeting(self):
        clients, room, ids, game = self.start_round()
        for client, pid in zip(clients, ids):
            client.emit('ready', {'player_id': pid})
        clients[0].emit('meeting', {'player_id': ids[0], 'round_id': getattr(game, 'round_id', 'missing')})
        clients[0].emit('ready', {'player_id': ids[0], 'round_id': getattr(game, 'round_id', 'missing'),
                                   'meeting_id': getattr(game.meeting, 'id', 'missing')})
        self.assertEqual('waiting', game.meeting.stage)
