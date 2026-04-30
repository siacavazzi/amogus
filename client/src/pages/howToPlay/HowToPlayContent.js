import {
  AlertTriangle,
  ClipboardList,
  FileText,
  HelpCircle,
  Home,
  Monitor,
  Search,
  Shield,
  Skull,
  Trophy,
  Users,
  Vote,
  Zap,
} from 'lucide-react';

export const heroStats = [
  { value: '5-15', label: 'Players' },
  { value: '30-60 min', label: 'Typical game time' },
  { value: '1 phone each', label: 'Phones are the controller' },
  { value: 'Multi-room space', label: 'House, office, dorm, or similar' },
];

export const jumpLinks = [
  { href: '#setup', label: 'Setup' },
  { href: '#roles', label: 'Roles' },
  { href: '#flow', label: 'Round flow' },
  { href: '#meetings', label: 'Meetings' },
  { href: '#meltdown', label: 'Meltdown' },
  { href: '#cards', label: 'Intruder cards' },
  { href: '#winning', label: 'Winning' },
  { href: '#host', label: 'Host script' },
];

export const setupCards = [
  {
    icon: Home,
    tone: 'neutral',
    title: 'Meeting area',
    description:
      'Pick one central room where everyone returns when a meeting is called. A living room, kitchen, or other easy gathering point is ideal.',
  },
  {
    icon: ClipboardList,
    tone: 'neutral',
    title: 'Task list',
    description:
      'Make a list of short physical tasks around the venue. Players mark them complete on the honor system after they actually do them.',
  },
  {
    icon: Monitor,
    tone: 'gold',
    title: 'Optional reactor',
    description:
      'If you want meltdown mode, put a laptop in a different room from the meeting area. People should have to travel to reach it.',
  },
];

export const setupGuides = [
  {
    icon: Users,
    tone: 'neutral',
    title: 'Good first-game setup',
    items: [
      'Use 5 to 16 players. Around 8 to 12 usually feels best.',
      'Keep tasks short, obvious, and spread across several rooms.',
      'Make sure every player has a phone and knows how to swipe a task complete.',
    ],
  },
  {
    icon: AlertTriangle,
    tone: 'neutral',
    title: 'Explain these two rules out loud',
    items: [
      'Intruders kill by tapping a player and quietly telling them they are dead.',
      'If you die, wait for the next meeting. When the meeting starts, your phone will show an "I\'m Dead" button \u2014 you MUST press it then. The game tracks deaths from that button, and skipping it breaks scoring and end-game logic.',
    ],
  },
];

export const roleCards = [
  {
    icon: Shield,
    tone: 'crew',
    label: 'Crewmate',
    title: 'Keep the house moving and catch the killers.',
    description:
      'Crewmates spend the game finishing tasks, staying alive, and building enough suspicion to vote intruders out.',
    items: [
      'Follow the task on your phone and do it in real life.',
      'Swipe when you finish to get the next task.',
      'Notice who was where, who was alone, and who is acting strangely.',
      'Report bodies or call a meeting when something feels off.',
    ],
  },
  {
    icon: Skull,
    tone: 'intruder',
    label: 'Intruder',
    title: 'Blend in long enough to thin the crew.',
    description:
      'Intruders look like normal players, but their goal is to quietly remove crewmates and stay alive through the meetings.',
    items: [
      'Walk with purpose and fake the rhythm of doing tasks.',
      'Eliminate isolated players without witnesses.',
      'Use cards to sabotage, misdirect, or pressure the crew.',
      'Win by numbers or by forcing a successful meltdown.',
    ],
  },
];

export const flowSteps = [
  {
    step: '1',
    title: 'Move and do tasks',
    description:
      'Crewmates see one task at a time on their phones. Go to the location, do it in real life, then swipe to confirm it. Intruders should copy that rhythm and look busy.',
  },
  {
    step: '2',
    title: 'Kill quietly or find a body',
    description:
      'If an intruder catches someone alone, they can tap that player and quietly tell them they are dead. Anyone who finds the body can call a meeting.',
  },
  {
    step: '3',
    title: 'Return to the meeting area',
    description:
      'When a meeting is called, everyone heads back to the central room. Do not start debating early. Wait until the phones say the meeting is live.',
  },
  {
    step: '4',
    title: 'Discuss, vote, and repeat',
    description:
      'Living players vote for one person or choose veto or skip. If nobody is ejected, everyone goes back out and the loop starts again.',
    note:
      'The game feels best when people stay disciplined about the quiet periods and the meeting area.',
  },
];

