import React from 'react';
import { usePageMeta } from '../../seo/usePageMeta';
import SeoPageLayout from './SeoPageLayout';
import GameplayScreenshots from './GameplayScreenshots';
import GameSetupCta from './GameSetupCta';

const CANONICAL = 'https://susparty.com/chore-games-for-kids';
const CLEANUP_URL = '/among-us-irl-task-generator?preset=cleanup&players=4';
const TITLE = '15 Chore Games for Kids That Actually Work | Sus Party';
const DESCRIPTION = 'Chore games for kids that make chores fun: beat the timer, sock match race, chore dice and 12 more, each with quick steps and the best age range to try it.';
const SCHEMA = {
    '@context': 'https://schema.org', '@type': 'Article',
    headline: '15 chore games for kids that actually work', description: DESCRIPTION,
    mainEntityOfPage: CANONICAL,
    author: { '@type': 'Organization', name: 'Sus Party', url: 'https://susparty.com/' },
};

const GAMES = [
    {
        id: 'beat-the-timer', name: 'Beat the timer', ages: '3+', time: '5–10 min',
        how: 'Set a kitchen timer or play one song. Name one clear job, such as "all the books back on the shelf." Your child tries to finish before the time runs out. Keep the first round easy so they win, then shorten the time next week.',
    },
    {
        id: 'among-us-chores', name: 'Among Us chores with Sus Party', ages: '7+', time: '15–20 min',
        how: (
            <>
                Every player gets a secret role on a phone. The crew does real chores around the house. A hidden intruder
                pretends to help and tries to blend in. Everyone meets to compare alibis and vote. Start with
                the <a href={CLEANUP_URL}>family cleanup preset</a>, which has short chores for four players.
                You need at least three players, and each needs a phone browser and internet. Younger kids can pair with
                an adult who reads the task aloud. See <a href="/among-us-chores">Among Us chores</a> for more ideas.
            </>
        ),
    },
    {
        id: 'sock-match-race', name: 'Sock match race', ages: '3+', time: '5 min',
        how: 'Dump a basket of clean socks on the bed. Each player races to find pairs and roll them together. Count pairs at the end. Leftover single socks go in one "lost sock" pile for later. Toddlers can match by color instead of by size.',
    },
    {
        id: 'chore-dice', name: 'Chore dice', ages: '4+', time: '10–15 min',
        how: 'Write six small jobs on a sheet and number them one to six. Your child rolls a die and does that job. Roll again until the timer ends. Repeat numbers are fine. A second die can set how many items to pick up.',
    },
    {
        id: 'mystery-item', name: 'Mystery item', ages: '4+', time: '10 min',
        how: 'Secretly pick one item in the messy room. Tell your child that whoever puts the mystery item away wins a small prize, like picking dinner music. Kids clean everything because they do not know which item it is. Reveal it at the end.',
    },
    {
        id: 'color-hunt', name: 'Color hunt', ages: '2–6', time: '5 min',
        how: 'Call out a color. Your child finds everything on the floor in that color and puts it away. Then call a new color. This works well for toddlers who get stuck when the whole room looks like one big job.',
    },
    {
        id: 'freeze-clean', name: 'Freeze clean', ages: '3–8', time: '10 min',
        how: 'Play music while everyone tidies. When you pause it, everyone freezes. Anyone still moving puts away one extra item. Short songs keep the energy up, and the pauses give small kids a natural rest.',
    },
    {
        id: 'chore-jar', name: 'Chore jar', ages: '5+', time: '10–20 min',
        how: 'Write jobs on slips of paper and fold them into a jar. Add a few fun slips, such as "ten jumping jacks" or "pick the next song." Each player draws a slip, does it, and draws again. Remove any job that a child cannot do safely.',
    },
    {
        id: 'toy-basketball', name: 'Toy basketball', ages: '3–8', time: '5–10 min',
        how: 'Put the laundry basket or toy bin in the middle of the room. Soft toys and clothes can be tossed from a line. Anything breakable gets carried, not thrown. Keep score or just cheer for each basket.',
    },
    {
        id: 'room-inspector', name: 'Room inspector', ages: '6+', time: '10 min',
        how: 'After a room is tidy, hand your child a clipboard and a short checklist. They inspect the room like a hotel inspector and mark anything missed. Then the whole family fixes the list. Kids often notice more than adults do.',
    },
    {
        id: 'chore-bingo', name: 'Chore bingo', ages: '5+', time: '20–30 min',
        how: 'Draw a three-by-three grid and write one chore in each square. Your child crosses off each job as it is done. Three in a row earns a small reward. A full card earns a bigger one, like a later bedtime on the weekend.',
    },
    {
        id: 'count-to-ten', name: 'Ten things', ages: '3+', time: '3–5 min',
        how: 'Everyone picks up and puts away ten things, counting out loud. That is the whole game. It is short enough to do before dinner every day, and it helps younger kids practice counting.',
    },
    {
        id: 'laundry-shop', name: 'Laundry shop', ages: '4+', time: '10 min',
        how: 'Set up piles labeled for each family member. Your child runs the shop and "delivers" the folded clothes to each pile. Older kids can fold towels and shirts. Younger kids can sort by owner and carry piles to the right room.',
    },
    {
        id: 'relay-race', name: 'Cleanup relay', ages: '5+', time: '10 min',
        how: 'Line up siblings or friends at one end of the room. Each runner grabs one item, puts it in the right place, and tags the next runner. Use teams if you have four or more kids. Clear a safe path first so no one trips.',
    },
    {
        id: 'points-board', name: 'Beat your score', ages: '6+', time: 'Ongoing',
        how: 'Give each job a point value and track points on a whiteboard for a week. The goal is to beat last week\'s family total, not each other. Working together keeps siblings from arguing over who did more.',
    },
];

