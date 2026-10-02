from unittest.mock import patch

from server.tests.integration_helpers import SocketGameTestCase, server_app


class WeekendReadinessTests(SocketGameTestCase):
    def start_round(self):
        return self.setup_started_game(5, config={
            'starting_cards': 0, 'card_draw_probability': 0,
        })

    def test_large_lobby_reuses_valid_avatars_after_unique_pool_is_empty(self):
        clients, room, ids, game = self.setup_lobby(25)
        pictures = [player.pic for player in game.players]
        self.assertEqual(25, len(pictures))
        self.assertEqual(17, len(set(pictures[:17])))
        self.assertTrue(all(0 <= picture <= 16 for picture in pictures))

    def test_lobby_departure_returns_an_unused_avatar_to_the_pool(self):
        clients, room, ids, game = self.setup_lobby(17)
        picture = game.getPlayerById(ids[-1]).pic
        clients[-1].emit('leave_room', {'player_id': ids[-1], 'room_code': room})
        self.assertEqual([picture], game.backgrounds)
        newcomer = self.make_client()
        pid = self.join_player(newcomer, room, 'New player')
        self.assertEqual(picture, game.getPlayerById(pid).pic)

    def test_departure_does_not_release_an_avatar_that_another_player_uses(self):
        clients, room, ids, game = self.setup_lobby(18)
        player = game.players[-1]
        self.assertTrue(any(other.pic == player.pic for other in game.players[:-1]))
        clients[-1].emit('leave_room', {'player_id': player.player_id, 'room_code': room})
        self.assertEqual([], game.backgrounds)

    def test_reactor_reconnect_restores_round_state_and_effects(self):
        clients, room, ids, game = self.start_round()
        reactor = self.make_client()
        reactor.emit('register_reactor', {'room_code': room})
        intruder = self.intruders(game)[0]
        card = self.inject_card(game, intruder, 'Area Denial', duration=30, location='Kitchen')
        game.card_deck.active_cards.append(card)
        game.denied_location = 'Kitchen'
        game.active_hack = 12
        with patch('assets.meltdown.eventlet.spawn'):
            clients[0].emit('meltdown', {'player_id': ids[0]})
        game.active_meltdown.codes_entered = 1
        reactor.disconnect()
        self.assertTrue(game.has_reactor)
        replacement = self.make_client()
        replacement.emit('register_reactor', {'room_code': room})
        events = self.drain(replacement)
        self.assertFalse(self.has_event(events, 'error'))
        self.assertTrue(self.has_event(events, 'game_start'))
        roster = self.first_event(events, 'game_data')
        self.assertEqual(len(game.players), len(roster['list']))
        self.assertEqual(game.locations, self.first_event(events, 'task_locations'))
        self.assertEqual(game.crew_score, self.first_event(events, 'crew_score')['score'])
        self.assertEqual(game.taskGoal, self.first_event(events, 'task_goal'))
        self.assertEqual(12, self.first_event(events, 'hack'))
        self.assertEqual('Kitchen', self.first_event(events, 'active_denial'))
        self.assertEqual(card.id, self.parse_json_payload(self.first_event(events, 'active_cards')[0])['id'])
        self.assertEqual(game.active_meltdown.time_left, self.first_event(events, 'meltdown_update'))
        self.assertEqual(game.active_meltdown.codes_needed - 1, self.first_event(events, 'codes_needed'))

    def test_reactor_reconnect_restores_meeting_and_round_result(self):
        clients, room, ids, game = self.start_round()
        reactor = self.make_client()
        reactor.emit('register_reactor', {'room_code': room})
        with patch('assets.meeting.Thread'):
            self.start_meeting_and_ready_living_players(clients, ids, game, game.players[0])
        reactor.disconnect()
        replacement = self.make_client()
        replacement.emit('register_reactor', {'room_code': room})
        events = self.drain(replacement)
        self.assertEqual('voting', self.parse_json_payload(self.first_event(events, 'meeting'))['stage'])
        self.assertTrue(self.has_event(events, 'vote_update'))
        game.kill_player(self.intruders(game)[0].player_id)
        replacement.disconnect()
        final_reactor = self.make_client()
        final_reactor.emit('register_reactor', {'room_code': room})
        result = self.first_event(self.drain(final_reactor), 'end_game')
        self.assertEqual('victory', result['result'])
        self.assertEqual(game.stats, result['stats'])

    def test_connected_reactor_cannot_be_replaced_during_a_round(self):
        clients, room, ids, game = self.start_round()
        reactor = self.make_client()
        reactor.emit('register_reactor', {'room_code': room})
        original_sid = game.reactor_sid
        other = self.make_client()
        other.emit('register_reactor', {'room_code': room})
        self.assertTrue(self.has_event(self.drain(other), 'error'))
        self.assertEqual(original_sid, game.reactor_sid)

    def test_desktop_creator_reconnect_restores_open_room_and_host_controls(self):
        reactor = self.make_client()
        room = self.create_open_room(reactor)
        reactor.emit('register_reactor', {'room_code': room})
        reactor.disconnect()
        replacement = self.make_client()
        replacement.emit('register_reactor', {'room_code': room})
        registration = self.first_event(self.drain(replacement), 'reactor_registered')
        self.assertTrue(registration['is_creator'])
        self.assertTrue(registration['is_open'])
        replacement.emit('update_game_config', {'room_code': room, 'config': {'num_intruders': 2}})
        self.assertEqual(2, server_app.game_manager.get_game(room).numIntruders)

    def test_fake_task_and_taunt_work_after_play_again(self):
        clients, room, ids, game = self.start_round()
        game.task_list_applied = True
        game.kill_player(self.intruders(game)[0].player_id)
        for client, pid in zip(clients, ids):
            client.emit('reset', {'player_id': pid, 'room_code': room})
        self.start_game(clients[0], ids[0], clients)
        self.assertTrue(game.game_running)
        intruder = self.intruders(game)[0]
        crew = self.crew(game)[0]
        actor = self.client_for_player(clients, ids, intruder)
        for action, extra, stat in (
            ('Fake Task', {'task_text': 'Dance', 'task_location': 'Kitchen'}, 'fake_tasks_sent'),
            ('Taunt Message', {'message': 'Found you'}, 'taunts_sent'),
        ):
            with self.subTest(action=action):
                card = self.inject_card(game, intruder, action, requires_input=True)
                actor.emit('play_card', {'player_id': intruder.player_id, 'card_id': card.id,
                                        'extra_data': {'target_player_id': crew.player_id, **extra}})
                self.assertNotIn(card, intruder.cards)
                self.assertEqual(1, len(game.stats[stat]))
        self.assertEqual('Dance', crew.fake_task['task'])
        events = self.drain(self.client_for_player(clients, ids, crew))
        self.assertEqual({'message': 'Found you'}, self.first_event(events, 'taunt_received'))

    def test_old_meeting_timer_cannot_end_a_meeting_in_the_next_round(self):
        for force in (False, True):
            with self.subTest(force=force), patch('assets.meeting.Thread'):
                clients, room, ids, game = self.start_round()
                game.task_list_applied = True
                self.start_meeting_and_ready_living_players(clients, ids, game, game.players[0])
                old_meeting = game.meeting
                old_meeting.time_left = 1

                def reset_and_start_new_meeting(_):
                    if force:
                        clients[0].emit('reset', {'player_id': ids[0], 'force': True})
                    else:
                        game.kill_player(self.intruders(game)[0].player_id)
                        for client, pid in zip(clients, ids):
                            client.emit('reset', {'player_id': pid, 'room_code': room})
                    self.start_game(clients[0], ids[0], clients)
                    self.start_meeting_and_ready_living_players(clients, ids, game, game.players[0])
                    self.drain_all(clients)

                with patch('assets.meeting.time.sleep', side_effect=reset_and_start_new_meeting):
                    old_meeting._vote_countdown()
                self.assertIsNotNone(game.meeting)
                self.assertIsNot(game.meeting, old_meeting)
                self.assertEqual('voting', game.meeting.stage)
                self.assertFalse(self.has_event(self.drain(clients[0]), 'meeting'))

    def test_meeting_deadline_still_ends_the_current_meeting_once(self):
        clients, room, ids, game = self.start_round()
        with patch('assets.meeting.Thread'):
            self.start_meeting_and_ready_living_players(clients, ids, game, game.players[0])
        meeting = game.meeting
        meeting.time_left = 1
        self.drain_all(clients)
        with patch('assets.meeting.time.sleep'), patch.object(game, 'drawCards') as draw:
            meeting._vote_countdown()
            meeting.end_meeting()
        self.assertIsNone(game.meeting)
        self.assertEqual(1, draw.call_count)
        self.assertEqual(1, len(self.event_payloads(self.drain(clients[0]), 'meeting')))

    def test_meeting_timer_stops_when_the_round_ends_during_a_vote(self):
        clients, room, ids, game = self.start_round()
        with patch('assets.meeting.Thread'):
            self.start_meeting_and_ready_living_players(clients, ids, game, game.players[0])
        meeting = game.meeting
        meeting.time_left = 1

        def end_round(_):
            game.kill_player(self.intruders(game)[0].player_id)
            self.drain_all(clients)

        with patch('assets.meeting.time.sleep', side_effect=end_round), patch.object(game, 'drawCards') as draw:
            meeting._vote_countdown()
        self.assertEqual('victory', game.end_state)
        draw.assert_not_called()
        self.assertFalse(self.has_event(self.drain(clients[0]), 'meeting'))

    def test_both_game_start_paths_emit_one_theme_to_the_room(self):
        for collaborative in (False, True):
            with self.subTest(collaborative=collaborative):
                clients, room, ids, game = self.setup_lobby(5)
                self.add_tasks(clients[0], room, 15)
                self.drain_all(clients)
                if collaborative:
                    clients[0].emit('finalize_collaborative_tasks', {'room_code': room, 'player_id': ids[0]})
                else:
                    self.start_game(clients[0], ids[0], clients, drain=False)
                for events in self.drain_all(clients).values():
                    themes = [sound for sound in self.event_payloads(events, 'play_sound')
                              if sound['sound'] == 'theme']
                    self.assertEqual([{'sound': 'theme'}], themes)
