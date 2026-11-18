"""A crewmate's hand of tasks and the timed Priority tasks.

Every living crewmate holds HAND_SIZE tasks and does them in any order; a finished task's slot
refills from the room's task pool. The crew's goal is still the team total in Game.taskGoal.

Now and then a crewmate also gets one Priority task: an optional bonus task with a countdown.
Finishing it in time is worth one task on the bar plus a swap (trade one task in your hand for a
new one). A Fake Task card arrives as a Priority task that looks exactly the same.

Timing comes from prod rounds to Nov 17 2026: a 6 to 9 player round lasts about 5 minutes, the
first meeting comes about 1.2 minutes in, and the median task takes 26 s (59 s at 10 to 14
players). The first Priority shows 45 to 75 s in, the next 90 to 150 s after the last one ended,
so a crewmate sees about 2 in an average round. The clock stops during meetings and meltdowns
and keeps running during an EMP.

The time to finish one adapts to the room: it starts at 60 s, and every few real Priority tasks
the room looks at the last several. If more than 3 in 4 were finished in time it takes 5 s off
(down to 30 s); if fewer, it gives 5 s back (up to 60 s). Fakes don't count, and look the same.
"""
import random
import time
from threading import Thread

# Bound once, so a test that patches time.sleep for another timer doesn't drive this clock.
_sleep = time.sleep
from uuid import uuid4

HAND_SIZE = 3
PRIORITY_SECONDS = 60
PRIORITY_MIN_SECONDS = 30
PRIORITY_STEP_SECONDS = 5
PRIORITY_TARGET_RATE = 0.75
PRIORITY_WINDOW = 8         # recent real Priority tasks the room looks at
PRIORITY_MIN_SAMPLE = 4     # no change until this many have ended
PRIORITY_ADJUST_EVERY = 3   # and at most one change per this many
FIRST_PRIORITY_SECONDS = (45, 75)
NEXT_PRIORITY_SECONDS = (90, 150)
FAKE_TASK_MAX_CHARS = 200
LOCATION_MAX_CHARS = 80


def _public(task):
    """A task as a phone may see it. A fake looks exactly like a real one."""
    if not task:
        return None
    return {key: task[key] for key in ('task', 'location', 'assignment_id', 'round_id') if key in task}


def _stamp(game, task):
    task = dict(task)
    task['assignment_id'] = str(uuid4())
    task['round_id'] = game.round_id
    task['assigned_monotonic'] = time.monotonic()
    return task


def draw_task(game, avoid_texts=(), location=None, avoid_location=None):
    """A task from the room pool. `location` asks for one in that area (None when there is none)."""
    handler = game.task_handler
    if not handler.tasks and game.collaborative_tasks:
        handler.tasks = [saved.copy() for saved in game.collaborative_tasks]
        random.shuffle(handler.tasks)
    if not handler.tasks:
        handler.reset()
    pool = handler.tasks
    if not pool:
        return None

    def area(task):
        return (task.get('location') or '').lower()

    def pick(candidates):
        fresh = [task for task in candidates if task.get('task') not in avoid_texts]
        return random.choice(fresh or candidates) if candidates else None

    if location:
        wanted = location.lower()
        task = pick([task for task in pool if area(task) == wanted])
        if task is None:
            # The pool ran low on that area: borrow a task from the full room list.
            full = [saved for saved in (game.collaborative_tasks or []) if area(saved) == wanted]
            task = pick(full)
            return dict(task) if task else None
        pool.remove(task)
        return dict(task)

    denied = (game.denied_location or '').lower()
    avoid = (avoid_location or '').lower()
    options = [task for task in pool if area(task) != denied] if denied else list(pool)
    options = options or list(pool)
    preferred = [task for task in options if area(task) != avoid] if avoid else options
    task = pick(preferred or options)
    pool.remove(task)
    return dict(task)


def fill_hand(game, player):
    """Top a crewmate's hand up to HAND_SIZE. Returns True if anything was dealt."""
    dealt = False
    while len(player.hand) < HAND_SIZE:
        task = draw_task(game, avoid_texts={held.get('task') for held in player.hand})
        if not task:
            break
        player.hand.append(_stamp(game, task))
        dealt = True
    if player.next_priority_in is None and player.priority is None:
        player.next_priority_in = random.randint(*FIRST_PRIORITY_SECONDS)
    return dealt


def replace_in_hand(game, player, index):
    """Swap the task at `index` for a fresh one that isn't already in the hand."""
    held = {task.get('task') for task in player.hand}
    task = draw_task(game, avoid_texts=held)
    if not task:
        return False
    player.hand[index] = _stamp(game, task)
    if player.selected_assignment and not player.find_assignment(player.selected_assignment)[0]:
        player.selected_assignment = None
    return True


def redeal_hand(game, player):
    player.hand = []
    if player.selected_assignment and player.find_assignment(player.selected_assignment)[0] != 'priority':
        player.selected_assignment = None
    fill_hand(game, player)


def priority_seconds(game):
    """How long a Priority task lasts in this room right now."""
    return getattr(game, 'priority_seconds', None) or PRIORITY_SECONDS


def reset_priority_timing(game):
    game.priority_seconds = PRIORITY_SECONDS
    game.priority_results = []
    game.priority_since_adjust = 0


