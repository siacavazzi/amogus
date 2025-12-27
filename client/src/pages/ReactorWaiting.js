import React, { useContext, useState } from 'react';
import { DataContext } from '../GameContext';
import { Copy, Check, Users, Monitor, Speaker, ExternalLink, Github, Volume2, LogOut } from 'lucide-react';
import { FaRadiation } from 'react-icons/fa';

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

  // Placeholder - replace with your actual repo URL
  const SONOS_CONNECTOR_URL = "https://github.com/siacavazzi/amogus-sonos-connector";

  const handleLeaveRoom = () => {
    // Clear local storage first
    localStorage.removeItem('room_code');
    sessionStorage.removeItem('is_room_creator');
    // Send leave_room with room_code (reactor doesn't have player_id)
    socket.emit('leave_room', { room_code: roomCode });
  };

  return (
    <div className="fixed inset-0 flex flex-col items-center bg-gradient-to-b from-gray-900 via-gray-800 to-blue-900 text-white p-8 pt-12 pb-20 overflow-y-auto">
      {/* Leave Room Button - Fixed Position */}
      <button
        onClick={handleLeaveRoom}
        className="fixed top-4 right-4 z-50 flex items-center gap-2 px-3 py-2 bg-gray-800/80 hover:bg-red-600/80 border border-gray-600 hover:border-red-500 rounded-lg text-gray-400 hover:text-white transition-all text-sm backdrop-blur-sm"
        title="Leave Room"
      >
        <LogOut size={16} />
        <span className="hidden md:inline">Leave Room</span>
      </button>
      {/* Reactor Background Animation */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl animate-pulse delay-1000"></div>
      </div>

      <div className="relative z-10 flex flex-col items-center max-w-4xl w-full flex-1 justify-center">
        {/* Reactor Icon */}
        <div className="mb-6">
          <FaRadiation className="text-cyan-400 text-7xl animate-pulse" />
        </div>

        {/* Room Code Display */}
        {roomCode && (
          <div className="bg-gray-800/80 backdrop-blur-sm p-8 rounded-2xl shadow-2xl mb-8 text-center border border-cyan-500/30">
            <div className="flex items-center justify-center gap-2 mb-4">
              <Monitor size={24} className="text-cyan-400" />
              <p className="text-cyan-300 text-lg font-medium">Core Control Station</p>
            </div>
            
            <p className="text-gray-400 text-sm mb-2">Room Code</p>
            <div className="flex items-center justify-center gap-4 mb-4">
              <span className="text-6xl font-mono font-bold text-cyan-400 tracking-widest drop-shadow-[0_0_10px_rgba(34,211,238,0.5)]">
                {roomCode}
              </span>
              <button
                onClick={copyRoomCode}
                className="p-3 hover:bg-gray-700 rounded-lg transition-colors"
                title="Copy room code"
              >
                {copied ? (
                  <Check className="text-green-400" size={28} />
                ) : (
                  <Copy className="text-gray-400" size={28} />
                )}
              </button>
            </div>
            <p className="text-gray-500 text-sm">
              Share this code with players to join
            </p>
          </div>
        )}

        {/* Players Count */}
        {players && players.length > 0 && (
          <div className="bg-gray-800/60 backdrop-blur-sm px-6 py-4 rounded-xl mb-8 flex items-center gap-3 border border-green-500/30">
            <Users size={24} className="text-green-400" />
            <span className="text-xl">
              <span className="font-bold text-green-400">{players.length}</span>
              <span className="text-gray-300"> player{players.length !== 1 ? 's' : ''} connected</span>
            </span>
          </div>
        )}

        {/* Waiting Message */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="w-3 h-3 bg-cyan-500 rounded-full animate-pulse"></div>
            <div className="w-3 h-3 bg-cyan-500 rounded-full animate-pulse" style={{ animationDelay: '0.2s' }}></div>
            <div className="w-3 h-3 bg-cyan-500 rounded-full animate-pulse" style={{ animationDelay: '0.4s' }}></div>
          </div>
          <p className="text-2xl text-gray-300">Waiting for game to start...</p>
          <p className="text-gray-500 mt-2">A player will start the game from their phone</p>
        </div>

        {/* Info Cards Row */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-3xl">
          {/* Reactor Info */}
          <div className="bg-gray-800/50 backdrop-blur-sm p-6 rounded-xl border border-red-500/30">
            <div className="flex items-center gap-2 mb-3">
              <FaRadiation className="text-red-400 text-xl" />
              <h3 className="text-lg font-semibold text-red-400">Core Control</h3>
            </div>
            <p className="text-gray-400 text-sm">
              Once the game starts, this screen becomes the <span className="text-red-400 font-medium">Sabotage Panel</span>. 
              Intruders can trigger core meltdowns that crewmates must stop!
            </p>
          </div>

          {/* Sonos Integration Info */}
          <div className="bg-gray-800/50 backdrop-blur-sm p-6 rounded-xl border border-purple-500/30">
            <div className="flex items-center gap-2 mb-3">
              <Speaker className="text-purple-400" size={20} />
              <h3 className="text-lg font-semibold text-purple-400">Sonos Integration</h3>
            </div>
            <p className="text-gray-400 text-sm mb-3">
              Want game sounds on your Sonos speakers? Run our open-source connector app on any computer connected to your Sonos network.
            </p>
            <a 
              href={SONOS_CONNECTOR_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-sm text-purple-400 hover:text-purple-300 transition-colors"
            >
              <Github size={16} />
              <span>Get the Sonos Connector</span>
              <ExternalLink size={14} />
            </a>
          </div>
        </div>

        {/* Audio Tips Box */}
        <div className="mt-6 w-full max-w-3xl">
          <div className="bg-gray-800/50 backdrop-blur-sm p-6 rounded-xl border border-cyan-500/30">
            <div className="flex items-center gap-2 mb-3">
              <Volume2 className="text-cyan-400" size={20} />
              <h3 className="text-lg font-semibold text-cyan-400">Audio Setup Tips</h3>
            </div>
            <p className="text-gray-400 text-sm">
              <span className="text-cyan-300 font-medium">Don't have Sonos?</span> No problem! For the best experience:
            </p>
            <ul className="mt-2 text-gray-400 text-sm space-y-1">
              <li className="flex items-center gap-2">
                <span className="text-cyan-400">•</span>
                Pair a Bluetooth speaker to this computer for room-filling sound
              </li>
              <li className="flex items-center gap-2">
                <span className="text-cyan-400">•</span>
                Max out the volume on your laptop speakers
              </li>
              <li className="flex items-center gap-2">
                <span className="text-cyan-400">•</span>
                Keep this tab in the foreground for uninterrupted audio
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ReactorWaiting;
