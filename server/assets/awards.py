"""Round awards: a few medals handed out when a round ends.

Every medal comes from something that really happened this round, counted in memory on each
player (Player.round_tally, everyone, signed in or not) and thrown away with the round. Nothing
here is stored; assets/player_stats.py keeps a signed-in player's medals on their account.

Medals are only worked out once the round is over, so they never give a role away mid-round.
"""

# Display order. Each entry: (medal id, who can get it, tally key or rule, smallest count that counts).
MEDALS = (
    'called_it',      # crew: called the meeting that voted out an intruder
    'prankster',      # intruder: a crewmate did their fake task
    'task_machine',   # crew: most tasks done
    'core_saver',     # anyone: brought a code that helped stop a meltdown
    'undercover',     # intruder: never got a single vote, with at least one vote held
    'card_shark',     # intruder: most cards played
    'sharp_eye',      # crew: most votes for an intruder
    'last_standing',  # crew: still in at the end when only one or two crew were left
)
MAX_AWARDS = 4
MIN_PLAYERS = 3
MINIMUM = {'task_machine': 2, 'card_shark': 2, 'sharp_eye': 2, 'core_saver': 1, 'called_it': 1, 'prankster': 1}
TALLY_KEY = {'task_machine': 'tasks', 'card_shark': 'cards', 'sharp_eye': 'sharp_votes',
             'core_saver': 'codes', 'called_it': 'caught', 'prankster': 'pranks'}
CREW_ONLY = {'called_it', 'task_machine', 'sharp_eye', 'last_standing'}
INTRUDER_ONLY = {'prankster', 'undercover', 'card_shark'}


def count(player, key, amount=1):
    """Add to a player's count for this round's medals."""
    if player is None:
        return
    tally = getattr(player, 'round_tally', None)
    if tally is None:
        tally = player.round_tally = {}
    tally[key] = tally.get(key, 0) + amount


def note_prank_sent(game, sender, target):
    """An intruder queued a fake task for a crewmate. Kept server-side: the task itself goes to the
    crewmate's phone and must never carry who sent it."""
    pending = game.__dict__.setdefault('_award_pranks', {})
    pending.setdefault(target.player_id, []).append(sender.player_id)


def note_prank_done(game, target, task_text=None):
    """The crewmate finished a fake task: the intruder who sent it gets the credit."""
    pending = game.__dict__.setdefault('_award_pranks', {})
    senders = pending.get(target.player_id) or []
    if not senders:
        return
    sender = game.getPlayerById(senders.pop(0))
    if sender:
        count(sender, 'pranks')
        best = game.__dict__.setdefault('_award_prank_detail', {})
        best.setdefault(sender.player_id, {'target': target.username, 'task': (task_text or '')[:120]})


def note_vote_result(meeting, votes, voted_out_id):
    """Called as a vote closes, before the ejection (which can end the round)."""
    game = meeting.game
    for target_id in votes.values():
        target = game.getPlayerById(target_id)
        if target:
            count(target, 'votes_received')
    game.__dict__['_award_votes_held'] = game.__dict__.get('_award_votes_held', 0) + 1
    if not voted_out_id:
        return
    out = game.getPlayerById(voted_out_id)
    caller = meeting.player_who_started_it
    if out and out.sus and caller and not caller.sus:
        count(caller, 'caught')
        game.__dict__.setdefault('_award_caught', {}).setdefault(caller.player_id, out.username)


def note_meltdown_saved(players):
    """A meltdown was stopped: everyone whose code was entered helped."""
    for player in players:
        count(player, 'codes')


def reset_round(game):
    for key in ('_award_pranks', '_award_prank_detail', '_award_votes_held', '_award_caught'):
        game.__dict__.pop(key, None)
    for player in game.players:
        player.round_tally = {}


def _value(player, key):
    return (getattr(player, 'round_tally', None) or {}).get(key, 0)


def compute(game):
    """The round's medals, best story first: [{medal, player_id, name, value, detail?}]."""
    if getattr(game, 'test_mode', False):
        return []
    players = [p for p in getattr(game, 'players', []) if not getattr(p, 'waiting', False)]
    if len(players) < MIN_PLAYERS:
        return []
    crew = [p for p in players if not p.sus]
    intruders = [p for p in players if p.sus]
    awarded, taken = [], set()

    def pool(medal):
        group = crew if medal in CREW_ONLY else intruders if medal in INTRUDER_ONLY else players
        return [p for p in group if p.player_id not in taken]

    def give(medal, player, value, detail=None):
        entry = {'medal': medal, 'player_id': player.player_id, 'name': player.username, 'value': value}
        if detail:
            entry['detail'] = detail
        awarded.append(entry)
        taken.add(player.player_id)

    for medal in MEDALS:
        if len(awarded) >= MAX_AWARDS:
            break
        candidates = pool(medal)
        if medal == 'undercover':
            if not game.__dict__.get('_award_votes_held'):
                continue
            clean = [p for p in candidates if p.alive and _value(p, 'votes_received') == 0]
            # Most cards played breaks a tie: the busiest intruder nobody suspected.
            clean.sort(key=lambda p: -_value(p, 'cards'))
            if clean:
                give(medal, clean[0], game.__dict__.get('_award_votes_held'))
            continue
        if medal == 'last_standing':
            alive_crew = [p for p in crew if p.alive]
            if len(crew) >= 3 and 0 < len(alive_crew) <= 2:
                left = [p for p in candidates if p.alive]
                left.sort(key=lambda p: -_value(p, 'tasks'))
                if left:
                    give(medal, left[0], len(alive_crew))
            continue
        key = TALLY_KEY[medal]
        # Rank everyone who could get it, medal or not, so a tie at the top stays a tie.
        group = crew if medal in CREW_ONLY else intruders if medal in INTRUDER_ONLY else players
        ranked = sorted(group, key=lambda p: -_value(p, key))
        if not ranked:
            continue
        best = _value(ranked[0], key)
        if best < MINIMUM[medal]:
            continue
        # A tie at the top is a shared lead, not a win: no medal rather than a coin toss.
        if len(ranked) > 1 and _value(ranked[1], key) == best and medal not in ('called_it', 'prankster', 'core_saver'):
            continue
        ranked = [p for p in ranked if p.player_id not in taken and _value(p, key) == best]
        if not ranked:
            continue  # The leader already has a medal this round.
        winner = ranked[0]
        detail = None
        if medal == 'called_it':
            detail = {'caught': game.__dict__.get('_award_caught', {}).get(winner.player_id)}
        elif medal == 'prankster':
            detail = game.__dict__.get('_award_prank_detail', {}).get(winner.player_id)
        elif medal == 'sharp_eye':
            detail = {'votes': _value(winner, 'votes')}
        give(medal, winner, best, detail)

    order = {medal: i for i, medal in enumerate(MEDALS)}
    awarded.sort(key=lambda a: order[a['medal']])
    return awarded
