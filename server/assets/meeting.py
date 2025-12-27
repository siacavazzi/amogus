import json
import math
from threading import Thread
from flask_socketio import emit
import time
from collections import Counter

class Meeting:

    def __init__(self, vote_time, socket, player_who_started_it, game):
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


    def start_voting(self):
        if self.game.get_num_living_players() <= 1:
            self.game.end_state = 'sus_victory'
            # Emit player list BEFORE end_game so clients have updated death info
            self.game.emit_player_list()
            self.game.emit_to_room("end_game", {'result': self.game.end_state, 'stats': self.game.stats})
            return
        self.stage = 'voting'
        self.game.emit_to_room("meeting", self.to_json())
        self.speaker.play_sound('hurry')
        Thread(target=self._vote_countdown).start()
    
    def register_vote(self, voting_player, voted_for=None, veto=False):
        """
        Register or change a vote or veto.
        """
        player_id = voting_player.player_id

        if veto:
            # Handle veto votes
            self.veto_votes.add(player_id)
            self.votes.pop(player_id, None)  # Remove regular vote if vetoing
            print(f"Veto Votes: {len(self.veto_votes)}")
        else:
            # Register a standard vote (overwrite previous vote if exists)
            self.votes[player_id] = voted_for.player_id
            self.veto_votes.discard(player_id)  # Remove veto if voting
            print(f"Votes: {self.votes}")

        # Send updated vote and veto counts
        self.emit_vote_counts()

        # Check if veto threshold has been reached
        if self.check_veto_threshold():
            self.end_meeting(early=True)

        total_votes = len(self.votes) + len(self.veto_votes)
        if(total_votes >= self.game.get_num_living_players()):
            self.end_meeting()

    def compute_vote_counts(self):
        """
        Generate a dictionary summarizing votes for each player.
        """
        vote_counter = Counter(self.votes.values())

        # Create output dictionary with player names and vote counts
        vote_summary = {
            player.player_id: vote_counter.get(player.player_id, 0)
            for player in self.game.players
        }
        return vote_summary

    def emit_vote_counts(self):
        """
        Emit the updated vote counts and veto votes to all connected players.
        """
        vote_summary = self.compute_vote_counts()
        veto_count = len(self.veto_votes)

        print(f"Vote Summary: {vote_summary}, Veto Votes: {veto_count}")
        self.game.emit_to_room("vote_update", {"votes": vote_summary, "vetoVotes": veto_count})

    def check_veto_threshold(self):
        """
        Check if the number of veto votes exceeds half the living players.
        """
        veto_count = len(self.veto_votes)
        living_player_count = self.game.get_num_living_players()
        return veto_count > (living_player_count / 2)
    
    def determine_voted_out(self, vote_counts):
        """
        Determine the player with the most votes.
        Requires a configurable fraction of living players to vote for someone to eject them.
        Returns None if there's a tie, no votes, or threshold not met.
        """
        if not vote_counts:
            return None  # No votes cast

        # Filter out players with 0 votes
        players_with_votes = {k: v for k, v in vote_counts.items() if v > 0}
        
        if not players_with_votes:
            print("No votes cast for any player.")
            return None

        # Sort players by vote count in descending order
        sorted_votes = sorted(players_with_votes.items(), key=lambda item: item[1], reverse=True)

        # Check for a tie at the top
        if len(sorted_votes) > 1 and sorted_votes[0][1] == sorted_votes[1][1]:
            print("Tie detected. No one is voted out.")
            return None

        # Get the player with the most votes
        voted_out_player = sorted_votes[0][0]
        votes_received = sorted_votes[0][1]

        # Calculate required votes based on living player count and threshold
        living_player_count = self.game.get_num_living_players()
        required_votes = math.ceil(living_player_count * self.game.vote_threshold)

        if votes_received < required_votes:
            print(f"Not enough votes. Got {votes_received}, need {required_votes} ({self.game.vote_threshold * 100:.0f}% of {living_player_count} living players).")
            return None

        print(f"Player voted out: {voted_out_player} with {votes_received} votes (needed {required_votes})")
        return voted_out_player

    
    def end_meeting(self, early=False):
        """
        End the meeting and emit the final vote results, including who was voted out.
        """
        self.stage = 'over'

        for player in self.game.players:
            player.ready = False

        if early:
            self.reason = 'veto'
            print("Meeting ended early due to veto threshold...")
            self.game.emit_to_room("meeting", self.to_json())
            self.speaker.play_sound('veto')
        else:
            # Regular meeting ending, determine who was voted out
            print("Meeting over...")
            final_votes = self.compute_vote_counts()
        
            # Determine who was voted out (player with the most votes)
            self.voted_out = self.determine_voted_out(final_votes)
            if self.voted_out:
                # Track the vote-out in stats
                self.game.stats['players_voted_out'] += 1
                
                # Determine if they were actually an intruder
                voted_player = self.game.getPlayerById(self.voted_out)
                if voted_player:
                    if voted_player.sus:
                        death_cause = 'voted_out_intruder'
                    else:
                        death_cause = 'voted_out_innocent'
                else:
                    death_cause = 'voted_out'
                self.game.kill_player(self.voted_out, death_cause=death_cause)
                
            self.reason = 'votes'
            self.votes = self.compute_vote_counts()

            self.game.emit_to_room("meeting", self.to_json())

        # Draw cards for intruders (after any meeting, including veto)
        self.game.drawCards(probability=self.game.card_draw_probability)

        print(f"Final Votes: {self.votes}, Veto Votes: {len(self.veto_votes)}")
        self.game.meeting = None

    def _vote_countdown(self):
        """
        Countdown the voting time and end the meeting.
        """
        while self.time_left > 0:
            if self.time_left == 10 and self.stage != 'over':
                self.speaker.play_sound('hurry')
            time.sleep(1)
            self.time_left -= 1

        if self.stage != 'over':
            self.end_meeting()

    def to_json(self):
        """
        Convert the current meeting state to JSON.
        """
        return json.dumps({
            "stage": self.stage,
            "player_who_started_it": self.player_who_started_it.username,
            "time_left": self.time_left,
            "reason": self.reason,
            "voted_out": self.voted_out,
            "votes": self.votes,
            "veto_votes": len(self.veto_votes)
        })
