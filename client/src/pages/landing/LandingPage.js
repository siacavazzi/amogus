import React, { useEffect } from 'react';
import './LandingPage.css';

function useLandingDocument() {
  useEffect(() => {
    const html = document.documentElement;
    const body = document.body;
    const themeMeta = document.querySelector('meta[name="theme-color"]');
    const previousTitle = document.title;
    const previousTheme = themeMeta ? themeMeta.getAttribute('content') : null;

    html.classList.add('lp-document');
    body.classList.add('lp-document');
    document.title = 'Sus Party';

    if (themeMeta) {
      themeMeta.setAttribute('content', '#030712');
    }

    return () => {
      html.classList.remove('lp-document');
      body.classList.remove('lp-document');
      document.title = previousTitle;

      if (themeMeta && previousTheme) {
        themeMeta.setAttribute('content', previousTheme);
      }
    };
  }, []);
}

function LandingPage() {
  useLandingDocument();

  return (
    <div className="lp-shell">
      <div className="lp-orb lp-orb--indigo" aria-hidden="true" />
      <div className="lp-orb lp-orb--purple" aria-hidden="true" />
      <div className="lp-orb lp-orb--pink" aria-hidden="true" />

      <main className="lp-page">
        <p className="lp-eyebrow">A real-life social deduction party game</p>

        <h1 className="lp-title">Sus Party</h1>

        <p className="lp-tagline">
          A social deduction party game that takes over your whole house. Roam
          room to room doing real tasks, sniff out the intruders hiding in your
          group, and bring your case to the meeting.
        </p>

        <div className="lp-actions">
          <a href="/play" className="lp-button lp-button--primary">
            Play now
          </a>
          <a href="/how-to-play" className="lp-button lp-button--secondary">
            How to play
          </a>
        </div>

        <div className="lp-inspired">
          <p className="lp-inspired__label">Inspired by</p>
          <ul className="lp-inspired__list" aria-label="Inspired by">
            <li className="lp-pill lp-pill--crew">
              <span className="lp-pill__name">Among Us</span>
              <span className="lp-pill__note">Imposters &amp; tasks</span>
            </li>
            <li className="lp-pill lp-pill--intruder">
              <span className="lp-pill__name">Mafia</span>
              <span className="lp-pill__note">Real-room deduction</span>
            </li>
            <li className="lp-pill lp-pill--meeting">
              <span className="lp-pill__name">Quiplash</span>
              <span className="lp-pill__note">Phones as controllers</span>
            </li>
          </ul>
        </div>

        <p className="lp-footnote">Best with 5–12 players · One host phone runs the room</p>
      </main>
    </div>
  );
}

export default LandingPage;