export const meetingCards = [
  {
    icon: Users,
    tone: 'neutral',
    title: 'What happens during a meeting',
    items: [
      'Everyone goes to the meeting area and gets quiet.',
      'Living players press Ready. Dead players confirm that they are dead.',
      'Discussion starts and is usually timed to about 3 minutes.',
      'Then the living players vote.',
    ],
  },
  {
    icon: Vote,
    tone: 'neutral',
    title: 'How ejection works',
    items: [
      'The top vote-getter is only ejected if they also clear the host\'s vote threshold. By default that is about two thirds of living players.',
      'If more than half of living players choose veto or skip, no one is ejected.',
      'Ties also mean no ejection.',
      'After the meeting, surviving intruders may draw more cards, so stalled games get harder.',
    ],
  },
];

export const meltdownCards = [
  {
    icon: Zap,
    tone: 'gold',
    title: 'How it starts',
    description:
      'An intruder can trigger meltdown by physically triggering it at the reactor or with a sabotage card. When that happens, players receive a 4-digit code on their phones and have to move fast.',
  },
  {
    icon: Monitor,
    tone: 'gold',
    title: 'How to stop it',
    items: [
      'Everyone with a code rushes to the reactor laptop.',
      'Codes have to be entered before time runs out.',
      'The normal target is around 60% of living players within 60 seconds.',
      'If the target is missed, the intruders win instantly.',
    ],
  },
];

export const intruderCardHighlights = [
  {
    icon: FileText,
    tone: 'intruder',
    title: 'Fake tasks',
    description:
      'Intruders can send a crewmate on a fake errand. Fake tasks waste time and do not add to the crew\'s score.',
  },
  {
    icon: Search,
    tone: 'intruder',
    title: 'Meetings and misdirection',
    description:
      'Cards like Self Report let intruders create a meeting on their own and redirect suspicion after a kill.',
  },
  {
    icon: Home,
    tone: 'intruder',
    title: 'Space control',
    description:
      'EMP and area denial cards can interfere with devices or temporarily make a location unusable.',
  },
  {
    icon: Zap,
    tone: 'intruder',
    title: 'Reactor pressure',
    description:
      'Some cards start meltdowns or shorten the time crews have to solve them, which makes late-game chaos much worse.',
  },
];

export const winningCards = [
  {
    icon: Trophy,
    tone: 'crew',
    title: 'Crew wins by removing every intruder',
    items: [
      'If all intruders are voted out, the crew wins immediately.',
      'If the task meter reaches 100%, the game reveals the intruders by name.',
      'That reveal is powerful, but it does not end the game on its own. The crew still has to get the intruders voted out.',
    ],
  },
  {
    icon: AlertTriangle,
    tone: 'intruder',
    title: 'Intruders win by numbers or meltdown',
    items: [
      'Intruders win when the number of living crewmates is equal to or lower than the number of living intruders.',
      'Intruders also win if meltdown succeeds.',
      'Example: if 2 intruders are alive and only 2 crewmates remain, the intruders have already won.',
    ],
  },
];

export const hostCards = [
  {
    icon: HelpCircle,
    tone: 'neutral',
    title: 'What every player needs to hear',
    items: [
      'Your phone gives you instructions, but the game happens in the house.',
      'Crewmates do tasks and try to vote out every intruder.',
      'Intruders fake tasks, kill quietly, and try to survive meetings.',
      'If you die, stay quiet and wait. The "I\'m Dead" button only appears on your phone during a meeting \u2014 press it then so the game knows.',
    ],
  },
  {
    icon: AlertTriangle,
    tone: 'neutral',
    title: 'The two reminders people forget',
    items: [
      'No talking when a meeting is called until everyone is back and ready.',
      'Finishing all tasks reveals the intruders, but the crew still needs them voted out to finish the game.',
    ],
  },
];

export const pageCopy = {
  heroTitle: 'Phones guide it. The game happens in your house.',
  heroBody:
    'Sus Party is a real-world social deduction game. Crewmates move between rooms finishing physical tasks. Intruders blend in, eliminate people quietly, and try to survive the vote. If you have played Mafia or Among Us, this is the live-action version.',
  heroNote: 'Short version: move, do tasks, watch people, call meetings, vote carefully.',
  venueTitle: 'Best venue',
  venueBody:
    'A house or building with several rooms works best. You want enough space for people to separate without always seeing each other.',
  criticalDeadRule:
    'If you are killed, stay quiet and leave your body where it was. You cannot mark yourself dead yet. The next time a meeting is called, your phone will show an "I\'m Dead" button \u2014 you MUST press it during that meeting. The game uses that button to track who is alive, and forgetting it breaks voting, win conditions, and the end-game summary.',
  vetoNote: 'If you are unsure, a veto is usually better than ejecting a crewmate by mistake.',
  reactorNote:
    'Put the laptop in a different room from the meeting area. If the reactor is right beside the meeting area, the mechanic loses most of its tension.',
  cardDrawNote:
    'Intruders start with cards and can draw more after meetings, so surviving intruders become more dangerous over time.',
};