def record_priority_result(game, finished):
    """A real Priority task ended (finished in time or not). Nudge the room's timer toward
    PRIORITY_TARGET_RATE finished."""
    results = getattr(game, 'priority_results', None)
    if results is None:
        reset_priority_timing(game)
        results = game.priority_results
    results.append(bool(finished))
    del results[:-PRIORITY_WINDOW]
    game.priority_since_adjust = getattr(game, 'priority_since_adjust', 0) + 1
    if len(results) < PRIORITY_MIN_SAMPLE or game.priority_since_adjust < PRIORITY_ADJUST_EVERY:
        return
    rate = sum(results) / len(results)
    seconds = priority_seconds(game)
    if rate > PRIORITY_TARGET_RATE:
        seconds = max(PRIORITY_MIN_SECONDS, seconds - PRIORITY_STEP_SECONDS)
    elif rate < PRIORITY_TARGET_RATE:
        seconds = min(PRIORITY_SECONDS, seconds + PRIORITY_STEP_SECONDS)
    if seconds != priority_seconds(game):
        game.priority_seconds = seconds
        game.priority_since_adjust = 0


def give_priority(game, player, task, fake=False):
    task = _stamp(game, task)
    if fake:
        task['is_fake'] = True
    task['seconds'] = priority_seconds(game)
    task['time_left'] = task['seconds']
    player.priority = task
    player.next_priority_in = None
    return task


def end_priority(player, game=None, finished=False):
    """The Priority task was done or ran out: start the clock to the next one."""
    if game is not None and player.priority and not player.priority.get('is_fake'):
        record_priority_result(game, finished)
    if player.selected_assignment and player.priority and player.selected_assignment == player.priority.get('assignment_id'):
        player.selected_assignment = None
    player.priority = None
    player.priority_idle = 0
    player.next_priority_in = random.randint(*NEXT_PRIORITY_SECONDS)


def hand_state(game, player):
    """What this player's own phone shows: their hand, Priority task, swaps and stolen tasks."""
    if player is None:
        return None
    priority = None
    if player.priority:
        priority = {**_public(player.priority), 'time_left': max(0, int(player.priority.get('time_left', 0))),
                    'seconds': player.priority.get('seconds', PRIORITY_SECONDS)}
    return {
        'hand': [_public(task) for task in player.hand],
        'priority': priority,
        'swaps': player.swaps,
        'tasks_done': player.round_tasks_done,
        'stolen': player.stolen,
    }


def emit_hand(game, player):
    if player and player.sid:
        state = hand_state(game, player)
        game.socket.emit('task', game._add_state_metadata({'task': _public(player.task), **state}), to=player.sid)


def eligible_crew(game):
    return [player for player in game.players
            if player.alive and not player.sus and not getattr(player, 'waiting', False)]


def pick_fake_task_target(game, location):
    """The crewmate most due a Priority task: none showing, longest since their last one, and
    not already in that area (going by where they last finished a task)."""
    # Never the Hacker: they are on the intruders' side, and the sender would learn it for free.
    candidates = [player for player in eligible_crew(game)
                  if not player.priority and not getattr(player, 'is_hacker', False)]
    if not candidates:
        return None
    wanted = (location or '').lower()
    away = [player for player in candidates if (player.last_task_location or '').lower() != wanted]
    pool = away or candidates
    longest = max(player.priority_idle for player in pool)
    return random.choice([player for player in pool if player.priority_idle == longest])


def priority_tick(game):
    """One second of the Priority clock. Call with the room lock held. Returns changed players."""
    if not game.game_running or game.end_state or game.meeting or game.active_meltdown:
        game.priority_clock_paused = True
        return []
    if game.intruders_revealed:
        return []
    # Phones count a Priority down on their own; after a pause, send everyone the true time left.
    resumed = getattr(game, 'priority_clock_paused', False)
    game.priority_clock_paused = False
    changed = []
    for player in eligible_crew(game):
        if player.priority:
            player.priority['time_left'] = player.priority.get('time_left', PRIORITY_SECONDS) - 1
            if player.priority['time_left'] <= 0:
                end_priority(player, game, finished=False)
                changed.append(player)
            continue
        player.priority_idle += 1
        if player.next_priority_in is None:
            player.next_priority_in = random.randint(*FIRST_PRIORITY_SECONDS)
        player.next_priority_in -= 1
        if player.next_priority_in <= 0:
            task = draw_task(game, avoid_texts={held.get('task') for held in player.hand},
                             avoid_location=player.last_task_location)
            if task:
                give_priority(game, player, task)
                changed.append(player)
            else:
                player.next_priority_in = random.randint(*NEXT_PRIORITY_SECONDS)
    if resumed:
        changed += [player for player in eligible_crew(game) if player.priority and player not in changed]
    return changed


def start_priority_clock(game):
    """Run the Priority clock for this round in the background."""
    round_id = game.round_id
    reset_priority_timing(game)

    def run():
        while True:
            _sleep(1)
            with game.state_lock:
                if game.round_id != round_id or not game.game_running or game.end_state:
                    return
                changed = priority_tick(game)
                if changed:
                    game.revision += 1
                for player in changed:
                    emit_hand(game, player)

    thread = Thread(target=run, daemon=True)
    thread.start()
    return thread
