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
    document.title = 'Sus Party — Among Us in Real Life | Free Party Game';

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

      <section className="lp-seo" aria-labelledby="lp-seo-heading">
        <div className="lp-seo__inner">
          <h2 id="lp-seo-heading" className="lp-seo__heading">
            Among Us in real life — no setup required
          </h2>
          <p className="lp-seo__lead">
            Sus Party is a free, in-person social deduction party game inspired by Among Us. Open
            <a href="https://susparty.com"> susparty.com</a> on your phones, gather 5–15 friends, and
            play in your house. Tasks, sabotage, emergency meetings, votes — all on your phone, no app
            to install, no signup, no ads.
          </p>

          <h3 className="lp-seo__subheading">How it works</h3>
          <ul className="lp-seo__list">
            <li>The host creates a room and a custom task list for your venue.</li>
            <li>Crewmates get tasks like “turn off the basement light” or “take out the trash.”</li>
            <li>Imposters secretly eliminate crewmates between rounds and sabotage the reactor.</li>
            <li>Anyone can call an emergency meeting and vote out the suspected imposter.</li>
            <li>Optional Sonos integration plays the reactor alarm through the whole house.</li>
          </ul>

          <h3 className="lp-seo__subheading">Why play Sus Party?</h3>
          <p className="lp-seo__body">
            Most party games keep you on the couch. Sus Party gets you up and moving — sneaking around
            rooms, scanning for bodies, racing to finish tasks before the meltdown. It’s the social
            deduction of Among Us or Mafia combined with the physical chaos of hide-and-seek, all
            coordinated through a single shared screen and everyone’s phones.
          </p>

          <p className="lp-seo__cta">
            <a href="/how-to-play" className="lp-seo__link">Read the full how-to-play guide →</a>
          </p>
        </div>
      </section>
    </div>
  );
}

export default LandingPage;
