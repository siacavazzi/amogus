import React, { useEffect } from 'react';
import {
  flowSteps,
  heroStats,
  hostCards,
  intruderCardHighlights,
  jumpLinks,
  meetingCards,
  meltdownCards,
  pageCopy,
  roleCards,
  setupCards,
  setupGuides,
  winningCards,
} from './HowToPlayContent';
import {
  ButtonLink,
  CardGrid,
  FlowStep,
  FooterCta,
  InfoCard,
  JumpLinks,
  NotePanel,
  RoleCard,
  Section,
} from './HowToPlayComponents';
import './HowToPlayPage.css';

function useMarketingDocument() {
  useEffect(() => {
    const html = document.documentElement;
    const body = document.body;
    const themeMeta = document.querySelector('meta[name="theme-color"]');
    const previousTitle = document.title;
    const previousTheme = themeMeta ? themeMeta.getAttribute('content') : null;

    html.classList.add('htp-document');
    body.classList.add('htp-document');
    document.title = 'How to Play - Sus Party';

    if (themeMeta) {
      themeMeta.setAttribute('content', '#030712');
    }

    return () => {
      html.classList.remove('htp-document');
      body.classList.remove('htp-document');
      document.title = previousTitle;

      if (themeMeta && previousTheme) {
        themeMeta.setAttribute('content', previousTheme);
      }
    };
  }, []);
}

