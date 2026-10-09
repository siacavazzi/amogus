import React from 'react';
import { usePageMeta } from '../../seo/usePageMeta';
import SeoPageLayout from './SeoPageLayout';
import GameplayScreenshots from './GameplayScreenshots';
import GameSetupCta from './GameSetupCta';

const SETUP_URL = '/among-us-irl-task-generator?venue=house&players=8&movement=normal&style=standard&room=Kitchen&room=Living+Room&room=Hallway';
const DESCRIPTION = 'Play a Traitors-style game at home with Sus Party. Give friends secret roles, real tasks, and alibis to defend. Free in your phone browsers; the host plays too.';
const SCHEMA = {
    '@context': 'https://schema.org', '@type': 'Article',
    headline: 'Host a Traitors-style party in your own house', description: DESCRIPTION,
    mainEntityOfPage: 'https://susparty.com/traitors-at-home',
    author: { '@type': 'Organization', name: 'Sus Party', url: 'https://susparty.com/' },
};

export default function TraitorsAtHomePage() {
    usePageMeta({
        title: 'Sus Party | A Traitors-Style Game at Home',
        description: DESCRIPTION, canonical: 'https://susparty.com/traitors-at-home', schema: SCHEMA,
    });
    return (
        <SeoPageLayout>
            <header className="seo-hero">
                <p className="seo-eyebrow">The Traitors at home · Give your friends a secret</p>
                <h1 className="seo-h1">Host a Traitors-style party in your own house</h1>
                <p className="seo-lead">
                    You watched someone lie through a round-table vote and thought your friend could do better.
                    Give them the chance. Sus Party turns your home into a game of secret intruders, real
                    missions, and face-to-face accusations. Everyone joins free in a phone browser, including the host.
                </p>
                <div className="seo-actions">
                    <a href={SETUP_URL} className="seo-btn--primary">Prepare your house game →</a>
                    <a href="/play" className="seo-btn--secondary">Play Sus Party free</a>
                </div>
            </header>
            <main className="seo-content">
                <section className="seo-section">
                    <h2>The person on a mission might be the intruder</h2>
                    <p>
                        Sus Party assigns each player a private role. The crew completes tasks around the house.
                        Intruders pretend to help, slip away to eliminate players, and defend their stories at meetings.
                        Someone saw you in the kitchen. Someone else never saw you leave. That is material for an accusation.
                    </p>
                    <p>
                        If you want the suspicion and group votes of The Traitors at home, this gives you a playable
                        version of that appeal. Sus Party is an independent game with its own rules: play happens
                        between meetings, and completing the task goal reveals the intruders. The crew still needs to vote them out.
                    </p>
                </section>
                <GameplayScreenshots screens={['intruder-objective', 'vote-result']} />

                <section className="seo-section">
                    <h2>Three areas and a table for accusations</h2>
                    <p>
                        Start with the <a href={SETUP_URL}>eight-player house setup</a>: kitchen, living room, and hallway.
                        Put paper and pens at the task areas. Counting chairs, drawing a clock face, or finding a
                        visible object gives people a reason to move and a story to tell later. Review the generated
                        list and replace anything that does not fit your rooms.
                    </p>
                    <p>
                        Choose “Use this pack,” create a room, then select “Import generated tasks”
                        in host setup. Open the room and share its four-letter code. Each player needs their own
                        phone browser and internet. Read the <a href="/how-to-play">host guide</a> together before the first round.
                    </p>
                    <p>
                        Show how an intruder quietly tells a victim “you’re dead.” The victim marks themselves dead
                        in the app and keeps the killer’s identity secret. Choose a meeting spot where the living
                        players can compare alibis and vote. Then take your own role and join them.
                    </p>
                </section>
                <GameSetupCta title="Give your most convincing friend something to hide."
                    href={SETUP_URL} label="Set up your Traitors-style party"
                    secondaryHref="/how-to-play" secondaryLabel="Read the game rules">
                    Prepare the tasks, invite your suspects, and play Sus Party. Your dining table can handle the accusations.
                </GameSetupCta>
            </main>
        </SeoPageLayout>
    );
}
