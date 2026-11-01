"""Phones that arrive mid-round go on a waiting list and play from the next round."""
from server.tests.integration_helpers import SocketGameTestCase, server_app


class WaitingListTests(SocketGameTestCase):
    def start_round(self, players=5):
        return self.setup_started_game(players, config={'starting_cards': 0, 'card_draw_probability': 0})

    def join_late(self, room, name='Late'):
        late = self.make_client()
        late.emit('join_game', {'room_code': room})
        entered = self.drain(late)
        self.assertIsNone(self.first_event(entered, 'error'), 'a running round must not turn phones away')
        joined = self.first_event(entered, 'game_joined')
        self.assertTrue(joined['round_running'])
        late.emit('join', {'room_code': room, 'username': name})
        events = self.drain(late)
        player_event = self.first_event(events, 'player_id')
        self.assertTrue(player_event['waiting'])
        return late, player_event['player_id'], events

    def test_late_phone_waits_and_is_not_counted_by_the_round(self):
        clients, room, ids, game = self.start_round()
        intruders, crew, goal = game.numIntruders, game.numCrew, game.taskGoal
        late, late_id, events = self.join_late(room)

        self.assertEqual(5, len(game.players))
        self.assertEqual([late_id], [p.player_id for p in game.waiting_players])
        self.assertIsNone(game.getPlayerById(late_id))
        self.assertEqual((intruders, crew, goal), (game.numIntruders, game.numCrew, game.taskGoal))
        state = self.first_event(events, 'room_state')
        self.assertTrue(state['waiting'])
        self.assertTrue(state['running'])
        self.assertIsNone(state['task'])
        self.assertEqual(['Late'], [p['username'] for p in state['waiting_players']])
        # Nobody's role reaches the waiting phone.
        self.assertFalse(any(p['sus'] for p in state['players']))

        for client in clients:
            listed = self.first_event(self.drain(client), 'waiting_players')
            self.assertEqual(['Late'], [p['username'] for p in listed['players']])

    def test_waiting_phone_cannot_play_the_round(self):
        clients, room, ids, game = self.start_round()
        late, late_id, _ = self.join_late(room)
        for event, extra in (('meeting', {}), ('complete_task', {}), ('vote', {'voted_for': ids[0]}),
                             ('player_dead', {}), ('meltdown', {})):
            result = late.raw_emit(event, {'player_id': late_id, 'round_id': game.round_id, **extra}, callback=True)
            self.assertEqual({'ok': False, 'error': 'You join at the start of the next round.', 'waiting': True},
                             result, event)
        self.assertFalse(game.meeting)
        self.assertIsNone(game.active_meltdown)
        self.assertEqual(0, game.crew_score)
        self.assertIsNone(self.first_event(self.drain(late), 'error'))

    def test_meeting_and_votes_ignore_the_waiting_phone(self):
        clients, room, ids, game = self.start_round()
        late, late_id, _ = self.join_late(room)
        caller = next(i for i, pid in enumerate(ids) if not game.getPlayerById(pid).sus)
        clients[caller].emit('meeting', {'player_id': ids[caller]})
        for client, pid in zip(clients, ids):
            client.emit('ready', {'player_id': pid})
        # Five ready out of five: the waiting phone is not waited for.
        self.assertEqual('voting', game.meeting.stage)

    def test_play_again_does_not_wait_for_the_waiting_phone_and_deals_them_in(self):
        clients, room, ids, game = self.start_round()
        late, late_id, _ = self.join_late(room)
        for player in game.players:
            if player.sus:
                game.kill_player(player.player_id, death_cause='voted_out_intruder')
        self.assertEqual('victory', game.end_state)
        self.drain_all(clients + [late])

        for client, pid in zip(clients, ids):
            client.emit('reset', {'player_id': pid})
        self.assertFalse(game.game_running, 'Play Again from the five players returns the room to the lobby')
        self.assertEqual([], game.waiting_players)
        admitted = game.getPlayerById(late_id)
        self.assertIsNotNone(admitted)
        self.assertFalse(admitted.waiting)
        self.assertEqual(6, len(game.players))
        events = self.drain(late)
        self.assertTrue(self.has_event(events, 'game_reset'))
        listed = [self.parse_json_payload(p) for p in self.event_payloads(events, 'game_data')[-1]['list']]
        self.assertIn(late_id, [p['player_id'] for p in listed])

        # The next Start deals the latecomer in like anyone else.
        game.auto_intruders = True
        self.add_tasks(clients[0], room, 5)
        self.start_game(clients[0], ids[0], clients + [late])
        self.assertTrue(game.game_running)
        self.assertIn(late_id, [p.player_id for p in game.players])
        self.assertEqual(1, game.numIntruders)  # Auto: 6 players -> 1 intruder

    def test_host_reset_mid_round_also_admits_the_waiting_list(self):
        clients, room, ids, game = self.start_round()
        late, late_id, _ = self.join_late(room)
        clients[0].emit('reset', {'player_id': ids[0], 'force': True})
        self.assertIsNotNone(game.getPlayerById(late_id))

    def test_waiting_phone_survives_reload(self):
        clients, room, ids, game = self.start_round()
        late, late_id, _ = self.join_late(room)
        late.disconnect()
        waiting = game.get_waiting_player(late_id)
        self.assertFalse(waiting.active)

        back = self.make_client()
        result = back.emit('rejoin', {'player_id': late_id}, callback=True)
        self.assertTrue(result['ok'])
        self.assertTrue(result['state']['waiting'])
        events = self.drain(back)
        self.assertFalse(self.has_event(events, 'rejoin_failed'))
        self.assertFalse(self.has_event(events, 'game_start'))
        self.assertTrue(self.first_event(events, 'player_id')['waiting'])
        self.assertTrue(waiting.active)
        state = back.emit('get_room_state', {'player_id': late_id, 'room_code': room}, callback=True)
        self.assertTrue(state['ok'])
        self.assertTrue(state['state']['waiting'])

    def test_waiting_phone_gone_for_good_is_dropped_at_start(self):
        clients, room, ids, game = self.start_round()
        late, late_id, _ = self.join_late(room)
        late.disconnect()
        waiting = game.get_waiting_player(late_id)
        self.assertTrue(server_app.mark_absent_if_still_gone(room, late_id, waiting.disconnected_at))
        clients[0].emit('reset', {'player_id': ids[0], 'force': True})
        self.assertIsNotNone(game.getPlayerById(late_id))
        self.add_tasks(clients[0], room, 5)
        self.start_game(clients[0], ids[0], clients)
        self.assertTrue(game.game_running)
        self.assertIsNone(game.getPlayerById(late_id))

    def test_leaving_the_waiting_list(self):
        clients, room, ids, game = self.start_round()
        late, late_id, _ = self.join_late(room)
        late.emit('leave_room', {'player_id': late_id})
        self.assertTrue(self.has_event(self.drain(late), 'left_room'))
        self.assertEqual([], game.waiting_players)
        self.assertEqual(5, len(game.players))
        clients[0].emit('reset', {'player_id': ids[0], 'force': True})
        self.assertEqual(5, len(game.players))

    def test_late_names_do_not_clash(self):
        clients, room, ids, game = self.start_round()
        _, first_id, _ = self.join_late(room, name='P1')
        _, second_id, _ = self.join_late(room, name='P1')
        names = [p.username for p in game.waiting_players]
        self.assertEqual(['P1 2', 'P1 3'], names)

    def test_late_phone_never_becomes_host_mid_round(self):
        clients, room, ids, game = self.start_round()
        host_sid = game.creator_sid
        late, late_id, events = self.join_late(room)
        self.assertFalse(self.first_event(events, 'player_id')['is_creator'])
        self.assertEqual(host_sid, game.creator_sid)
