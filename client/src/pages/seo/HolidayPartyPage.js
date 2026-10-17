import React from 'react';
import { usePageMeta } from '../../seo/usePageMeta';
import SeoPageLayout from './SeoPageLayout';
import GameplayScreenshots from './GameplayScreenshots';
import GameSetupCta from './GameSetupCta';

const CANONICAL = 'https://susparty.com/holiday-party-games-for-adults';
const TASKS_URL = '/among-us-irl-task-generator?venue=house&players=10';
const OFFICE_URL = '/among-us-irl-task-generator?venue=office&players=12';
const DESCRIPTION = 'Christmas party games for adults that get guests moving: a secret-intruder game with holiday tasks, an office party version, and a host plan. Free to play.';
const SCHEMA = {
    '@context': 'https://schema.org', '@type': 'Article',
    headline: 'Holiday party games for adults: a secret-intruder game', description: DESCRIPTION,
    mainEntityOfPage: CANONICAL,
    author: { '@type': 'Organization', name: 'Sus Party', url: 'https://susparty.com/' },
};

export default function HolidayPartyPage() {
    usePageMeta({
        title: 'Christmas Party Games for Adults at Home | Sus Party',
        description: DESCRIPTION, canonical: CANONICAL, schema: SCHEMA,
    });

    return (
        <SeoPageLayout>
            <header className="seo-hero">
                <p className="seo-eyebrow">Holiday host guide · Someone is not wrapping that gift</p>
                <h1 className="seo-h1">Christmas party games for adults: a secret-intruder game for the whole house</h1>
                <p className="seo-lead">
                    Most holiday parties stall in the same spot: everyone has eaten, nobody wants to move, and the gift exchange is over in ten minutes.
                    A secret-intruder game fixes that. Guests split up to do small holiday tasks around the house, one or two of them are secretly working against the group,
                    and the whole party meets by the tree to argue about who it was. This guide works for Christmas, an office holiday party, Friendsgiving, or New Year’s Eve.
                </p>
                <div className="seo-actions">
                    <a href={TASKS_URL} className="seo-btn--primary">Build a holiday task pack →</a>
                    <a href="#host-plan" className="seo-btn--secondary">Read the host plan</a>
                </div>
            </header>
            <main className="seo-content">
                <section className="seo-section">
                    <h2>Why a moving-around game suits a holiday party</h2>
                    <p>
                        Holiday groups are mixed. You get old friends, partners who know nobody, coworkers from other teams, and a cousin who only came for the food.
                        Sit-down games favor the loudest people at the table. A game where people walk between rooms gives everyone a small job and a reason to talk.
                    </p>
                    <ul className="seo-list">
                        <li><strong>It breaks up the couch.</strong> Players move between the kitchen, the tree, and the coat rack, so new pairs form naturally.</li>
                        <li><strong>Quiet guests still play.</strong> A crew member who never says a word still helps by finishing tasks, which exposes the intruders.</li>
                        <li><strong>Late arrivals are easy.</strong> Rounds are short. New guests join the next one.</li>
                        <li><strong>The meetings are the fun part.</strong> “You were at the tree for five minutes and the ornament is still in the box” is a better story than any trivia answer.</li>
                    </ul>
                    <p>
                        The format comes from the Among Us video game: a crew finishes tasks while hidden intruders blend in and eliminate players.
                        Playing it in real life is often called Among Us IRL. Sus Party is an Among Us-inspired browser game that runs this at home, with no affiliation to the original.
                    </p>
                </section>

                <section className="seo-section">
                    <h2>Holiday task ideas by room</h2>
                    <p>
                        A good task has one location, one clear finish, and a quick reset for the next player. Keep each one to about a minute.
                        Use materials you already have out for the party.
                    </p>
                    <div className="seo-cards seo-cards--3">
                        <article className="seo-card"><h3>Gift table: wrap the decoy</h3><p>Leave a small empty box, a sheet of reused paper, and tape. Wrap it, then unwrap it and fold the paper for the next player.</p></article>
                        <article className="seo-card"><h3>Tree: hang the ornament</h3><p>Keep three unbreakable ornaments in a bowl. Hang one on a branch, then move a different one back to the bowl.</p></article>
                        <article className="seo-card"><h3>Living room: find the candy cane</h3><p>Hide a candy cane in one of five marked spots. The finder writes the spot on a card and hides it somewhere else on the list.</p></article>
                        <article className="seo-card"><h3>Kitchen: count the cookies</h3><p>Count the cookies on one tray without eating any. Write the number on your own slip of paper.</p></article>
                        <article className="seo-card"><h3>Hallway: untangle the lights</h3><p>Leave a short, unplugged string of lights in a loose knot. Untangle it, then loosely coil it again.</p></article>
                        <article className="seo-card"><h3>Coat rack: match the mittens</h3><p>Mix four pairs of gloves or socks in a basket. Pair them up, then mix them for the next player.</p></article>
                    </div>
                    <p>
                        For Friendsgiving, swap in tasks like folding napkins or setting one place at the table. For New Year’s Eve, use “write a resolution on a slip and drop it in the jar”
                        or “set the countdown clock.” The <a href="/among-us-irl-task-ideas">task ideas by room</a> page has more you can adapt.
                        The app trusts players to mark tasks complete. It does not check their work, which is exactly what gives an intruder room to fake it.
                    </p>
                </section>

                <GameplayScreenshots screens={['party-lobby', 'meeting-ready']} />

                <section className="seo-section" id="host-plan">
                    <h2>Host plan for a holiday game night</h2>
                    <ol className="seo-steps">
                        <li className="seo-step"><span className="seo-step__num" aria-hidden="true">1</span><div>
                            <h3>The day before: pick rooms and tasks</h3>
                            <p>Choose three or four shared areas. Open the <a href={TASKS_URL}>house task generator for ten players</a>, set your guest count and rooms, and edit the tasks to match your decorations. Set out the materials.</p>
                        </div></li>
                        <li className="seo-step"><span className="seo-step__num" aria-hidden="true">2</span><div>
                            <h3>After dinner: gather by the tree</h3>
                            <p>Pick one meeting spot everyone can reach in a few seconds. Create the room, import the task pack, and share the four-letter code. Every player needs a phone browser and internet. You play too.</p>
                        </div></li>
                        <li className="seo-step"><span className="seo-step__num" aria-hidden="true">3</span><div>
                            <h3>Explain in two minutes</h3>
                            <p>Cover four things: how to complete a task, how a meeting starts, what an elimination looks like, and how voting works. The <a href="/how-to-play">how to play</a> page covers the basics.</p>
                        </div></li>
                        <li className="seo-step"><span className="seo-step__num" aria-hidden="true">4</span><div>
                            <h3>Play two or three rounds</h3>
                            <p>Take a break for dessert or gifts between rounds. Swap out any task that confused people. Stop while the group still wants one more.</p>
                        </div></li>
                    </ol>
                    <p>
                        An old laptop or the TV can show the optional Reactor display, which tracks crew progress for the room. It is a nice touch but not required.
                    </p>
                </section>

                <section className="seo-section">
                    <h2>Running it as an office holiday party game</h2>
                    <p>
                        A secret-intruder game works well at work because it is social without being personal. Nobody has to share a story, sing, or drink.
                        A few rules keep it comfortable for everyone.
                    </p>
                    <ul className="seo-list">
                        <li><strong>Keep alcohol optional.</strong> Nothing in the game depends on drinking. Do not make any task or penalty a drink.</li>
                        <li><strong>Keep tasks low-contact.</strong> Use tasks people do alone at a station, such as sorting cards or copying a symbol. Skip anything that involves touching someone.</li>
                        <li><strong>Make walking optional.</strong> Place stations close together and at table height. Anyone who would rather not move much can be a strong voice in meetings.</li>
                        <li><strong>Use the space you have.</strong> A conference area, break room, and open desk zone are enough. Try the <a href={OFFICE_URL}>office task generator for twelve players</a>.</li>
                        <li><strong>Set a clear end time.</strong> Book a fixed slot, such as 45 minutes, and stop when it ends.</li>
                    </ul>
                    <p>
                        For larger teams, run the game with one group while others mingle, then rotate. Keep sabotage in the app; nobody needs to hide items or block a door in a shared office.
                    </p>
                </section>

                <GameSetupCta title="Set up your holiday game" href={TASKS_URL} label="Prepare tasks for ten guests">
                    This opens the house preset with ten players. Change the guest count and rooms, swap in your holiday tasks, then carry the pack into host setup.
                </GameSetupCta>

                <section className="seo-section">
                    <h2>Other holiday party games for groups</h2>
                    <p>A secret-intruder game is one option. Mix it with a lighter game so the night has a warm-up and a cool-down.</p>
                    <div className="seo-table-wrap">
                        <table className="seo-table seo-table--plain">
                            <caption>Holiday party games for groups, compared</caption>
                            <thead><tr><th scope="col">Game</th><th scope="col">Best for</th><th scope="col">What you need</th></tr></thead>
                            <tbody>
                                <tr><th scope="row">White elephant gift swap</th><td>Any group with a set gift budget</td><td>One wrapped gift per person and numbered slips</td></tr>
                                <tr><th scope="row">Holiday charades</th><td>A warm-up while guests arrive</td><td>Prompt slips such as movies or songs, and a timer</td></tr>
                                <tr><th scope="row">Name that holiday song</th><td>Mixed ages, low effort</td><td>A playlist and a speaker</td></tr>
                                <tr><th scope="row">Secret-intruder game</th><td>Six or more players who like a little drama</td><td>Phones, internet, and a few rooms</td></tr>
                            </tbody>
                        </table>
                    </div>
                    <p>
                        For more ideas, see our <a href="/party-games-for-adults">party games for adults</a>, the <a href="/party-games-for-10-people">games for ten people</a> guide,
                        and the <a href="/game-night-ideas">game night ideas</a> list.
                    </p>
                </section>

                <section className="seo-section">
                    <h2>Small things that make the night smoother</h2>
                    <ul className="seo-list">
                        <li>Keep tasks away from the stove, candles, and anything fragile on the tree.</li>
                        <li>Pick a spot where eliminated players wait. They stay quiet about what they saw.</li>
                        <li>Check that the Wi-Fi reaches every task area before guests arrive.</li>
                        <li>For three to five players, use one intruder and fewer rooms so players cross paths.</li>
                    </ul>
                </section>

                <nav className="seo-links" aria-label="More help for the host">
                    <p className="seo-links__title">Before you share the code</p>
                    <ul className="seo-links__list">
                        <li><a href="/how-to-play">Learn the basic rules</a></li>
                        <li><a href="/among-us-irl-task-ideas">Browse more task ideas by room</a></li>
                        <li><a href="/party-games-for-adults">Compare other party games for adults</a></li>
                    </ul>
                </nav>
            </main>
        </SeoPageLayout>
    );
}
