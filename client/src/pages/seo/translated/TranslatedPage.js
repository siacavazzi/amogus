import React, { useEffect } from 'react';
import { usePageMeta } from '../../../seo/usePageMeta';
import { alternatesFor, pagePath, pageUrl, LANGUAGE_NAMES, PAGE_LANGUAGES } from '../../../seo/translatedPages';
import { applyDocumentLanguage, chooseLanguage } from '../../../i18n';
import { TRANSLATED_CONTENT } from './content';
import '../../../styles/SitePage.css';
import '../SeoPage.css';
import SusMark from '../../../components/SusMark';

function Steps({ steps }) {
    return (
        <ol className="seo-steps">
            {steps.map(([title, text], i) => (
                <li className="seo-step" key={title}>
                    <span className="seo-step__num" aria-hidden="true">{i + 1}</span>
                    <div>
                        <h3>{title}</h3>
                        <p>{text}</p>
                    </div>
                </li>
            ))}
        </ol>
    );
}

function Faqs({ title, faqs }) {
    return (
        <section className="seo-section">
            <h2>{title}</h2>
            <div className="seo-faq">
                {faqs.map(([q, a]) => (
                    <div className="seo-faq__item" key={q}>
                        <p className="seo-faq__q">{q}</p>
                        <p>{a}</p>
                    </div>
                ))}
            </div>
        </section>
    );
}

/** The homepage or the Among Us IRL page in one language (see translated/content.js). */
function TranslatedPage({ lang, page }) {
    const copy = TRANSLATED_CONTENT[lang];
    const body = copy[page];
    const { common } = copy;

    usePageMeta({
        title: body.title,
        description: body.description,
        canonical: pageUrl(lang, page),
        ogImage: 'https://susparty.com/og-image.jpg?v=2',
        alternates: alternatesFor(page),
        schema: {
            '@context': 'https://schema.org',
            '@type': 'FAQPage',
            inLanguage: copy.hreflang,
            mainEntity: body.faqs.map(([q, a]) => ({
                '@type': 'Question',
                name: q,
                acceptedAnswer: { '@type': 'Answer', text: a },
            })),
        },
    });

    useEffect(() => {
        const html = document.documentElement;
        const bodyEl = document.body;
        html.classList.add('lp-document');
        bodyEl.classList.add('lp-document');
        // The path set the language (/fr is French), so <html lang> follows it.
        applyDocumentLanguage();
        return () => {
            html.classList.remove('lp-document');
            bodyEl.classList.remove('lp-document');
        };
    }, []);

    // Starting a game from a French page should keep the game in French.
    const keepLanguage = () => chooseLanguage(lang, { reload: false });
    const playHref = `/play?lang=${lang}`;
    const generatorHref = `/among-us-irl-task-generator?venue=house&players=8&task_lang=${lang}`;

    const actions = (
        <div className="seo-actions">
            <a href={playHref} className="seo-btn--primary" onClick={keepLanguage}>{common.start} →</a>
            <a href={generatorHref} className="seo-btn--secondary" onClick={keepLanguage}>{common.generator}</a>
        </div>
    );

    return (
        <div className="site-page seo-shell" lang={lang}>
            <nav className="site-nav" aria-label="Sus Party">
                <a href={pagePath(lang, 'home')} className="site-brand"><SusMark className="site-brand__mark" />Sus Party</a>
                <div className="site-nav__links">
                    <a href={pagePath(lang, 'irl')}>{copy.nav.irl}</a>
                    <a href={playHref} className="site-button" onClick={keepLanguage}>{copy.nav.play} →</a>
                </div>
            </nav>

            <div className="seo-hero">
                <p className="seo-eyebrow">{common.eyebrow}</p>
                <h1 className="seo-h1">{body.h1}</h1>
                <p className="seo-lead">{body.lead}</p>
                {actions}
                <p className="seo-launch__note">{common.note}</p>
            </div>

            <div className="seo-content">
                {page === 'home' ? (
                    <section className="seo-section">
                        <h2>{body.stepsTitle}</h2>
                        <Steps steps={body.steps} />
                        <p><a href={pagePath(lang, 'irl')}>{body.irlLink}</a></p>
                    </section>
                ) : (
                    <>
                        <section className="seo-section">
                            <h2>{body.rolesTitle}</h2>
                            <div className="seo-cards seo-cards--2">
                                {body.roles.map(([title, text]) => (
                                    <div className="seo-card" key={title}>
                                        <h3>{title}</h3>
                                        <p>{text}</p>
                                    </div>
                                ))}
                            </div>
                        </section>
                        <section className="seo-section">
                            <h2>{body.setupTitle}</h2>
                            <Steps steps={body.steps} />
                        </section>
                        <section className="seo-section">
                            <h2>{body.winTitle}</h2>
                            <p>{body.win}</p>
                        </section>
                    </>
                )}

                <Faqs title={common.faqTitle} faqs={body.faqs} />

                <section className="seo-launch">
                    <h2>{common.readyTitle}</h2>
                    <p>{common.readyText}</p>
                    {actions}
                </section>
            </div>

            <footer className="site-footer">
                <LanguageLinks page={page} current={lang} />
                <p className="site-footer__note">{copy.footerNote}</p>
            </footer>
        </div>
    );
}

/** "English · Français · ..." for one page; also used in the English footer. */
export function LanguageLinks({ page = 'home', current = 'en' }) {
    return (
        <nav className="site-footer__langs" aria-label="Language">
            {['en', ...PAGE_LANGUAGES].map(code => (
                code === current
                    ? <span key={code} aria-current="page">{LANGUAGE_NAMES[code]}</span>
                    : <a key={code} href={pagePath(code, page)} hrefLang={code === 'pt' ? 'pt-BR' : code} lang={code}>{LANGUAGE_NAMES[code]}</a>
            ))}
        </nav>
    );
}

export default TranslatedPage;
