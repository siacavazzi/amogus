import React from 'react';

function GameSetupCta({ title, children, href, label, secondaryHref = '/play', secondaryLabel = 'Create or join a room' }) {
    return (
        <section className="seo-launch" aria-label="Set up a Sus Party game">
            <h2>{title}</h2>
            <p>{children}</p>
            <div className="seo-actions">
                <a href={href} className="seo-btn--primary">{label} →</a>
                <a href={secondaryHref} className="seo-btn--secondary">{secondaryLabel}</a>
            </div>
            <p className="seo-launch__note">Free browser game · No account or install · Everyone plays in the same place</p>
        </section>
    );
}

export default GameSetupCta;
