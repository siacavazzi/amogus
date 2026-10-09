import React from 'react';
import { usePageMeta } from '../../seo/usePageMeta';
import SeoPageLayout from './SeoPageLayout';
import GameplayScreenshots from './GameplayScreenshots';
import GameSetupCta from './GameSetupCta';

const SCHEMA = {
    '@context': 'https://schema.org', '@type': 'Article',
    headline: 'How to host an Among Us birthday party game at home',
    description: 'A host plan for an Among Us-inspired birthday game with real tasks, guest phones, practice rounds, and in-person meetings.',
    mainEntityOfPage: 'https://susparty.com/among-us-birthday-party',
    author: { '@type': 'Organization', name: 'Sus Party', url: 'https://susparty.com/' },
};

function BirthdayPartyPage() {
    usePageMeta({
        title: 'Among Us Birthday Party Game at Home | Sus Party',
        description: 'Make an Among Us-inspired game the main birthday activity. Plan the rooms, prepare real tasks, teach one practice round, and use Sus Party to run the game.',
        canonical: 'https://susparty.com/among-us-birthday-party', schema: SCHEMA,
    });

    return (
        <SeoPageLayout>
            <header className="seo-hero">
                <p className="seo-eyebrow">Birthday host guide · The house is the map</p>
                <h1 className="seo-h1">Host an Among Us birthday party game at home</h1>
                <p className="seo-lead">
                    Give your guests a reason to sneak into the dining room, look busy, and accuse their best friend.
                    Sus Party turns the main birthday activity into an in-person game with secret roles and real tasks.
                    Prepare the room before the guests arrive, then let their phones handle the roles and votes.
                </p>
                <div className="seo-actions">
                    <a href="/among-us-irl-task-generator?venue=house&players=10&movement=normal&style=mix" className="seo-btn--primary">Build a birthday task pack →</a>
                    <a href="#host-plan" className="seo-btn--secondary">Read the host plan</a>
                </div>
            </header>
            <main className="seo-content">
                <section className="seo-section">
                    <h2>Check the guest list before you plan the tasks</h2>
                    <p>
                        Each player needs a phone browser and internet. Guests play together in your home;
                        this is not a remote game. The generator covers five to fifteen players, and the host can change the setup.
                        For children, arrange adult supervision and confirm device access before you choose this as the main activity.
                    </p>
                    <p>
                        Choose shared areas such as the living room, dining table, and an open hallway.
                        Keep one meeting point. A laptop or TV can supply the optional Reactor display, but a phone-only game works too.
                    </p>
                </section>
                <GameplayScreenshots screens={['family-lobby', 'crew-task']} />

                <section className="seo-section" id="host-plan">
                    <h2>Prepare the game, then bring out the cake</h2>
                    <ol className="seo-steps">
                        <li className="seo-step"><span className="seo-step__num" aria-hidden="true">1</span><div>
                            <h3>Before guests arrive: make the task pack</h3>
                            <p>Pick your areas in the generator. Review every task against the actual room. Supply paper, pencils, cards, and any other listed materials.</p>
                        </div></li>
                        <li className="seo-step"><span className="seo-step__num" aria-hidden="true">2</span><div>
                            <h3>At the start: get everyone into the same room</h3>
                            <p>Take the pack into a new game, create the room, and import the generated tasks. Share the four-letter code with the guests.</p>
                        </div></li>
                        <li className="seo-step"><span className="seo-step__num" aria-hidden="true">3</span><div>
                            <h3>Teach the actions before the secret roles</h3>
                            <p>Explain task completion, the meeting point, eliminations, and votes. Use the <a href="/tutorial">crew tutorial</a> or talk through a practice task before you start.</p>
                        </div></li>
                        <li className="seo-step"><span className="seo-step__num" aria-hidden="true">4</span><div>
                            <h3>Play, debrief, and try another round</h3>
                            <p>Ask which tasks caused confusion after the round. Adjust those before the next game. Save cake and guest arrivals for a break between rounds.</p>
                        </div></li>
                    </ol>
                </section>
                <section className="seo-section">
                    <h2>Give the tasks a birthday setting</h2>
                    <p>These are example stations for your own list. Use shared materials and reset each station between players.</p>
                    <div className="seo-cards seo-cards--3">
                        <article className="seo-card"><h3>Dining table: sort the cargo</h3><p>Set out six reusable cards with numbers. Ask players to put them in order, then shuffle them for the next person.</p></article>
                        <article className="seo-card"><h3>Living room: check supplies</h3><p>Ask players to count the visible cushions and write the number on their own paper. Nothing needs to move.</p></article>
                        <article className="seo-card"><h3>Hallway table: copy the signal</h3><p>Place a short symbol sequence on a card. Each player copies it onto their own paper, then returns to the game.</p></article>
                    </div>
                    <p>
                        Give every task one location and one clear finish. Use the <a href="/among-us-irl-task-ideas">task ideas by room</a>
                        {' '}to fill out the list. The app trusts players to mark tasks complete; it does not check their answers.
                    </p>
                </section>
                <GameSetupCta title="Make the birthday game yours"
                    href="/among-us-irl-task-generator?venue=house&players=10&movement=normal&style=mix" label="Prepare tasks for ten guests">
                    This setup opens the house preset with ten players and a mix of task styles. Change the guest count and areas, review the list, then carry it into host setup.
                </GameSetupCta>
                <section className="seo-section">
                    <h2>Keep the party easy to host</h2>
                    <ul className="seo-list">
                        <li>Explain that eliminated players stay quiet about clues. Choose a separate place for them to watch the round.</li>
                        <li>Keep decorations clear of task surfaces. Save food handling for the party break.</li>
                        <li>Choose <a href="/among-us-irl-task-generator?venue=house&players=10&style=mix">nearby task locations</a> and edit the tasks for your guests.</li>
                        <li>Keep sabotage in the app. Nobody needs to hide someone’s phone, block a door, or touch a real alarm.</li>
                    </ul>
                    <h3>Can we do it with printable cards instead?</h3>
                    <p>
                        Yes. Paper roles and task cards suit a party without enough phones. You also need someone to manage progress and votes.
                        <a href="https://originalmom.com/real-life-among-us-game-printable-with-pictures/" target="_blank" rel="noopener noreferrer"> OriginalMOM’s printable party guide</a>
                        {' '}provides one paper-based example. Sus Party is the browser option, with its own <a href="/how-to-play-among-us-irl#win-conditions">win rules</a>.
                    </p>
                </section>
                <nav className="seo-links" aria-label="More help for the host">
                    <p className="seo-links__title">Before you share the code</p>
                    <ul className="seo-links__list">
                        <li><a href="/how-to-play-among-us-irl">Read the sample round and vote rules</a></li>
                        <li><a href="/party-games-for-10-people">Choose a warm-up game for ten guests</a></li>
                        <li><a href="/social-deduction-games">Compare other social deduction games</a></li>
                    </ul>
                </nav>
            </main>
        </SeoPageLayout>
    );
}

export default BirthdayPartyPage;
