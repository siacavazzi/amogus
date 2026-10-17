import React from 'react';
import { usePageMeta } from '../../seo/usePageMeta';
import SeoPageLayout from './SeoPageLayout';
import GameplayScreenshots from './GameplayScreenshots';
import GameSetupCta from './GameSetupCta';

const CANONICAL = 'https://susparty.com/among-us-party-for-kids';
const TASK_URL = '/among-us-irl-task-generator?venue=house&players=8&style=funny&room=Living%20Room&room=Kitchen&room=Hallway';
const DESCRIPTION = 'Plan an Among Us party for kids aged 7 to 12: a 2-hour timeline, kid-safe tasks, phone sharing options, adult helper jobs, and how to handle early exits.';

const FAQS = [
    {
        q: 'What age is an Among Us party for kids best for?',
        a: 'Most groups of 7 to 12 year olds can play. Seven and eight year olds usually need an adult to read tasks aloud and to remind them to keep their role secret. Ten to twelve year olds can often run meetings on their own.',
    },
    {
        q: 'Does every child need a phone?',
        a: 'In Sus Party, yes: each player needs their own browser and internet. A tablet or an old phone on your Wi-Fi works. Without enough devices, pair kids on one device or use paper roles instead.',
    },
    {
        q: 'Is the game too scary for young kids?',
        a: 'There is no gore. A player is out when an intruder taps them and quietly says so. If a child dislikes the word "killed", call it "tagged" or "frozen" for the whole party.',
    },
];

const SCHEMA = {
    '@context': 'https://schema.org',
    '@graph': [
        {
            '@type': 'Article',
            headline: 'Among Us Party for Kids: An Indoor Game Plan for Ages 7 to 12',
            description: DESCRIPTION,
            mainEntityOfPage: CANONICAL,
            author: { '@type': 'Organization', name: 'Sus Party', url: 'https://susparty.com/' },
        },
        {
            '@type': 'FAQPage',
            mainEntity: FAQS.map(faq => ({
                '@type': 'Question', name: faq.q,
                acceptedAnswer: { '@type': 'Answer', text: faq.a },
            })),
        },
    ],
};

