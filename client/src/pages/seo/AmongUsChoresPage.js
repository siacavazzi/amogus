import React from 'react';
import { usePageMeta } from '../../seo/usePageMeta';
import SeoPageLayout from './SeoPageLayout';
import GameplayScreenshots from './GameplayScreenshots';
import GameSetupCta from './GameSetupCta';

const CANONICAL = 'https://susparty.com/among-us-chores';
const CLEANUP_URL = '/among-us-irl-task-generator?preset=cleanup&players=4';
const DESCRIPTION = 'Among Us chores turn cleanup into a game kids ask to play. Get kid-friendly tasks by room, a chore chart option, intruder rules for kids, and reward ideas.';

const ROOMS = [
    {
        room: 'Living room',
        tasks: [
            'Restore the cushions: put every sofa cushion back in place.',
            'Fold the blanket and lay it over the arm of the sofa.',
            'Return three toys to their storage box.',
            'Stack the books or magazines on the coffee table.',
        ],
    },
    {
        room: 'Kitchen',
        tasks: [
            'Clear the counter: put three items back where they live.',
            'Wipe the table crumbs with a damp cloth.',
            'Put the clean cups away (older kids only for glass).',
            'Carry the recycling to the bin.',
        ],
    },
    {
        room: 'Bedroom',
        tasks: [
            'Collect the laundry: put clothes from the floor in the hamper.',
            'Pair three socks and put them in the drawer.',
            'Straighten the pillow and pull up the covers.',
            'Put five things from the floor where they belong.',
        ],
    },
    {
        room: 'Hallway and entry',
        tasks: [
            'Align the shoes: pair them and line them up.',
            'Hang one coat or bag on its hook.',
            'Return one item that belongs in another room.',
            'Put the mail or school papers in their usual spot.',
        ],
    },
];

const FAQS = [
    {
        q: 'What age is an Among Us chore game good for?',
        a: 'Most families find it works from about 6 to 14. Younger kids need simple tasks and help reading them. Older kids enjoy the bluffing and the meetings more than the chores themselves.',
    },
    {
        q: 'Do we need the app to play?',
        a: 'No. A paper chore chart and folded role slips work. Sus Party handles the secret roles, task lists, meetings, and votes on phones, so the parent can play instead of running everything.',
    },
    {
        q: 'Is this an official Among Us product?',
        a: 'No. Sus Party is an independent, Among Us-inspired game. It is not affiliated with or endorsed by Innersloth.',
    },
];

const SCHEMA = {
    '@context': 'https://schema.org',
    '@graph': [
        {
            '@type': 'Article',
            headline: 'Among Us Chores: Turn Cleanup Into a Game Kids Ask to Play',
            description: DESCRIPTION,
            mainEntityOfPage: CANONICAL,
            author: { '@type': 'Organization', name: 'Sus Party', url: 'https://susparty.com/' },
        },
        {
            '@type': 'FAQPage',
            mainEntity: FAQS.map(({ q, a }) => ({
                '@type': 'Question', name: q,
                acceptedAnswer: { '@type': 'Answer', text: a },
            })),
        },
    ],
};

