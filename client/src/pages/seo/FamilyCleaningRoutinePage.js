import React from 'react';
import { usePageMeta } from '../../seo/usePageMeta';
import SeoPageLayout from './SeoPageLayout';
import GameplayScreenshots from './GameplayScreenshots';
import GameSetupCta from './GameSetupCta';

const CANONICAL = 'https://susparty.com/family-cleaning-routine';
const CLEANUP_URL = '/among-us-irl-task-generator?preset=cleanup&players=4';
const DESCRIPTION = 'A weekly family cleaning routine with 10-minute daily resets, age appropriate chores for each age, and one Saturday chore game your kids will want to play.';
const SCHEMA = {
    '@context': 'https://schema.org', '@type': 'Article',
    headline: 'A weekly family cleaning routine kids won’t fight', description: DESCRIPTION,
    mainEntityOfPage: CANONICAL,
    author: { '@type': 'Organization', name: 'Sus Party', url: 'https://susparty.com/' },
};

export default function FamilyCleaningRoutinePage() {
    usePageMeta({
        title: 'Family Cleaning Routine Kids Won’t Fight | Sus Party',
        description: DESCRIPTION, canonical: CANONICAL, schema: SCHEMA,
    });
    return (
        <SeoPageLayout>
            <header className="seo-hero">
                <p className="seo-eyebrow">Parent guide · Small resets, one weekend game</p>
                <h1 className="seo-h1">A weekly family cleaning routine kids won’t fight</h1>
                <p className="seo-lead">
                    Most chore fights start with a vague request and a huge mess. This family cleaning routine
                    does the opposite. You do ten short minutes each weekday, then one game session on the weekend.
                    Every job is small, specific, and matched to the child’s age.
                </p>
                <div className="seo-actions">
                    <a href="#weekly-plan" className="seo-btn--primary">See the weekly plan →</a>
                    <a href={CLEANUP_URL} className="seo-btn--secondary">Open the cleanup game template</a>
                </div>
            </header>
            <main className="seo-content">
                <section className="seo-section">
                    <h2>Why short, fixed routines work better than big clean-ups</h2>
                    <p>
                        Kids push back on chores that feel endless. “Clean your room” has no clear finish, so a child
                        cannot tell when they are done. A big Saturday clean-up also lets the mess grow all week,
                        which makes the job feel even bigger.
                    </p>
                    <p>
                        A routine fixes both problems. The daily reset keeps the mess small. The weekend session has a
                        start time, an end time, and a list. When the timer stops, the family stops. Children are more
                        willing to start a job when they know exactly when it ends.
                    </p>
                </section>

                <section className="seo-section" id="weekly-plan">
                    <p className="seo-section__kicker">The plan</p>
                    <h2>The weekly family cleaning routine</h2>
                    <ol className="seo-steps">
                        <li className="seo-step"><span className="seo-step__num" aria-hidden="true">1</span><div>
                            <h3>Monday to Friday: a 10-minute reset</h3>
                            <p>
                                Pick one fixed time, such as right after dinner or before screens. Set a timer for ten minutes.
                                Everyone resets one area: shoes in the rack, bags on hooks, toys in bins, dishes to the sink.
                                Nobody deep cleans. The goal is to put things back where they live.
                            </p>
                        </div></li>
                        <li className="seo-step"><span className="seo-step__num" aria-hidden="true">2</span><div>
                            <h3>Give each weekday one small focus</h3>
                            <p>
                                Monday is the entryway. Tuesday is the living room. Wednesday is bedrooms. Thursday is the
                                kitchen table and counters. Friday is a quick sweep for anything left out before the weekend.
                                A fixed focus means you do not have to decide every night.
                            </p>
                        </div></li>
                        <li className="seo-step"><span className="seo-step__num" aria-hidden="true">3</span><div>
                            <h3>Saturday or Sunday: one game session</h3>
                            <p>
                                Block 30 to 45 minutes at the same time each weekend. This is where the bigger jobs go:
                                changing sheets, wiping bathroom sinks, sorting the toy shelf, emptying small bins.
                                Make it a game, set a clear end, and plan something the kids like for straight after.
                            </p>
                        </div></li>
                        <li className="seo-step"><span className="seo-step__num" aria-hidden="true">4</span><div>
                            <h3>Sunday evening: a two-minute check-in</h3>
                            <p>
                                Ask what worked and which jobs caused arguments. Swap one job between kids if someone is
                                bored. Adjust the list for next week. Keep it short so it never feels like a meeting.
                            </p>
                        </div></li>
                    </ol>
                </section>

                <section className="seo-section">
                    <h2>Age appropriate chores by age band</h2>
                    <p>
                        Use this as a starting point. Children develop at different speeds, so match the job to what your
                        child can do safely, not only to their birthday. Show a new job once, do it together once, then let
                        them try it alone.
                    </p>
                    <div className="seo-table-wrap">
                        <table className="seo-table seo-table--plain">
                            <caption>Age appropriate chores for a family cleaning routine</caption>
                            <thead><tr><th scope="col">Age</th><th scope="col">Daily reset jobs</th><th scope="col">Weekend session jobs</th></tr></thead>
                            <tbody>
                                <tr><th scope="row">3 to 5</th><td>Put toys in a bin, put shoes by the door, carry their cup to the sink.</td><td>Pair socks, wipe a low table with a damp cloth, put books back on a low shelf.</td></tr>
                                <tr><th scope="row">6 to 8</th><td>Make their bed, clear their plate, put clean clothes in drawers.</td><td>Dust shelves, sort recycling, match and fold small towels, tidy the shoe rack.</td></tr>
                                <tr><th scope="row">9 to 12</th><td>Load or unload the dishwasher, wipe the kitchen table, empty a small bin.</td><td>Vacuum one room, change their own sheets, wipe the bathroom sink and mirror.</td></tr>
                                <tr><th scope="row">13 and up</th><td>Wipe counters, take out the trash, start a load of their own laundry.</td><td>Clean a bathroom, mop a floor, sort a cupboard, help a younger sibling finish a job.</td></tr>
                            </tbody>
                        </table>
                    </div>
                    <p>
                        Keep cleaning sprays, bleach, and sharp items with an adult. Younger kids can use water and a cloth.
                        Older kids can use mild products after you show them how. Anything on a step stool or ladder needs an
                        adult nearby.
                    </p>
                </section>

                <section className="seo-section">
                    <h2>Make Saturday chores for kids a game</h2>
                    <p>
                        The weekend session is the hardest part to start. A game gives it a reason to begin and a clear
                        finish. A few options work without any app:
                    </p>
                    <ul className="seo-list">
                        <li>Beat the clock: set a 20-minute timer and see how many jobs the family finishes before it rings.</li>
                        <li>Chore draw: write jobs on slips of paper. Each person draws two and trades one if they want.</li>
                        <li>Room relay: one person starts a room, then hands it to the next person after five minutes.</li>
                    </ul>
                    <p>
                        For more formats, see these <a href="/chore-games-for-kids">chore games for kids</a> and ideas to
                        {' '}<a href="/make-cleaning-fun-for-kids">make cleaning fun for kids</a>.
                    </p>
                    <h3>The family chore game with a secret intruder</h3>
                    <p>
                        Sus Party turns the session into an Among Us IRL game. Each person joins on a phone browser with a
                        room code. Most players are crew who complete real chores. One secret intruder tries to blend in and
                        fake it. When someone calls a meeting, the family gathers, compares alibis, and votes in the app.
                        You need at least three players, and the parent plays too. There is no account and nothing to install.
                    </p>
                    <p>
                        Start from the <a href={CLEANUP_URL}>cleanup preset for four players</a>. It fills the list with
                        small house jobs across the living room, kitchen, bedroom, and hallway. Remove anything that does not
                        fit your home, then add your weekend jobs from the table above. You can read more about the format on
                        the <a href="/among-us-chores">Among Us chores</a> page.
                    </p>
                </section>
                <GameplayScreenshots screens={['cleanup-task', 'cleanup-next-task']} />

                <section className="seo-section">
                    <h2>How to run the weekend game session</h2>
                    <ol className="seo-steps">
                        <li className="seo-step"><span className="seo-step__num" aria-hidden="true">1</span><div>
                            <h3>Prepare the list before you call everyone</h3>
                            <p>Open the cleanup preset, set your player count, and check each job against the real room. Every job needs one place and one clear finish.</p>
                        </div></li>
                        <li className="seo-step"><span className="seo-step__num" aria-hidden="true">2</span><div>
                            <h3>Share the room code and explain the rules once</h3>
                            <p>Tell everyone where the meeting point is. Help younger children read their tasks. The <a href="/how-to-play">how to play guide</a> covers meetings and votes.</p>
                        </div></li>
                        <li className="seo-step"><span className="seo-step__num" aria-hidden="true">3</span><div>
                            <h3>Play one round, then stop</h3>
                            <p>One round fits most weekend sessions. If the kids ask for another, remove the finished chores and add the next few jobs first.</p>
                        </div></li>
                    </ol>
                    <p>
                        One house rule matters: the intruder can bluff about chores, but nobody undoes finished work.
                        Real jobs stay done whoever wins.
                    </p>
                </section>

                <section className="seo-section">
                    <h2>Tips to keep the routine going</h2>
                    <ul className="seo-checklist">
                        <li>Keep the same time every day. A habit tied to dinner or bedtime needs fewer reminders.</li>
                        <li>Store things where kids can reach them. A child cannot put away toys if the bin lives on a high shelf.</li>
                        <li>Praise the effort, not the result. A lumpy made bed is still a made bed.</li>
                        <li>Rotate jobs every week or two so nobody is stuck with the worst one.</li>
                        <li>Do the jobs alongside them. Kids copy what you do more than what you say.</li>
                        <li>Skip a day without guilt. Pick it back up the next night instead of doubling the work.</li>
                        <li>Let the weekend game end on time, even with jobs left. A list that always runs over stops being fun.</li>
                    </ul>
                    <p>
                        If a child refuses a job, offer a choice between two jobs of the same size. Choice gives them some
                        control without changing the plan. If one job always causes a fight, make it smaller or move it to the
                        weekend game, where the timer and the group do the motivating.
                    </p>
                </section>

                <nav className="seo-links" aria-label="More family chore guides">
                    <p className="seo-links__title">More for the weekend session</p>
                    <ul className="seo-links__list">
                        <li><a href="/chore-games-for-kids">Chore games for kids of different ages</a></li>
                        <li><a href="/among-us-chores">Turn chores into Among Us tasks</a></li>
                        <li><a href="/make-cleaning-fun-for-kids">Make cleaning fun for kids</a></li>
                        <li><a href="/how-to-play">Learn how a Sus Party round works</a></li>
                    </ul>
                </nav>

                <GameSetupCta title="Make this weekend’s chores a game"
                    href={CLEANUP_URL} label="Open the cleanup preset"
                    secondaryHref="/how-to-play" secondaryLabel="Read the host guide">
                    Start with four players and the house cleanup list, swap in your real weekend jobs, and play one round together.
                </GameSetupCta>
            </main>
        </SeoPageLayout>
    );
}
