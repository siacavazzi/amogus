import React, { useContext, useEffect } from 'react';
import { DataContext } from '../GameContext';
import { t } from '../i18n';
import EndGameButtons from '../components/EndGameButtons';
import DeathSummary from '../components/DeathSummary';
import GameStats from '../components/GameStats';
import StatsLink from '../account/StatsLink';
import { Confetti, Face, vibrate } from './index';

// Game over: the screen splits open in the winners' colour and their faces drop in.
export default function VictoryScreen({ tone, kicker, title, line, winners, winnersLabel, summaryTitle, showSurvivors }) {
  const { isMobile } = useContext(DataContext);
  useEffect(() => {
    vibrate([80, 60, 80, 60, 200]);
  }, []);
  const crew = tone === 'round';
  const big = winners.length <= 2;
  // Long words ("Besättningen", "Mannskapet") shrink to fit a phone instead of running off it.
  const heading = t(title);
  const longest = Math.max(0, ...String(heading).split(/\s+/).map((word) => word.length));
  // Phones get a slightly smaller headline so Play Again and Save this game fit without scrolling.
  const headingSize = longest > 9
    ? `clamp(36px, ${Math.floor((isMobile ? 1300 : 1450) / longest) / 10}vw, 88px)`
    : isMobile ? 'clamp(48px, 14.5vw, 88px)' : 'clamp(54px, 17vw, 88px)';

  return (
    <div className={`sg-screen sg-split ${crew ? 'sg-round' : tone === 'hazard' ? 'sg-ink' : 'sg-out'}`} style={isMobile ? { paddingTop: 'calc(env(safe-area-inset-top, 0px) + 24px)', paddingBottom: 40 } : { paddingBottom: 40 }}>
      {tone === 'hazard' && <div className="sg-hazard" style={{ opacity: 0.35 }} />}
      <div className="flex flex-col items-center text-center" style={isMobile
        // Phones: the headline stays big but the buttons must show without scrolling.
        ? { justifyContent: 'center', gap: 10, position: 'relative', paddingBottom: 18 }
        // The laptop screen has room for the full drop-in.
        : { minHeight: '78vh', justifyContent: 'center', gap: 14, position: 'relative' }}>
        {kicker && <p className="sg-lede sg-a sg-rise" style={{ animationDelay: '300ms' }}>{kicker}</p>}
        <h1 className="sg-big sg-a sg-rise" style={{ fontSize: headingSize, animationDelay: '400ms', animationDuration: '520ms' }}>
          {heading}
        </h1>
        <p className="sg-lede sg-a sg-fade" style={{ opacity: 0.9, maxWidth: '26ch', animationDelay: '700ms' }}>{line}</p>
        {winners.length > 0 && (
          <div style={{ marginTop: 4 }}>
            {winnersLabel && <p className="sg-small" style={{ marginBottom: 10 }}>{winnersLabel}</p>}
            <div className="sg-row" style={{ gap: big ? 16 : 8 }}>
              {winners.map((p, i) => (
                <div key={p.player_id} className="sg-fall flex flex-col items-center" style={{ animationDelay: `${800 + i * 160}ms`, gap: 6 }}>
                  <Face player={p} size={isMobile ? (big ? 76 : 56) : (big ? 108 : 68)} dead={!p.alive && crew} />
                  <span style={{ fontWeight: 900, fontSize: big ? 20 : 15 }}>{p.username}</span>
                </div>
              ))}
            </div>
          </div>
        )}
        {crew && <Confetti colors={['#ffffff', '#ffc21a', '#ffffff']} top="30%" delay={900} count={24} />}
      </div>

      <div className="w-full max-w-md mx-auto flex flex-col" style={{ gap: 18 }}>
        <div style={{ background: '#fff', borderRadius: 22, padding: 14, color: 'var(--sg-ink)' }}>
          <EndGameButtons />
        </div>
        <StatsLink />
        <DeathSummary title={summaryTitle} showSurvivors={showSurvivors} />
        <GameStats />
      </div>
    </div>
  );
}