function HowToPlayPage() {
  useMarketingDocument();

  // SPA hash-scroll: the browser misses the initial #anchor jump because the
  // page mounts after the URL is already set, so we re-trigger it here.
  useEffect(() => {
    const hash = window.location.hash;
    if (!hash) return;
    const id = hash.slice(1);
    // Wait one frame so sections are in the DOM and CSS has applied.
    const raf = requestAnimationFrame(() => {
      const el = document.getElementById(id);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    });
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <div className="htp-shell">
      <div className="htp-page">
        <div className="htp-topbar">
          <div className="htp-brand">Sus Party</div>
          <ButtonLink href="/play" variant="secondary" compact>
            Open Game
          </ButtonLink>
        </div>

        <section className="htp-hero">
          <div className="htp-hero__main">
            <p className="htp-eyebrow">How to Play</p>
            <h1>{pageCopy.heroTitle}</h1>
            <p>{pageCopy.heroBody}</p>

            <div className="htp-hero__actions">
              <ButtonLink href="/play" variant="primary">
                Play now
              </ButtonLink>
              <ButtonLink href="#setup" variant="secondary">
                Start with setup
              </ButtonLink>
            </div>

            <p className="htp-hero__note">{pageCopy.heroNote}</p>
          </div>

          <aside className="htp-hero__panel">
            <div className="htp-summary-card">
              <p className="htp-kicker">First-Game Basics</p>
              <h2>At a glance</h2>

              <div className="htp-summary-grid">
                {heroStats.map((stat) => (
                  <div className="htp-stat" key={stat.label}>
                    <strong>{stat.value}</strong>
                    <span>{stat.label}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="htp-callout">
              <strong>{pageCopy.venueTitle}</strong>
              <p>{pageCopy.venueBody}</p>
            </div>
          </aside>
        </section>

        <JumpLinks links={jumpLinks} />

        <section className="htp-tldr" aria-label="The short version">
          <div className="htp-tldr__header">
            <p className="htp-kicker">If you read nothing else</p>
            <h2>The 30-second version</h2>
          </div>

          <p className="htp-tldr__lede">
            Everyone walks around the house doing real-life tasks on their
            phone. <strong>Players write the task list themselves</strong> at
            the start (Quiplash style), so every game is different. A few
            players are secretly <strong>intruders</strong> trying to sabotage
            and "kill" the rest. Find a body? Call a meeting, argue, vote
            someone out. Crew wins by finishing every task or voting out all
            intruders. Intruders win by surviving and thinning the crew.
          </p>

          <ul className="htp-tldr__bullets">
            <li>
              <span className="htp-tldr__dot htp-tldr__dot--crew" aria-hidden="true" />
              <div>
                <strong>Crew:</strong> do your tasks, stay alert, debate hard
                in meetings.
              </div>
            </li>
            <li>
              <span className="htp-tldr__dot htp-tldr__dot--intruder" aria-hidden="true" />
              <div>
                <strong>Intruder:</strong> blend in, fake tasks, "kill" by
                tapping a player's card on your phone when you're alone with
                them. Watch out: intruders also get <strong>ability cards</strong>
                {' '}that can tilt the game in their favor.
              </div>
            </li>
            <li>
              <span className="htp-tldr__dot htp-tldr__dot--meeting" aria-hidden="true" />
              <div>
                <strong>Meetings:</strong> anyone alive can call one. Talk it
                out, vote, eject. The ejected player is out for the round.
              </div>
            </li>
          </ul>

          <p className="htp-tldr__cta">
            That's the whole game. Everything below is just detail.
          </p>
        </section>

        <main className="htp-main">
          <Section
            id="setup"
            kicker="Before You Start"
            title="Good setup does most of the teaching for you."
            intro="New players understand the game much faster when the host points out the space first: where meetings happen, where tasks happen, and whether meltdown mode is on."
          >
            <CardGrid columns={3}>
              {setupCards.map((card) => (
                <InfoCard key={card.title} {...card} />
              ))}
            </CardGrid>

            <CardGrid columns={2} className="htp-grid--stacked">
              {setupGuides.map((card) => (
                <InfoCard key={card.title} {...card} />
              ))}
            </CardGrid>
          </Section>

          <Section
            id="roles"
            kicker="Roles"
            title="Every player gets a secret job."
            intro="Your phone tells you whether you are a Crewmate or an Intruder. Keep that role private."
          >
            <CardGrid columns={2}>
              {roleCards.map((card) => (
                <RoleCard key={card.label} {...card} />
              ))}
            </CardGrid>
          </Section>

          <Section
            id="flow"
            kicker="Round Flow"
            title="The loop is simple once people understand the rhythm."
            intro="Most of the game is just alternating between moving around the house and gathering in one room to talk about what happened."
          >
            <div className="htp-flow">
              {flowSteps.map((step) => (
                <FlowStep key={step.step} {...step} />
              ))}
            </div>

            <NotePanel tone="critical" title="Critical dead-player rule">
              {pageCopy.criticalDeadRule}
            </NotePanel>
          </Section>

          <Section
            id="meetings"
            kicker="Meetings"
            title="Meetings are the whole game, so keep them clean."
            intro="The tension lives here. A good meeting is clear, timed, and honest about who is alive, dead, and ready to vote."
          >
            <CardGrid columns={2}>
              {meetingCards.map((card) => (
                <InfoCard key={card.title} {...card} />
              ))}
            </CardGrid>

            <NotePanel title="Important">{pageCopy.vetoNote}</NotePanel>
          </Section>

          <Section
            id="meltdown"
            kicker="Optional Meltdown"
            title="Meltdown is not required, but it makes the game much better."
            intro="Meltdown gives the crew a time pressure event and gives intruders a way to force movement, panic, and bad decisions."
          >
            <CardGrid columns={2}>
              {meltdownCards.map((card) => (
                <InfoCard key={card.title} {...card} />
              ))}
            </CardGrid>

            <NotePanel title="Reactor rule">{pageCopy.reactorNote}</NotePanel>
          </Section>

          <Section
            id="cards"
            kicker="Intruder Cards"
            title="You do not need to memorize every card to start playing."
            intro="Just understand the kinds of pressure intruders can create. The exact deck can vary based on your settings and whether reactor or speakers are enabled."
          >
            <CardGrid columns={2}>
              {intruderCardHighlights.map((card) => (
                <InfoCard key={card.title} {...card} />
              ))}
            </CardGrid>

            <NotePanel title="Late game gets sharper">{pageCopy.cardDrawNote}</NotePanel>
          </Section>

          <Section
            id="winning"
            kicker="Winning"
            title="This is the part new players misread most often."
            intro="Tasks matter, but they do not finish the match by themselves. Voting is still what ends the game."
          >
            <CardGrid columns={2}>
              {winningCards.map((card) => (
                <InfoCard key={card.title} {...card} />
              ))}
            </CardGrid>
          </Section>

          <Section
            id="host"
            kicker="Host Script"
            title="Use this as the 30-second briefing before game start."
            intro="If you only say a few things out loud, say these."
          >
            <CardGrid columns={2}>
              {hostCards.map((card) => (
                <InfoCard key={card.title} {...card} />
              ))}
            </CardGrid>
          </Section>
        </main>

        <FooterCta
          title="Ready to Host?"
          description="Open the game, create a room, build a task list, and walk everyone through the host script once before you start."
          href="/play"
          actionLabel="Create or join a game"
        />

        <footer className="htp-footer">
          Sus Party is loosely inspired by social deduction games like Mafia and Among Us.
        </footer>
      </div>
    </div>
  );
}

export default HowToPlayPage;