function ChoreGamesPage() {
    usePageMeta({ title: TITLE, description: DESCRIPTION, canonical: CANONICAL, schema: SCHEMA });

    return (
        <SeoPageLayout>
            <header className="seo-hero">
                <p className="seo-eyebrow">For parents · Fifteen ways to get the floor back</p>
                <h1 className="seo-h1">15 chore games for kids that actually work</h1>
                <p className="seo-lead">
                    Most kids will not clean because you asked nicely. Many will clean to win, to beat a timer,
                    or to catch a sneaky sibling. These chore games for kids turn small jobs into short rounds.
                    Each one has quick steps and the age range where it works best.
                </p>
                <div className="seo-actions">
                    <a href="#games" className="seo-btn--primary">See the 15 games →</a>
                    <a href={CLEANUP_URL} className="seo-btn--secondary">Try the cleanup game</a>
                </div>
            </header>
            <main className="seo-content">
                <section className="seo-section">
                    <h2>What makes a chore game work</h2>
                    <p>
                        The best games to make chores fun for kids share three things. The job is small and clear.
                        The round is short. And there is a finish line kids can see. "Clean your room" is too big.
                        "Put every red thing away before the song ends" is a game.
                    </p>
                    <p>
                        Match the game to the child. Toddlers do well with colors, counting, and music.
                        School-age kids like points, secrets, and beating a record. Teens respond better
                        to games with a social twist, where they get to play against you.
                    </p>
                </section>

                <section className="seo-section" id="games">
                    <h2>The 15 chore games</h2>
                    <ol className="seo-steps">
                        {GAMES.map((game, index) => (
                            <li className="seo-step" id={game.id} key={game.id}>
                                <span className="seo-step__num" aria-hidden="true">{index + 1}</span>
                                <div>
                                    <h3>{game.name}</h3>
                                    <p><strong>Best for ages {game.ages}.</strong> {game.how}</p>
                                </div>
                            </li>
                        ))}
                    </ol>
                </section>

                <GameplayScreenshots screens={['cleanup-task', 'cleanup-next-task']} />

                <section className="seo-section">
                    <h2>Pick a game by age and time</h2>
                    <div className="seo-table-wrap">
                        <table className="seo-table seo-table--plain">
                            <caption>Chore games for kids at a glance</caption>
                            <thead><tr><th scope="col">Game</th><th scope="col">Best ages</th><th scope="col">Time</th></tr></thead>
                            <tbody>
                                {GAMES.map(game => (
                                    <tr key={game.id}>
                                        <th scope="row"><a href={`#${game.id}`}>{game.name}</a></th>
                                        <td>{game.ages}</td>
                                        <td>{game.time}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </section>

                <section className="seo-section">
                    <h2>Cleaning games for kids by situation</h2>
                    <div className="seo-cards seo-cards--3">
                        <article className="seo-card">
                            <h3>Five minutes before dinner</h3>
                            <p>Ten things, color hunt, or beat the timer. They need no setup and end fast.</p>
                        </article>
                        <article className="seo-card">
                            <h3>Saturday deep clean</h3>
                            <p>Chore bingo or the chore jar. They spread many jobs across a longer stretch.</p>
                        </article>
                        <article className="seo-card">
                            <h3>Older kids who roll their eyes</h3>
                            <p>The Among Us chores game. Secret roles and voting give teens a reason to join in.</p>
                        </article>
                    </div>
                </section>

                <section className="seo-section">
                    <h2>Keep it safe and keep it fun</h2>
                    <ul className="seo-list">
                        <li>Keep cleaning sprays, bleach, and sharp tools out of the games. Use water and a cloth for kids under ten.</li>
                        <li>Carry anything glass or heavy. Only soft items get thrown or raced.</li>
                        <li>Clear the floor before any race so no one slips on toys.</li>
                        <li>Stop while the game is still fun. A short round tomorrow beats a long fight today.</li>
                        <li>Praise the effort, not just the result. A six-year-old's folded towel will look like a six-year-old folded it.</li>
                    </ul>
                </section>

                <section className="seo-section">
                    <h2>How the Sus Party version runs</h2>
                    <p>
                        The <a href={CLEANUP_URL}>cleanup preset</a> fills the game with short household jobs.
                        Review the list, remove chores that are already done, and add your own. Then create the room
                        and share the four-letter code. Each player sees a secret role on their own phone, and the crew gets one chore at a time.
                    </p>
                    <p>
                        The crew wins by voting out every intruder at a meeting, so the chores get done while everyone
                        watches for whoever is only pretending. The intruder can bluff about their jobs but never undoes finished work. The parent plays too, which kids love, because now
                        Mom might be the suspect. Read <a href="/how-to-play">how to play</a> for the full rules, or
                        see more ideas in <a href="/make-cleaning-fun-for-kids">make cleaning fun for kids</a> and
                        the <a href="/family-cleaning-routine">family cleaning routine</a> guide.
                    </p>
                </section>

                <GameSetupCta title="Turn tonight's mess into a mystery."
                    href={CLEANUP_URL} label="Open the family cleanup preset"
                    secondaryHref="/how-to-play" secondaryLabel="Read the host guide">
                    Start with four players and short chores. Swap in your own jobs, share the code, and find out who was only pretending to help.
                </GameSetupCta>

                <nav className="seo-links" aria-label="More family game ideas">
                    <p className="seo-links__title">More ideas for families</p>
                    <ul className="seo-links__list">
                        <li><a href="/among-us-chores">Among Us chores: task ideas for home</a></li>
                        <li><a href="/among-us-party-for-kids">Plan an Among Us party for kids</a></li>
                        <li><a href="/indoor-family-reunion-games">Indoor family reunion games</a></li>
                    </ul>
                </nav>
            </main>
        </SeoPageLayout>
    );
}

export default ChoreGamesPage;
