import React from 'react';
import { usePageMeta } from '../../seo/usePageMeta';
import SeoPageLayout from './SeoPageLayout';
import GameplayScreenshots from './GameplayScreenshots';
import GameSetupCta from './GameSetupCta';

const SETUP_URL = '/among-us-irl-task-generator?venue=house&players=6&movement=normal&style=mix&room=Living+Room&room=Kitchen&room=Hallway';
const DESCRIPTION = 'Need an indoor sleepover game for teens? Play Sus Party: secret roles, real missions, and suspicious friends. Prepare a house task pack and join free on your phones.';
const SCHEMA = {
    '@context': 'https://schema.org', '@type': 'Article',
    headline: 'Your sleepover has an intruder', description: DESCRIPTION,
    mainEntityOfPage: 'https://susparty.com/sleepover-games-for-teens',
    author: { '@type': 'Organization', name: 'Sus Party', url: 'https://susparty.com/' },
};

export default function SleepoverPage() {
    usePageMeta({
        title: 'Sus Party | An Indoor Sleepover Game for Teens',
        description: DESCRIPTION, canonical: 'https://susparty.com/sleepover-games-for-teens', schema: SCHEMA,
    });
    return (
        <SeoPageLayout>
            <header className="seo-hero">
                <p className="seo-eyebrow">Sleepover games for teens · Keep an eye on your friends</p>
                <h1 className="seo-h1">Your sleepover has an intruder</h1>
                <p className="seo-lead">
                    The friend who helped set out the snacks might be the one you need to vote out.
                    In Sus Party, secret intruders hide among a crew with real missions around the house.
                    It is an indoor sleepover game you play together, free on your phones, with plenty
                    of reasons to wonder what your friends are up to.
                </p>
                <div className="seo-actions">
                    <a href={SETUP_URL} className="seo-btn--primary">Prepare your sleepover game →</a>
                    <a href="/play" className="seo-btn--secondary">Play Sus Party free</a>
                </div>
            </header>
            <main className="seo-content">
                <section className="seo-section">
                    <h2>The hallway becomes part of the mystery</h2>
                    <p>
                        A crew member checks their phone, heads to a task, and marks it complete.
                        An intruder follows the same route with a different plan: quietly eliminate
                        someone, then find a convincing explanation for being there. When a body is
                        discovered, everyone still alive meets to talk and vote in the app.
                    </p>
                    <p>
                        The fun comes from what you catch your friends doing. Did someone follow you
                        into the kitchen? Why did they change their story about the hallway? Tasks
                        give people reasons to split up, so the next accusation has something behind it.
                    </p>
                </section>
                <GameplayScreenshots screens={['crew-task', 'meeting-ready']} />

                <section className="seo-section">
                    <h2>Set up a six-friend round in three shared areas</h2>
                    <p>
                        The <a href={SETUP_URL}>sleepover setup</a> starts with the living room, kitchen,
                        and hallway. Keep sleeping rooms outside the game. Put paper and pens at the
                        task spots, then review the generated list. Choose jobs with clear finishes:
                        count the visible cushions, draw a clock face, or write three words that rhyme.
                        Change the player count to match your group.
                    </p>
                    <p>
                        Choose “Use this pack,” create a room, and select “Import generated
                        tasks” in host setup. Open the room and share the four-letter code. Each friend
                        needs a phone browser and internet. Pick the sofa or a table as your meeting spot.
                    </p>
                    <p>
                        Read the <a href="/how-to-play">game rules</a> before the first round. Explain
                        how victims mark themselves dead and keep the intruder’s identity secret.
                        Give eliminated players a place to watch. After the result, return to the
                        lobby and start another round with new secret roles.
                    </p>
                </section>
                <GameSetupCta title="Find out who can lie to their friends."
                    href={SETUP_URL} label="Choose your sleepover tasks"
                    secondaryHref="/play" secondaryLabel="Create your room">
                    Prepare the shared areas, hand out the room code, and let Sus Party choose the intruder.
                </GameSetupCta>
            </main>
        </SeoPageLayout>
    );
}
