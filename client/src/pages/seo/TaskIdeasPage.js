import React, { useState } from 'react';
import { usePageMeta } from '../../seo/usePageMeta';
import SeoPageLayout from './SeoPageLayout';
import GameplayScreenshots from './GameplayScreenshots';
import GameSetupCta from './GameSetupCta';
import { TASK_SECTIONS, TASK_COUNT, FAQ, numberedSections } from './taskIdeas';
import './TaskIdeasPage.css';

const PAGE_URL = 'https://susparty.com/among-us-irl-task-ideas';
const SECTIONS = numberedSections(TASK_SECTIONS);

const SCHEMA = {
    '@context': 'https://schema.org',
    '@graph': [
        {
            '@type': 'ItemList',
            name: `${TASK_COUNT} Among Us tasks to do in real life`,
            description: 'Real-life Among Us task ideas for the living room, kitchen, hallway, backyard, classroom, and parties, plus tasks for little kids and two players.',
            url: PAGE_URL,
            numberOfItems: TASK_COUNT,
            itemListElement: SECTIONS.flatMap(section => section.tasks.map((task, index) => ({
                '@type': 'ListItem',
                position: section.start + index,
                name: task,
            }))),
        },
        {
            '@type': 'FAQPage',
            mainEntity: FAQ.map(item => ({
                '@type': 'Question',
                name: item.q,
                acceptedAnswer: { '@type': 'Answer', text: item.a },
            })),
        },
    ],
};

const TIPS = [
    { title: 'One spot', body: 'Tie every task to a place. Players walk there, and everyone else can see who went where.' },
    { title: '10 to 40 seconds', body: 'Long enough to be watched, short enough that nobody waits around.' },
    { title: 'Resets by itself', body: 'Unstack the cups, put the book back. The next player sent there finds it ready.' },
    { title: 'Nothing to check', body: 'Skip quizzes and answers. Doing the task in plain sight is the whole point.' },
];

