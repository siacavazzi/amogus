import React, { useContext, useState } from 'react';
import { DataContext } from '../GameContext';
import { Copy, Check, Speaker, ExternalLink, Volume2, LogOut } from '../signal/icons';
import { Face } from '../signal';
import '../signal/reactor.css';

// The room's big screen before the game: the code huge enough to read from across the room,
// and the faces of everyone who has joined. The blinking dot is the one thing that moves.
function ReactorWaiting() {
  const { roomCode, players, socket } = useContext(DataContext);
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
  const joinAt = typeof window !== 'undefined' ? `${window.location.host}/play` : '';

  return (
    <div className="sg sg-screen sg-round sg-rx">
      <div className="sg-rx__bar">
        <p className="sg-rx__brand">Sus Party</p>
        <button type="button" onClick={handleLeaveRoom} className="sg-rx__leave" title="Leave Room">
          <LogOut size={18} />
          <span>Leave Room</span>
        </button>
      </div>

      <div className="sg-rx__main">
        {roomCode && (
          <>
            <p className="sg-rx__label sg-a sg-rise">Room code</p>
            <div className="sg-rx__codebox">
              <h1 className="sg-rx__code sg-a sg-slam" aria-label={`Room code ${roomCode}`}>{roomCode}</h1>
              <button type="button" onClick={copyRoomCode} className="sg-rx__copy" title="Copy room code" aria-label="Copy room code">
                {copied ? <Check size={28} strokeWidth={3} /> : <Copy size={26} />}
              </button>
            </div>
            <p className="sg-rx__lede sg-a sg-rise" style={{ animationDelay: '200ms' }}>
              Join on your phone at <span style={{ whiteSpace: 'nowrap' }}>{joinAt}</span>
            </p>
          </>
        )}

        <div className="sg-rx__faces" style={{ marginTop: 'clamp(8px, 2vh, 24px)' }}>
          {joined.length > 0 ? (
            joined.map((player) => (
              <div key={player.player_id || player.id || player.username} className="sg-rx__face sg-a sg-pop">
                <Face player={player} size={88} className="sg-rx__face-ring" />
                <span>{player.username}</span>
              </div>
            ))
          ) : (
            [0, 1, 2, 3].map((i) => <div key={i} className="sg-rx__empty" aria-hidden="true" />)
          )}
        </div>
        {joined.length > 0 && (
          <p className="sg-rx__note sg-num">
            {joined.length} player{joined.length !== 1 ? 's' : ''} connected
          </p>
        )}

        <p className="sg-rx__lede sg-rx__wait">
          <span className="sg-rx__blink" aria-hidden="true" />
          Waiting for the host to start
        </p>
      </div>

      <div className="sg-rx__help">
        <div>
          <h2>This screen is the reactor</h2>
          <p>
            Leave it somewhere everyone can see. It shows the room's task progress and meetings, and
            it is where the crew stops a meltdown. Players use their phones.
          </p>
        </div>
        <div>
          <h2><Speaker size={18} /> Sonos</h2>
          <p>Want game sounds on your Sonos speakers? Run the open-source connector on any computer on your Sonos network.</p>
          <a href={SONOS_CONNECTOR_URL} target="_blank" rel="noopener noreferrer">
            Get the Sonos Connector <ExternalLink size={14} />
          </a>
        </div>
        <div>
          <h2><Volume2 size={18} /> No Sonos?</h2>
          <ul>
            <li>Pair a Bluetooth speaker to this computer</li>
            <li>Turn the laptop volume all the way up</li>
            <li>Keep this tab in front so the sound keeps playing</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

export default ReactorWaiting;
