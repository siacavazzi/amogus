import React, { useEffect } from 'react';
import { usePageMeta } from '../../seo/usePageMeta';
import SeoPageLayout from '../seo/SeoPageLayout';
import './InfoPage.css';

// Shown for any address the site doesn't have, instead of quietly showing the home page.
function NotFoundPage() {
    usePageMeta({
        title: 'Page not found | Sus Party',
        description: 'This page does not exist. Host or join a Sus Party game, or read how to play.',
        canonical: 'https://susparty.com/',
    });

    // Keep search engines from indexing a missing page as a copy of the home page.
    useEffect(() => {
        const meta = document.createElement('meta');
        meta.setAttribute('name', 'robots');
        meta.setAttribute('content', 'noindex');
        document.head.appendChild(meta);
        return () => meta.remove();
    }, []);

    return (
        <SeoPageLayout className="info-shell">
            <main className="info-page">
                <header className="info-header">
                    <p className="info-eyebrow">404</p>
                    <h1 className="info-title">This page isn't here</h1>
                    <p className="info-lead">
                        The link may be old or mistyped. If you were sent a room code, go to the game and type it in.
                    </p>
                    <p style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginTop: 24 }}>
                        <a href="/play" className="seo-btn--primary">Host or join a game</a>
                        <a href="/" className="seo-btn--secondary">Go to the home page</a>
                    </p>
                </header>
            </main>
        </SeoPageLayout>
    );
}

export default NotFoundPage;
