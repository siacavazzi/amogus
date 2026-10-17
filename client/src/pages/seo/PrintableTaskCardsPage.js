import React from 'react';
import { usePageMeta } from '../../seo/usePageMeta';
import SeoPageLayout from './SeoPageLayout';
import GameplayScreenshots from './GameplayScreenshots';
import GameSetupCta from './GameSetupCta';
import { TASKS, VENUE_ROOMS } from './taskPools';
import './PrintableTaskCards.css';

const CANONICAL = 'https://susparty.com/among-us-task-cards-printable';
const GENERATOR_URL = '/among-us-irl-task-generator?venue=house&players=8&style=mix';
const DESCRIPTION = 'Free printable Among Us task cards: 24 room task cards, Crew and Intruder role cards, and a meeting card. Print them, or run the game on phones instead.';
const SCHEMA = {
    '@context': 'https://schema.org', '@type': 'Article',
    headline: 'Printable Among Us Task Cards (and a Phone Version)', description: DESCRIPTION,
    mainEntityOfPage: CANONICAL,
    author: { '@type': 'Organization', name: 'Sus Party', url: 'https://susparty.com/' },
};

// Fixed subset of the house rooms that have their own task pools. No randomness, so the
// prerendered HTML matches what the browser renders.
const ROOM_KEYS = { Kitchen: 'kitchen', 'Living Room': 'living_room', Hallway: 'hallway', Bedroom: 'bedroom', 'Garden / Outdoor': 'outdoor' };
const ROOM_CARDS = VENUE_ROOMS.house
    .filter(room => ROOM_KEYS[room])
    .flatMap(room => TASKS[ROOM_KEYS[room]].slice(0, 4).map(({ task }) => ({ room, task })));
const ANY_ROOM_CARDS = [0, 7, 9, 16].map(index => ({ room: 'Any room', task: TASKS.funny[index].task }));
const TASK_CARDS = [...ROOM_CARDS, ...ANY_ROOM_CARDS];

const SPECIAL_CARDS = [
    { kind: 'crew', label: 'Secret role', title: 'Crew', text: 'Finish your task cards and tick each box. Report anyone you find tagged out. Find the intruder and vote them out.' },
    { kind: 'intruder', label: 'Secret role', title: 'Intruder', text: 'Pretend to do your tasks. Tag a crew member on the shoulder when nobody is watching. Stay calm in meetings.' },
    { kind: 'meeting', label: 'Call it once', title: 'Emergency meeting', text: 'Everyone stops and walks to the meeting point. Talk for 90 seconds, then vote. Most votes is out. A tie means nobody leaves.' },
];

function printCards() {
    if (typeof window !== 'undefined') window.print();
}

