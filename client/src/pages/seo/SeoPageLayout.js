import React, { useEffect } from 'react';
import './SeoPage.css';

/**
 * Shared shell for all SEO / marketing pages.
 * Handles: dark body class, sticky nav, footer with legal disclaimer.
 * Individual pages supply their own hero + content as children.
 */
function SeoPageLayout({ children }) {
    useEffect(() => {
        const html = document.documentElement;
        const body = document.body;
        html.classList.add('lp-document');
        body.classList.add('lp-document');
        return () => {
            html.classList.remove('lp-document');
            body.classList.remove('lp-document');
        };
    }, []);

    return (
        <div className="seo-shell">
            <nav className="seo-nav" aria-label="Site navigation">
                <a href="/" className="seo-nav__brand">
                    Sus Party
                </a>
                <a href="/play" className="seo-btn--primary seo-nav__play">
                    Play now →
                </a>
            </nav>

            {children}

            <div className="seo-footer-wrap">
                <footer className="seo-footer">
                    <nav aria-label="Footer links">
                        <div className="seo-footer__links">
                            <a href="/">Home</a>
                            <a href="/among-us-irl">Among Us IRL</a>
                            <a href="/how-to-play-among-us-irl">How to Play IRL</a>
                            <a href="/among-us-irl-task-ideas">Task Ideas</a>
                            <a href="/among-us-irl-task-generator">Task Generator</a>
                            <a href="/how-to-play">Sus Party Guide</a>
                            <a href="/faq">FAQ</a>
                            <a href="/about">About</a>
                            <a href="/play">Play</a>
                        </div>
                    </nav>
                    <p className="seo-footer__disclaimer">
                        Sus Party is an independent social deduction party game and is not affiliated
                        with, endorsed by, or sponsored by Innersloth or Among Us.
                    </p>
                </footer>
            </div>
        </div>
    );
}

export default SeoPageLayout;
