import React, { useEffect } from 'react';
import { usePageMeta } from '../../seo/usePageMeta';
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
import SeoPageLayout from '../seo/SeoPageLayout';
import GameplayScreenshots from '../seo/GameplayScreenshots';
import './HowToPlayPage.css';

function HowToPlayPage() {
  usePageMeta({
    title: 'How to Play Sus Party | Among Us-Inspired IRL Game',
    description: 'Set up your first Sus Party game at home. Learn how to host, join with a room code, add real-life tasks, use sabotage cards, and run meetings and votes.',
    canonical: 'https://susparty.com/how-to-play',
    documentClass: 'htp-document',
  });

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
    <SeoPageLayout className="htp-shell">
      <div className="htp-page">
        <header className="htp-hero">
          <div className="htp-hero__main">
            <h1>{pageCopy.heroTitle}</h1>
            <p>{pageCopy.heroBody}</p>
            <div className="htp-hero__actions">
              <ButtonLink href="/among-us-irl-task-generator?venue=house&players=8&movement=normal" variant="primary">
                Prepare a game →
              </ButtonLink>
              <ButtonLink href="/tutorial?returnTo=how-to-play" variant="secondary">Start tutorial</ButtonLink>
            </div>
          </div>
          <dl className="htp-essentials" aria-label="First-game basics">
            {heroStats.map((stat) => (
              <div key={stat.label}><dt>{stat.value}</dt><dd>{stat.label}</dd></div>
            ))}
          </dl>
        </header>
        <div className="htp-guide">
          <JumpLinks links={jumpLinks} />
          <main className="htp-main">

          <Section
            id="setup"
            kicker="Before You Start"
            title="Before you start"
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
            <p>
              <a href="/among-us-irl-task-generator?venue=house&players=8&movement=normal">Prepare a task pack for your rooms</a>,
              {' '}select “Use these tasks in a new game,” then create the room and select “Import generated tasks” in host setup.
            </p>
            <GameplayScreenshots screens={['host-setup', 'task-list']} />
          </Section>

          <Section
            id="roles"
            kicker="Roles"
            title="Every player gets a secret job."
            intro="Your phone tells you whether you are a Crewmate or an Intruder. Keep that role private."
          >
            <CardGrid columns={2} className="htp-role-grid">
              {roleCards.map((card) => (
                <RoleCard key={card.label} {...card} />
              ))}
            </CardGrid>
            <GameplayScreenshots screens={['crew-task', 'intruder-objective']} />
          </Section>

          <Section
            id="flow"
            kicker="Round Flow"
            title="The round"
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
            title="Meetings and votes"
            intro="The tension lives here. A good meeting is clear, timed, and honest about who is alive, dead, and ready to vote."
          >
            <CardGrid columns={2}>
              {meetingCards.map((card) => (
                <InfoCard key={card.title} {...card} />
              ))}
            </CardGrid>

            <NotePanel title="Important">{pageCopy.vetoNote}</NotePanel>
            <GameplayScreenshots screens={['meeting-ready', 'vote']} />
          </Section>

          <Section
            id="meltdown"
            kicker="Optional Meltdown"
            title="Optional Reactor meltdown"
            intro="Meltdown gives the crew a time pressure event and gives intruders a way to force movement, panic, and bad decisions."
          >
            <CardGrid columns={2}>
              {meltdownCards.map((card) => (
                <InfoCard key={card.title} {...card} />
              ))}
            </CardGrid>

            <NotePanel title="Reactor rule">{pageCopy.reactorNote}</NotePanel>
            <GameplayScreenshots screens={['reactor', 'reactor-meltdown']} />
          </Section>

          <Section
            id="cards"
            kicker="Intruder Cards"
            title="How intruders use cards"
            intro="Just understand the kinds of pressure intruders can create. The exact deck can vary based on your settings and whether reactor or speakers are enabled."
          >
            <CardGrid columns={2}>
              {intruderCardHighlights.map((card) => (
                <InfoCard key={card.title} {...card} />
              ))}
            </CardGrid>

            <NotePanel title="Late game gets sharper">{pageCopy.cardDrawNote}</NotePanel>
            <GameplayScreenshots screens={['intruder-cards']} />
          </Section>

          <Section
            id="winning"
            kicker="Winning"
            title="How the game ends"
            intro="Tasks matter, but they do not finish the match by themselves. Voting is still what ends the game."
          >
            <CardGrid columns={2}>
              {winningCards.map((card) => (
                <InfoCard key={card.title} {...card} />
              ))}
            </CardGrid>
            <GameplayScreenshots screens={['crew-victory', 'round-stats']} />
          </Section>

          <Section
            id="host"
            kicker="Host Script"
            title="Brief your players"
            intro="If you only say a few things out loud, say these."
          >
            <CardGrid columns={2}>
              {hostCards.map((card) => (
                <InfoCard key={card.title} {...card} />
              ))}
            </CardGrid>
          </Section>

            <FooterCta
              title="Ready to host?"
              description="Choose your areas, review the task pack, then take it into a new room. Use the host script before you deal the roles."
              href="/among-us-irl-task-generator?venue=house&players=8&movement=normal"
              actionLabel="Prepare your task pack"
            />
          </main>
        </div>
      </div>
    </SeoPageLayout>
  );
}

export default HowToPlayPage;
