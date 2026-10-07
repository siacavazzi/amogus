import React from 'react';
import { usePageMeta } from '../../seo/usePageMeta';
import SeoPageLayout from './SeoPageLayout';
import GameplayScreenshots from './GameplayScreenshots';
import GameSetupCta from './GameSetupCta';

const SETUP_URL = '/among-us-irl-task-generator?venue=house&players=10&movement=normal&style=standard&room=Living+Room&room=Kitchen&room=Hallway';
const LOW_MOVEMENT_URL = '/among-us-irl-task-generator?venue=house&players=10&movement=low&style=standard';
const DESCRIPTION = 'Turn your relatives into suspects with Sus Party, an indoor family reunion game. Use simple tasks, private roles, and face-to-face votes. Free in your phone browsers.';
const SCHEMA = {
    '@context': 'https://schema.org', '@type': 'Article',
    headline: 'A family reunion game with suspicious relatives', description: DESCRIPTION,
    mainEntityOfPage: 'https://susparty.com/indoor-family-reunion-games',
    author: { '@type': 'Organization', name: 'Sus Party', url: 'https://susparty.com/' },
};

export default function FamilyReunionPage() {
    usePageMeta({
        title: 'Sus Party | An Indoor Family Reunion Game',
        description: DESCRIPTION, canonical: 'https://susparty.com/indoor-family-reunion-games', schema: SCHEMA,
    });
    return (
        <SeoPageLayout>
            <header className="seo-hero">
                <p className="seo-eyebrow">Indoor family reunion games · Know your relatives?</p>
                <h1 className="seo-h1">A family reunion game with suspicious relatives</h1>
                <p className="seo-lead">
                    You know which cousin tells the longest stories. Find out which one tells the best lie.
                    Sus Party gives your family secret roles and simple tasks around the house. Hidden
                    intruders pretend to help, and the rest of you try to catch them. Play free in your
                    phone browsers, with accusations across the same table where you ate lunch.
                </p>
                <div className="seo-actions">
                    <a href={SETUP_URL} className="seo-btn--primary">Prepare your family game →</a>
                    <a href={LOW_MOVEMENT_URL} className="seo-btn--secondary">Use two nearby task stations</a>
                </div>
            </header>
            <main className="seo-content">
                <section className="seo-section">
                    <h2>Give relatives something to do, then something to explain</h2>
                    <p>
                        The crew follows tasks into different areas. Intruders use those same areas
                        as cover to eliminate players. A discovered body brings the living players
                        together for a meeting and a vote. Sus Party assigns the roles and counts
                        the votes, so the reunion organizer can be a suspect too.
                    </p>
                    <p>
                        Choose tasks that everyone in your round can understand: count the chairs,
                        find a visible clock, or draw a triangle inside a circle. The task itself is
                        simple. Explaining why you were beside an eliminated cousin is the interesting part.
                        This setup suits teens and adults who can use their own phones and follow the secret-role rules.
                    </p>
                </section>
                <GameplayScreenshots screens={['party-lobby', 'meeting-ready']} />

                <section className="seo-section">
                    <h2>Fit the game to the family home</h2>
                    <p>
                        Gather a group for one round of the <a href={SETUP_URL}>ten-player house setup</a>.
                        The generator covers three to fifteen players; adjust the head count to match your group.
                        It starts with the living room, kitchen, and hallway. Review the tasks and
                        set out their materials. If your group wants less movement, use
                        {' '}<a href={LOW_MOVEMENT_URL}>two nearby task stations</a> with observation and paper tasks.
                        Keep a comfortable shared spot for meetings.
                    </p>
                    <p>
                        Select “Use these tasks in a new game,” create your room, then select “Import
                        generated tasks” in host setup. Open the room and share the four-letter code.
                        Each player needs a phone browser and internet. Teach the
                        {' '}<a href="/tutorial">player actions</a> together and explain that eliminated
                        players keep the intruder’s identity secret.
                    </p>
                    <p>
                        Give relatives who sit out a place to watch the accusations. After a round,
                        return to the lobby, change any confusing tasks, and play again. The next
                        intruder can have a completely different approach to the same family.
                    </p>
                </section>
                <GameSetupCta title="Put the family storyteller’s alibi to the test."
                    href={SETUP_URL} label="Set up your family reunion round"
                    secondaryHref="/how-to-play" secondaryLabel="Read the host guide">
                    Prepare a few shared areas and invite your relatives into a Sus Party room.
                </GameSetupCta>
            </main>
        </SeoPageLayout>
    );
}
