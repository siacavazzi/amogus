import React from 'react';
import { usePageMeta } from '../../seo/usePageMeta';
import SeoPageLayout from './SeoPageLayout';
import GameplayScreenshots, { GameTour } from './GameplayScreenshots';
import GameSetupCta from './GameSetupCta';
import QUICK_PAGES from './quickPages';

const SITE = 'https://susparty.com';
const plain = html => html.replace(/<[^>]+>/g, '');
// Copy comes from quickPages.js in this repo, never from users.
const Html = ({ as: Tag = 'p', html, ...rest }) => <Tag {...rest} dangerouslySetInnerHTML={{ __html: html }} />;

const RELATED = [
    ['/among-us-irl', 'Among Us IRL: the full guide'],
    ['/how-to-play-among-us-irl', 'How to play: rules and a sample round'],
    ['/among-us-irl-task-ideas', 'Task ideas by room'],
    ['/social-deduction-games', 'Social deduction games to play in person'],
    ['/party-games-on-your-phone', 'Party games with phones'],
    ['/game-night-ideas', 'Game night with no moderator'],
    ['/sus-games', 'Sus games'],
    ['/mafia-game-app', 'Mafia game app'],
];

function QuickPage({ path }) {
    const page = QUICK_PAGES[path];
    const canonical = `${SITE}${path}`;
    usePageMeta({
        title: page.title, description: page.description, canonical,
        schema: {
            '@context': 'https://schema.org',
            '@graph': [
                {
                    '@type': 'Article', headline: page.h1, description: page.description, mainEntityOfPage: canonical,
                    author: { '@type': 'Organization', name: 'Sus Party', url: `${SITE}/` },
                },
                {
                    '@type': 'FAQPage',
                    mainEntity: page.faqs.map(faq => ({
                        '@type': 'Question', name: faq.q, acceptedAnswer: { '@type': 'Answer', text: plain(faq.a) },
                    })),
                },
            ],
        },
    });

    return (
        <SeoPageLayout>
            <header className="seo-hero">
                <p className="seo-eyebrow">{page.eyebrow}</p>
                <h1 className="seo-h1">{page.h1}</h1>
                <p className="seo-lead">{page.lead}</p>
                <div className="seo-actions">
                    <a href={page.pack.href} className="seo-btn--primary">{page.pack.label} →</a>
                    <a href="/play" className="seo-btn--secondary">Join a game</a>
                </div>
            </header>
            <GameTour />
            <main className="seo-content">
                <section className="seo-section">
                    <p className="seo-section__kicker">How it works</p>
                    <h2>{page.stepsTitle}</h2>
                    <ol className="seo-steps">
                        {page.steps.map(([title, text], index) => (
                            <li className="seo-step" key={title}>
                                <span className="seo-step__num" aria-hidden="true">{index + 1}</span>
                                <div><h3>{title}</h3><p>{text}</p></div>
                            </li>
                        ))}
                    </ol>
                </section>

                {page.sections.map((section, index) => (
                    <React.Fragment key={section.h2}>
                        <section className="seo-section">
                            <h2>{section.h2}</h2>
                            {section.body.map(html => <Html key={html.slice(0, 40)} html={html} />)}
                        </section>
                        {index === 0 && <GameplayScreenshots screens={['crew-task', 'vote']} />}
                    </React.Fragment>
                ))}

                <section className="seo-section">
                    <p className="seo-section__kicker">FAQ</p>
                    <h2>Quick answers</h2>
                    <div className="seo-faq">
                        {page.faqs.map(faq => (
                            <div className="seo-faq__item" key={faq.q}>
                                <p className="seo-faq__q">{faq.q}</p>
                                <Html html={faq.a} />
                            </div>
                        ))}
                    </div>
                </section>

                <GameSetupCta title={page.cta.title} href={page.pack.href}
                    label={page.pack.label} secondaryHref="/play" secondaryLabel="Join with a room code">
                    {page.cta.text}
                </GameSetupCta>

                <nav className="seo-links" aria-label="Related guides">
                    <p className="seo-links__title">More guides</p>
                    <ul className="seo-links__list">
                        {RELATED.filter(([href]) => href !== path).map(([href, label]) => (
                            <li key={href}><a href={href}>{label}</a></li>
                        ))}
                    </ul>
                </nav>
            </main>
        </SeoPageLayout>
    );
}

export default QuickPage;
