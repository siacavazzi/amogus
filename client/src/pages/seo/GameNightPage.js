import React from 'react';
import { usePageMeta } from '../../seo/usePageMeta';
import SeoPageLayout from './SeoPageLayout';
import GameplayScreenshots from './GameplayScreenshots';
import GameSetupCta from './GameSetupCta';

const SETUP_URL = '/among-us-irl-task-generator?venue=apartment&players=8&movement=normal&style=mix';
const SCHEMA = {
    '@context': 'https://schema.org', '@type': 'Article',
    headline: 'A game night where the host gets to play, too',
    description: 'Plan a Sus Party game night at home. Prepare room-based tasks, teach the actions, and join your friends as a player.',
    mainEntityOfPage: 'https://susparty.com/game-night-ideas',
    author: { '@type': 'Organization', name: 'Sus Party', url: 'https://susparty.com/' },
};

function GameNightPage() {
    usePageMeta({
        title: 'Sus Party | Game Night with No Dedicated Moderator',
        description: 'Want a game like Mafia or Werewolf without a dedicated moderator? Play Sus Party with secret roles, real tasks, and app-counted votes. The host plays too.',
        canonical: 'https://susparty.com/game-night-ideas', schema: SCHEMA,
    });

    return (
        <SeoPageLayout>
            <header className="seo-hero">
                <p className="seo-eyebrow">Game night ideas · Host it, then get into it</p>
                <h1 className="seo-h1">A game night where the host gets to play, too</h1>
                <p className="seo-lead">
                    You picked the date, invited the friends, and supplied the snacks. You deserve a secret
                    role too. Sus Party is a free game-night idea that turns your home into a map of tasks
                    and suspicious encounters. The app assigns roles and counts votes, so you can join
                    the round and try to get away with a terrible alibi.
                </p>
                <div className="seo-actions">
                    <a href="/play" className="seo-btn--primary">Play Sus Party free →</a>
                    <a href={SETUP_URL} className="seo-btn--secondary">Prepare your game night</a>
                </div>
            </header>
            <main className="seo-content">
                <section className="seo-section">
                    <h2>A game like Mafia or Werewolf without a dedicated moderator</h2>
                    <p>
                        If your group likes hidden roles but nobody wants to sit out as the narrator,
                        try Sus Party. The app assigns private roles, tracks task progress, and counts
                        votes. You prepare the room and explain the rules, then take a role alongside your friends.
                    </p>
                    <p>
                        Sus Party has its own rules and a physical task map. Crew members have jobs
                        to complete; intruders use those jobs as cover. What people do between meetings
                        gives the group something to question when it is time to vote.
                    </p>
                </section>
                <GameplayScreenshots screens={['crew-task', 'vote']} />

                <section className="seo-section">
                    <h2>Set up the spaces before friends arrive</h2>
                    <p>
                        Open the <a href={SETUP_URL}>eight-player apartment task pack</a>, then change the
                        venue, head count, and areas to match your night. Review every task and put out any
                        materials it needs. Choose a meeting spot where the group can gather and talk.
                    </p>
                    <p>
                        Select “Use this pack,” create your room, then choose “Import generated
                        tasks” in host setup. Keep that browser open. Guests need their own phone browsers and
                        internet; nobody needs an account or an install.
                    </p>
                </section>
                <section className="seo-section">
                    <h2>Teach one task, then let the secrets loose</h2>
                    <p>
                        Share the four-letter room code. Before you start, show the <a href="/tutorial">crew tutorial</a>
                        {' '}and explain where meetings happen. An intruder eliminates a player with a tap and a quiet
                        “you’re dead.” Eliminated players keep the killer’s identity secret.
                    </p>
                    <p>
                        Now play. The crew works through real tasks while intruders fake their way around the same
                        spaces. A discovered body pulls everyone back to your meeting spot to compare stories and vote.
                        After the round, ask which alibi fooled the room. Adjust any confusing tasks before the next one.
                    </p>
                </section>
                <GameSetupCta title="Get the snacks ready. Keep your role secret."
                    href="/play" label="Start your game night"
                    secondaryHref={SETUP_URL} secondaryLabel="Prepare your task pack">
                    Make the room, invite your friends, and take your place among the suspects.
                    Sus Party handles the roles. You still have to explain why you were in the hallway.
                </GameSetupCta>
            </main>
        </SeoPageLayout>
    );
}

export default GameNightPage;
