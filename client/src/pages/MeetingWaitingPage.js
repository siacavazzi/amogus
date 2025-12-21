import React, { useContext, useState, useEffect } from 'react';
import { DataContext } from '../GameContext';
import MUECustomSlider from '../components/swiper';
import LeaveGameButton from '../components/LeaveGameButton';
import { AlertTriangle, Users, CheckCircle2, Clock, Skull } from 'lucide-react';

const MeetingWaitingPage = () => {
  const { playerState, players, meetingState, socket } = useContext(DataContext);

  const [readyPlayers, setReadyPlayers] = useState(0);
  const [waitingPlayers, setWaitingPlayers] = useState([]);
  const [pulseIntensity, setPulseIntensity] = useState(0);

  useEffect(() => {
    let ready = 0;
    const waiting = [];
    for (const player of players) {
      if (player.alive) {
        if (player.ready) {
          ready++;
        } else {
          waiting.push(player);
        }
      }
    }
    setReadyPlayers(ready);
    setWaitingPlayers(waiting);
  }, [playerState, players]);

  // Animated pulse effect
  useEffect(() => {
    const interval = setInterval(() => {
      setPulseIntensity((prev) => (prev + 1) % 360);
    }, 50);
    return () => clearInterval(interval);
  }, []);

  const totalAlive = players.filter((player) => player.alive).length;
  const playersRemaining = totalAlive - readyPlayers;
  const progressPercentage = (readyPlayers / totalAlive) * 100;
  const allReady = playersRemaining === 0;

  const handleReadyUp = () => {
    socket.emit('ready', { player_id: localStorage.getItem('player_id') });
  };

  const handleImDead = () => {
    if(!window.confirm('Are you sure you want to mark yourself as dead?')) {
      return;
    }
    if (socket) {
      socket.emit('player_dead', { player_id: localStorage.getItem('player_id') });
    }
  };

  return (
    <div className="relative min-h-screen flex flex-col items-center justify-center bg-gradient-to-b from-gray-900 via-gray-800 to-gray-900 text-white p-6 pb-32 overflow-hidden">
      {/* Leave Game Button */}
      <LeaveGameButton className="fixed top-4 right-4 z-50" />

      {/* Animated Background Effects */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        {/* Central glow */}
        <div 
          className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] rounded-full blur-3xl"
          style={{ 
            background: `radial-gradient(circle, ${allReady ? 'rgba(34, 197, 94, 0.15)' : 'rgba(251, 146, 60, 0.15)'} 0%, transparent 70%)`,
            opacity: 0.5 + (Math.sin(pulseIntensity * 0.05) * 0.2)
          }}
        />
        
        {/* Rotating ring */}
        <div 
          className={`absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px] border ${allReady ? 'border-green-500/20' : 'border-orange-500/20'} rounded-full`}
          style={{ transform: `translate(-50%, -50%) rotate(${pulseIntensity}deg)` }}
        />
        <div 
          className={`absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[350px] h-[350px] border ${allReady ? 'border-green-500/10' : 'border-orange-500/10'} rounded-full`}
          style={{ transform: `translate(-50%, -50%) rotate(-${pulseIntensity * 0.5}deg)` }}
        />

        {/* Grid overlay */}
        <div 
          className="absolute inset-0 opacity-5"
          style={{
            backgroundImage: 'linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)',
            backgroundSize: '50px 50px'
          }}
        />

        {/* Corner accents */}
        <div className="absolute top-0 left-0 w-32 h-32 border-l-2 border-t-2 border-orange-500/20" />
        <div className="absolute top-0 right-0 w-32 h-32 border-r-2 border-t-2 border-orange-500/20" />
        <div className="absolute bottom-0 left-0 w-32 h-32 border-l-2 border-b-2 border-orange-500/20" />
        <div className="absolute bottom-0 right-0 w-32 h-32 border-r-2 border-b-2 border-orange-500/20" />
      </div>

      <div className="relative z-10 text-center max-w-lg w-full">
        {/* Header Icon */}
        <div className="flex justify-center mb-4">
          <div className={`w-20 h-20 rounded-2xl ${allReady ? 'bg-green-500/20 border-green-500/30' : 'bg-orange-500/20 border-orange-500/30'} border flex items-center justify-center`}>
            <AlertTriangle size={40} className={allReady ? 'text-green-400' : 'text-orange-400'} />
          </div>
        </div>

        <h1 className={`text-3xl font-bold mb-2 ${allReady ? 'text-green-300' : 'text-orange-300'} tracking-wider uppercase`}>
          Emergency Meeting
        </h1>
        <p className="text-gray-400 mb-6">
          Called by{' '}
          <span className="font-semibold text-white">
            {meetingState.player_who_started_it}
          </span>
        </p>

        {/* Status Card */}
        <div className={`relative overflow-hidden rounded-2xl border ${allReady ? 'border-green-500/30' : 'border-orange-500/30'} bg-gray-800/50 backdrop-blur-sm mb-6`}>
          {/* Progress bar as background */}
          <div 
            className={`absolute inset-y-0 left-0 ${allReady ? 'bg-green-500/10' : 'bg-orange-500/10'} transition-all duration-700 ease-out`}
            style={{ width: `${progressPercentage}%` }}
          />
          
          <div className="relative p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Users size={18} className="text-gray-400" />
                <span className="text-gray-400 text-sm">Crew Response</span>
              </div>
              <div className={`flex items-center gap-1.5 ${allReady ? 'text-green-400' : 'text-orange-400'}`}>
                {allReady ? (
                  <>
                    <CheckCircle2 size={16} />
                    <span className="text-sm font-medium">All Ready</span>
                  </>
                ) : (
                  <>
                    <Clock size={16} className="animate-pulse" />
                    <span className="text-sm font-medium">Waiting...</span>
                  </>
                )}
              </div>
            </div>

            {/* Stats Row */}
            <div className="flex justify-center gap-8">
              <div className="text-center">
                <div className="text-3xl font-bold text-green-400">{readyPlayers}</div>
                <div className="text-xs text-gray-500 uppercase tracking-wider">Ready</div>
              </div>
              <div className="w-px bg-gray-700" />
              <div className="text-center">
                <div className="text-3xl font-bold text-red-400">{playersRemaining}</div>
                <div className="text-xs text-gray-500 uppercase tracking-wider">Waiting</div>
              </div>
              <div className="w-px bg-gray-700" />
              <div className="text-center">
                <div className="text-3xl font-bold text-gray-300">{totalAlive}</div>
                <div className="text-xs text-gray-500 uppercase tracking-wider">Alive</div>
              </div>
            </div>
          </div>

          {/* Gradient accent line */}
          <div className={`h-1 w-full bg-gradient-to-r from-transparent ${allReady ? 'via-green-500' : 'via-orange-500'} to-transparent`} />
        </div>

        {/* Waiting Players List */}
        {waitingPlayers.length > 0 && (
          <div className="relative overflow-hidden rounded-2xl border border-red-500/30 bg-gray-800/50 backdrop-blur-sm mb-6">
            <div className="p-4">
              <div className="flex items-center justify-center gap-2 mb-3">
                <Clock className="text-red-400 animate-pulse" size={18} />
                <h3 className="text-sm font-semibold text-red-400 uppercase tracking-wider">Waiting For</h3>
              </div>
              <div className="flex flex-wrap justify-center gap-2">
                {waitingPlayers.map((player) => (
                  <span
                    key={player.id || player.player_id}
                    className="px-3 py-1.5 bg-red-500/10 border border-red-500/30 rounded-lg text-red-300 text-sm font-medium flex items-center gap-1.5"
                  >
                    <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                    {player.username}
                  </span>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Ready Status Indicator */}
        {playerState.ready && (
          <div className="relative overflow-hidden rounded-2xl border border-green-500/30 bg-green-500/10 mb-6">
            <div className="p-4 flex items-center justify-center gap-3">
              <CheckCircle2 className="text-green-400" size={24} />
              <span className="text-green-300 font-medium">You're ready! Waiting for others...</span>
            </div>
          </div>
        )}

        {/* Dead Button - Prominent for dead players */}
        <div className="relative overflow-hidden rounded-2xl border-2 border-red-500/50 bg-red-950/30 mb-6">
          <div className="absolute inset-0 bg-red-500/5 animate-pulse" />
          <button
            onClick={handleImDead}
            className="relative w-full flex items-center justify-center gap-3 px-6 py-4 text-lg font-bold text-red-400 hover:text-red-300 hover:bg-red-500/20 transition-all"
          >
            <Skull size={24} className="animate-pulse" />
            <span>I've Been Killed</span>
            <Skull size={24} className="animate-pulse" />
          </button>
          <div className="text-center pb-3 text-red-400/60 text-xs">
            Tap if you were eliminated before this meeting
          </div>
        </div>
      </div>

      {/* Slider fixed at bottom */}
      {!playerState.ready && (
        <div className="fixed bottom-0 left-0 right-0 z-50 pb-safe">
          <MUECustomSlider text="Slide to ready up" onSuccess={handleReadyUp} />
        </div>
      )}
    </div>
  );
};

export default MeetingWaitingPage;
