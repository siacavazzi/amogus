import React from 'react';
import { usePageMeta } from '../../seo/usePageMeta';
import SeoPageLayout from './SeoPageLayout';
import GameplayScreenshots from './GameplayScreenshots';
import GameSetupCta from './GameSetupCta';

const TEMPLATE_URL = '/among-us-irl-task-generator?preset=cleanup&players=4';
const DESCRIPTION = 'Make cleaning fun for kids with Sus Party. Turn everyday chores into Among Us IRL tasks with a ready-to-use family cleanup template. Free in your browser.';
const SCHEMA = {
    '@context': 'https://schema.org', '@type': 'Article',
    headline: 'Make cleaning fun for kids with Sus Party', description: DESCRIPTION,
    mainEntityOfPage: 'https://susparty.com/make-cleaning-fun-for-kids',
    author: { '@type': 'Organization', name: 'Sus Party', url: 'https://susparty.com/' },
};

export default function FamilyCleanupPage() {
    usePageMeta({
        title: 'Sus Party | Make Cleaning Fun for Kids with Among Us IRL',
        description: DESCRIPTION, canonical: 'https://susparty.com/make-cleaning-fun-for-kids', schema: SCHEMA,
    });
    return (
        <SeoPageLayout>
            <header className="seo-hero">
                <p className="seo-eyebrow">Family cleanup · Someone is pretending to help</p>
                <h1 className="seo-h1">Make cleaning fun for kids with Sus Party</h1>
                <p className="seo-lead">
                    The toys need a home. The socks need a partner. Somebody is acting suspicious.
                    Sus Party turns everyday chores into an Among Us IRL game: the crew does real jobs,
                    while a secret intruder tries to blend in. Play together, free in your phone browsers.
                </p>
                <div className="seo-actions">
                    <a href={TEMPLATE_URL} className="seo-btn--primary">Open the family cleanup template →</a>
                    <a href="/how-to-play" className="seo-btn--secondary">Learn how to play</a>
                </div>
            </header>
            <main className="seo-content">
                <section className="seo-section">
                    <h2>Your house already has the missions</h2>
                    <p>
                        The <a href={TEMPLATE_URL}>cleanup template</a> starts with 24 tasks across the living room,
                        kitchen, bedroom, and hallway. It uses small jobs that fit many homes:
                    </p>
                    <ul className="seo-checklist">
                        <li>Fold a blanket and put the sofa cushions back.</li>
                        <li>Wipe table crumbs with a damp cloth.</li>
                        <li>Pair clean socks and put clothes in the hamper.</li>
                        <li>Straighten the shoes and hang a coat.</li>
                    </ul>
                    <p>
                        Change the player count and areas, then review the list. In host setup, remove jobs
                        that are already done or do not fit your home. Each task needs a clear finish.
                        “Put three toys in the box” gives everyone a specific mission.
                    </p>
                </section>
                <GameplayScreenshots screens={['cleanup-task', 'cleanup-next-task']} />

                <section className="seo-section">
                    <h2>Do the chores. Question the alibis.</h2>
                    <p>
                        Take the template into a new game and share the room code. Sus Party assigns private
                        roles, tracks task progress, and handles the votes. The parent can play too.
                        Use at least three players, each with a phone browser and internet.
                    </p>
                    <p>
                        Keep the jobs short and help children read their tasks when needed.
                        Intruders can bluff about their chores; nobody undoes completed work.
                        The cleanup preset uses a smaller task goal for a short round.
                        Before another round, remove completed chores and add the next few jobs.
                    </p>
                </section>
                <GameSetupCta title="Give the laundry pile an alibi."
                    href={TEMPLATE_URL} label="Choose your cleanup tasks"
                    secondaryHref="/how-to-play" secondaryLabel="Read the host guide">
                    Start with the house template, swap in your real chores, and play Sus Party together.
                </GameSetupCta>
            </main>
        </SeoPageLayout>
    );
}
