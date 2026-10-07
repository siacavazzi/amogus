import React from 'react';
import { usePageMeta } from '../../seo/usePageMeta';
import SeoPageLayout from './SeoPageLayout';
import GameplayScreenshots from './GameplayScreenshots';
import GameSetupCta from './GameSetupCta';

const SCHEMA = {
    '@context': 'https://schema.org', '@type': 'Article',
    headline: 'Social deduction games to play in person',
    description: 'Choose a social deduction game for your group: real-room tasks, hidden-role cards, location clues, or a shared-screen game.',
    mainEntityOfPage: 'https://susparty.com/social-deduction-games',
    author: { '@type': 'Organization', name: 'Sus Party', url: 'https://susparty.com/' },
};

function SocialDeductionPage() {
    usePageMeta({
        title: 'Social Deduction Games to Play in Person | Sus Party',
        description: 'Find a social deduction game for a room full of friends. Compare Sus Party, Spyfall, One Night Ultimate Werewolf, and Push the Button, then set up a free game.',
        canonical: 'https://susparty.com/social-deduction-games', schema: SCHEMA,
    });

    return (
        <SeoPageLayout>
            <header className="seo-hero">
                <p className="seo-eyebrow">Game night · Hidden roles and very suspicious friends</p>
                <h1 className="seo-h1">Social deduction games to play in person</h1>
                <p className="seo-lead">
                    A friend gives a perfect explanation for being in the kitchen. Someone else saw them in the hallway.
                    Now the whole room has to decide which story holds up. Choose a game that gives your group something to argue about.
                </p>
                <div className="seo-actions">
                    <a href="/among-us-irl-task-generator?venue=house&players=8&movement=normal" className="seo-btn--primary">Set up a free Sus Party game →</a>
                    <a href="#choose-a-game" className="seo-btn--secondary">Compare the games</a>
                </div>
            </header>
            <main className="seo-content">
                <section className="seo-section">
                    <h2>What makes a game a social deduction game?</h2>
                    <p>
                        Some players know something that the others do not: a secret role, a location, or who belongs to their team.
                        The group uses questions, actions, and votes to work out who to trust. A convincing story can be a lie.
                        A nervous player can be innocent.
                    </p>
                    <p>
                        The useful choice is where your evidence comes from. Spyfall gives you answers to questions.
                        One Night Ultimate Werewolf gives you hidden roles and night actions. Sus Party gives you a real space,
                        task lists, and the chance to notice who went where before everyone meets to vote.
                    </p>
                </section>
                <section className="seo-section" id="choose-a-game">
                    <h2>Choose the format that fits tonight</h2>
                    <p>We make Sus Party. Start with your group size and whether everyone wants to move or stay seated.</p>
                    <div className="seo-table-wrap">
                        <table className="seo-table">
                            <caption>In-person social deduction games compared</caption>
                            <thead><tr><th scope="col">Game</th><th scope="col">Group and equipment</th><th scope="col">Choose it when…</th></tr></thead>
                            <tbody>
                                <tr><th scope="row">Sus Party</th><td>A phone browser and internet for each player. The task generator prepares groups of 5–15.</td><td>You want to use your house as the map, complete real tasks, and gather for accusations. Free.</td></tr>
                                <tr><th scope="row"><a href="https://cryptozoic.com/products/spyfall-game" target="_blank" rel="noopener noreferrer">Spyfall</a></th><td>3–8 players and the card game.</td><td>You want a seated game of careful questions. One spy does not know the location that everyone else shares.</td></tr>
                                <tr><th scope="row"><a href="https://beziergames.com/products/one-night-ultimate-werewolf" target="_blank" rel="noopener noreferrer">One Night Ultimate Werewolf</a></th><td>3–10 players and the game. No moderator required.</td><td>You want a short hidden-role round without player elimination. The publisher describes games of about ten minutes.</td></tr>
                                <tr><th scope="row"><a href="https://www.jackboxgames.com/games/push-the-button" target="_blank" rel="noopener noreferrer">Push the Button</a></th><td>4–10 players, a shared display, phones, and a copy of The Jackbox Party Pack 6.</td><td>You want to judge suspicious answers and drawings on a screen instead of set up physical tasks.</td></tr>
                            </tbody>
                        </table>
                    </div>
                    <p>The linked publisher pages supply the player counts and game details. Sus Party has no fixed 15-player cap.</p>
                </section>
                <section className="seo-section">
                    <h2>How a Sus Party round creates clues</h2>
                    <p>
                        In a sample house setup, one task sends a player to count coasters at the dining table.
                        Another sends someone to read a book title in the living room. An intruder has to look busy while the crew follows its lists.
                        When a meeting starts, “I was doing a task” becomes a claim that other players can question.
                    </p>
                    <p>
                        The phones assign roles, show tasks, and collect votes. The conversation happens in person.
                        Intruders also have sabotage cards. When the crew reaches its task goal, the app reveals living intruders;
                        the crew still has to vote them out. Read the <a href="/how-to-play-among-us-irl">round and vote rules</a> before your first game.
                    </p>
                </section>
                <GameplayScreenshots screens={['intruder-cards', 'vote']} />

                <GameSetupCta title="Turn the rooms you already have into a game"
                    href="/among-us-irl-task-generator?venue=house&players=8&movement=normal" label="Build an eight-player house setup">
                    Choose your areas, review a task pack, then select “Use these tasks in a new game.” Create the room and select “Import generated tasks” in host setup.
                </GameSetupCta>
                <section className="seo-section">
                    <h2>Can we play without a board or a paid app?</h2>
                    <p>
                        Yes. Sus Party runs free in phone browsers. You supply the people, internet, and a few materials for the tasks you choose.
                        A paper version of Mafia or Werewolf is another option if someone can narrate the round.
                        For a group with no phones or internet, that format avoids Sus Party’s device requirement.
                    </p>
                    <h3>What if we only have one room?</h3>
                    <p>
                        Choose a seated card game, or use Sus Party’s <a href="/among-us-irl-task-generator?venue=other&players=8&movement=low">two-station task preset</a>.
                        Two table stations can share one room. Review the tasks with the group and keep the meeting point nearby.
                    </p>
                    <h3>Is this the imposter word game?</h3>
                    <p>
                        No. Sus Party uses physical tasks, intruders, sabotage, and votes.
                        The word-game format gives most players a shared word and asks them to detect the player who does not know it.
                    </p>
                </section>
                <nav className="seo-links" aria-label="Plan your game night">
                    <p className="seo-links__title">Pick your occasion</p>
                    <ul className="seo-links__list">
                        <li><a href="/party-games-for-10-people">Party games for ten people at home</a></li>
                        <li><a href="/among-us-birthday-party">An Among Us-inspired birthday game</a></li>
                        <li><a href="/among-us-irl">Play Among Us in real life with Sus Party</a></li>
                    </ul>
                </nav>
            </main>
        </SeoPageLayout>
    );
}

export default SocialDeductionPage;
