from server.tests.integration_helpers import SocketGameTestCase


class GameIntegrationTests(SocketGameTestCase):
    def test_start_game_assigns_roles_tasks_and_broadcasts_goal(self):
        clients, room_code, player_ids, game = self.setup_lobby(
            4,
            config={
                "num_intruders": 1,
                "starting_cards": 0,
                "task_ratio": 2,
            },
        )
        self.add_tasks(clients[0], room_code, 12)
        self.drain_all(clients)

        start_events = self.start_game(clients[0], player_ids[0], clients)

        self.assertTrue(game.game_running)
        self.assertEqual(1, len(self.intruders(game)))
        self.assertEqual(3, len(self.crew(game)))
        self.assertEqual(6, game.taskGoal)
        for events in start_events.values():
            self.assertTrue(self.has_event(events, "game_start"))
            self.assertEqual(6, self.first_event(events, "task_goal"))

        for player in self.crew(game):
            events = start_events[self.client_for_player(clients, player_ids, player)]
            self.assertIsNotNone(self.first_event(events, "task"))

        intruder = self.intruders(game)[0]
        intruder_events = start_events[self.client_for_player(clients, player_ids, intruder)]
        self.assertIsNone(self.first_event(intruder_events, "task"))

    def test_start_game_with_too_few_tasks_enters_task_creation_for_everyone(self):
        clients, room_code, player_ids, game = self.setup_lobby(
            4,
            config={"num_intruders": 1, "starting_cards": 0},
        )
        self.add_tasks(clients[0], room_code, 10)
        self.drain_all(clients)

        start_events = self.start_game(clients[0], player_ids[0], clients)

        self.assertFalse(game.game_running)
        for events in start_events.values():
            self.assertIsNone(self.first_event(events, "game_start"))
            task_creation = self.first_event(events, "enter_task_creation")
            self.assertEqual(12, task_creation["min_tasks"])
            self.assertEqual(10, task_creation["current_tasks"])

    def test_collaborative_task_permissions_follow_host_toggle(self):
        clients, room_code, player_ids, game = self.setup_lobby(
            3,
            config={"num_intruders": 1},
        )
        guest = clients[1]

        guest.emit(
            "add_collaborative_task",
            {
                "room_code": room_code,
                "task": {"task": "Guest task blocked", "location": "Kitchen"},
            },
        )
        blocked_events = self.drain(guest)
        self.assertEqual(
            "Only the host can add tasks. Ask them to enable collaborative mode.",
            self.first_event(blocked_events, "error")["message"],
        )
        self.assertEqual([], game.collaborative_tasks)

        clients[0].emit("toggle_collaborative_mode", {"room_code": room_code, "enabled": True})
        self.drain_all(clients)
        guest.emit(
            "add_collaborative_task",
            {
                "room_code": room_code,
                "task": {"task": "Guest task accepted", "location": "Kitchen"},
            },
        )
        accepted_events = self.drain_all(clients)

        self.assertEqual(1, len(game.collaborative_tasks))
        for events in accepted_events.values():
            task_added = self.first_event(events, "collaborative_task_added")
            self.assertEqual("Guest task accepted", task_added["task"]["task"])

    def test_rejoin_running_game_restores_room_state_and_current_task(self):
        clients, room_code, player_ids, game = self.setup_started_game(
            3,
            config={
                "num_intruders": 1,
                "starting_cards": 0,
                "task_ratio": 5,
            },
        )
        crew_player = self.crew(game)[0]
        crew_client = self.client_for_player(clients, player_ids, crew_player)
        crew_client.emit("complete_task", {"player_id": crew_player.player_id})
        self.drain_all(clients)
        crew_client.disconnect()

        rejoin_client = self.make_client()
        rejoin_client.emit("rejoin", {"player_id": crew_player.player_id})
        rejoin_events = self.drain(rejoin_client)

        self.assertEqual({"room_code": room_code, "is_creator": crew_player.player_id == game.creator_player_id}, self.first_event(rejoin_events, "game_joined"))
        self.assertTrue(self.has_event(rejoin_events, "game_start"))
        self.assertEqual({"score": 1}, self.first_event(rejoin_events, "crew_score"))
        self.assertEqual(game.taskGoal, self.first_event(rejoin_events, "task_goal"))
        self.assertEqual({"task": crew_player.task}, self.first_event(rejoin_events, "task"))

    def test_task_completion_reveals_intruders_at_goal_without_ending_game(self):
        clients, room_code, player_ids, game = self.setup_started_game(
            3,
            config={
                "num_intruders": 1,
                "starting_cards": 0,
                "task_ratio": 1,
            },
        )
        self.assertEqual(2, game.taskGoal)

        for player in self.crew(game):
            self.client_for_player(clients, player_ids, player).emit(
                "complete_task",
                {"player_id": player.player_id},
            )
        completion_events = self.drain_all(clients)

        self.assertEqual(2, game.crew_score)
        self.assertTrue(game.intruders_revealed)
        self.assertIsNone(game.end_state)
        for events in completion_events.values():
            reveal = self.first_event(events, "intruders_revealed")
            self.assertIsNotNone(reveal)
            self.assertEqual([self.intruders(game)[0].player_id], reveal["intruder_ids"])

    def test_dead_players_do_not_block_meeting_from_reaching_voting(self):
        clients, room_code, player_ids, game = self.setup_started_game(
            4,
            config={"num_intruders": 1, "starting_cards": 0, "vote_time": 1},
        )
        dead_crew = self.crew(game)[0]
        self.client_for_player(clients, player_ids, dead_crew).emit(
            "player_dead",
            {"player_id": dead_crew.player_id},
        )
        self.drain_all(clients)
        caller = next(player for player in self.living(game) if player.player_id != dead_crew.player_id)

        meeting_events = self.start_meeting_and_ready_living_players(clients, player_ids, game, caller)

        self.assertEqual("voting", game.meeting.stage)
        for events in meeting_events.values():
            meeting_payloads = [self.parse_json_payload(payload) for payload in self.event_payloads(events, "meeting")]
            self.assertIn("voting", [payload["stage"] for payload in meeting_payloads])

    def test_vote_threshold_prevents_low_support_ejection(self):
        clients, room_code, player_ids, game = self.setup_started_game(
            5,
            config={
                "num_intruders": 1,
                "starting_cards": 0,
                "card_draw_probability": 0,
                "vote_threshold": 0.8,
                "vote_time": 1,
            },
        )
        caller = self.living(game)[0]
        self.start_meeting_and_ready_living_players(clients, player_ids, game, caller)
        target = self.crew(game)[0]
        voters_for_target = [player for player in self.living(game) if player.player_id != target.player_id][:3]
        veto_voters = [
            player
            for player in self.living(game)
            if player.player_id not in {target.player_id, *(voter.player_id for voter in voters_for_target)}
        ]

        for player in voters_for_target:
            self.client_for_player(clients, player_ids, player).emit(
                "vote",
                {"player_id": player.player_id, "votedFor": target.player_id},
            )
        for player in veto_voters:
            self.client_for_player(clients, player_ids, player).emit("veto", {"player_id": player.player_id})
        self.client_for_player(clients, player_ids, target).emit("veto", {"player_id": target.player_id})
        vote_events = self.drain_all(clients)

        self.assertTrue(target.alive)
        self.assertEqual(0, game.stats["players_voted_out"])
        self.assertIsNone(game.meeting)
        meeting_payloads = [
            self.parse_json_payload(payload)
            for events in vote_events.values()
            for payload in self.event_payloads(events, "meeting")
        ]
        self.assertIn("votes", [payload["reason"] for payload in meeting_payloads])

    def test_vote_threshold_ejects_target_and_draws_intruder_card_once(self):
        clients, room_code, player_ids, game = self.setup_started_game(
            4,
            config={
                "num_intruders": 1,
                "starting_cards": 0,
                "card_draw_probability": 1,
                "vote_threshold": 0.66,
                "vote_time": 1,
            },
        )
        intruder = self.intruders(game)[0]
        target = self.crew(game)[0]
        self.start_meeting_and_ready_living_players(clients, player_ids, game, self.living(game)[0])

        voters_for_target = [
            player for player in self.living(game) if player.player_id != target.player_id
        ][:3]
        for player in voters_for_target:
            self.client_for_player(clients, player_ids, player).emit(
                "vote",
                {"player_id": player.player_id, "votedFor": target.player_id},
            )
        self.client_for_player(clients, player_ids, target).emit("veto", {"player_id": target.player_id})
        vote_events = self.drain_all(clients)

        self.assertFalse(target.alive)
        self.assertEqual("voted_out_innocent", target.death_cause)
        self.assertEqual(1, game.stats["players_voted_out"])
        self.assertEqual(1, len(intruder.cards))
        self.assertIsNone(game.meeting)
        self.assertIsNone(game.end_state)
        self.assertTrue(
            any(
                self.parse_json_payload(payload)["voted_out"] == target.player_id
                for events in vote_events.values()
                for payload in self.event_payloads(events, "meeting")
            )
        )

    def test_veto_majority_ends_meeting_without_killing_player(self):
        clients, room_code, player_ids, game = self.setup_started_game(
            5,
            config={
                "num_intruders": 1,
                "starting_cards": 0,
                "card_draw_probability": 0,
                "vote_time": 1,
            },
        )
        self.start_meeting_and_ready_living_players(clients, player_ids, game, self.living(game)[0])
        living_before = {player.player_id for player in self.living(game)}

        for player in self.living(game)[:3]:
            self.client_for_player(clients, player_ids, player).emit("veto", {"player_id": player.player_id})
        veto_events = self.drain_all(clients)

        self.assertEqual(living_before, {player.player_id for player in self.living(game)})
        self.assertEqual(0, game.stats["players_voted_out"])
        self.assertIsNone(game.meeting)
        meeting_payloads = [
            self.parse_json_payload(payload)
            for events in veto_events.values()
            for payload in self.event_payloads(events, "meeting")
        ]
        self.assertIn("veto", [payload["reason"] for payload in meeting_payloads])

    def test_veto_requires_strict_majority_before_ending_meeting(self):
        clients, room_code, player_ids, game = self.setup_started_game(
            4,
            config={
                "num_intruders": 1,
                "starting_cards": 0,
                "card_draw_probability": 0,
                "vote_time": 1,
            },
        )
        self.start_meeting_and_ready_living_players(clients, player_ids, game, self.living(game)[0])
        living_players = self.living(game)

        for player in living_players[:2]:
            self.client_for_player(clients, player_ids, player).emit("veto", {"player_id": player.player_id})
        self.drain_all(clients)
        self.assertEqual("voting", game.meeting.stage)

        self.client_for_player(clients, player_ids, living_players[2]).emit(
            "veto",
            {"player_id": living_players[2].player_id},
        )
        veto_events = self.drain_all(clients)

        self.assertIsNone(game.meeting)
        self.assertEqual(0, game.stats["players_voted_out"])
        meeting_payloads = [
            self.parse_json_payload(payload)
            for events in veto_events.values()
            for payload in self.event_payloads(events, "meeting")
        ]
        self.assertIn("veto", [payload["reason"] for payload in meeting_payloads])

    def test_rejoin_during_voting_replays_meeting_snapshot_and_vote_counts(self):
        clients, room_code, player_ids, game = self.setup_started_game(
            4,
            config={
                "num_intruders": 1,
                "starting_cards": 0,
                "card_draw_probability": 0,
                "vote_time": 1,
            },
        )
        rejoining_player = self.crew(game)[0]
        target = self.crew(game)[1]
        self.start_meeting_and_ready_living_players(clients, player_ids, game, self.living(game)[0])
        voter = next(player for player in self.living(game) if player.player_id != target.player_id)
        self.client_for_player(clients, player_ids, voter).emit(
            "vote",
            {"player_id": voter.player_id, "votedFor": target.player_id},
        )
        self.drain_all(clients)
        self.client_for_player(clients, player_ids, rejoining_player).disconnect()

        rejoin_client = self.make_client()
        rejoin_client.emit("rejoin", {"player_id": rejoining_player.player_id})
        rejoin_events = self.drain(rejoin_client)

        meeting = self.parse_json_payload(self.first_event(rejoin_events, "meeting"))
        vote_update = self.first_event(rejoin_events, "vote_update")
        self.assertEqual("voting", meeting["stage"])
        self.assertEqual(1, sum(vote_update["votes"].values()))
        self.assertTrue(self.has_event(rejoin_events, "game_start"))
        self.assertEqual({"score": 0}, self.first_event(rejoin_events, "crew_score"))
        self.assertEqual(game.taskGoal, self.first_event(rejoin_events, "task_goal"))
        self.assertEqual({"task": rejoining_player.task}, self.first_event(rejoin_events, "task"))

    def test_self_report_card_starts_meeting_and_consumes_card(self):
        clients, room_code, player_ids, game = self.setup_started_game(
            4,
            config={"num_intruders": 1, "starting_cards": 0, "card_draw_probability": 0},
        )
        intruder = self.intruders(game)[0]
        card = self.inject_card(game, intruder, "Self Report")
        self.drain_all(clients)

        self.client_for_player(clients, player_ids, intruder).emit(
            "play_card",
            {"player_id": intruder.player_id, "card_id": card.id},
        )
        card_events = self.drain_all(clients)

        self.assertEqual(1, game.stats["cards_played"])
        self.assertIsNotNone(game.meeting)
        self.assertNotIn(card, intruder.cards)
        for events in card_events.values():
            self.assertIsNotNone(self.first_event(events, "meeting"))

    def test_taunt_message_card_reaches_only_target_and_tracks_stats(self):
        clients, room_code, player_ids, game = self.setup_started_game(
            4,
            config={"num_intruders": 1, "starting_cards": 0, "card_draw_probability": 0},
        )
        intruder = self.intruders(game)[0]
        target = self.crew(game)[0]
        bystander = self.crew(game)[1]
        card = self.inject_card(game, intruder, "Taunt Message", requires_input=True)
        self.drain_all(clients)

        self.client_for_player(clients, player_ids, intruder).emit(
            "play_card",
            {
                "player_id": intruder.player_id,
                "card_id": card.id,
                "extra_data": {
                    "target_player_id": target.player_id,
                    "message": "I can see your task list.",
                },
            },
        )
        card_events = self.drain_all(clients)

        self.assertNotIn(card, intruder.cards)
        self.assertEqual(
            [{
                "sender_name": intruder.username,
                "target_name": target.username,
                "message": "I can see your task list.",
            }],
            game.stats["taunts_sent"],
        )
        target_events = card_events[self.client_for_player(clients, player_ids, target)]
        bystander_events = card_events[self.client_for_player(clients, player_ids, bystander)]
        self.assertEqual({"message": "I can see your task list."}, self.first_event(target_events, "taunt_received"))
        self.assertIsNone(self.first_event(bystander_events, "taunt_received"))

    def test_area_denial_card_blocks_matching_location_for_next_task(self):
        clients, room_code, player_ids, game = self.setup_started_game(
            4,
            config={"num_intruders": 1, "starting_cards": 0, "card_draw_probability": 0},
            locations=("Kitchen", "Yard"),
        )
        intruder = self.intruders(game)[0]
        card = self.inject_card(
            game,
            intruder,
            "Area Denial",
            location="Kitchen",
            duration=1,
            countdown=True,
        )
        game.task_handler.tasks = [
            {"task": "Kitchen follow-up", "location": "Kitchen"},
            {"task": "Yard follow-up", "location": "Yard"},
        ]
        self.drain_all(clients)

        self.client_for_player(clients, player_ids, intruder).emit(
            "play_card",
            {"player_id": intruder.player_id, "card_id": card.id},
        )
        card_events = self.drain_all(clients)
        next_task = game.getTask()

        self.assertEqual("Kitchen", game.denied_location)
        self.assertNotIn(card, intruder.cards)
        self.assertEqual("Yard", next_task["location"])
        self.assertTrue(any(self.first_event(events, "active_cards") for events in card_events.values()))

    def test_reactor_registration_before_start_enables_reactor_cards(self):
        clients, room_code, player_ids, game = self.setup_lobby(
            4,
            config={
                "num_intruders": 1,
                "starting_cards": 0,
                "card_deck_preset": "sabotage_heavy",
            },
        )
        reactor = self.make_client()
        reactor.emit("register_reactor", {"room_code": room_code})
        self.assertEqual({"room_code": room_code, "is_open": True, "is_creator": False},
                         self.first_event(self.drain(reactor), "reactor_registered"))
        self.add_tasks(clients[0], room_code, 12)
        self.drain_all(clients)

        self.start_game(clients[0], player_ids[0], clients)
        deck_actions = {card.action for card in game.card_deck.cards}

        self.assertTrue(game.has_reactor)
        self.assertIn("Remote Sabotage", deck_actions)
        self.assertIn("Shorten Meltdown", deck_actions)

    def test_shorten_meltdown_card_is_consumed_by_next_reactor_meltdown(self):
        clients, room_code, player_ids, game = self.setup_lobby(
            4,
            config={
                "num_intruders": 1,
                "starting_cards": 0,
                "card_draw_probability": 0,
                "meltdown_time": 10,
                "card_deck_preset": "sabotage_heavy",
            },
        )
        reactor = self.make_client()
        reactor.emit("register_reactor", {"room_code": room_code})
        self.drain(reactor)
        self.add_tasks(clients[0], room_code, 12)
        self.drain_all(clients)
        self.start_game(clients[0], player_ids[0], clients)
        intruder = self.intruders(game)[0]
        card = self.inject_card(game, intruder, "Shorten Meltdown", duration=4)
        self.drain_all(clients)

        self.client_for_player(clients, player_ids, intruder).emit(
            "play_card",
            {"player_id": intruder.player_id, "card_id": card.id},
        )
        self.drain_all(clients)
        self.assertEqual(4, game.meltdown_time_mod)
        self.assertIn(card, game.card_deck.active_cards)

        reactor.emit("meltdown", {"room_code": room_code})
        self.drain_all(clients + [reactor])

        self.assertEqual(1, game.stats["meltdowns_triggered"])
        self.assertIsNotNone(game.active_meltdown)
        self.assertEqual(6, game.active_meltdown.time_left)
        self.assertEqual(0, game.meltdown_time_mod)
        self.assertNotIn(card, game.card_deck.active_cards)
        game.active_meltdown.end_meltdown(success=True)


if __name__ == "__main__":
    import unittest

    unittest.main()
