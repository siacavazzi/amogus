import React from 'react';
import '../styles/SitePage.css';

export function SiteNav() {
    return (
        <nav className="site-nav" aria-label="Site navigation">
            <a href="/" className="site-brand">Sus Party</a>
            <div className="site-nav__links">
                <a href="/how-to-play">How to play</a>
                <a href="/among-us-irl-task-generator">Task generator</a>
                <a href="/play" className="site-button">Play now →</a>
            </div>
        </nav>
    );
}

export function SiteFooter() {
    return (
        <footer className="site-footer">
            <nav className="site-footer__links" aria-label="Footer links">
                <div>
                    <a href="/">Home</a>
                    <a href="/how-to-play">How to play</a>
                    <a href="/among-us-irl">Among Us IRL</a>
                    <a href="/how-to-play-among-us-irl">How to play IRL</a>
                    <a href="/among-us-irl-task-ideas">Task ideas</a>
                    <a href="/among-us-irl-task-generator">Task generator</a>
                </div>
                <div>
                    <a href="/party-games-for-adults">Adult party game</a>
                    <a href="/murder-mystery-party-game">Murder mystery party</a>
                    <a href="/birthday-party-games-for-adults">Adult birthday game</a>
                    <a href="/among-us-birthday-party">Among Us birthday party</a>
                    <a href="/make-cleaning-fun-for-kids">Family cleanup game</a>
                    <a href="/party-games-for-10-people">Games for 10 people</a>
                    <a href="/game-night-ideas">Game night</a>
                    <a href="/traitors-at-home">Traitors-style party</a>
                    <a href="/party-games-on-your-phone">Phone party game</a>
                </div>
                <div>
                    <a href="/sleepover-games-for-teens">Sleepover game</a>
                    <a href="/indoor-family-reunion-games">Family reunion game</a>
                    <a href="/social-deduction-games">Social deduction games</a>
                    <a href="/faq">FAQ</a>
                    <a href="/about">About</a>
                    <a href="/play">Play Sus Party</a>
                </div>
            </nav>
            <p className="site-footer__note">
                Sus Party is an independent social deduction party game. It is not affiliated with,
                endorsed by, or sponsored by Innersloth or Among Us.
            </p>
        </footer>
    );
}
