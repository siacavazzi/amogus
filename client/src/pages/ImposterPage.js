// src/pages/ImposterPage.jsx
import React, { useContext, useEffect } from 'react';
import { DataContext } from '../GameContext';
import { LogOut, Zap, Clock, MapPin, AlertTriangle, Eye } from 'lucide-react';

// ActionCard component defined OUTSIDE to prevent re-creation on every render
function ActionCard({ action, text, location, duration, id, time_left, active = false, countdown, onPlay }) {
  if (time_left <= 0) {
    return null;
  }

  const formattedAction = action.replace('_', ' ');

  return (
    <button 
      onClick={() => onPlay(id)}
      type="button"
      className={`relative w-full text-left rounded-2xl p-6 flex flex-col border-2 ${
        active 
          ? 'bg-emerald-900/80 border-emerald-400' 
          : 'bg-gray-800/90 border-red-500'
      }`}
    >
      {/* Header */}
      <div className="flex items-center gap-3 mb-3">
        <div className={`p-2 rounded-xl ${active ? 'bg-emerald-500/30' : 'bg-red-500/30'}`}>
          <Zap size={20} className={active ? 'text-emerald-300' : 'text-red-300'} />
        </div>
        <h3 className={`text-xl font-bold capitalize ${active ? 'text-emerald-200' : 'text-white'}`}>
          {formattedAction}
        </h3>
        {active && (
          <div className="ml-auto flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/30">
            <div className="w-2 h-2 bg-emerald-400 rounded-full"></div>
            <span className="text-emerald-300 text-sm font-medium">Active</span>
          </div>
        )}
      </div>

      {/* Description */}
      <p className="text-gray-200 text-base mb-4 leading-relaxed">{text}</p>

      {/* Footer info */}
      <div className="flex flex-wrap gap-3">
        {location && (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-black/30 text-sm">
            <MapPin size={14} className="text-gray-300" />
            <span className="text-gray-200">{location}</span>
          </div>
        )}

        {duration && (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-black/30 text-sm">
            <Clock size={14} className="text-gray-300" />
            <span className="text-gray-200">
              {countdown ? `${time_left}s left` : `${duration}s`}
            </span>
          </div>
        )}
      </div>

      {/* Tap indicator for non-active cards */}
      {!active && (
        <div className="absolute bottom-3 right-3 text-red-300 text-xs font-bold uppercase">
          Tap to use
        </div>
      )}
    </button>
  );
}

