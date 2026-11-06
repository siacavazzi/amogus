import React from 'react';

const SCREENS = {
    'host-setup': ['Choose how many intruders, then open the room.', 'Sus Party host settings with one intruder selected and the Open Room button.'],
    'join-room': ['Friends join with the same four-letter code.', 'Sus Party join screen with a room code entered.'],
    'name-screen': ['No account. Type a name and pick a face.', 'Sus Party name screen asking what to call the player.'],
    'party-lobby': ['Eight friends in the lobby, ready to start.', 'Sus Party lobby with eight fictional players and the Start Game button.'],
    'task-list': ['The example task list is ready to use, or write your own.', 'Sus Party lobby showing the room code, eight players, and the example task list.'],
    'role-crew': ['Your role is secret. Hold to peek at it.', 'Sus Party role screen showing the Crewmate role.'],
    'role-intruder': ['The intruder sees a different card.', 'Sus Party role screen showing the Intruder role and its cards.'],
    'crew-task': ['A real task, and the room it happens in.', 'Sus Party crewmate screen with a real-life task, its room, and the slide-to-complete control.'],
    'next-task': ['Slide when it is done. The next task appears.', 'Sus Party crewmate screen with the next task after one was completed.'],
    'intruder-objective': ['The intruder has a different mission.', 'Sus Party intruder screen with the Eliminate the crew objective and the Enter Vent button.'],
    'intruder-cards': ['Intruders hide sabotage cards in the vent.', 'Sus Party intruder vent screen with a sabotage card and the Close vent button.'],
    'phone-meltdown': ['A meltdown gives every phone a code to type in.', 'Sus Party phone during a meltdown, showing a countdown and a four-digit code.'],
    'eliminated-player': ['Out of the round. Keep the killer’s secret.', 'Sus Party eliminated-player screen with the View Survivors button.'],
    'meeting-ready': ['Meet in person. Slide when you get there.', 'Sus Party emergency meeting screen showing who called it and who is ready.'],
    vote: ['Talk it out, then tap who you think it is.', 'Sus Party voting screen with each player’s face and name to tap.'],
    'vote-result': ['The vote shows who the group sent out.', 'Sus Party result screen after a vote: the player sent out was an intruder.'],
    'crew-victory': ['The crew caught the intruder.', 'Sus Party crew victory screen showing the intruder and the Play Again button.'],
    'round-stats': ['See how the round went, then play again.', 'Sus Party round summary with who was lost, the survivors, and game stats.'],
    'family-lobby': ['A small group works too.', 'Sus Party four-player lobby with fictional names and a ready task list.'],
    'cleanup-task': ['A real chore becomes a crew task.', 'Sus Party crew screen with a cleanup task assigned to a room in the home.'],
    'cleanup-next-task': ['One chore done. The next one appears.', 'Sus Party cleanup game after a completed chore, with the next task and crew progress.'],
    reactor: ['An optional laptop screen tracks the round.', 'Sus Party reactor screen with crew task progress.', 2048, 1536],
    'reactor-lobby': ['Open the reactor on a laptop. Guests scan the code to join.', 'Sus Party reactor lobby with the room code, a QR code, and eight players.', 2048, 1536],
    'reactor-meeting': ['Meetings show up on the laptop too.', 'Sus Party reactor during an emergency meeting, showing who is ready.', 2048, 1536],
    'reactor-meltdown': ['Type the codes in before time runs out.', 'Sus Party reactor meltdown screen with a countdown and shutdown code boxes.', 2048, 1536],
};

export default function GameplayScreenshots({ screens }) {
    return (
        <div className="seo-gameplay">
            <div className={`seo-gameplay__screens${screens.length === 1 ? ' seo-gameplay__screens--single' : ''}${screens.some(name => SCREENS[name][2] > SCREENS[name][3]) ? ' seo-gameplay__screens--wide' : ''}`}>
                {screens.map((name) => {
                    const [label, alt, width = 860, height = 1864, signalSrc] = SCREENS[name];
                    const src = signalSrc || `/images/gameplay/${name}.webp`;
                    return (
                        <figure className="seo-gameplay__figure" key={name}>
                            <a href={src} target="_blank" rel="noopener noreferrer" aria-label={`View full-size screenshot: ${label}`}>
                                <img src={src} alt={alt} width={width} height={height} loading="lazy" decoding="async" />
                            </a>
                            <figcaption>{label}</figcaption>
                        </figure>
                    );
                })}
            </div>
            <p className="seo-gameplay__note">Real screens from a test game with made-up players. Tap one to see it full size.</p>
        </div>
    );
}

// The round in five phone screens, shown under each page's headline so a visitor sees the game
// before reading about it. Small images (430 px) for the strip, the full 860 px on tap.
export const TOUR_STEPS = [
    ['role-crew', 'Everyone gets a secret role.', 'Phone screen showing a secret role: Crewmate.'],
    ['crew-task', 'The crew does real tasks around the house.', 'Phone screen with a real-life task and the room it is in.'],
    ['intruder-cards', 'Intruders fake tasks and play sabotage cards.', 'Intruder phone screen in the vent, showing a sabotage card.'],
    ['meeting-ready', 'Find a body? Everyone meets up.', 'Phone screen for an emergency meeting, showing who has arrived.'],
    ['vote', 'Talk it out, then vote someone out.', 'Voting screen with every player’s face to tap.'],
];
const CHORE_STEP = ['cleanup-task', 'Each task is a real chore.', 'Phone screen with a cleanup chore and the room it is in.'];

export function GameTour({ title = 'What a round looks like', steps, variant, lang }) {
    const shown = steps || (variant === 'chores'
        ? TOUR_STEPS.map(step => (step[0] === 'crew-task' ? CHORE_STEP : step))
        : TOUR_STEPS);
    return (
        <section className="seo-tour" aria-label={title}>
            <p className="seo-tour__title">{title}</p>
            <ol className="seo-tour__steps">
                {shown.map(([name, caption, alt], i) => {
                    const file = lang && name !== 'cleanup-task' ? `${name}.${lang}` : name;
                    const small = `/images/gameplay/sm/${file}.webp`;
                    const full = `/images/gameplay/${file}.webp`;
                    return (
                        <li className="seo-tour__step" key={name}>
                            <a href={full} target="_blank" rel="noopener noreferrer">
                                <img src={small} srcSet={`${small} 430w, ${full} 860w`}
                                    sizes="(max-width: 700px) 62vw, 200px"
                                    alt={alt} width="430" height="932" loading="lazy" decoding="async" />
                            </a>
                            <p><span className="seo-tour__num" aria-hidden="true">{i + 1}</span>{caption}</p>
                        </li>
                    );
                })}
            </ol>
        </section>
    );
}
