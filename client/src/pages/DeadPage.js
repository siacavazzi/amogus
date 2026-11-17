// ./pages/DeadPage.js
// A player who is out watches the rest of the round here: who is still in, and a live feed of
// tasks done, cards played, meetings and who went out. The feed comes from the server only to
// phones that are out (server/assets/spectator.py); by default it keeps the intruders secret.

import React, { useContext, useMemo } from 'react';
import { DataContext } from '../GameContext';
import LeaveGameButton from '../components/LeaveGameButton';
import HostStartVoting from '../components/HostStartVoting';
import { ProfilePicture, getDeathInfo } from '../components/PlayerCard';
import {
  Skull, Eye, CheckCircle, Cards, Megaphone, Radiation, ShieldCheck, Ban, ClipboardX, MapPin, Vote,
  DoorOpen, Sparkles,
} from '../signal/icons';
import { t, tn } from '../i18n';
import { localizeDeathMessage } from '../i18n/deathMessages';
import { feedLineText, placeName, roundClock } from '../utils/spectatorFeed';

// Get a readable death cause label
const getDeathLabel = (cause) => {
  switch (cause) {
    case 'voted_out':
    case 'voted_out_intruder':
    case 'voted_out_innocent':
      return t('Ejected');
    case 'murdered':
    case 'murdered_during_task':
      return t('Murdered');
    case 'meltdown':
      return t('Irradiated');
    case 'left_game':
      return t('Disconnected');
    default:
      return t('Eliminated');
  }
};

const INK = 'var(--sg-ink)';
// Icon and colour for each kind of feed line, so the feed reads at a glance.
const FEED_STYLE = {
  task: { icon: CheckCircle, bg: 'var(--sg-round)', fg: '#fff' },
  fake_done: { icon: ClipboardX, bg: 'var(--sg-meet)', fg: INK },
  card: { icon: Cards, bg: 'var(--sg-out)', fg: '#fff' },
  meeting: { icon: Megaphone, bg: 'var(--sg-meet)', fg: INK },
  nobody_out: { icon: Ban, bg: 'rgba(255,255,255,0.18)', fg: '#fff' },
  vote_skipped: { icon: Ban, bg: 'rgba(255,255,255,0.18)', fg: '#fff' },
  meltdown: { icon: Radiation, bg: 'var(--sg-hazard)', fg: INK },
  meltdown_over: { icon: ShieldCheck, bg: 'rgba(255,255,255,0.18)', fg: '#fff' },
  revealed: { icon: Sparkles, bg: 'var(--sg-meet)', fg: INK },
};

function outStyle(cause) {
  if (cause === 'left_game') return { icon: DoorOpen, bg: 'rgba(255,255,255,0.18)', fg: '#fff' };
  if (cause?.startsWith('voted_out')) return { icon: Vote, bg: '#fff', fg: INK };
  return { icon: getDeathInfo(cause)?.icon || Skull, bg: '#fff', fg: INK };
}

const sectionTitle = { fontWeight: 900, fontSize: 13, letterSpacing: '0.08em', textTransform: 'uppercase', opacity: 0.7, margin: '0 0 10px' };

const FeedLine = ({ entry, isNew }) => {
  const style = entry.kind === 'out' ? outStyle(entry.cause) : (FEED_STYLE[entry.kind] || FEED_STYLE.nobody_out);
  const Icon = style.icon;
  const text = feedLineText(entry);
  if (!text) return null;
  return (
    <li
      className={isNew ? 'sg-a sg-rise' : undefined}
      data-testid="spectator-feed-line"
      style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px', borderRadius: 16, background: 'rgba(255,255,255,0.07)' }}
    >
      <span style={{ flex: 'none', width: 36, height: 36, borderRadius: '50%', display: 'grid', placeItems: 'center', background: style.bg, color: style.fg }}>
        <Icon size={18} strokeWidth={2.75} />
      </span>
      <span style={{ flex: 1, fontWeight: 700, fontSize: 16, lineHeight: 1.25, textAlign: 'left' }} translate="no">{text}</span>
      <span className="sg-num" style={{ flex: 'none', fontWeight: 700, fontSize: 13, opacity: 0.55 }}>{roundClock(entry.at)}</span>
    </li>
  );
};

const LivingPlayer = ({ player, row }) => {
  const isIntruder = row?.sus === true;
  return (
    <li style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, width: 86 }}>
      <div style={{ borderRadius: '50%', boxShadow: isIntruder ? '0 0 0 3px var(--sg-out)' : 'none' }}>
        <ProfilePicture imageCode={player.pic} selfie={player.selfie} size="small" />
      </div>
      <span style={{ fontWeight: 800, fontSize: 14, maxWidth: '100%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} translate="no">{player.username}</span>
      {isIntruder && (
        <span style={{ fontWeight: 800, fontSize: 11, background: 'var(--sg-out)', color: '#fff', borderRadius: 999, padding: '2px 8px' }}>{t('Intruder')}</span>
      )}
      {row && row.sus === false && placeName(row.location) && (
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, fontWeight: 700, fontSize: 12, opacity: 0.8, maxWidth: '100%' }} translate="no">
          <MapPin size={12} strokeWidth={2.75} />
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{row.location}</span>
        </span>
      )}
      {row && row.sus === false && (
        <span className="sg-num" style={{ fontWeight: 700, fontSize: 12, opacity: 0.6 }}>{tn(row.tasks_done || 0, '{count} task', '{count} tasks')}</span>
      )}
    </li>
  );
};