const ImposterPage = ({ setShowSusPage }) => {
  const {
    playerState,
    socket,
    activeCards,
    intrudersRevealed
  } = useContext(DataContext);

  // Check if intruders have been revealed (tasks 100%)
  const isCompromised = !!intrudersRevealed;

  function playCard(id) {
    socket.emit('play_card', { player_id: localStorage.getItem('player_id'), card_id: id });
  }

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const activeCardsList = activeCards.filter((card) => !(card.time_left && card.time_left <= 0));

  return (
    <div className="fixed inset-0 flex flex-col items-center p-4 pt-12 pb-32 bg-gradient-to-b from-red-950 via-red-900/90 to-gray-900 text-white overflow-y-auto">
      {/* DANGER Background Effects - Very visible from distance */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        {/* Pulsing red glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] rounded-full blur-3xl bg-red-600/30 animate-pulse"></div>
        
        {/* Warning stripes at bottom only (top has progress bar) */}
        <div className="absolute bottom-0 left-0 right-0 h-2 bg-gradient-to-r from-yellow-500 via-red-600 to-yellow-500"></div>
        
        {/* Diagonal warning stripes overlay */}
        <div className="absolute inset-0 opacity-[0.03]" style={{
          backgroundImage: 'repeating-linear-gradient(45deg, #fbbf24 0, #fbbf24 10px, transparent 10px, transparent 20px)',
        }}></div>
      </div>

      {/* DANGER Header */}
      <div className="relative z-10 flex flex-col items-center gap-3 mb-6">
        {isCompromised ? (
          <>
            {/* EXPOSED state - big red warning */}
            <div className="flex items-center gap-2 px-6 py-3 rounded-full bg-red-600/40 border-2 border-red-500 animate-pulse">
              <AlertTriangle size={24} className="text-red-300" />
              <span className="font-black text-red-200 text-xl tracking-wider">EXPOSED</span>
              <AlertTriangle size={24} className="text-red-300" />
            </div>
            
            {/* Locked out message */}
            <div className="bg-red-500/20 border border-red-500/50 rounded-xl px-4 py-3 max-w-sm">
              <p className="text-red-300 text-center text-sm font-bold">
                LOCKED OUT OF ALL SYSTEMS
              </p>
              <p className="text-red-400/80 text-center text-xs mt-1">
                Eliminate remaining crew immediately!
              </p>
            </div>
          </>
        ) : (
          <>
            {/* Normal state - vent network active */}
            <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-red-500/30 border-2 border-red-500">
              <AlertTriangle size={20} className="text-red-300" />
              <span className="font-bold text-red-200 text-sm tracking-wider">VENT NETWORK ACTIVE</span>
              <AlertTriangle size={20} className="text-red-300" />
            </div>
            
            {/* Exposure warning */}
            <div className="flex items-center gap-2 text-yellow-400/80 text-sm">
              <Eye size={16} />
              <span>You are exposed - find safety!</span>
            </div>
          </>
        )}
      </div>

      {/* Active Cards Section */}
      {activeCardsList.length > 0 && (
        <div className="relative z-10 w-full max-w-2xl mb-6">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-3 h-3 bg-emerald-400 rounded-full"></div>
            <h2 className="text-lg font-bold text-emerald-300">Active Effects</h2>
          </div>
          <div className="grid gap-4">
            {activeCardsList.map((card) => {
              const { action, text, location, duration, id, time_left, countdown } = card;
              return (
                <ActionCard
                  key={id}
                  id={id}
                  action={action}
                  text={text}
                  location={location}
                  duration={duration}
                  time_left={time_left}
                  countdown={countdown}
                  active
                  onPlay={playCard}
                />
              );
            })}
          </div>
        </div>
      )}

      {/* Available Cards Section */}
      <div className="relative z-10 w-full max-w-2xl">
        <div className="flex items-center gap-2 mb-3">
          <Zap size={20} className="text-red-400" />
          <h2 className="text-lg font-bold text-red-200">Sabotage Cards</h2>
          <span className="text-red-400/60 text-sm ml-auto">Tap to activate</span>
        </div>
        
        {(!playerState.cards || playerState.cards.length === 0) ? (
          <div className="bg-gray-900/50 rounded-2xl p-8 border-2 border-dashed border-red-500/30 text-center">
            <Zap size={32} className="text-red-500/40 mx-auto mb-3" />
            <p className="text-gray-400">No cards available</p>
            <p className="text-gray-500 text-sm mt-2">Complete tasks to draw cards</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {playerState.cards.map((cardJson) => {
              try {
                const card = JSON.parse(cardJson);
                const { action, text, location, duration, id } = card;
                return (
                  <ActionCard
                    key={id}
                    id={id}
                    action={action}
                    text={text}
                    location={location}
                    duration={duration}
                    time_left={999}
                    onPlay={playCard}
                  />
                );
              } catch (error) {
                console.error('Error parsing game action card:', error);
                return null;
              }
            })}
          </div>
        )}
      </div>

      {/* Exit Vent Button - Fixed at Bottom (hidden when exposed) */}
      {!isCompromised && (
        <div className="fixed bottom-0 left-0 right-0 z-20 p-4 pb-6 bg-gradient-to-t from-gray-900 via-gray-900/98 to-transparent">
          <button
            onClick={() => setShowSusPage(false)}
            type="button"
            className="w-full max-w-2xl mx-auto flex items-center justify-center gap-4 px-8 py-5 bg-green-600 text-white rounded-2xl text-xl font-bold"
          >
            <LogOut size={26} />
            <span>EXIT TO SAFETY</span>
          </button>
        </div>
      )}
    </div>
  );
};

export default ImposterPage;
