import React from 'react';
import { usePageMeta } from '../../seo/usePageMeta';
import SeoPageLayout from './SeoPageLayout';
import GameplayScreenshots from './GameplayScreenshots';
import GameSetupCta from './GameSetupCta';

const SETUP_URL = '/among-us-irl-task-generator?venue=house&players=10&movement=normal&style=mix';
const SCHEMA = {
    '@context': 'https://schema.org', '@type': 'Article',
    headline: 'Turn your birthday party into a room full of suspects',
    description: 'Give adult birthday guests secret roles and real tasks with Sus Party, a free game that makes your friends explain their alibis.',
    mainEntityOfPage: 'https://susparty.com/birthday-party-games-for-adults',
    author: { '@type': 'Organization', name: 'Sus Party', url: 'https://susparty.com/' },
};

function AdultBirthdayPage() {
    usePageMeta({
        title: 'Birthday Party Game for Adults at Home | Sus Party',
        description: 'Make your birthday friends the suspects. Play Sus Party free at home with secret roles, real tasks, and accusations. Prepare the game, then leave cake for a break.',
        canonical: 'https://susparty.com/birthday-party-games-for-adults', schema: SCHEMA,
    });

    return (
        <SeoPageLayout>
            <header className="seo-hero">
                <p className="seo-eyebrow">Birthday party games for adults · Bring your best poker face</p>
                <h1 className="seo-h1">Turn your birthday party into a room full of suspects</h1>
                <p className="seo-lead">
                    Your oldest friend knows exactly how to make you believe them. Give them a secret role
                    and see if that still works. Sus Party is a free birthday party game for adults where
                    your guests complete real tasks around the house, dodge hidden intruders, and accuse
                    each other across the table. Even the birthday host gets to play.
                </p>
                <div className="seo-actions">
                    <a href="/play" className="seo-btn--primary">Play Sus Party free →</a>
                    <a href={SETUP_URL} className="seo-btn--secondary">Prepare the birthday game</a>
                </div>
            </header>
            <main className="seo-content">
                <section className="seo-section">
                    <h2>Give friends from different circles a shared secret</h2>
                    <p>
                        Guests get private roles on their phones. The crew follows tasks around your home;
                        intruders blend in and look for someone to catch alone. Nobody gets to assume their
                        best friend is on their side.
                    </p>
                    <p>
                        A body discovery brings everyone to a meeting. Guests compare what they saw, defend
                        their movements, and vote. Someone’s suspicious trip to the kitchen gives the whole
                        table something to talk about, including the friends who just met.
                    </p>
                </section>
                <GameplayScreenshots screens={['party-lobby', 'vote']} />

                <section className="seo-section">
                    <h2>Prepare before the doorbell rings</h2>
                    <ul className="seo-list">
                        <li>Open the <a href={SETUP_URL}>ten-player house task pack</a>. Change the guest count and rooms. Review the tasks and supply their materials.</li>
                        <li>Choose “Use this pack,” create a room, then select “Import generated tasks” in host setup.</li>
                        <li>When everyone arrives, share the four-letter code. Each guest needs a phone browser and internet. Explain eliminations and the meeting spot before the round.</li>
                    </ul>
                    <p>
                        Wait for the guest list to settle before you start. Keep cake and late arrivals for
                        a break between rounds. Once a round ends, swap stories about who fooled whom
                        before you deal another set of roles.
                    </p>
                </section>
                <GameSetupCta title="Make your birthday guests defend themselves"
                    href="/play" label="Start the birthday game"
                    secondaryHref={SETUP_URL} secondaryLabel="Build the birthday task pack">
                    Bring the friends, prepare the rooms, and let Sus Party hand out the secrets.
                    Use the <a href="/tutorial">crew tutorial</a> to show a task before you start.
                    Save your best accusation for the first meeting.
                </GameSetupCta>
            </main>
        </SeoPageLayout>
    );
}

export default AdultBirthdayPage;