export default function PrintableTaskCardsPage() {
    usePageMeta({
        title: 'Among Us Task Cards Printable (Free Set) | Sus Party',
        description: DESCRIPTION, canonical: CANONICAL, schema: SCHEMA,
    });
    return (
        <SeoPageLayout className="ptc-page">
            <header className="seo-hero">
                <p className="seo-eyebrow">Among Us task cards printable · Paper or phones</p>
                <h1 className="seo-h1">Printable Among Us task cards (and a phone version)</h1>
                <p className="seo-lead">
                    This page is a free among us task cards printable set for an Among Us IRL game at home.
                    You get 24 task cards with a room and a checkbox, two role cards, and an emergency meeting card.
                    Print the sheet, cut it up, and play. If you would rather skip the scissors, the same game runs on
                    everyone’s phone with Sus Party.
                </p>
                <div className="seo-actions">
                    <button type="button" className="seo-btn--primary ptc-print-btn" onClick={printCards}>Print the cards</button>
                    <a href="#how-to-play-paper" className="seo-btn--secondary">How to run a paper game</a>
                </div>
            </header>
            <main className="seo-content">
                <section className="ptc-sheet" aria-labelledby="ptc-sheet-title">
                    <div className="ptc-sheet__head">
                        <h2 id="ptc-sheet-title">Among Us IRL printable: task cards</h2>
                        <div className="seo-actions">
                            <button type="button" className="seo-btn--primary ptc-print-btn" onClick={printCards}>Print the cards</button>
                        </div>
                    </div>
                    <p className="ptc-sheet__note">
                        The print layout hides the menus and the article, and prints the cards in black on white, three per row.
                        Use plain paper or card stock. Print at 100% scale so the cards come out the same size.
                    </p>
                    <p className="ptc-sheet__label">Task cards</p>
                    <ol className="ptc-grid">
                        {TASK_CARDS.map(({ room, task }, index) => (
                            <li className="ptc-card" key={`${room}-${task}`}>
                                <div className="ptc-card__top">
                                    <span className="ptc-card__room">{room}</span>
                                    <span className="ptc-card__num">Task {String(index + 1).padStart(2, '0')}</span>
                                </div>
                                <p className="ptc-card__text">{task}</p>
                                <span className="ptc-card__done"><span className="ptc-box" aria-hidden="true" />Done</span>
                            </li>
                        ))}
                    </ol>
                    <p className="ptc-sheet__label">Role and meeting cards</p>
                    <ul className="ptc-grid">
                        {SPECIAL_CARDS.map(card => (
                            <li className={`ptc-card ptc-card--${card.kind}${card.kind === 'meeting' ? '' : ' ptc-card--role'}`} key={card.kind}>
                                <span className="ptc-card__room">{card.label}</span>
                                <p className="ptc-card__title">{card.title}</p>
                                <p className="ptc-card__text">{card.text}</p>
                            </li>
                        ))}
                    </ul>
                </section>

                <section className="seo-section">
                    <h2>What is on the sheet</h2>
                    <p>
                        The 20 room cards cover five areas of a typical house: kitchen, living room, hallway, bedroom, and
                        garden. The last four cards say “Any room” and are silly on purpose, such as patrolling like a robot
                        or giving the room a weather report. They give the intruder something easy to fake and give younger
                        players a laugh.
                    </p>
                    <p>
                        Every task has a clear finish and leaves the room as it was. Players count things, straighten things,
                        or put one item back. Nobody needs a timer, a pen, or a special prop. If a card does not fit your
                        home, cross it out and write your own on the back. The <a href="/among-us-irl-task-ideas">task ideas by room</a>
                        {' '}list has plenty more to copy onto blank cards.
                    </p>
                    <p>
                        You only get one Crew card and one Intruder card on the sheet. For a full game, print the sheet again
                        or copy the role cards onto index cards. Every role card should look the same from the back so nobody
                        can tell them apart while you deal.
                    </p>
                </section>

                <section className="seo-section" id="how-to-play-paper">
                    <h2>How to run a paper game</h2>
                    <ol className="seo-steps">
                        <li className="seo-step"><span className="seo-step__num" aria-hidden="true">1</span><div>
                            <h3>Pick a moderator and a meeting point</h3>
                            <p>A paper game works best with one adult or older player who does not play. They deal roles, count votes, and keep the tally. Choose a central room as the meeting point and put the Emergency meeting card there.</p>
                        </div></li>
                        <li className="seo-step"><span className="seo-step__num" aria-hidden="true">2</span><div>
                            <h3>Deal the roles face down</h3>
                            <p>Use one Intruder for up to nine players and two for ten or more. Shuffle the role cards, deal one to each player, and ask everyone to look, then hand it back face down. The moderator keeps the stack.</p>
                        </div></li>
                        <li className="seo-step"><span className="seo-step__num" aria-hidden="true">3</span><div>
                            <h3>Hand out task cards</h3>
                            <p>Give each player four or five task cards, mixed across rooms. Intruders get task cards too, so nobody stands out. Crew tick the box when a task is done. Intruders only pretend.</p>
                        </div></li>
                        <li className="seo-step"><span className="seo-step__num" aria-hidden="true">4</span><div>
                            <h3>Play the round</h3>
                            <p>Everyone walks to their tasks. An intruder tags someone with a light tap on the shoulder. A tagged player sits down quietly where they are. Anyone who finds them calls “Body!” and everyone goes to the meeting point.</p>
                        </div></li>
                        <li className="seo-step"><span className="seo-step__num" aria-hidden="true">5</span><div>
                            <h3>Meet, talk, and vote</h3>
                            <p>Each living player may also call one emergency meeting. Talk for 90 seconds. On a count of three, everyone points at a suspect or at the floor to skip. The player with the most votes is out. A tie means nobody leaves.</p>
                        </div></li>
                        <li className="seo-step"><span className="seo-step__num" aria-hidden="true">6</span><div>
                            <h3>Check the win</h3>
                            <p>The crew wins when every crew task card is ticked or every intruder is voted out. The intruders win when they equal the crew in number. Crew hand finished cards to the moderator, who keeps a tally on paper.</p>
                        </div></li>
                    </ol>
                </section>

                <section className="seo-section">
                    <h2>Keep the paper game safe and fair</h2>
                    <ul className="seo-list">
                        <li>Walk, do not run. Keep stairs, the stove, and anything sharp out of the game.</li>
                        <li>Tags are a light tap on the shoulder. No pushing, grabbing, or hiding in closets or small spaces.</li>
                        <li>Mark rooms that are off limits, such as a home office or a sleeping baby’s room.</li>
                        <li>Pair young readers with an older player, or read their cards aloud before the round starts.</li>
                        <li>Eliminated players stay quiet. They can still finish their tasks if your group agrees.</li>
                    </ul>
                    <p>
                        The weak spots of paper are honesty and bookkeeping. A crew player can tick a box without doing the
                        task, and a moderator who also plays sees everyone’s role. That is fine for a relaxed family round.
                        It gets harder with more players.
                    </p>
                </section>

                <GameplayScreenshots screens={['crew-task', 'vote-result']} />

                <section className="seo-section">
                    <h2>When the phone version is easier</h2>
                    <p>
                        Sus Party is a free, browser-based Among Us IRL game. Everyone joins with a four-letter room code on
                        their own phone. There is no account and no install. You need at least three players, and each needs
                        a phone browser and internet. Here is where it saves work compared with paper:
                    </p>
                    <div className="seo-cards seo-cards--3">
                        <article className="seo-card"><h3>Secret roles</h3><p>Each phone shows its own role. Nobody deals cards, and the host plays too instead of sitting out as moderator.</p></article>
                        <article className="seo-card"><h3>Task progress</h3><p>Players complete tasks on their phones and the crew sees shared progress. No tally sheet, no lost cards.</p></article>
                        <article className="seo-card"><h3>Meetings and votes</h3><p>Players meet in person and vote in the app. It counts the votes and shows who the group sent out.</p></article>
                    </div>
                    <p>
                        You still choose the tasks. Build a list in the <a href={GENERATOR_URL}>task generator</a> for your rooms
                        and group size, or give everyone a role with the <a href="/among-us-role-generator">role generator</a> if
                        you only want help with that part. The <a href="/how-to-play">host guide</a> walks through a full round.
                    </p>
                    <p>
                        Paper still wins in some cases. Use the printed cards when not everyone has a phone, when the venue
                        has no reliable internet, or when you want young children off screens. Some hosts print the cards as
                        room signs and keep the phones for roles and votes.
                    </p>
                </section>

                <nav className="seo-links" aria-label="More Among Us IRL guides">
                    <p className="seo-links__title">Plan the rest of the game</p>
                    <ul className="seo-links__list">
                        <li><a href="/among-us-irl-task-ideas">Among Us IRL task ideas by room</a></li>
                        <li><a href="/how-to-play-among-us-irl">Full rules for Among Us IRL</a></li>
                        <li><a href="/among-us-party-for-kids">Run an Among Us party for kids</a></li>
                        <li><a href="/among-us-role-generator">Among Us role generator</a></li>
                    </ul>
                </nav>

                <GameSetupCta title="Skip the scissors next time."
                    href={GENERATOR_URL} label="Build a task list for your house"
                    secondaryHref="/how-to-play" secondaryLabel="Read the host guide">
                    Pick your rooms and player count, review the tasks, then start a Sus Party game. Roles, progress, and votes run on everyone’s phone.
                </GameSetupCta>
            </main>
        </SeoPageLayout>
    );
}
