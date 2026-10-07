import React from 'react';
import { usePageMeta } from '../../seo/usePageMeta';
import SeoPageLayout from './SeoPageLayout';
import GameplayScreenshots from './GameplayScreenshots';
import GameSetupCta from './GameSetupCta';

const SETUP_URL = '/among-us-irl-task-generator?venue=house&players=8&movement=normal&style=mix';
const SCHEMA = {
    '@context': 'https://schema.org', '@type': 'Article',
    headline: 'A party game for adults who love a good accusation',
    description: 'Turn a house party into Sus Party: secret roles, real tasks, suspicious alibis, and votes between friends.',
    mainEntityOfPage: 'https://susparty.com/party-games-for-adults',
    author: { '@type': 'Organization', name: 'Sus Party', url: 'https://susparty.com/' },
};

function AdultPartyPage() {
    usePageMeta({
        title: 'Free Party Game for Adults at Home | Sus Party',
        description: 'Give your friends something to hide. Play Sus Party, a free party game for adults with secret intruders, real tasks around the house, and face-to-face accusations.',
        canonical: 'https://susparty.com/party-games-for-adults', schema: SCHEMA,
    });

    return (
        <SeoPageLayout>
            <header className="seo-hero">
                <p className="seo-eyebrow">Party games for adults · Play together at home</p>
                <h1 className="seo-h1">A party game for adults who love a good accusation</h1>
                <p className="seo-lead">
                    Give your friends a secret worth keeping. In Sus Party, someone at your party is an intruder,
                    and looking busy is part of their cover. It is a free browser game that turns your house into
                    the map. Your phones hand out private roles; your friends supply the suspicious behavior.
                </p>
                <div className="seo-actions">
                    <a href="/play" className="seo-btn--primary">Play Sus Party free →</a>
                    <a href={SETUP_URL} className="seo-btn--secondary">Prepare the party tasks</a>
                </div>
            </header>
            <main className="seo-content">
                <section className="seo-section">
                    <h2>Give everyone a reason to leave the couch</h2>
                    <p>
                        The crew gets real tasks around your home. An intruder can pretend to check supplies
                        at the dining table, then catch someone alone in the hallway. They tap the player and
                        quietly tell them they are dead. When someone finds the body, the accusations begin.
                    </p>
                    <p>
                        Gather at your meeting spot, compare stories, and vote on your phones. That friend
                        who always has an explanation now has to explain where they were. The crew wins
                        when every intruder gets voted out.
                    </p>
                </section>
                <GameplayScreenshots screens={['crew-task', 'intruder-objective']} />

                <section className="seo-section">
                    <h2>Use the home you already have</h2>
                    <p>
                        Start with the <a href={SETUP_URL}>eight-player house task pack</a>. Change the guest count
                        and rooms, then review the tasks and gather any listed materials. Choose shared spaces
                        such as the living room and dining table. One area becomes your meeting point.
                    </p>
                    <p>
                        Carry your pack into a new game and import it in host setup. Friends join with the
                        four-letter room code. Everyone needs a phone browser and internet, with no account
                        or app download. You can host and play from your phone; a TV is optional.
                    </p>
                </section>
                <GameSetupCta title="Let your most convincing friend be suspicious"
                    href="/play" label="Play Sus Party free"
                    secondaryHref={SETUP_URL} secondaryLabel="Make your task pack">
                    Get your friends into a room and keep the roles secret. For the first round, explain the
                    <a href="/how-to-play"> task, elimination, and meeting rules</a>. Then find out whose alibi survives the vote.
                </GameSetupCta>
            </main>
        </SeoPageLayout>
    );
}

export default AdultPartyPage;
