export const TUTORIAL_PLAYER_ID = 'tutorial-you';

export const tutorialTask = {
  task: 'Turn off the lights',
  location: 'Basement',
};

export const crewTutorialPlayers = [
  { player_id: TUTORIAL_PLAYER_ID, username: 'You', alive: true, sus: false, ready: false, pic: 3 },
  { player_id: 'tutorial-mira', username: 'Mira', alive: true, sus: true, ready: false, pic: 7 },
  { player_id: 'tutorial-elliot', username: 'Elliot', alive: true, sus: false, ready: false, pic: 11 },
  { player_id: 'tutorial-nova', username: 'Nova', alive: true, sus: false, ready: false, pic: 5 },
];

export const intruderTutorialPlayers = [
  { player_id: TUTORIAL_PLAYER_ID, username: 'You', alive: true, sus: true, ready: false, pic: 3 },
  { player_id: 'tutorial-elliot', username: 'Elliot', alive: true, sus: false, ready: false, pic: 11 },
  { player_id: 'tutorial-nova', username: 'Nova', alive: true, sus: false, ready: false, pic: 5 },
  { player_id: 'tutorial-rhea', username: 'Rhea', alive: true, sus: false, ready: false, pic: 2 },
];

export const tutorialLocations = ['Basement', 'Kitchen', 'Living Room', 'Garage'];

export const tutorialTrainingCards = [
  {
    id: 'tutorial-emp',
    action: 'EMP',
    text: 'Temporarily disables a player\'s phone. Swipe left to see your other cards.',
    location: null,
    duration: 20,
    time_left: 20,
    countdown: true,
    requires_input: false,
  },
  {
    id: 'tutorial-area-denial',
    action: 'Area Denial',
    text: 'Blocks a room for a set time. Crewmates with tasks there have to wait or move on.',
    location: 'Basement',
    duration: 60,
    time_left: 60,
    countdown: true,
    requires_input: false,
  },
  {
    id: 'tutorial-fake-task',
    action: 'Fake Task',
    text: 'Sends a fake errand to a crewmate. It looks real on their phone and wastes their time.',
    location: null,
    duration: null,
    time_left: 0,
    countdown: false,
    requires_input: true,
  },
];

export const defaultFakeTaskDraft = {
  targetPlayerId: 'tutorial-elliot',
  taskText: 'Check the breaker panel and confirm the basement lights are stable.',
  taskLocation: 'Basement',
};

export const tutorialCoachCopy = {
  intro: {
    step: 'Welcome',
    accent: 'cyan',
    title: 'Learn Sus Party in about 2 minutes',
    body: 'You\'ll play through both roles on the real game screens — first as a Crewmate, then as an Intruder. Nothing here affects a real game.',
    modal: true,
    cta: 'Start with Crewmate',
  },
  crewTask: {
    step: 'Crewmate · 1 of 4',
    accent: 'cyan',
    body: 'Your phone shows one task at a time — a name and a location in the house. In a real game you\'d go there and do it. Here, just swipe the slider below to mark this one done.',
  },
  crewCallMeeting: {
    step: 'Crewmate · 2 of 4',
    accent: 'amber',
    body: 'Find a body or notice something off? CALL MEETING gathers everyone in one room to talk and vote. Tap it to try.',
  },
  meetingWaiting: {
    step: 'Crewmate · 3 of 4',
    accent: 'amber',
    body: 'After a meeting is called, everyone walks to the meeting room. Once the group is physically there, each player swipes ready. Try it now.',
  },
  voting: {
    step: 'Crewmate · 4 of 4',
    accent: 'purple',
    body: 'The group debates, then votes. Tap a player card to select them, then press Vote. Select Mira and vote her out.',
  },
  results: {
    step: 'Meeting result',
    accent: 'emerald',
    body: 'This screen reveals who was ejected and whether they were actually an intruder. Once the animation plays, press Continue.',
  },
  intruderIntro: {
    step: 'Switching roles',
    accent: 'rose',
    title: 'Now you\'re the Intruder',
    body: 'Intruders look exactly like crewmates to everyone else. You secretly eliminate isolated players, fake doing tasks to blend in, and use ability cards to create chaos.',
    modal: true,
    cta: 'Start intruder training',
  },
  intruderKill: {
    step: 'Intruder · 1 of 3',
    accent: 'rose',
    body: 'When you\'re alone with a crewmate, quietly tell them they\'re out. Then swipe the slider on your phone to log the kill. Try it now.',
  },
  intruderCooldown: {
    step: 'Intruder · 1 of 3',
    accent: 'orange',
    body: 'After each kill there\'s a short cooldown — so you can\'t eliminate the whole crew back-to-back. Wait for the timer to finish.',
  },
  intruderVent: {
    step: 'Intruder · 2 of 3',
    accent: 'rose',
    body: 'Intruders carry a hidden hand of ability cards — fake tasks, sabotage, and more. Tap ENTER VENT above to open your cards.',
  },
  intruderCards: {
    step: 'Intruder · 3 of 3',
    accent: 'rose',
    body: 'Swipe left past the EMP card to see your next card. Then press and hold Area Denial to play it.',
  },
  complete: {
    step: 'All done',
    accent: 'emerald',
    title: 'You\'re ready to play!',
    body: 'You\'ve seen both sides of the game. Get 5 or more friends together, start a room, and share the code. Check the full guide any time for a refresher.',
    modal: true,
  },
};