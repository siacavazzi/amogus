import React, { useContext, useState } from 'react';
import { DataContext } from '../GameContext';
import { Copy, Check, Users, Monitor } from 'lucide-react';

function ReactorWaiting() {
  const { roomCode, players } = useContext(DataContext);
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

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-b from-gray-900 to-blue-900 text-white p-8">
      {/* Room Code Display */}
      {roomCode && (
        <div className="bg-gray-800 bg-opacity-80 p-8 rounded-2xl shadow-2xl mb-8 text-center">
          <div className="flex items-center justify-center gap-2 mb-4">
            <Monitor size={24} className="text-blue-400" />
            <p className="text-gray-400 text-lg">Reactor Control Station</p>
          </div>
          
          <p className="text-gray-300 text-sm mb-2">Room Code</p>
          <div className="flex items-center justify-center gap-4 mb-4">
            <span className="text-6xl font-mono font-bold text-blue-400 tracking-widest">
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
        <div className="bg-gray-800 bg-opacity-60 px-6 py-4 rounded-xl mb-8 flex items-center gap-3">
          <Users size={24} className="text-green-400" />
          <span className="text-xl">
            <span className="font-bold text-green-400">{players.length}</span>
            <span className="text-gray-300"> player{players.length !== 1 ? 's' : ''} connected</span>
          </span>
        </div>
      )}

      {/* Waiting Message */}
      <div className="text-center">
        <div className="flex items-center justify-center gap-3 mb-4">
          <div className="w-3 h-3 bg-blue-500 rounded-full animate-pulse"></div>
          <div className="w-3 h-3 bg-blue-500 rounded-full animate-pulse delay-100"></div>
          <div className="w-3 h-3 bg-blue-500 rounded-full animate-pulse delay-200"></div>
        </div>
        <p className="text-2xl text-gray-300">Waiting for game to start...</p>
        <p className="text-gray-500 mt-2">A player will start the game from their phone</p>
      </div>

      {/* Instructions */}
      <div className="mt-12 bg-gray-800 bg-opacity-40 p-6 rounded-xl max-w-lg text-center">
        <p className="text-gray-400 text-sm">
          💡 This screen will become the <span className="text-red-400 font-semibold">Reactor Control Panel</span> once the game starts. 
          Imposters can trigger meltdowns from here!
        </p>
      </div>
    </div>
  );
}

export default ReactorWaiting;
