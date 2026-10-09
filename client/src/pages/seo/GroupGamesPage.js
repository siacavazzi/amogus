import React from 'react';
import { usePageMeta } from '../../seo/usePageMeta';
import SeoPageLayout from './SeoPageLayout';
import GameplayScreenshots from './GameplayScreenshots';
import GameSetupCta from './GameSetupCta';

const SCHEMA = {
    '@context': 'https://schema.org', '@type': 'Article',
    headline: 'Party games for ten people at home',
    description: 'Choose a game for ten friends: room-to-room social deduction, charades, a paper clue game, or a seated Mafia round.',
    mainEntityOfPage: 'https://susparty.com/party-games-for-10-people',
    author: { '@type': 'Organization', name: 'Sus Party', url: 'https://susparty.com/' },
};

function GroupGamesPage() {
    usePageMeta({
        title: 'Party Games for 10 People at Home | Sus Party',
        description: 'Choose free party games for ten friends at home: charades, paper clues, Mafia, or Sus Party. Compare setups, then build a game with real tasks and phone browsers.',
        canonical: 'https://susparty.com/party-games-for-10-people', schema: SCHEMA,
    });

    return (
        <SeoPageLayout>
            <header className="seo-hero">
                <p className="seo-eyebrow">House party · Ten friends, one plan</p>
                <h1 className="seo-h1">Party games for 10 people at home</h1>
                <p className="seo-lead">
                    Ten people can become two teams of five, a circle of suspects, or a crew spread across the house.
                    Pick the format first. Here are four games you can run with friends, phones, or a few paper slips.
                </p>
                <div className="seo-actions">
                    <a href="#pick-a-game" className="seo-btn--primary">Choose tonight’s game →</a>
                    <a href="/among-us-irl-task-generator?venue=house&players=10&movement=normal" className="seo-btn--secondary">Set up Sus Party</a>
                </div>
            </header>
            <main className="seo-content">
                <section className="seo-section" id="pick-a-game">
                    <h2>What do you want the group to do?</h2>
                    <div className="seo-table-wrap">
                        <table className="seo-table">
                            <caption>Four free party-game formats for ten people</caption>
                            <thead><tr><th scope="col">Game</th><th scope="col">What you need</th><th scope="col">What the group does</th></tr></thead>
                            <tbody>
                                <tr><th scope="row"><a href="#sus-party">Sus Party</a></th><td>Phone browsers, internet, areas for tasks, and the task materials.</td><td>Complete tasks around the house, spot suspicious behavior, meet, and vote.</td></tr>
                                <tr><th scope="row"><a href="#charades">Charades</a></th><td>A timer and agreed prompts.</td><td>Two teams of five guess what a teammate acts out.</td></tr>
                                <tr><th scope="row"><a href="#paper-clues">Three-round paper clues</a></th><td>A bowl, paper slips, pens, and a timer.</td><td>Guess the same prompts through descriptions, one-word clues, and mime.</td></tr>
                                <tr><th scope="row"><a href="#mafia">Mafia / Werewolf</a></th><td>Secret role slips and one narrator.</td><td>Nine players discuss and vote while the tenth guides the night and day phases.</td></tr>
                            </tbody>
                        </table>
                    </div>
                    <p>Sus Party is our game. The other three are suggested house-rule formats that you can run without a purchase.</p>
                </section>
                <section className="seo-section" id="sus-party">
                    <h2>Sus Party: use the house as the game board</h2>
                    <p>
                        Choose this when the group wants to move between areas and argue about what actually happened there.
                        Each phone shows a private role and task list. Intruders blend in, eliminate crew members, and use sabotage cards.
                        Meetings bring everyone back together to discuss and vote.
                    </p>
                    <p>
                        For ten players, start with the <a href="/among-us-irl-task-generator?venue=house&players=10&movement=normal">ten-player house task pack</a>.
                        It suggests two intruders. Review the rooms and tasks, import the pack into a new room, then share the code.
                        The app needs everyone in the same place with internet. Use at least two locations so players have a route.
                    </p>
                    <p>Read the <a href="/how-to-play-among-us-irl">Sus Party round rules</a> before you start. Task completion reveals intruders; the crew still needs to vote them out.</p>
                </section>
                <GameplayScreenshots screens={['party-lobby', 'vote']} />

                <section className="seo-section" id="charades">
                    <h2>Charades: start before anyone opens a phone</h2>
                    <p>
                        Split into two teams of five. Agree on familiar films, objects, or actions as prompts.
                        One player acts without words while their team guesses. Use a one-minute timer, award one point for a correct guess,
                        and alternate teams. Give everyone a turn before you choose a winner.
                    </p>
                    <p>Use this as the first activity while guests arrive. Nobody needs to learn a role system or wait for a room code.</p>
                </section>
                <section className="seo-section" id="paper-clues">
                    <h2>Three-round paper clues: let the running jokes build</h2>
                    <p>
                        For this house version, each person writes three familiar names, objects, or phrases on slips.
                        Put them in a bowl and form two teams. In each one-minute turn, a clue-giver tries to get their team to guess as many slips as possible.
                        Each correct guess earns a point.
                    </p>
                    <ol className="seo-checklist">
                        <li>First round: describe the prompt without saying its words.</li>
                        <li>Return all slips to the bowl. Second round: give only one word for each prompt.</li>
                        <li>Return the slips again. Third round: mime the prompt without speech.</li>
                    </ol>
                    <p>Keep the same prompts across all three rounds. The memory of earlier clues becomes part of the game.</p>
                </section>
                <section className="seo-section" id="mafia">
                    <h2>Mafia / Werewolf: keep the whole game at the table</h2>
                    <p>
                        Choose a narrator and give the other nine players secret team roles. During the night, everyone closes their eyes;
                        the narrator wakes the hidden team to choose an elimination. During the day, the group discusses and votes on a suspect.
                        Agree on the role mix and each team’s win condition before the first night.
                    </p>
                    <p>
                        This format fits a group that wants accusations without devices or task stations.
                        Its trade-off is the narrator’s separate job and the time eliminated players spend outside the round.
                        For alternatives, compare the <a href="/social-deduction-games">in-person social deduction games</a>.
                    </p>
                </section>
                <GameSetupCta title="Make Sus Party the main event"
                    href="/among-us-irl-task-generator?venue=house&players=10&movement=normal" label="Build a ten-player game">
                    Pick a short warm-up, then use the house task pack for the full-group game. Change the areas, review the list, and take it into a new Sus Party room.
                </GameSetupCta>
                <section className="seo-section">
                    <h2>What if the guest count changes?</h2>
                    <p>
                        For Sus Party, change the player slider before you save the task pack. The generator covers five to fifteen players.
                        With an odd guest count in the team games, rotate one player’s timer or scorekeeper role between turns.
                        Decide the format once the guest list is clear, rather than split a group that wants to play together.
                    </p>
                </section>
                <nav className="seo-links" aria-label="More party plans">
                    <ul className="seo-links__list">
                        <li><a href="/among-us-birthday-party">Plan a birthday party game</a></li>
                        <li><a href="/among-us-irl-task-ideas#vacation-house-tasks">Choose tasks for a vacation house</a></li>
                        <li><a href="/among-us-irl-task-generator?venue=apartment&players=10">Prepare a room-to-room apartment setup</a></li>
                    </ul>
                </nav>
            </main>
        </SeoPageLayout>
    );
}

export default GroupGamesPage;
