import React, { useEffect, useState, useContext, useMemo } from "react";
import { DataContext } from "../GameContext";
import LeaveGameButton from "../components/LeaveGameButton";
import { ProfilePicture } from "../components/PlayerCard";
import { Vote, UserX, ShieldOff, ShieldCheck, AlertTriangle, ArrowRight } from "lucide-react";
import { FloatingParticles, useFloatingParticles } from "../components/ui";
import { PrimaryButton } from "../components/ui";

export default function MeetingResultPage() {
  const { meetingState, players, setMeetingState, setVotes, setVetoVotes } = useContext(DataContext);
  const [phase, setPhase] = useState('initial'); // 'initial', 'reveal', 'complete'
  const [votedOutPlayer, setVotedOutPlayer] = useState(undefined);
  
  // Use shared floating particles
  const particles = useFloatingParticles(12, 'purple');

  useEffect(() => {
    setVotes(undefined);
    setVetoVotes(0);
    if (!meetingState?.voted_out) return;
    for (const player of players) {
      if (player.player_id === meetingState?.voted_out) {
        setVotedOutPlayer(player);
        return;
      }
    }
  }, [meetingState, players, setVotes, setVetoVotes]);

  // Phased animation reveal
  useEffect(() => {
    const timer1 = setTimeout(() => setPhase('reveal'), 500);
    const timer2 = setTimeout(() => setPhase('complete'), 1500);
    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
    };
  }, []);

  // Stars background - memoized
  const stars = useMemo(() => 
    Array.from({ length: 30 }, (_, i) => ({
      id: i,
      left: Math.random() * 100,
      top: Math.random() * 100,
      delay: Math.random() * 2,
    }))
  , []);

  const renderVetoResult = () => (
    <div className={`flex flex-col items-center transition-all duration-700 ${phase !== 'initial' ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
      {/* Veto Icon */}
      <div className="relative mb-6">
        <div className="w-28 h-28 rounded-full bg-orange-500/20 border-2 border-orange-500/50 flex items-center justify-center">
          <AlertTriangle size={56} className="text-orange-400" />
        </div>
        <div className="absolute inset-0 w-28 h-28 rounded-full border-2 border-orange-500/30 animate-ping" />
      </div>
      
      <h1 className="text-3xl sm:text-4xl font-bold text-orange-400 mb-3 text-center">
        Meeting Vetoed
      </h1>
      <p className="text-gray-400 text-lg text-center max-w-xs">
        The crew decided to skip the vote
      </p>
    </div>
  );

  const renderNoVoteResult = () => (
    <div className={`flex flex-col items-center transition-all duration-700 ${phase !== 'initial' ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
      {/* No one icon */}
      <div className="relative mb-6">
        <div className="w-28 h-28 rounded-full bg-gray-700/50 border-2 border-gray-600 flex items-center justify-center">
          <UserX size={56} className="text-gray-500" />
        </div>
      </div>
      
      <h1 className="text-3xl sm:text-4xl font-bold text-gray-300 mb-3 text-center">
        No Consensus
      </h1>
      <p className="text-gray-500 text-lg text-center max-w-xs">
        No one received enough votes to be ejected
      </p>
    </div>
  );

  const renderEjectionResult = () => (
    <div className={`flex flex-col items-center transition-all duration-700 ${phase !== 'initial' ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
      {/* Player being ejected */}
      <div className="relative mb-6">
        {/* Glow effect */}
        <div className={`absolute inset-0 blur-2xl opacity-40 scale-150 rounded-full ${
          votedOutPlayer?.sus ? 'bg-red-500' : 'bg-blue-500'
        }`} />
        
        <ProfilePicture
          imageCode={votedOutPlayer?.pic}
          selfie={votedOutPlayer?.selfie}
          size="large"
          isDead={true}
          deathCause="voted_out"
        />
        
        {/* Vote icon overlay */}
        <div className="absolute -bottom-2 -right-2 w-10 h-10 bg-purple-500/30 border border-purple-500/50 rounded-full flex items-center justify-center">
          <Vote size={20} className="text-purple-300" />
        </div>
      </div>
      
      {/* Player name */}
      <h2 className="text-2xl font-bold text-white mb-2">{votedOutPlayer?.username}</h2>
      
      {/* Ejection text */}
      <h1 className="text-3xl sm:text-4xl font-bold text-purple-400 mb-4 text-center">
        was ejected
      </h1>
      
      {/* Role reveal - appears after delay */}
      <div className={`transition-all duration-700 delay-500 ${phase === 'complete' ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
        {votedOutPlayer?.sus !== undefined && (
          <div className={`flex items-center gap-3 px-6 py-3 rounded-xl border ${
            votedOutPlayer.sus 
              ? 'bg-red-900/30 border-red-500/50' 
              : 'bg-blue-900/30 border-blue-500/50'
          }`}>
            {votedOutPlayer.sus ? (
              <>
                <ShieldOff size={24} className="text-red-400" />
                <span className="text-red-300 font-semibold text-lg">They were an Intruder!</span>
              </>
            ) : (
              <>
                <ShieldCheck size={24} className="text-blue-400" />
                <span className="text-blue-300 font-semibold text-lg">They were innocent...</span>
              </>
            )}
          </div>
        )}
      </div>
      
      {/* Death message */}
      {votedOutPlayer?.death_message && phase === 'complete' && (
        <div className="mt-6 p-4 rounded-xl bg-gray-800/60 border border-gray-700 max-w-sm animate-fadeIn">
          <p className="text-gray-400 italic text-center">
            "{votedOutPlayer.death_message}"
          </p>
        </div>
      )}
    </div>
  );

  const renderContent = () => {
    if (meetingState?.reason === "veto") {
      return renderVetoResult();
    }

    if (!meetingState?.voted_out) {
      return renderNoVoteResult();
    }

    return renderEjectionResult();
  };

  return (
    <div className="fixed inset-0 bg-gray-900 flex flex-col items-center justify-center overflow-hidden">
      {/* Animated background */}
      <div className="absolute inset-0 bg-gradient-to-b from-purple-900/20 via-gray-900 to-gray-900" />
      
      {/* Floating particles */}
      <FloatingParticles particles={particles} />
      
      {/* Stars/dots background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {stars.map((star) => (
          <div
            key={star.id}
            className="absolute w-1 h-1 bg-white/20 rounded-full"
            style={{
              left: `${star.left}%`,
              top: `${star.top}%`,
              animationDelay: `${star.delay}s`,
            }}
          />
        ))}
      </div>
      
      {/* Leave Game Button */}
      <LeaveGameButton className="fixed top-4 right-4 z-50" />

      {/* Main content */}
      <div className="relative z-10 flex flex-col items-center p-6">
        {renderContent()}
      </div>
      
      {/* Continue button */}
      <div className={`fixed bottom-8 left-0 right-0 px-6 transition-all duration-700 ${
        phase === 'complete' ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
      }`}>
        <div className="max-w-sm mx-auto">
          <PrimaryButton onClick={() => setMeetingState(undefined)} variant="purple">
            Continue
            <ArrowRight size={20} />
          </PrimaryButton>
        </div>
      </div>
    </div>
  );
}
