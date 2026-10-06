import React, { useEffect } from 'react';
import { SiteNav, SiteFooter } from '../../components/SiteChrome';
import './SeoPage.css';

/**
 * Shared shell for all SEO / marketing pages.
 * Uses the shared dark theme, navigation, and footer.
 * Individual pages supply their own hero + content as children.
 */
function SeoPageLayout({ children, className = '' }) {
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
        <div className={`site-page seo-shell ${className}`}>
            <SiteNav />

            {children}

            <SiteFooter />
        </div>
    );
}

export default SeoPageLayout;
