import React, { useContext, useEffect, useState } from 'react';
import { DataContext } from '../GameContext';
import { Copy, Check, Speaker, ExternalLink, Volume2, LogOut } from '../signal/icons';
import { Face } from '../signal';
import RoomQrCode from '../components/RoomQrCode';
import { isBetaChannel } from '../components/BetaBadge';
import { buildRoomQrUrl } from '../utils/inviteLinks';
import { rememberLaptopHosted } from '../components/LaptopHostPrompt';
import '../signal/reactor.css';
import { t, tn } from '../i18n';

// No phone has joined after this long: say plainly that the screen itself can't start the game.
const NUDGE_AFTER_MS = 60 * 1000;

// The room's big screen before the game: the code huge enough to read from across the room,
// and the faces of everyone who has joined. The blinking dot is the one thing that moves.
function ReactorWaiting() {
  const { roomCode, players, socket, lobbyState } = useContext(DataContext);
  const [copied, setCopied] = useState(false);

  const copyRoomCode = async () => {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(roomCode);
      } else {
        // Fallback for older browsers/non-HTTPS
        const textArea = document.createElement('textarea');
        textArea.value = roomCode;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const SONOS_CONNECTOR_URL = "https://github.com/siacavazzi/amogus-sonos-connector";

  const handleLeaveRoom = () => {
    // Clear local storage first
    localStorage.removeItem('room_code');
    sessionStorage.removeItem('is_room_creator');
    // Send leave_room with room_code (reactor doesn't have player_id)
    socket.emit('leave_room', { room_code: roomCode });
  };

  const joined = players || [];
  // No phone yet after a minute: say plainly that this screen can't start the game.
  const [nudge, setNudge] = useState(false);
  useEffect(() => {
    if (joined.length > 0) {
      rememberLaptopHosted();
      setNudge(false);
      return undefined;
    }
    const timer = setTimeout(() => setNudge(true), NUDGE_AFTER_MS);
    return () => clearTimeout(timer);
  }, [joined.length]);

  // Only the host's phone has Start, so a big group needs to know whose phone that is.
  const host = joined.find((p) => p.player_id && p.player_id === lobbyState?.host_player_id);
  // A big group shrinks the faces so the room code, the host line and everyone still fit.
  const many = joined.length > 10;
  const joinAt = typeof window !== 'undefined' ? `${window.location.host}/play` : '';
  // Scanning opens the join page with the code filled in, so nobody types it (and mistypes it).
  const qrUrl = roomCode ? buildRoomQrUrl(roomCode, { beta: isBetaChannel() }) : '';

  return (
    <div className="sg sg-screen sg-round sg-rx">
      <div className="sg-rx__bar">
        <p className="sg-rx__brand">Sus Party</p>
        <button type="button" onClick={handleLeaveRoom} className="sg-rx__leave" title={t('Leave Room')}>
          <LogOut size={18} />
          <span>{t('Leave Room')}</span>
        </button>
      </div>

      <div className="sg-rx__main">
        {roomCode && (
          // The code and the address on the left, the QR code beside them as tall as both together.
          <div className="sg-rx__join">
            <div className="sg-rx__joincode">
              <p className="sg-rx__label sg-a sg-rise">{t('Room code')}</p>
              <div className="sg-rx__codebox">
                <h1 className="sg-rx__code sg-a sg-slam" aria-label={t('Room code {roomCode}', { roomCode })} data-testid="room-code" translate="no">{roomCode}</h1>
                <button type="button" onClick={copyRoomCode} className="sg-rx__copy" title={t('Copy room code')} aria-label={t('Copy room code')}>
                  {copied ? <Check size={28} strokeWidth={3} /> : <Copy size={26} />}
                </button>
              </div>
              <p className="sg-rx__lede sg-a sg-rise" style={{ animationDelay: '200ms' }}>
                {qrUrl ? t('Scan the code, or join on your phone at ') : t('Join on your phone at ')}
                <span style={{ whiteSpace: 'nowrap' }}>{joinAt}</span>
              </p>
            </div>
            {qrUrl && (
              <figure className="sg-rx__qr sg-a sg-pop">
                <RoomQrCode value={qrUrl} title={t('QR code to join room {roomCode}', { roomCode })} data-testid="room-qr" />
                <figcaption>{t('Scan to join')}</figcaption>
              </figure>
            )}
          </div>
        )}

        <p className={`sg-rx__lede sg-rx__wait${nudge ? ' sg-rx__wait--nudge' : ''}`} data-testid="reactor-host-hint">
          <span className="sg-rx__blink" aria-hidden="true" />
          {host
            ? <span>{t('{name} is the host. Start the game from their phone.', { name: host.username })}</span>
            : joined.length > 0
              ? t('Waiting for the host to start')
              : nudge
                ? t('No phones yet. Everyone joins on a phone, including you. This screen can\'t start the game.')
                : t('Now join on your phone. The first phone in is the host and starts the game.')}
        </p>

        <div className={`sg-rx__faces${many ? ' sg-rx__faces--many' : ''}`} style={{ marginTop: 'clamp(8px, 2vh, 24px)' }}>
          {joined.length > 0 ? (
            joined.map((player) => (
              <div key={player.player_id || player.id || player.username} className="sg-rx__face sg-a sg-pop">
                <Face player={player} size={many ? 56 : 88} className="sg-rx__face-ring" />
                <span translate="no">{player.username}</span>
                {player === host && <span className="sg-rx__host-tag">{t('Host')}</span>}
              </div>
            ))
          ) : (
            [0, 1, 2, 3].map((i) => <div key={i} className="sg-rx__empty" aria-hidden="true" />)
          )}
        </div>
        {joined.length > 0 && (
          <p className="sg-rx__note sg-num">
            {tn(joined.length, '{count} player connected', '{count} players connected')}
          </p>
        )}
      </div>

      <div className="sg-rx__help">
        <div>
          <h2>{t('This screen is the reactor')}</h2>
          <p>
            {t('Leave it somewhere everyone can see. It shows the room\'s task progress and meetings, and it is where the crew stops a meltdown. Players use their phones.')}
          </p>
        </div>
        <div>
          <h2><Speaker size={18} /> {t('Sonos')}</h2>
          <p>{t('Want game sounds on your Sonos speakers? Run the open-source connector on any computer on your Sonos network.')}</p>
          <a href={SONOS_CONNECTOR_URL} target="_blank" rel="noopener noreferrer">
            {t('Get the Sonos Connector')} <ExternalLink size={14} />
          </a>
        </div>
        <div>
          <h2><Volume2 size={18} /> {t('No Sonos?')}</h2>
          <ul>
            <li>{t('Pair a Bluetooth speaker to this computer')}</li>
            <li>{t('Turn the laptop volume all the way up')}</li>
            <li>{t('Keep this tab in front so the sound keeps playing')}</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

export default ReactorWaiting;