const DeadPage = () => {
  const { playerState, players, spectator, crewScore, taskGoal } = useContext(DataContext);

  // Get the death message from player state, fallback to default
  const deathMessage = playerState?.death_message ? localizeDeathMessage(playerState.death_message) : t('You have been eliminated');
  const deathCause = playerState?.death_cause;
  const DeathIcon = getDeathInfo(deathCause)?.icon || Skull;
  const deathLabel = getDeathLabel(deathCause);

  // Who is still in: the public player list, with the server's extra details for out players.
  const alivePlayers = useMemo(() => (players || []).filter(p => p.alive), [players]);
  const rows = useMemo(() => {
    const byId = {};
    for (const row of spectator?.living || []) byId[row.player_id] = row;
    return byId;
  }, [spectator]);
  const feed = useMemo(() => [...(spectator?.feed || [])].reverse(), [spectator]);
  const newestId = feed[0]?.id;
  const openBook = !!spectator?.open_book;

  const goal = Number(taskGoal) || 0;
  const percent = goal ? Math.max(0, Math.min(100, Math.round((Number(crewScore) || 0) / goal * 100))) : 0;

  return (
    <div className="sg-screen sg-dark" style={{ zIndex: 50, paddingTop: 'calc(env(safe-area-inset-top, 0px) + 20px)' }}>
      <LeaveGameButton className="sg-corner" />

      <div style={{ width: '100%', maxWidth: 480, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 18 }}>
        {/* Who they were and how they went out, kept short so the round fits below */}
        <header style={{ display: 'flex', alignItems: 'center', gap: 14, paddingRight: 52 }}>
          <div className="sg-a sg-pop" style={{ flex: 'none' }}>
            <ProfilePicture
              imageCode={playerState?.pic}
              selfie={playerState?.selfie}
              size="medium"
              isDead={true}
              deathCause={deathCause}
            />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 6, minWidth: 0 }}>
            <span className="sg-pill" style={{ background: 'rgba(255,255,255,0.12)', fontSize: 13, padding: '4px 10px' }}>
              <DeathIcon size={14} strokeWidth={2.75} />
              {deathLabel}
            </span>
            <h1 className="sg-big sg-h3 sg-a sg-slam" style={{ animationDelay: '150ms' }}>{t('You\'re out')}</h1>
            <p className="sg-small" style={{ textAlign: 'left' }}>"{deathMessage}"</p>
          </div>
        </header>

        {/* The one rule for spectators */}
        <p
          className="sg-lede"
          style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'var(--sg-meet)', color: INK, borderRadius: 16, padding: '10px 14px', fontSize: 16, margin: 0 }}
        >
          <Eye size={20} strokeWidth={2.75} style={{ flex: 'none' }} />
          <span>{openBook ? t('You can see everything now. Shh, don\'t tell anyone!') : t('Watch the round from here. Shh, don\'t tell anyone what you see!')}</span>
        </p>

        {/* A dead host still runs the room: the meeting may be stuck on them */}
        <HostStartVoting dark />

        {/* Crew task progress */}
        {goal > 0 && (
          <section aria-label={t('Tasks')}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 800, fontSize: 14, marginBottom: 6 }}>
              <span>{t('Crew tasks')}</span>
              <span className="sg-num">{Math.min(Number(crewScore) || 0, goal)}/{goal}</span>
            </div>
            <div style={{ height: 10, borderRadius: 999, background: 'rgba(255,255,255,0.14)', overflow: 'hidden' }}>
              <div style={{ width: `${percent}%`, height: '100%', background: 'var(--sg-meet)', borderRadius: 999, transition: 'width 0.5s ease' }} />
            </div>
          </section>
        )}

        {/* Everyone still in the round */}
        <section>
          <h2 style={sectionTitle}>{t('Still in')} · <span className="sg-num">{alivePlayers.length}</span></h2>
          <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexWrap: 'wrap', gap: '14px 6px', justifyContent: 'center' }}>
            {alivePlayers.map(player => (
              <LivingPlayer key={player.player_id} player={player} row={rows[player.player_id]} />
            ))}
          </ul>
        </section>

        {/* The live feed, newest first */}
        <section>
          <h2 style={{ ...sectionTitle, display: 'flex', alignItems: 'center', gap: 8 }}>
            <span aria-hidden="true" style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--sg-out)', boxShadow: '0 0 0 4px rgba(224,38,58,0.25)' }} />
            {t('What\'s happening')}
          </h2>
          {feed.length === 0 ? (
            <p className="sg-small" style={{ textAlign: 'center', padding: '14px 0' }}>{t('Nothing yet. Keep watching!')}</p>
          ) : (
            <ul aria-live="polite" style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
              {feed.map(entry => <FeedLine key={entry.id} entry={entry} isNew={entry.id === newestId} />)}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
};

export default DeadPage;