export default function AmongUsChoresPage() {
    usePageMeta({
        title: 'Among Us Chores: Turn Cleanup Into a Game | Sus Party',
        description: DESCRIPTION, canonical: CANONICAL, schema: SCHEMA,
    });
    return (
        <SeoPageLayout>
            <header className="seo-hero">
                <p className="seo-eyebrow">Among Us chores · The crew cleans, someone fakes it</p>
                <h1 className="seo-h1">Among Us chores: turn cleanup into a game kids ask to play</h1>
                <p className="seo-lead">
                    Kids who love Among Us already know the routine. Walk to a room, finish a task, watch for anyone acting strange.
                    Swap the spaceship for your house and the tasks for real chores, and cleanup becomes a round of a game.
                    Here is how to set it up with paper or with Sus Party, a free Among Us-inspired game that runs in phone browsers.
                </p>
                <div className="seo-actions">
                    <a href={CLEANUP_URL} className="seo-btn--primary">Open the cleanup task list →</a>
                    <a href="#chore-list" className="seo-btn--secondary">See the chore list</a>
                </div>
            </header>
            <main className="seo-content">
                <section className="seo-section">
                    <h2>How an Among Us chore game works</h2>
                    <p>
                        Each player gets a secret role. Most are crew. One is the intruder. Crew members get a short list of
                        chores in different rooms and finish them for real. The intruder gets the same kind of list but wins by
                        staying hidden. When someone sees something suspicious, they call a meeting. Everyone gathers in one room,
                        talks it out, and votes.
                    </p>
                    <p>
                        The chores are the map. Kids move around the house because the game tells them to, not because you asked
                        for the third time. A round with four players and a dozen small jobs often takes 15 to 20 minutes.
                    </p>
                </section>

                <section className="seo-section" id="chore-list">
                    <p className="seo-section__kicker">Among Us tasks for kids</p>
                    <h2>Sample chore tasks by room</h2>
                    <p>
                        Write each chore like a mission: one place, one action, one clear finish. &ldquo;Clean your room&rdquo;
                        is not a task. &ldquo;Put five things from the floor where they belong&rdquo; is. Use these as a starting point
                        and cut anything that does not fit your home.
                    </p>
                    <div className="seo-cards seo-cards--2">
                        {ROOMS.map(({ room, tasks }) => (
                            <article className="seo-card" key={room}>
                                <h3>{room}</h3>
                                <ul className="seo-list">
                                    {tasks.map(task => <li key={task}>{task}</li>)}
                                </ul>
                            </article>
                        ))}
                    </div>
                    <p>
                        Match the job to the child. A six-year-old can pair socks and line up shoes. A twelve-year-old can wipe
                        counters and empty a small bin. Leave out anything with cleaning sprays, sharp knives, heavy lifting, or
                        stairs carrying loads. Keep each task under five minutes so the game keeps moving. For more ideas sorted by
                        room, see the <a href="/among-us-irl-task-ideas">Among Us IRL task ideas</a>.
                    </p>
                </section>

                <GameplayScreenshots screens={['cleanup-task', 'cleanup-next-task']} />

                <section className="seo-section">
                    <h2>Paper chore chart or Sus Party?</h2>
                    <p>Both work. Pick the one that fits your family and how many phones you have.</p>
                    <div className="seo-table-wrap">
                        <table className="seo-table seo-table--plain">
                            <caption>Two ways to run an Among Us chore chart</caption>
                            <thead><tr><th scope="col">&nbsp;</th><th scope="col">Paper chore chart</th><th scope="col">Sus Party</th></tr></thead>
                            <tbody>
                                <tr><th scope="row">What you need</th><td>Role slips, a task list per player, a pencil, a timer.</td><td>A phone browser and internet for each player. At least three players.</td></tr>
                                <tr><th scope="row">Secret roles</th><td>A parent folds and hands out slips. Kids sometimes peek.</td><td>Each phone shows a private role.</td></tr>
                                <tr><th scope="row">Progress</th><td>Kids tick boxes on the chart.</td><td>Players slide to complete a task and the next one appears.</td></tr>
                                <tr><th scope="row">Meetings and votes</th><td>Hands up or folded votes, counted by a parent.</td><td>Meetings and votes happen in the app.</td></tr>
                                <tr><th scope="row">Can the parent play?</th><td>Hard, because someone has to run it.</td><td>Yes. The host plays too.</td></tr>
                            </tbody>
                        </table>
                    </div>
                    <p>
                        A paper chart is great for younger kids or a family without enough devices. Make a grid with each
                        player&rsquo;s name and their four chores, then hand out role slips face down. Sus Party is easier when
                        kids have phones or tablets, because nobody can see anyone else&rsquo;s role and the parent gets to be a
                        suspect too. The <a href={CLEANUP_URL}>cleanup preset</a> starts with chores across the living room,
                        kitchen, bedroom, and hallway. Change the player count, review the list, remove anything already done, and
                        carry it into host setup.
                    </p>
                </section>

                <section className="seo-section">
                    <p className="seo-section__kicker">The intruder role</p>
                    <h2>House rules for the intruder when kids play</h2>
                    <p>
                        The intruder is the fun part, and the part most likely to cause a fight. Set these rules before the first
                        round and say them out loud.
                    </p>
                    <ul className="seo-checklist">
                        <li>The intruder still does chores. Faking means doing the job slowly or picking the easy ones, not skipping work.</li>
                        <li>Nobody undoes finished work. No unmaking beds, no tipping toys back out. Sabotage stays inside the game.</li>
                        <li>No hiding, blocking doors, or grabbing phones. Keep it to walking and talking.</li>
                        <li>Lying about your role is allowed. Lying about whether a chore is done is not.</li>
                        <li>Being voted out is not a punishment. Ejected players keep cleaning and stay quiet about clues.</li>
                    </ul>
                    <p>
                        Kids who are new to social deduction can take the intruder role badly, or blurt it out right away.
                        Play one practice round with a parent as intruder first. Rotate the role so everyone gets a turn.
                        If a child gets upset after being caught, end the round and point at the clean kitchen: everyone on
                        the crew got what they wanted. In Sus Party, finishing all the crew tasks reveals the living intruders,
                        but the crew still has to vote them out to win, so the chores matter to the result.
                    </p>
                </section>

                <section className="seo-section">
                    <h2>Rewards that keep kids asking to play</h2>
                    <p>
                        The game itself is most of the reward. Small extras help, especially early on. Tie them to the whole
                        house getting cleaned rather than to who won, so the intruder has no reason to drag their feet.
                    </p>
                    <ul className="seo-list">
                        <li>The crew picks dinner, a movie, or the next family game if every task gets done.</li>
                        <li>Whoever spots the intruder picks dessert.</li>
                        <li>Extra screen time equal to the length of the round.</li>
                        <li>A sticker or tally on a fridge chart for each round played. Ten tallies earns an outing.</li>
                        <li>The best bluffer gets bragging rights at dinner, decided by family vote.</li>
                    </ul>
                    <p>
                        Avoid paying per chore inside the game. It turns every meeting into an argument about money.
                        For more ways to make tidying less of a battle, read <a href="/make-cleaning-fun-for-kids">how to make
                        cleaning fun for kids</a> or browse other <a href="/chore-games-for-kids">chore games for kids</a>.
                    </p>
                </section>

                <section className="seo-section">
                    <h2>Run your first round in five steps</h2>
                    <ol className="seo-steps">
                        <li className="seo-step"><span className="seo-step__num" aria-hidden="true">1</span><div>
                            <h3>Pick the chores</h3>
                            <p>Choose three or four tasks per player in rooms close together. Check each one is safe for the youngest player.</p>
                        </div></li>
                        <li className="seo-step"><span className="seo-step__num" aria-hidden="true">2</span><div>
                            <h3>Set the meeting room</h3>
                            <p>Use the living room or kitchen table. Everyone goes there when a meeting is called.</p>
                        </div></li>
                        <li className="seo-step"><span className="seo-step__num" aria-hidden="true">3</span><div>
                            <h3>Deal the roles</h3>
                            <p>Hand out slips, or create a Sus Party room and share the four-letter code. Use one intruder for up to nine players and two for ten or more.</p>
                        </div></li>
                        <li className="seo-step"><span className="seo-step__num" aria-hidden="true">4</span><div>
                            <h3>Play and clean</h3>
                            <p>Walk, do not run. Help younger kids read their tasks. Call meetings when something looks off.</p>
                        </div></li>
                        <li className="seo-step"><span className="seo-step__num" aria-hidden="true">5</span><div>
                            <h3>Debrief and reset</h3>
                            <p>Ask which tasks were confusing. Remove finished chores and add the next few before another round.</p>
                        </div></li>
                    </ol>
                    <p>
                        New to the rules? Read <a href="/how-to-play">how to play Sus Party</a> or
                        the <a href="/how-to-play-among-us-irl">Among Us IRL rules and sample round</a>.
                    </p>
                </section>

                <section className="seo-section">
                    <p className="seo-section__kicker">FAQ</p>
                    <h2>Among Us chores questions</h2>
                    <div className="seo-faq">
                        {FAQS.map(faq => (
                            <div className="seo-faq__item" key={faq.q}>
                                <p className="seo-faq__q">{faq.q}</p>
                                <p>{faq.a}</p>
                            </div>
                        ))}
                    </div>
                </section>

                <nav className="seo-links" aria-label="More family game guides">
                    <p className="seo-links__title">More for family game night</p>
                    <ul className="seo-links__list">
                        <li><a href="/family-cleaning-routine">Build a weekly family cleaning routine</a></li>
                        <li><a href="/among-us-party-for-kids">Plan an Among Us party for kids</a></li>
                        <li><a href="/game-night-ideas">Find more game night ideas</a></li>
                    </ul>
                </nav>

                <GameSetupCta title="Give the chore chart a secret intruder."
                    href={CLEANUP_URL} label="Open the cleanup preset for four"
                    secondaryHref="/make-cleaning-fun-for-kids" secondaryLabel="More cleanup ideas for kids">
                    Start with the family cleanup tasks, swap in your real chores, share the room code, and play together. Free in your phone browsers.
                </GameSetupCta>
            </main>
        </SeoPageLayout>
    );
}
