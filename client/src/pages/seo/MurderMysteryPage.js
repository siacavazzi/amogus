import React from 'react';
import { usePageMeta } from '../../seo/usePageMeta';
import SeoPageLayout from './SeoPageLayout';
import GameplayScreenshots from './GameplayScreenshots';
import GameSetupCta from './GameSetupCta';

const SETUP_URL = '/among-us-irl-task-generator?venue=house&players=10&movement=normal&style=standard';
const SCHEMA = {
    '@context': 'https://schema.org', '@type': 'Article',
    headline: 'A murder mystery party game where your friends are the suspects',
    description: 'Host a live murder mystery with Sus Party. Friends become secret intruders, create their own alibis, and face the group vote.',
    mainEntityOfPage: 'https://susparty.com/murder-mystery-party-game',
    author: { '@type': 'Organization', name: 'Sus Party', url: 'https://susparty.com/' },
};

function MurderMysteryPage() {
    usePageMeta({
        title: 'Free Murder Mystery Party Game at Home | Sus Party',
        description: 'Your friends are the suspects. Play Sus Party as a live murder mystery party game with secret killers, real tasks, alibis, and votes. Free in your phone browser.',
        canonical: 'https://susparty.com/murder-mystery-party-game', schema: SCHEMA,
    });

    return (
        <SeoPageLayout>
            <header className="seo-hero">
                <p className="seo-eyebrow">Murder mystery party game · The suspects are already here</p>
                <h1 className="seo-h1">A murder mystery party game where your friends are the suspects</h1>
                <p className="seo-lead">
                    Picture a guest “dead” in the hallway and your most convincing friend with a very convenient
                    alibi. Sus Party turns that scene into a game: secret intruders hide among the crew, eliminate
                    players, and try to talk their way through the next meeting. Play it free on your phones,
                    together in the same home.
                </p>
                <div className="seo-actions">
                    <a href="/play" className="seo-btn--primary">Play Sus Party free →</a>
                    <a href={SETUP_URL} className="seo-btn--secondary">Set the scene at home</a>
                </div>
            </header>
            <main className="seo-content">
                <section className="seo-section">
                    <h2>The clues come from what your friends do</h2>
                    <p>
                        Crew members follow tasks into different rooms. Intruders use those same rooms as cover.
                        A player who spent too long near the dining table has an explanation to give.
                        So does the person you passed just before someone turned up dead.
                    </p>
                    <p>
                        An elimination is a tap and a quiet “you’re dead.” When someone discovers the body,
                        call a meeting. The living players compare alibis face to face, then vote in the app.
                        Every accusation comes from your round. The crew must vote out every intruder to win.
                    </p>
                </section>
                <GameplayScreenshots screens={['eliminated-player', 'vote']} />

                <section className="seo-section">
                    <h2>Make your home the scene of the crime</h2>
                    <p>
                        Use the <a href={SETUP_URL}>house task generator</a> to choose your areas and guest count.
                        Review the list and put out the materials each task needs. Keep a shared spot for meetings:
                        the table where everyone tries to look innocent.
                    </p>
                    <p>
                        Import the pack into a new room and share the four-letter code. Each guest needs a phone
                        browser and internet. The app assigns private roles and handles the votes; the host can
                        be a suspect too. Explain the elimination and silence rules before you start.
                    </p>
                </section>
                <GameSetupCta title="Invite your friends. Question their alibis."
                    href="/play" label="Start your murder mystery"
                    secondaryHref={SETUP_URL} secondaryLabel="Prepare the house tasks">
                    Read the <a href="/how-to-play">host guide</a>, share the code, and start the round.
                    Your hallway is about to become a very awkward place to be seen.
                </GameSetupCta>
            </main>
        </SeoPageLayout>
    );
}

export default MurderMysteryPage;
