import React from 'react';
import { usePageMeta } from '../../seo/usePageMeta';
import SeoPageLayout from './SeoPageLayout';
import GameplayScreenshots from './GameplayScreenshots';
import GameSetupCta from './GameSetupCta';

const SETUP_URL = '/among-us-irl-task-generator?venue=apartment&players=6&movement=normal&style=mix';
const DESCRIPTION = 'Play a free phone party game together in person. Sus Party puts secret roles on your phones and real tasks around your home. No download, account, or TV required.';
const SCHEMA = {
    '@context': 'https://schema.org', '@type': 'Article',
    headline: 'A phone party game with real-life alibis', description: DESCRIPTION,
    mainEntityOfPage: 'https://susparty.com/party-games-on-your-phone',
    author: { '@type': 'Organization', name: 'Sus Party', url: 'https://susparty.com/' },
};

export default function PhonePartyPage() {
    usePageMeta({
        title: 'Sus Party | A Phone Party Game to Play Together',
        description: DESCRIPTION, canonical: 'https://susparty.com/party-games-on-your-phone', schema: SCHEMA,
    });
    return (
        <SeoPageLayout>
            <header className="seo-hero">
                <p className="seo-eyebrow">Party games on your phone · Together in person</p>
                <h1 className="seo-h1">A phone party game with real-life alibis</h1>
                <p className="seo-lead">
                    Give every phone in the room a secret. Then see who can keep theirs. Sus Party is a free
                    browser party game where your friends complete real tasks while hidden intruders try to
                    blend in. Your phones hold the roles. Your home supplies the places to look suspicious.
                </p>
                <div className="seo-actions">
                    <a href="/play" className="seo-btn--primary">Play together on your phones →</a>
                    <a href={SETUP_URL} className="seo-btn--secondary">Prepare a six-player game</a>
                </div>
            </header>
            <main className="seo-content">
                <section className="seo-section">
                    <h2>One room code gets everyone into the same game</h2>
                    <p>
                        One person creates a room and prepares its tasks. Open the room, share the four-letter
                        code, and have each friend join on their own phone. There is no account or app to install.
                        Everyone needs internet, but a TV or console is optional. The host can take a role and play too.
                    </p>
                    <p>
                        This is a game for people together in the same place. Your phone shows your private role
                        and current task, records completions, and lets you vote. The conversations happen with
                        the people in front of you. When someone discovers a body, meet up and question where
                        everyone was before the elimination.
                    </p>
                </section>
                <GameplayScreenshots screens={['join-room', 'crew-task']} />

                <section className="seo-section">
                    <h2>Give the crew a reason to leave the sofa</h2>
                    <p>
                        Open the <a href={SETUP_URL}>six-player apartment task pack</a>, adjust the areas, and review
                        the list. Set out the paper, pens, or other materials your chosen tasks need. A task at
                        the kitchen table gives one player cover: count the visible cups and write the total.
                        A job in the hallway gives another player a chance to notice who passed through.
                    </p>
                    <p>
                        Choose “Use this pack,” then create a room and select “Import generated
                        tasks” in host setup. Before you start, show the <a href="/tutorial">player tutorial</a>
                        {' '}and explain the quiet elimination rule. A dead player marks themselves dead in the app
                        and keeps the intruder’s identity to themselves.
                    </p>
                    <p>
                        Intruders bluff through the same spaces as the crew. At the next meeting, a harmless
                        task becomes an alibi the room can challenge. Sus Party counts the votes; your friends
                        decide whose explanation deserves one more chance.
                    </p>
                </section>
                <GameSetupCta title="Send a room code. Keep your role to yourself."
                    href={SETUP_URL} label="Prepare your phone party game"
                    secondaryHref="/play" secondaryLabel="Create or join a room">
                    Start with a task pack for your space, then get your friends into the same Sus Party room.
                </GameSetupCta>
            </main>
        </SeoPageLayout>
    );
}
