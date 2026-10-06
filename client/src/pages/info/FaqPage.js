import React from 'react';
import { usePageMeta } from '../../seo/usePageMeta';
import SeoPageLayout from '../seo/SeoPageLayout';
import './InfoPage.css';

const FAQS = [
    {
        q: 'Is Sus Party free?',
        a: 'Yes. Sus Party is free, with no account, ads, or app-store purchase. Open it in your browser, prepare a task pack, and invite friends with your room code.',
        href: '/among-us-irl-task-generator', linkLabel: 'Prepare your first task pack',
    },
    {
        q: 'Do I need to install an app?',
        a: 'No. Sus Party runs entirely in the browser. Just open susparty.com on any phone: iPhone, Android, anything with a modern browser.',
    },
    {
        q: 'Is this the SusParty app on the App Store or Google Play?',
        a: 'No. Sus Party at susparty.com is an independent browser game for play around your house. We are not affiliated with the SusParty mobile app or susparty.info. Our game has no app-store purchases or subscriptions. We cannot access accounts, purchases, or refunds for that separate app.',
    },
    {
        q: 'How many players can play?',
        a: 'The game requires at least two crew members per intruder. One intruder needs at least three players. The task generator prepares groups of five to fifteen, but the game has no fixed fifteen-player cap. Adjust the intruder count to suit your group.',
        href: '/how-to-play-among-us-irl#before-play', linkLabel: 'Choose a first-round setup',
    },
    {
        q: 'Can I play a social deduction game around the house?',
        a: 'Yes. That is exactly what Sus Party is built for. Gather a group in a house, apartment, dorm, or office, hand everyone their phone, and run a room-to-room game with secret roles, real tasks, sabotage, meetings, and votes.',
    },
    {
        q: 'What are good tasks for Among Us in real life?',
        a: 'Choose short jobs with a clear location and finish: count coasters at the dining table, arrange host-provided cards, or read a title on a shared shelf. Spread the list across your areas so players have a reason to split up. The generator supplies a pack that you can review and edit.',
        href: '/among-us-irl-task-ideas', linkLabel: 'Browse task ideas by room',
    },
    {
        q: 'How do you set up Among Us in real life?',
        a: 'Generate a task pack for your rooms, select “Use these tasks in a new game,” and create the room. Select “Import generated tasks” in host setup, review the list and settings, then share the four-letter code. Friends join on their phones. A larger device can join as the optional Reactor display.',
        href: '/how-to-play-among-us-irl', linkLabel: 'Follow the setup and sample round',
    },
    {
        q: 'Do you need an app to play Among Us in real life?',
        a: 'You can run a paper version with roles, task lists, and someone to manage votes. Sus Party runs those shared game functions in browser tabs. Each player needs internet and a phone browser, but nobody needs to install a native app.',
    },
    {
        q: 'Is there a free Among Us party game?',
        a: 'Sus Party is one. It\u2019s free, requires no signup, runs in the browser, and the source is on GitHub.',
    },
    {
        q: 'What is the reactor / meltdown?',
        a: 'The optional Reactor display adds a shared meltdown mini-game. Intruders can trigger a countdown that sends the crew to the Reactor with codes. If the countdown reaches zero, the intruders win. Use a larger device as the display and keep a clear route to it.',
    },
    {
        q: 'Does Sus Party work with Sonos speakers?',
        a: 'Yes. There’s an optional Sonos integration that pipes the reactor alarm and meeting bells through your speakers. You run a small connector app on the same Wi-Fi as your speakers and join your game with the room code. It’s completely optional, but it dramatically changes the vibe.',
    },
    {
        q: 'Can I play remotely / over video chat?',
        a: 'No. Players share a physical space. The phones connect online, but tasks, observations, and meetings happen in person. The low-movement preset can place two task stations in one room.',
        href: '/among-us-irl-task-generator?venue=other&players=8&movement=low', linkLabel: 'Prepare a two-station round',
    },
    {
        q: 'Do we need a TV or laptop?',
        a: 'No. A phone-only game works. Larger devices act as the Reactor display rather than as players. Add one if you want the shared meltdown mini-game; each player still uses a phone.',
    },
    {
        q: 'Does completing tasks win the game?',
        a: 'Task completion reveals the names of living intruders. The crew still needs to vote out every intruder. Intruders win when they reach parity with the living crew or a Reactor meltdown reaches zero.',
        href: '/how-to-play-among-us-irl#win-conditions', linkLabel: 'Read the win conditions',
    },
    {
        q: 'Is Sus Party the imposter word game?',
        a: 'No. Sus Party uses physical tasks, sabotage, meetings, and votes. It does not use the shared-secret-word format. Both are social deduction formats, but they create different clues and need different setups.',
        href: '/social-deduction-games', linkLabel: 'Compare social deduction formats',
    },
    {
        q: 'Is Sus Party affiliated with Innersloth or Among Us?',
        a: 'No. Sus Party is an independent social deduction party game and is not affiliated with, endorsed by, or sponsored by Innersloth or Among Us.',
    },
];

function FaqPage() {
    usePageMeta({
        title: 'Sus Party FAQ | Free Social Deduction Game in Real Life',
        description: 'Prepare your first Sus Party game with phones, real tasks, and friends in the same place. Get answers about setup, player counts, votes, and optional screens.',
        canonical: 'https://susparty.com/faq',
    });
    const jsonLd = {
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        mainEntity: FAQS.map((f) => ({
            '@type': 'Question',
            name: f.q,
            acceptedAnswer: { '@type': 'Answer', text: f.a },
        })),
    };

    return (
        <>
            <SeoPageLayout className="info-shell">


                <main className="info-page">

                    <header className="info-header">
                        <p className="info-eyebrow">Frequently Asked Questions</p>
                        <h1 className="info-title">Before your first Sus Party game</h1>
                        <p className="info-lead">
                            Get the group into one room, prepare the task map, and give everyone a secret role.
                            These answers explain what you need before you share the code.
                        </p>
                    </header>

                    <section className="info-body">
                        {FAQS.map((f, i) => (
                            <article key={i} className="info-faq">
                                <h2 className="info-faq__q">{f.q}</h2>
                                <p className="info-faq__a">{f.a}</p>
                                {f.href && <p><a href={f.href}>{f.linkLabel} →</a></p>}
                            </article>
                        ))}
                    </section>

                    <footer className="info-footer">
                        <p>
                            Ready to host? <a href="/among-us-irl-task-generator?venue=house&players=8&movement=normal">Build a house task pack</a>, read the{' '}
                            <a href="/how-to-play">Sus Party host guide</a>,{' '}
                            <a href="/how-to-play-among-us-irl">full Among Us IRL rules</a>, or{' '}
                            <a href="/play">create or join a room</a>.
                        </p>
                    </footer>
                </main>

                <script
                    type="application/ld+json"
                    dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
                />
            </SeoPageLayout>
        </>
    );
}

export default FaqPage;