export default function KidsPartyPage() {
    usePageMeta({
        title: 'Among Us Party for Kids: Ages 7 to 12 | Sus Party',
        description: DESCRIPTION, canonical: CANONICAL, schema: SCHEMA,
    });
    return (
        <SeoPageLayout>
            <header className="seo-hero">
                <p className="seo-eyebrow">Kids party plan · Ages 7 to 12 · Indoors</p>
                <h1 className="seo-h1">Among Us party for kids: an indoor game plan for ages 7 to 12</h1>
                <p className="seo-lead">
                    Kids already know the game. They want to be the sneaky one, call the meeting, and point at
                    their friend. This plan turns your home into the map for a two-hour Among Us-inspired party.
                    It covers the schedule, safe tasks, devices, adult helpers, and what to do when someone is out first.
                </p>
                <div className="seo-actions">
                    <a href={TASK_URL} className="seo-btn--primary">Build a kid-friendly task list →</a>
                    <a href="#timeline" className="seo-btn--secondary">See the 2-hour timeline</a>
                </div>
            </header>
            <main className="seo-content">
                <section className="seo-section">
                    <h2>How the game works for kids</h2>
                    <p>
                        Each child gets a secret role. Most are crew. One or two are intruders. The crew walks around
                        the house doing small real-world tasks. Intruders pretend to do tasks and try to tag crew members
                        when nobody is watching. Anyone can call a meeting. Everyone gathers, talks about what they saw,
                        and votes on who to send out.
                    </p>
                    <p>
                        Kids pick it up fast because many have played the video game. The hard parts for this age are
                        keeping a secret, reading the task, and accepting being out. The rest of this page is about those three things.
                        If you want a general birthday hosting plan for any age, see the <a href="/among-us-birthday-party">Among Us birthday party guide</a>.
                    </p>
                </section>

                <section className="seo-section">
                    <h2>Sort out devices before you send invites</h2>
                    <p>
                        This is the question to settle first. Sus Party runs in a browser, and every player needs their own
                        screen with internet. Plenty of 7 to 12 year olds do not have a phone. Here are honest options:
                    </p>
                    <ul className="seo-list">
                        <li><strong>Borrow spare devices.</strong> Old phones and tablets work on your Wi-Fi without a SIM card. Ask parents at drop-off if a child can bring a tablet.</li>
                        <li><strong>Use adult phones.</strong> Helpers can hand over their phones for the game. Lock down anything private first, or keep the phone in guided access or screen pinning mode.</li>
                        <li><strong>Pair up younger kids.</strong> Two kids share one device and one role. They do tasks together and whisper about who to vote for. This also helps seven year olds who read slowly.</li>
                        <li><strong>Go phone-free.</strong> Use the <a href="/among-us-role-generator">no-phone role picker</a> to hand out secret roles, then run tasks and votes on paper with an adult keeping score.</li>
                    </ul>
                    <p>
                        Count devices against your guest list a few days ahead. Charge everything the night before.
                        You need at least three players, and the host can play too.
                    </p>
                </section>

                <section className="seo-section" id="timeline">
                    <p className="seo-section__kicker">Timeline</p>
                    <h2>A 2-hour party timeline</h2>
                    <p>Kids lose focus after about 30 minutes of the same game. Split play into short blocks with food in the middle.</p>
                    <div className="seo-table-wrap">
                        <table className="seo-table seo-table--plain">
                            <thead>
                                <tr><th>Time</th><th>What happens</th><th>Adult job</th></tr>
                            </thead>
                            <tbody>
                                <tr><td>0:00 to 0:15</td><td>Arrivals. Kids color a paper crewmate name tag and pick a crew color.</td><td>Greet parents, collect or set up devices.</td></tr>
                                <tr><td>0:15 to 0:30</td><td>Everyone joins the room code. Walk the task areas as a group. Play one practice round with no intruders.</td><td>Explain the meeting point and the out-of-bounds rooms.</td></tr>
                                <tr><td>0:30 to 1:00</td><td>Two or three real rounds with one intruder.</td><td>One adult watches the task areas, one stays at the meeting point.</td></tr>
                                <tr><td>1:00 to 1:20</td><td>Food and cake break. Devices go face down on a table.</td><td>Serve food away from task stations.</td></tr>
                                <tr><td>1:20 to 1:50</td><td>Two or three more rounds. Try two intruders if the group has eight or more kids.</td><td>Rotate who watches the out players.</td></tr>
                                <tr><td>1:50 to 2:00</td><td>Small awards and goodbyes.</td><td>Return borrowed devices to the right child.</td></tr>
                            </tbody>
                        </table>
                    </div>
                </section>

                <GameplayScreenshots screens={['crew-task', 'meeting-ready']} />

                <section className="seo-section">
                    <h2>Kid-safe task ideas</h2>
                    <p>
                        Good tasks for this age take under a minute, need no running, and have one clear finish.
                        Avoid stairs, the stove, sharp tools, and anything that needs climbing. Use the
                        {' '}<a href={TASK_URL}>task generator</a> for a starting list, then cut anything that does not suit your kids.
                    </p>
                    <div className="seo-cards seo-cards--3">
                        <article className="seo-card"><h3>Living room: stack the cargo</h3><p>Build a tower of five plastic cups, then take it down for the next player.</p></article>
                        <article className="seo-card"><h3>Kitchen table: sort the fuel</h3><p>Sort a small bowl of colored blocks or pom-poms into three cups by color. Tip them back when done.</p></article>
                        <article className="seo-card"><h3>Hallway: fix the wiring</h3><p>Match four colored paper strips to the same colors taped on the wall.</p></article>
                        <article className="seo-card"><h3>Dining room: scan the crew</h3><p>Do ten jumping jacks on a marked spot. Easy to watch, easy to fake.</p></article>
                        <article className="seo-card"><h3>Living room: check the map</h3><p>Find a hidden sticker on a printed floor plan and say the room name out loud.</p></article>
                        <article className="seo-card"><h3>Hallway: copy the code</h3><p>Copy a four-symbol code from a card onto a sticky note and add it to the pile.</p></article>
                    </div>
                    <p>
                        For younger players, write tasks in short words and add a picture where you can.
                        More ideas by room are on the <a href="/among-us-irl-task-ideas">task ideas page</a>.
                        The app does not check answers, so pick tasks kids can finish honestly without an adult judging them.
                    </p>
                </section>

                <section className="seo-section">
                    <h2>Give adult helpers clear jobs</h2>
                    <p>Plan one adult for every five or six kids. Give each adult one job so nobody hovers.</p>
                    <ul className="seo-checklist">
                        <li><strong>Game host:</strong> runs the room, reads rules aloud, and calls time.</li>
                        <li><strong>Floor helper:</strong> walks the task areas, helps with reading, and stops running.</li>
                        <li><strong>Out-player buddy:</strong> sits with kids who are out and keeps them busy.</li>
                    </ul>
                    <p>
                        Keep all play in shared rooms. Close bedrooms and bathrooms to the game. No hiding in closets,
                        no locked doors, and no turning off lights. Sabotage stays inside the app.
                    </p>
                </section>

                <section className="seo-section">
                    <h2>When a child is out first or gets upset</h2>
                    <p>
                        Being tagged first stings, especially at seven. Plan for it before the first round so it feels
                        like part of the game and not a punishment.
                    </p>
                    <ul className="seo-list">
                        <li>Say early that getting out first is normal and does not mean you played badly.</li>
                        <li>Give out players a job. They can watch from a chosen spot, cheer at meetings without giving clues, or help reset task stations.</li>
                        <li>When tagged, a player stays quiet and waits. At the next meeting, their phone shows an &ldquo;I&rsquo;m Dead&rdquo; button to press.</li>
                        <li>Keep rounds short. An out player only waits a few minutes before everyone starts again.</li>
                        <li>Rotate intruders so every child who wants a turn gets one. Keep a quiet tally on paper.</li>
                        <li>Ban &ldquo;I knew it was you&rdquo; teasing after the reveal. Have the intruder take a bow instead.</li>
                        <li>If a child is in tears, let them sit out a round with an adult. Most rejoin within one game.</li>
                    </ul>
                    <div className="seo-highlight">
                        <p>Voting a friend out can feel personal. Remind kids before each meeting: you vote on what you saw, not on who you like.</p>
                    </div>
                </section>

                <GameplayScreenshots screens={['eliminated-player', 'vote']} />

                <section className="seo-section">
                    <h2>Among Us party ideas: decorations and food</h2>
                    <p>Keep it simple. The game is the main event.</p>
                    <ul className="seo-list">
                        <li><strong>Decorations:</strong> red and blue balloons, paper crewmate cutouts on the doors, and a sign marking the meeting point. Keep task tables clear.</li>
                        <li><strong>Food:</strong> crewmate-shaped sandwiches, colored candy melts, red and blue juice cups, and a crewmate cake. Check allergies with parents before the party.</li>
                        <li><strong>Favors:</strong> stickers, small crewmate figures, or the paper name tags kids made at arrival.</li>
                        <li><strong>Awards:</strong> best bluff, sharpest detective, and best task finisher. Make sure every child gets one.</li>
                    </ul>
                </section>

                <section className="seo-section">
                    <h2>Setting it up with Sus Party</h2>
                    <p>
                        Sus Party is a free, browser-based Among Us IRL game. No accounts and no install. Build a task list,
                        create a room, and share the four-letter code. Each device gets a private role, a task list, and a vote button.
                        A TV or laptop can show the optional Reactor screen so kids see crew progress. Read <a href="/how-to-play">how to play</a> before the party
                        so you can teach it in five minutes. Sus Party is not affiliated with Among Us or Innersloth.
                    </p>
                </section>

                <section className="seo-section">
                    <p className="seo-section__kicker">FAQ</p>
                    <h2>Among Us birthday party games for kids: common questions</h2>
                    <div className="seo-faq">
                        {FAQS.map(faq => (
                            <div className="seo-faq__item" key={faq.q}>
                                <p className="seo-faq__q">{faq.q}</p>
                                <p>{faq.a}</p>
                            </div>
                        ))}
                    </div>
                </section>

                <nav className="seo-links" aria-label="More help for the party">
                    <p className="seo-links__title">More for party planners</p>
                    <ul className="seo-links__list">
                        <li><a href="/among-us-birthday-party">Host an Among Us birthday party at home</a></li>
                        <li><a href="/among-us-role-generator">Pick secret roles without phones</a></li>
                        <li><a href="/among-us-irl-task-ideas">Browse task ideas by room</a></li>
                        <li><a href="/chore-games-for-kids">Try chore games for kids</a></li>
                    </ul>
                </nav>

                <GameSetupCta title="Get the crew ready before the cake."
                    href={TASK_URL} label="Build tasks for eight kids">
                    This opens the house preset for eight players with the living room, kitchen, and hallway. Cut anything too hard, then take the list into host setup.
                </GameSetupCta>
            </main>
        </SeoPageLayout>
    );
}