function CopyButton({ section }) {
    const [copied, setCopied] = useState(false);
    const copy = async () => {
        try {
            await navigator.clipboard.writeText(section.tasks.join('\n'));
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch (_) { /* Clipboard can be blocked. The list is still on the page. */ }
    };
    return (
        <button type="button" className="ti-copy" onClick={copy} aria-live="polite">
            {copied ? 'Copied' : `Copy these ${section.tasks.length}`}
        </button>
    );
}

function TaskIdeasPage() {
    usePageMeta({
        title: `${TASK_COUNT} Among Us Tasks in Real Life: Ideas for Home, School and Parties | Sus Party`,
        description:
            `A free list of ${TASK_COUNT} real-life Among Us tasks, sorted by room: living room, kitchen, hallway, backyard, classroom, and party tasks, plus easy ones for little kids. All kid-safe.`,
        canonical: PAGE_URL,
        ogImage: 'https://susparty.com/og-image.jpg?v=2',
        schema: SCHEMA,
    });

    return (
        <SeoPageLayout className="ti-page">
            <div className="seo-hero">
                <p className="seo-eyebrow">
                    <a href="/among-us-irl" style={{ color: 'inherit' }}>Among Us IRL</a> › Task ideas
                </p>
                <h1 className="seo-h1">{TASK_COUNT} Among Us tasks to do in real life</h1>
                <p className="seo-lead">
                    Good real-life tasks are short jobs at one spot that reset for the next player:
                    fold a blanket, stack cups into a pyramid, toss a ball into a bucket. Here are {TASK_COUNT},
                    sorted by place, all safe for kids. Pick the ones that fit your house, school, or party.
                </p>
                <ul className="ti-facts" aria-label="What every task has">
                    <li>10 to 40 seconds each</li>
                    <li>Resets for the next player</li>
                    <li>Kid-safe</li>
                </ul>
                <div className="seo-actions">
                    <a href="/among-us-irl-task-generator?venue=house&players=8" className="seo-btn--primary">
                        Turn these into a game →
                    </a>
                    <a href="/among-us-task-cards-printable" className="seo-btn--secondary">
                        Print task cards
                    </a>
                </div>
            </div>

            <div className="seo-content">
                <nav className="ti-jump" aria-label="Jump to a place">
                    <p className="seo-links__title">Jump to a place</p>
                    <ul>
                        {SECTIONS.map(section => (
                            <li key={section.id}>
                                <a href={'#' + section.id}>
                                    {section.label} <span>{section.tasks.length}</span>
                                </a>
                            </li>
                        ))}
                    </ul>
                </nav>

                {SECTIONS.map(section => (
                    <section className="seo-section ti-section" id={section.id} key={section.id}>
                        <p className="ti-range">Tasks {section.start} to {section.start + section.tasks.length - 1}</p>
                        <h2>{section.heading}</h2>
                        <p>{section.intro}</p>
                        <ol className="ti-list" start={section.start}>
                            {section.tasks.map((task, index) => (
                                <li key={task}>
                                    <span className="ti-num" aria-hidden="true">{section.start + index}</span>
                                    <span>{task}</span>
                                </li>
                            ))}
                        </ol>
                        <div className="ti-section__foot">
                            <CopyButton section={section} />
                            <a href={section.generatorHref}>Build a game with tasks like these →</a>
                        </div>
                    </section>
                ))}

                <section className="seo-section" id="play-with-these-tasks">
                    <p className="seo-section__kicker">From list to game</p>
                    <h2>Play with these tasks</h2>
                    <ol className="ti-steps">
                        <li><strong>Pick about three tasks per player</strong> from at least three places. Eight players need around 24.</li>
                        <li><strong>Open a free room</strong> on a laptop or phone at susparty.com. Type your tasks in, or let the <a href="/among-us-irl-task-generator?venue=house&players=8">task generator</a> build the list and load it for you.</li>
                        <li><strong>Everyone joins on their phone</strong> with the room code. No app or account. Sus Party deals the secret roles and hands each player their next task.</li>
                    </ol>
                    <GameplayScreenshots screens={['crew-task', 'next-task']} />
                </section>

                <section className="seo-section" id="write-good-tasks">
                    <p className="seo-section__kicker">Write your own</p>
                    <h2>What makes a good real-life task</h2>
                    <div className="seo-cards seo-cards--2">
                        {TIPS.map(tip => (
                            <div className="seo-card" key={tip.title}>
                                <h3>{tip.title}</h3>
                                <p>{tip.body}</p>
                            </div>
                        ))}
                    </div>
                </section>

                <GameSetupCta title="Skip the list making"
                    href="/among-us-irl-task-generator?venue=house&players=8" label="Build a task list for your space"
                    secondaryLabel="Play Sus Party">
                    Pick your rooms and player count. The generator writes the task list, then
                    “Use this pack” opens a room with the tasks already loaded.
                </GameSetupCta>

                <section className="seo-section" id="task-faq">
                    <p className="seo-section__kicker">Questions</p>
                    <h2>Real-life task questions</h2>
                    <div className="ti-faq">
                        {FAQ.map(item => (
                            <div key={item.q}>
                                <h3>{item.q}</h3>
                                <p>{item.a}</p>
                            </div>
                        ))}
                    </div>
                </section>

                <nav className="seo-links" aria-label="Related Among Us IRL guides">
                    <p className="seo-links__title">Related guides</p>
                    <ul className="seo-links__list">
                        <li><a href="/how-to-play-among-us-irl">Rules for your first round</a></li>
                        <li><a href="/among-us-task-cards-printable">Printable task cards</a></li>
                        <li><a href="/among-us-irl#classroom-setup">Set up a classroom game</a></li>
                        <li><a href="/among-us-party-for-kids">Plan a kids party</a></li>
                        <li><a href="/how-to-play-among-us-irl#access-options">Plan a low-movement round</a></li>
                    </ul>
                </nav>
            </div>
        </SeoPageLayout>
    );
}

export default TaskIdeasPage;
