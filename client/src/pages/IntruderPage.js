// src/pages/IntruderPage.jsx
import React, { useContext, useEffect, useState } from 'react';
import { DataContext } from '../GameContext';
import LeaveGameButton from '../components/LeaveGameButton';
import { LogOut, Zap, Clock, MapPin, AlertTriangle, Eye, X, Send, Users, FileText } from 'lucide-react';
import { StatusBadge, PrimaryButton } from '../components/ui';
import { Card } from '../components/ui';

// ActionCard component defined OUTSIDE to prevent re-creation on every render
function ActionCard({ action, text, location, duration, id, time_left, active = false, countdown, requires_input, onPlay }) {
  if (time_left <= 0) {
    return null;
  }

  const formattedAction = action.replace('_', ' ');

  return (
    <button 
      onClick={() => onPlay(id, requires_input, action)}
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

const IntruderPage = ({ setShowSusPage }) => {
  const {
    playerState,
    socket,
    activeCards,
    players,
    taskLocations,
    intrudersRevealed
  } = useContext(DataContext);

  // Check if intruders have been revealed (tasks 100%)
  const isCompromised = !!intrudersRevealed;

  // Fake Task modal state
  const [showFakeTaskModal, setShowFakeTaskModal] = useState(false);
  const [selectedCardId, setSelectedCardId] = useState(null);
  const [targetPlayerId, setTargetPlayerId] = useState('');
  const [fakeTaskText, setFakeTaskText] = useState('');
  const [fakeTaskLocation, setFakeTaskLocation] = useState('');

  // Get list of alive crewmates (non-intruders)
  const aliveCrewmates = players.filter(p => p.alive && !p.sus);
  
  // Get available locations
  const availableLocations = taskLocations.length > 0 ? taskLocations : ['Other'];

  function playCard(id, requires_input, action) {
    if (requires_input && action === 'Fake Task') {
      // Show modal for Fake Task
      setSelectedCardId(id);
      setTargetPlayerId('');
      setFakeTaskText('');
      setFakeTaskLocation(availableLocations[0] || 'Other');
      setShowFakeTaskModal(true);
    } else {
      // Normal card play
      socket.emit('play_card', { player_id: localStorage.getItem('player_id'), card_id: id });
    }
  }

  function sendFakeTask() {
    if (!targetPlayerId || !fakeTaskText.trim()) {
      return;
    }
    
    socket.emit('play_card', {
      player_id: localStorage.getItem('player_id'),
      card_id: selectedCardId,
      extra_data: {
        target_player_id: targetPlayerId,
        task_text: fakeTaskText.trim(),
        task_location: fakeTaskLocation
      }
    });
    
    setShowFakeTaskModal(false);
    setSelectedCardId(null);
  }

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  // Auto-exit vent screen when intruders are revealed (tasks 100%)
  useEffect(() => {
    if (intrudersRevealed) {
      // Small delay so the player sees the "POSITION COMPROMISED" state briefly
      const timer = setTimeout(() => {
        setShowSusPage(false);
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [intrudersRevealed, setShowSusPage]);

  const activeCardsList = activeCards.filter((card) => !(card.time_left && card.time_left <= 0));

  return (
    <div className="fixed inset-0 flex flex-col items-center p-4 pt-12 pb-32 bg-gradient-to-b from-red-950 via-red-900/90 to-gray-900 text-white overflow-y-auto">
      {/* Leave Game Button - Fixed Position */}
      <LeaveGameButton className="fixed top-8 right-4 z-50" />

      {/* Fake Task Modal */}
      {showFakeTaskModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80">
          <div className="w-full max-w-md bg-gray-800 rounded-2xl border-2 border-red-500 overflow-hidden">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-4 bg-red-900/50 border-b border-red-500/50">
              <div className="flex items-center gap-2">
                <FileText size={20} className="text-red-300" />
                <h3 className="text-lg font-bold text-white">Send Fake Task</h3>
              </div>
              <button
                onClick={() => setShowFakeTaskModal(false)}
                className="p-2 rounded-lg hover:bg-red-800/50 transition-colors"
              >
                <X size={20} className="text-gray-400" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-4 space-y-4">
              {/* Target Selection */}
              <div>
                <label className="flex items-center gap-2 text-sm text-gray-300 mb-2">
                  <Users size={16} />
                  Select Target Crewmate
                </label>
                <select
                  value={targetPlayerId}
                  onChange={(e) => setTargetPlayerId(e.target.value)}
                  className="w-full p-3 bg-gray-700 border border-gray-600 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-red-500"
                >
                  <option value="">Choose a crewmate...</option>
                  {aliveCrewmates.map((player) => (
                    <option key={player.player_id} value={player.player_id}>
                      {player.username}
                    </option>
                  ))}
                </select>
                {aliveCrewmates.length === 0 && (
                  <p className="text-red-400 text-sm mt-1">No alive crewmates to target!</p>
                )}
              </div>

              {/* Task Text Input */}
              <div>
                <label className="flex items-center gap-2 text-sm text-gray-300 mb-2">
                  <FileText size={16} />
                  Fake Task Description
                </label>
                <textarea
                  value={fakeTaskText}
                  onChange={(e) => setFakeTaskText(e.target.value)}
                  placeholder="e.g., Go stand in the corner and count to 100..."
                  className="w-full p-3 bg-gray-700 border border-gray-600 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-red-500 resize-none"
                  rows={3}
                  maxLength={200}
                />
                <p className="text-gray-500 text-xs mt-1 text-right">{fakeTaskText.length}/200</p>
              </div>

              {/* Location Selection */}
              <div>
                <label className="flex items-center gap-2 text-sm text-gray-300 mb-2">
                  <MapPin size={16} />
                  Location
                </label>
                <select
                  value={fakeTaskLocation}
                  onChange={(e) => setFakeTaskLocation(e.target.value)}
                  className="w-full p-3 bg-gray-700 border border-gray-600 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-red-500"
                >
                  {availableLocations.map((loc) => (
                    <option key={loc} value={loc}>
                      {loc}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-gray-900/50 border-t border-gray-700 flex gap-3">
              <button
                onClick={() => setShowFakeTaskModal(false)}
                className="flex-1 py-3 px-4 bg-gray-700 text-white rounded-xl font-medium hover:bg-gray-600 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={sendFakeTask}
                disabled={!targetPlayerId || !fakeTaskText.trim()}
                className="flex-1 py-3 px-4 bg-red-600 text-white rounded-xl font-bold hover:bg-red-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                <Send size={18} />
                Send Task
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DANGER Background Effects - Very visible from distance */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        {/* Pulsing red glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] rounded-full blur-3xl bg-red-600/30 animate-pulse"></div>
        
        {/* Warning stripes at top and bottom */}
        <div className="absolute top-0 left-0 right-0 h-3 bg-gradient-to-r from-yellow-500 via-red-600 to-yellow-500"></div>
        <div className="absolute bottom-0 left-0 right-0 h-3 bg-gradient-to-r from-yellow-500 via-red-600 to-yellow-500"></div>
        
        {/* Diagonal warning stripes overlay */}
        <div className="absolute inset-0 opacity-[0.03]" style={{
          backgroundImage: 'repeating-linear-gradient(45deg, #fbbf24 0, #fbbf24 10px, transparent 10px, transparent 20px)',
        }}></div>
      </div>

      {/* DANGER Header */}
      <div className="relative z-10 flex flex-col items-center gap-3 mb-6">
        {isCompromised ? (
          <>
            {/* COMPROMISED state - big red warning */}
            <div className="flex items-center gap-2 px-6 py-3 rounded-full bg-red-600/40 border-2 border-red-500 animate-pulse">
              <AlertTriangle size={24} className="text-red-300" />
              <span className="font-black text-red-200 text-lg tracking-wider">POSITION COMPROMISED</span>
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
            
            {/* Disabled badges */}
            <div className="flex flex-wrap justify-center gap-2">
              <span className="px-3 py-1 bg-gray-800/80 border border-red-500/30 rounded-full text-red-400/60 text-xs font-bold line-through">
                VENTS DISABLED
              </span>
              <span className="px-3 py-1 bg-gray-800/80 border border-red-500/30 rounded-full text-red-400/60 text-xs font-bold">
                IDENTITY EXPOSED
              </span>
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
              const { action, text, location, duration, id, time_left, countdown, requires_input } = card;
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
                  requires_input={requires_input}
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
                const { action, text, location, duration, id, requires_input } = card;
                return (
                  <ActionCard
                    key={id}
                    id={id}
                    action={action}
                    text={text}
                    location={location}
                    duration={duration}
                    time_left={999}
                    requires_input={requires_input}
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

      {/* Exit Vent Button - Fixed at Bottom */}
      <div className="fixed bottom-0 left-0 right-0 z-20 p-4 pb-6 bg-gradient-to-t from-gray-900 via-gray-900/98 to-transparent">
        {isCompromised ? (
          // Compromised state - can't use vents anymore
          <div className="w-full max-w-2xl mx-auto flex items-center justify-center gap-4 px-8 py-5 bg-gray-800 text-gray-500 rounded-2xl text-xl font-bold border-2 border-red-500/30">
            <AlertTriangle size={26} className="text-red-500/50" />
            <span className="line-through">VENTS LOCKED</span>
          </div>
        ) : (
          <button
            onClick={() => setShowSusPage(false)}
            type="button"
            className="w-full max-w-2xl mx-auto flex items-center justify-center gap-4 px-8 py-5 bg-green-600 text-white rounded-2xl text-xl font-bold"
          >
            <LogOut size={26} />
            <span>EXIT TO SAFETY</span>
          </button>
        )}
      </div>
    </div>
  );
};

export default IntruderPage;
