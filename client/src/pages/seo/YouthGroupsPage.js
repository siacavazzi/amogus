import React from 'react';
import { usePageMeta } from '../../seo/usePageMeta';
import SeoPageLayout from './SeoPageLayout';
import GameplayScreenshots from './GameplayScreenshots';
import GameSetupCta from './GameSetupCta';

const CANONICAL = 'https://susparty.com/among-us-irl-for-youth-groups';
const GENERATOR_URL = '/among-us-irl-task-generator?venue=school&players=12&style=mix';
const DESCRIPTION = 'Run Among Us IRL for a youth group, library program, or classroom. A 60 to 90 minute plan with space setup, group sizes, device rules, and a safe task list.';
const SCHEMA = {
    '@context': 'https://schema.org', '@type': 'Article',
    headline: 'Among Us in Real Life for Libraries, Classrooms and Youth Groups',
    description: DESCRIPTION,
    mainEntityOfPage: CANONICAL,
    author: { '@type': 'Organization', name: 'Sus Party', url: 'https://susparty.com/' },
};

export default function YouthGroupsPage() {
    usePageMeta({
        title: 'Among Us IRL for Youth Groups and Libraries | Sus Party',
        description: DESCRIPTION, canonical: CANONICAL, schema: SCHEMA,
    });
    return (
        <SeoPageLayout>
            <header className="seo-hero">
                <p className="seo-eyebrow">Program guide · Libraries, classrooms, youth groups, camps</p>
                <h1 className="seo-h1">Among Us IRL for youth groups, libraries and classrooms</h1>
                <p className="seo-lead">
                    A real-life Among Us-inspired game fits a library program, a club meeting, or a youth group game night.
                    Players walk to simple tasks, watch each other, and argue their case at a meeting.
                    This guide gives you a session plan, room setup, device rules, and a task list with no running and no moving furniture.
                </p>
                <div className="seo-actions">
                    <a href={GENERATOR_URL} className="seo-btn--primary">Build a task list for your space →</a>
                    <a href="#program-plan" className="seo-btn--secondary">See the 60 to 90 minute plan</a>
                </div>
            </header>
            <main className="seo-content">
                <section className="seo-section">
                    <h2>How the game works in a group setting</h2>
                    <p>
                        Most players are crew. A few are secretly intruders. The crew completes small tasks in different parts of the room.
                        Intruders pretend to do tasks and try to stay hidden. When someone calls a meeting, everyone gathers, shares what they saw, and votes on who to remove.
                        The crew finishes tasks to expose the intruders, then wins by voting out every intruder.
                    </p>
                    <p>
                        You can run this with paper role slips and a whiteboard. Sus Party is the easier option for most groups:
                        it deals private roles, tracks tasks, and runs the votes in each player’s phone browser. There is no account and no install.
                        For the full rules, read <a href="/how-to-play-among-us-irl">how to play Among Us IRL</a> or the <a href="/how-to-play">Sus Party host guide</a>.
                    </p>
                </section>

                <section className="seo-section">
                    <h2>Group size and devices</h2>
                    <p>
                        One game room can hold the whole group, even with 20 or more players.
                        With 20 or more players, open the game on a laptop, TV or projector first so the room code and every meeting show on a big screen,
                        and use three or four intruders. If you have several leaders and separate spaces, two smaller games side by side also work
                        and give each player more tasks.
                    </p>
                    <p>
                        In Sus Party, each player needs a browser and internet. Check the Wi-Fi before the session. Some library and school networks block game sites,
                        so test the page on the network you will use. If not every player has a phone, you have three honest options:
                    </p>
                    <ul className="seo-list">
                        <li>Use library tablets or classroom laptops for players without phones. A laptop is harder to carry, so keep its tasks close by.</li>
                        <li>Play in pairs. Two players share one device and one role. They act as a team and must agree before they vote.</li>
                        <li>Skip the app and deal paper roles with the <a href="/among-us-role-generator">role generator</a>, then run tasks and votes by hand.</li>
                    </ul>
                    <p>
                        Set a device rule at the start: screens stay on the game, and phones stay in hands or pockets, not on the floor or furniture.
                    </p>
                </section>

                <GameplayScreenshots screens={['join-room', 'meeting-ready']} />

                <section className="seo-section" id="program-plan">
                    <h2>A 60 to 90 minute program plan</h2>
                    <ol className="seo-steps">
                        <li className="seo-step"><span className="seo-step__num" aria-hidden="true">1</span><div>
                            <h3>Welcome and rules (10 minutes)</h3>
                            <p>Explain roles, tasks, meetings, and voting. Show the meeting point and the boundaries. Ask two volunteers to act out a fake meeting so everyone sees how it works.</p>
                        </div></li>
                        <li className="seo-step"><span className="seo-step__num" aria-hidden="true">2</span><div>
                            <h3>Join and practice (10 minutes)</h3>
                            <p>Put the room code on a board. Let everyone join, then play a short practice round with one intruder and the roles revealed after. Answer questions.</p>
                        </div></li>
                        <li className="seo-step"><span className="seo-step__num" aria-hidden="true">3</span><div>
                            <h3>Main rounds (30 to 50 minutes)</h3>
                            <p>Play two to four rounds of 10 to 15 minutes. Use one intruder for small groups and two for groups of eight or more. Rotate who hosts if you have older students.</p>
                        </div></li>
                        <li className="seo-step"><span className="seo-step__num" aria-hidden="true">4</span><div>
                            <h3>Debrief (10 to 15 minutes)</h3>
                            <p>Sit in a circle. Ask what evidence convinced people, which arguments worked, and what the intruders did to blend in. End on time, not mid-round.</p>
                        </div></li>
                    </ol>
                    <p>
                        For a 60 minute slot, cut the practice round to a walkthrough and play two main rounds. For 90 minutes, add a round where players suggest one new task.
                    </p>
                </section>

                <section className="seo-section">
                    <h2>Set up the space</h2>
                    <p>
                        Pick three to five task zones you can see from one spot, such as a reading corner, a table cluster, a shelf end, and a whiteboard.
                        A long hallway or a separate room makes supervision harder, so only use it with a second adult. Choose one meeting point with enough chairs or floor space for a circle.
                    </p>
                    <p>
                        Mark the boundaries with signs or tape on the floor. Tell players which areas are off limits: staff desks, exits, stairwells, bathrooms, and anywhere other patrons are working.
                        In a public library, schedule the game for a program room or after hours if you can. If you have a projector, the optional Reactor display can show progress to the whole group.
                    </p>
                </section>

                <section className="seo-section">
                    <h2>Rules to state before the first round</h2>
                    <ul className="seo-checklist">
                        <li>Walk at all times. No running, even during a meeting call.</li>
                        <li>Do not move furniture, books, or equipment unless a task says so.</li>
                        <li>No grabbing, pushing, or blocking. Eliminations and sabotage happen in the app only.</li>
                        <li>Stay inside the marked zones.</li>
                        <li>At a meeting, one person speaks at a time. Accuse the play, not the person.</li>
                        <li>Eliminated players stay quiet about clues until the round ends.</li>
                        <li>Inside voices if the library is open to the public.</li>
                    </ul>
                </section>

                <section className="seo-section">
                    <h2>Sample task list for a library or classroom</h2>
                    <p>Every task here is quiet, seated or standing, and leaves the room as it was. Reset any shared items before the next player arrives.</p>
                    <div className="seo-cards seo-cards--3">
                        <article className="seo-card"><h3>Shelf end: find the call number</h3><p>Find a book from a call number on a card. Read the first word of its title, then leave it on the shelf.</p></article>
                        <article className="seo-card"><h3>Table: sort the cards</h3><p>Put six numbered cards in order, then shuffle them face down for the next player.</p></article>
                        <article className="seo-card"><h3>Whiteboard: copy the code</h3><p>Copy a five-symbol code from the board onto your own scrap paper.</p></article>
                        <article className="seo-card"><h3>Reading corner: count the cushions</h3><p>Count the cushions or chairs in the corner without moving them. Remember the number.</p></article>
                        <article className="seo-card"><h3>Bulletin board: find the date</h3><p>Find the earliest date on any notice and write it down.</p></article>
                        <article className="seo-card"><h3>Puzzle table: solve one line</h3><p>Answer one simple math or word clue taped to the table. Leave the clue in place.</p></article>
                    </div>
                    <p>
                        Need more? The <a href={GENERATOR_URL}>task generator</a> has a school preset you can edit for your room names and group size.
                        For a paper version, use the <a href="/among-us-task-cards-printable">printable task cards</a>.
                    </p>
                </section>

                <section className="seo-section">
                    <h2>Supervision and age notes</h2>
                    <p>
                        Plan for one adult per game room. That adult watches the zones, answers rule questions, and calls a pause if play gets rough.
                        For players around 8 to 10, use fewer tasks, one intruder, and read tasks aloud if needed. Teens can handle two intruders and longer meetings.
                    </p>
                    <p>
                        Watch for players who are voted out early every round. Rotate roles, keep rounds short, and give eliminated players a job, such as timekeeper for the next meeting.
                        Check your organization’s device and internet policies before you plan the session, and get permission for phone use where it is required.
                    </p>
                </section>

                <section className="seo-section">
                    <h2>What players practice</h2>
                    <ul className="seo-list">
                        <li><strong>Reasoning.</strong> Players connect who was where and when, and test claims against what they saw.</li>
                        <li><strong>Persuasion.</strong> At each meeting, players make a short case with evidence and respond to counterarguments.</li>
                        <li><strong>Teamwork.</strong> The crew shares information and decides together. In pairs, partners must agree on a vote.</li>
                        <li><strong>Listening.</strong> The one-speaker rule gives quiet players a turn.</li>
                    </ul>
                    <p>
                        For a classroom, tie the debrief to a lesson. Ask students to name one claim that had evidence and one that did not.
                        For more games in this style, see the <a href="/social-deduction-games">social deduction games guide</a>.
                    </p>
                </section>

                <nav className="seo-links" aria-label="More help for group leaders">
                    <p className="seo-links__title">Before your session</p>
                    <ul className="seo-links__list">
                        <li><a href="/how-to-play-among-us-irl">Read the full rules and a sample round</a></li>
                        <li><a href="/among-us-role-generator">Deal roles for groups without phones</a></li>
                        <li><a href="/among-us-task-cards-printable">Print task cards for your stations</a></li>
                        <li><a href="/social-deduction-games">Compare other social deduction games</a></li>
                    </ul>
                </nav>

                <GameSetupCta title="Plan your group’s first round"
                    href={GENERATOR_URL} label="Build a task list for twelve players">
                    This opens the school preset for twelve players. Rename the areas to match your library or classroom, remove anything that needs running or moving furniture, then take it into host setup.
                </GameSetupCta>
            </main>
        </SeoPageLayout>
    );
}
