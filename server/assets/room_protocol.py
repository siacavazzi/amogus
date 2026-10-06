"""State snapshots and shared rules for the WebSocket protocol."""
import copy
import json


def metadata(game):
    return {'room_code': game.room_code, 'revision': game.revision, 'round_id': game.round_id}


def minimum_tasks(game):
    return max(len(game.players) * 3, 10)


def start_error(game):
    if game.game_running:
        return 'The game already started.'
    if not game.is_open:
        return 'Open the room before you start the game.'
    if game.numIntruders < 1:
        return 'At least 1 intruder is required.'
    minimum_players = game.numIntruders * 2 + 1
    if len(game.players) < minimum_players:
        return f'Need at least {minimum_players} players for {game.numIntruders} intruder(s).'
    if len({loc for loc in game.locations if loc and loc.lower() != 'other'}) < 2:
        return 'Add at least 2 locations before you start the game.'
    tasks = game.collaborative_tasks
    if len(tasks) < minimum_tasks(game):
        return f'Need at least {minimum_tasks(game)} tasks. The room has {len(tasks)}.'
    return None


def lobby_state(game):
    error = start_error(game)
    return copy.deepcopy({
        **metadata(game), 'locations': game.locations, 'tasks': game.collaborative_tasks,
        'min_tasks': minimum_tasks(game), 'task_list_code': game.collaborative_task_list_code,
        'task_list_name': game.collaborative_task_list_name,
        'collaborative_mode': game.collaborative_mode, 'can_start': error is None,
        'start_error': error,
    })


def room_state(game, player=None, sid=None):
    intruders = [p for p in game.players if p.sus and p.alive]
    revealed = {
        'intruder_names': [p.username for p in intruders],
        'intruder_ids': [p.player_id for p in intruders],
        'message': 'Tasks complete. Find the intruders.',
    } if game.intruders_revealed else None
    return copy.deepcopy({
        **metadata(game), 'running': game.game_running, 'room_open': game.is_open,
        'is_creator': game.creator_sid == sid,
        'players': [json.loads(p.to_json()) for p in game.players],
        'task': player.task if player else None, 'crew_score': game.crew_score,
        'task_goal': game.taskGoal, 'meeting': json.loads(game.meeting.to_json()) if game.meeting else None,
        'votes': game.meeting.compute_vote_counts() if game.meeting else {},
        'veto_votes': len(game.meeting.veto_votes) if game.meeting else 0,
        'end_state': game.end_state, 'stats': game.stats, 'task_creation_mode': game.task_creation_mode,
        'locations': game.locations, 'config': game.get_config(),
        'collaborative_tasks': lobby_state(game), 'active_hack': game.active_hack,
        'denied_location': game.denied_location, 'intruders_revealed': revealed,
        'active_cards': [json.loads(card.export()) for card in game.card_deck.active_cards],
        'meltdown': {'time_left': game.active_meltdown.time_left,
                     'codes_needed': max(game.active_meltdown.codes_needed - game.active_meltdown.codes_entered, 0)}
                    if game.active_meltdown else None,
        'meltdown_code': player.meltdown_code if player else None,
    })
