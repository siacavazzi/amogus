import json
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
        self.votes = {} 
        self.veto_votes = set()
        self.reason = None
        self.voted_out = None
        self.final_votes = None


    def start_voting(self):
        self.stage = 'voting'
        self.socket.emit("meeting", self.to_json())
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
        self.socket.emit("vote_update", {"votes": vote_summary, "vetoVotes": veto_count})

    def check_veto_threshold(self):
        """
        Check if the number of veto votes exceeds half the players.
        """
        veto_count = len(self.veto_votes)
        player_count = len(self.game.players)
        print("VETO DATA")
        return veto_count > (player_count / 2)
    
    def determine_voted_out(self, vote_counts):
        """
        Determine the player with the most votes.
        """
        if not vote_counts:
            return None  # No votes cast

    # Sort players by vote count in descending order
        sorted_votes = sorted(vote_counts.items(), key=lambda item: item[1], reverse=True)

    # Check for a tie
        if len(sorted_votes) > 1 and sorted_votes[0][1] == sorted_votes[1][1]:
            print("Tie detected. No one is voted out.")
            return None

    # Return the player with the most votes
        voted_out_player = sorted_votes[0][0]
        print(f"Player voted out: {voted_out_player}")
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
            self.votes = self.compute_vote_counts()
        # Meeting ended due to veto threshold
            print("Meeting ended early due to veto threshold...")
            self.socket.emit("meeting", self.to_json())
        else:
        # Regular meeting ending, determine who was voted out
            print("Meeting over...")
            final_votes = self.compute_vote_counts()
        
        # Determine who was voted out (player with the most votes)
            self.voted_out = self.determine_voted_out(final_votes)
            if self.voted_out:
                player = self.game.getPlayerById(self.voted_out)
                self.game.kill_player(player)
                
            self.reason = 'votes'
            self.votes = self.compute_vote_counts()

            self.socket.emit("meeting", self.to_json())

        print(f"Final Votes: {self.votes}, Veto Votes: {len(self.veto_votes)}")
        self.game.meeting = None

    def _vote_countdown(self):
        """
        Countdown the voting time and end the meeting.
        """
        while self.time_left > 0:
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
