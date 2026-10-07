import React from 'react';

const SCREENS = {
    'host-setup': ['Choose the roles, then open the room.', 'Sus Party host settings with one intruder selected and the Open Room button.'],
    'join-room': ['Friends join with the same four-letter code.', 'Sus Party join screen with an example room code entered.'],
    'party-lobby': ['Ten friends. One room. Nobody has an alibi yet.', 'Sus Party lobby with ten fictional players and a ready task list.', 860, 2200],
    'task-list': ['Every task has a place to happen.', 'Sus Party task editor with real-life activities assigned to the Kitchen, Living Room, and Hallway.'],
    'crew-task': ['A task, a location, and a reason to look busy.', 'Sus Party crew screen with an assigned real-life task and the slide-to-complete control.'],
    'next-task': ['Finish one mission. Your next task appears.', 'Sus Party crew screen after one task completion, with the next assignment and shared task progress.'],
    'intruder-objective': ['The intruder has a different mission.', 'Sus Party intruder objective screen with the Enter Vent control.'],
    'intruder-cards': ['Intruders have cards to disrupt the crew.', 'Sus Party intruder vent screen with sabotage cards and the Exit to Safety control.'],
    'eliminated-player': ['Out of the round. Keep the killer’s secret.', 'Sus Party eliminated-player screen with a fictional player name and the View Survivors control.'],
    'meeting-ready': ['Meet in person. Ready up on your phone.', 'Sus Party meeting screen with player readiness and the slide-to-ready control.'],
    vote: ['Compare alibis, then choose your suspect.', 'Sus Party voting screen with named players, live vote totals, and a veto option.'],
    'vote-result': ['The vote reveals who the group sent out.', 'Sus Party meeting result after the crew votes out an intruder.'],
    'crew-victory': ['The crew caught the intruder.', 'Sus Party crew victory screen with the exposed intruder and surviving players.'],
    'round-stats': ['See how the round went. Then play again.', 'Sus Party round statistics with completed tasks, meetings, and the Play Again control.'],
    'family-lobby': ['A small group can share one room.', 'Sus Party four-player lobby with fictional names and a ready task list.'],
    'cleanup-task': ['A real chore becomes a crew mission.', 'Sus Party crew screen with a cleanup task assigned to a room in the home.'],
    'cleanup-next-task': ['One job done. One less mess.', 'Sus Party cleanup game after a completed chore, with the next task and crew progress.'],
    reactor: ['An optional shared screen tracks the round.', 'Sus Party Reactor screen with living players and crew progress.', 2048, 1536],
    'reactor-meltdown': ['The crew enters codes before time runs out.', 'Sus Party Reactor meltdown screen with shutdown code inputs and a countdown.', 2048, 1536],
};

export default function GameplayScreenshots({ screens }) {
    return (
        <div className="seo-gameplay">
            <div className={`seo-gameplay__screens${screens.length === 1 ? ' seo-gameplay__screens--single' : ''}${screens.some(name => SCREENS[name][2] > SCREENS[name][3]) ? ' seo-gameplay__screens--wide' : ''}`}>
                {screens.map((name) => {
                    const [label, alt, width = 860, height = 1864] = SCREENS[name];
                    const src = `/images/gameplay/${name}.webp`;
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
            <p className="seo-gameplay__note">Example games with fictional players. Select a screen to view it full size.</p>
        </div>
    );
}
