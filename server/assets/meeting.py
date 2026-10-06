import json
import math
import time
from collections import Counter
from threading import Thread
from uuid import uuid4


class Meeting:

    def __init__(self, vote_time, socket, player_who_started_it, game):
        self.id = str(uuid4())
        self.round_id = game.round_id
        self.stage = 'waiting'
        self.time_left = vote_time
        self.socket = socket
        self.player_who_started_it = player_who_started_it
        self.game = game
        self.speaker = game.speaker
        self.votes = {}
        self.veto_votes = set()
        self.reason = None
        self.voted_out = None
        self.final_votes = None
        self.countdown_started = False

    def _is_current(self):
        return self.game.meeting is self and self.game.round_id == self.round_id

    def start_voting(self):
        with self.game.state_lock:
            if not self._is_current() or self.stage != 'waiting' or self.game.end_state:
                return False
            if self.game.get_num_living_players() <= 1:
                self.stage = 'over'
                self.game.end_state = 'sus_victory'
                self.game.revision += 1
                self.game.emit_player_list()
                self.game.emit_to_room("end_game", {'result': self.game.end_state, 'stats': self.game.stats})
                return False
            if self.countdown_started:
                return False

            self.stage = 'voting'
            self.countdown_started = True
            self.game.revision += 1
            self.game.emit_to_room("meeting", self.to_json())
            self.speaker.play_sound('hurry')
            Thread(target=self._vote_countdown).start()
            return True

    def register_vote(self, voting_player, voted_for=None, veto=False):
        """Register a vote or veto for this active meeting."""
        with self.game.state_lock:
            if not self._is_current() or self.stage != 'voting' or self.game.end_state:
                return False
            if not voting_player.alive:
                return False
            player_id = voting_player.player_id

            if veto:
                self.veto_votes.add(player_id)
                self.votes.pop(player_id, None)
                print(f"Veto Votes: {len(self.veto_votes)}")
            else:
                if not voted_for:
                    return False
                self.votes[player_id] = voted_for.player_id
                self.veto_votes.discard(player_id)
                print(f"Votes: {self.votes}")

            self.game.revision += 1
            self.emit_vote_counts()

            self._finish_if_all_voted()
            return True

    def on_player_death(self):
        """Remove invalid ballots and check the reduced electorate under the room lock."""
        with self.game.state_lock:
            if not self._is_current() or self.stage != 'voting':
                return
            living = {player.player_id for player in self.game.players if player.alive}
            self.votes = {voter: target for voter, target in self.votes.items()
                          if voter in living and target in living}
            self.veto_votes.intersection_update(living)
            self.game.revision += 1
            self.emit_vote_counts()
            self._finish_if_all_voted()

    def _finish_if_all_voted(self):
        if not self._is_current() or self.stage != 'voting' or self.game.end_state:
            return
        if self.check_veto_threshold():
            self.end_meeting(early=True)
        elif len(self.votes) + len(self.veto_votes) >= self.game.get_num_living_players():
            self.end_meeting()

    def compute_vote_counts(self):
        with self.game.state_lock:
            vote_counter = Counter(self.votes.values())
            return {
                player.player_id: vote_counter.get(player.player_id, 0)
                for player in self.game.players
            }

    def emit_vote_counts(self):
        with self.game.state_lock:
            vote_summary = self.compute_vote_counts()
            veto_count = len(self.veto_votes)
            print(f"Vote Summary: {vote_summary}, Veto Votes: {veto_count}")
            self.game.emit_to_room("vote_update", {"votes": vote_summary, "vetoVotes": veto_count})

    def check_veto_threshold(self):
        with self.game.state_lock:
            return len(self.veto_votes) > (self.game.get_num_living_players() / 2)

    def determine_voted_out(self, vote_counts):
        """Return the top-voted player when the configured threshold is met."""
        with self.game.state_lock:
            if not vote_counts:
                return None

            players_with_votes = {player_id: count for player_id, count in vote_counts.items() if count > 0}
            if not players_with_votes:
                print("No votes cast for any player.")
                return None

            sorted_votes = sorted(players_with_votes.items(), key=lambda item: item[1], reverse=True)
            if len(sorted_votes) > 1 and sorted_votes[0][1] == sorted_votes[1][1]:
                print("Tie detected. No one is voted out.")
                return None

            voted_out_player, votes_received = sorted_votes[0]
            living_player_count = self.game.get_num_living_players()
            required_votes = math.ceil(living_player_count * self.game.vote_threshold)
            if votes_received < required_votes:
                print(f"Not enough votes. Got {votes_received}, need {required_votes} ({self.game.vote_threshold * 100:.0f}% of {living_player_count} living players).")
                return None

            print(f"Player voted out: {voted_out_player} with {votes_received} votes (needed {required_votes})")
            return voted_out_player

    def end_meeting(self, early=False):
        """End this meeting once, while its round still owns the room state."""
        with self.game.state_lock:
            if not self._is_current() or self.stage == 'over' or self.game.end_state:
                return False
            self.stage = 'over'
            self.game.revision += 1

            for player in self.game.players:
                player.ready = not player.alive

            if early:
                self.reason = 'veto'
                print("Meeting ended early due to veto threshold...")
                self.game.emit_to_room("meeting", self.to_json())
                self.speaker.play_sound('veto')
            else:
                print("Meeting over...")
                final_votes = self.compute_vote_counts()
                self.voted_out = self.determine_voted_out(final_votes)
                if self.voted_out:
                    self.game.stats['players_voted_out'] += 1
                    voted_player = self.game.getPlayerById(self.voted_out)
                    if voted_player and voted_player.sus:
                        death_cause = 'voted_out_intruder'
                    elif voted_player:
                        death_cause = 'voted_out_innocent'
                    else:
                        death_cause = 'voted_out'
                    self.game.kill_player(self.voted_out, death_cause=death_cause)

                self.reason = 'votes'
                self.votes = self.compute_vote_counts()
                self.game.emit_to_room("meeting", self.to_json())

            self.game.drawCards(probability=self.game.card_draw_probability)
            print(f"Final Votes: {self.votes}, Veto Votes: {len(self.veto_votes)}")
            self.game.meeting = None
            self.game.revision += 1
            return True

    def _vote_countdown(self):
        """Count down without holding the room lock while sleeping."""
        while True:
            with self.game.state_lock:
                if not self._is_current() or self.stage != 'voting' or self.game.end_state:
                    return
                if self.time_left == 10:
                    self.speaker.play_sound('hurry')

            time.sleep(1)

            with self.game.state_lock:
                if not self._is_current() or self.stage != 'voting' or self.game.end_state:
                    return
                self.time_left -= 1
                self.game.revision += 1
                if self.time_left <= 0:
                    self.end_meeting()
                    return

    def to_json(self):
        """Convert the current meeting state and round identity to JSON."""
        with self.game.state_lock:
            return json.dumps({
                "id": self.id,
                "room_code": self.game.room_code,
                "round_id": self.round_id,
                "revision": self.game.revision,
                "stage": self.stage,
                "player_who_started_it": self.player_who_started_it.username,
                "time_left": self.time_left,
                "reason": self.reason,
                "voted_out": self.voted_out,
                "votes": self.votes,
                "veto_votes": len(self.veto_votes),
            })
