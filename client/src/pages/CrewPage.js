import React, { useContext, useEffect, useState } from "react";
import PropTypes from "prop-types";
import { DataContext } from "../GameContext";
import AnimationOverlay from "../components/AnimationOverlay";
import MUECustomSlider from "../components/swiper";
import LeaveGameButton from "../components/LeaveGameButton";
import { AlertTriangle, MapPin, Target, Clock, Crosshair, Radio } from "lucide-react";
import { RotatingRing, GridOverlay } from "../components/ui";
import { StatusBadge, PrimaryButton } from "../components/ui";
import { Card, CardHeader, CardBody } from "../components/ui";

const CrewmemberPage = ({ setShowSusPage }) => {
  const {
    task,
    socket,
    setShowAnimation,
    showAnimation,
    handleCallMeeting,
    setAudio,
    playerState,
    killCooldown,
    setKillCooldown,
  } = useContext(DataContext);

  const [pulseIntensity, setPulseIntensity] = useState(0);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  // Subtle background animation
  useEffect(() => {
    const interval = setInterval(() => {
      setPulseIntensity(prev => (prev + 1) % 100);
    }, 50);
    return () => clearInterval(interval);
  }, []);

  const handleClickButton = () => {
    if (!playerState?.sus) {
      handleCallMeeting();
    } else {
      setShowSusPage(true);
    }
  };

  const handleCompleteTask = () => {
    if (playerState?.sus) {
      if (killCooldown > 0) return; // Prevent action during cooldown
      setAudio("kill_player");
      socket.emit("kill_player", { player_id: localStorage.getItem("player_id") }); // doesnt do anything yet...
      setKillCooldown(15); 
      return;
    }

    setAudio("complete_task");
    if (task) {
      socket.emit("complete_task", { player_id: localStorage.getItem("player_id") });
      setShowAnimation(true);
    } else {
      alert("No task to complete.");
    }
  };

  const handleAnimationComplete = () => {
    setShowAnimation(false);
  };

  return (
    <div className="fixed inset-0 flex flex-col items-center p-6 pt-12 pb-32 bg-gradient-to-b from-gray-900 via-gray-800 to-gray-900 text-white overflow-y-auto">
      {/* Leave Game Button - Fixed Position */}
      <LeaveGameButton className="fixed top-8 right-4 z-50" />

      {/* Animated Background Effects */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        {/* Core glow */}
        <div 
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full blur-3xl bg-cyan-500/10"
          style={{ 
            opacity: 0.3 + (Math.sin(pulseIntensity * 0.1) * 0.1)
          }}
        ></div>
        
        {/* Rotating rings */}
        <RotatingRing size="600px" borderColor="border-cyan-500/10" duration={30} />
        <RotatingRing size="700px" borderColor="border-cyan-500/5" duration={45} reverse />
        
        {/* Grid overlay for sci-fi feel */}
        <GridOverlay color="rgba(34, 211, 238, 0.3)" size={50} opacity={0.05} />
      </div>

      {/* Status Bar */}
      <div className="relative z-10 flex items-center gap-4 mb-6">
        <StatusBadge 
          icon={Radio} 
          variant={killCooldown > 0 ? 'orange' : 'cyan'}
          animate
        >
          {killCooldown > 0 ? 'STANDBY' : 'ACTIVE'}
        </StatusBadge>
      </div>

      {/* Emergency Button */}
      <div className="relative z-10 mb-8">
        <button
          onClick={handleClickButton}
          className="group relative flex items-center justify-center px-8 py-4 rounded-2xl shadow-lg transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-orange-500 bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-500 hover:to-red-500 transform hover:scale-105 hover:shadow-[0_0_30px_rgba(249,115,22,0.4)]"
        >
          <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-orange-400 to-red-400 opacity-0 group-hover:opacity-20 blur-xl transition-opacity"></div>
          <AlertTriangle className="mr-3" size={22} />
          <span className="font-bold text-lg tracking-wide">
            {playerState?.sus ? "ENTER VENT" : "CALL MEETING"}
          </span>
        </button>
      </div>

      {/* Main Task/Objective Card */}
      <div className="relative z-10 w-full max-w-xl">
        <div className="relative bg-gray-800/80 backdrop-blur-md rounded-2xl shadow-2xl border border-cyan-500/30 overflow-hidden">
          {/* Card Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-700/50 bg-gray-900/50">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${killCooldown > 0 ? 'bg-orange-500/20' : 'bg-cyan-500/20'}`}>
                <Target size={20} className={killCooldown > 0 ? 'text-orange-400' : 'text-cyan-400'} />
              </div>
              <h2 className="text-lg font-bold text-gray-200">
                {playerState?.sus ? "Current Objective" : "Current Task"}
              </h2>
            </div>
            {killCooldown > 0 && (
              <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-orange-500/20 border border-orange-500/50">
                <Clock size={14} className="text-orange-400" />
                <span className="text-orange-400 font-mono text-sm">{killCooldown}s</span>
              </div>
            )}
          </div>

          {/* Card Body */}
          <div className="p-6">
            {task && !playerState?.sus ? (
              <div className="flex flex-col items-center text-center">
                {/* Task Name */}
                <div className="relative mb-4">
                  <div className="absolute inset-0 blur-lg bg-cyan-500/20 rounded-full"></div>
                  <h3 className="relative text-2xl md:text-3xl font-bold text-cyan-400 drop-shadow-[0_0_10px_rgba(34,211,238,0.3)]">
                    {task.task}
                  </h3>
                </div>
                
                {/* Location */}
                <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gray-700/50 border border-gray-600/50">
                  <MapPin size={18} className="text-gray-400" />
                  <span className="text-gray-300 font-medium">{task.location}</span>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center text-center py-4">
                <div className="relative mb-3">
                  <Crosshair size={40} className={`${killCooldown > 0 ? 'text-orange-400/50' : 'text-gray-400'}`} />
                </div>
                <p className="text-lg text-gray-300">
                  {playerState?.sus
                    ? killCooldown > 0 
                      ? "Awaiting next opportunity..."
                      : "Eliminate all crewmates"
                    : "Awaiting task assignment..."}
                </p>
                {playerState?.sus && killCooldown > 0 && (
                  <div className="mt-4 w-full max-w-xs">
                    <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-gradient-to-r from-orange-500 to-orange-400 transition-all duration-1000"
                        style={{ width: `${((15 - killCooldown) / 15) * 100}%` }}
                      ></div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Animated border glow */}
          <div className="absolute inset-0 rounded-2xl pointer-events-none">
            <div className={`absolute inset-0 rounded-2xl opacity-20 ${
              killCooldown > 0 ? 'shadow-[inset_0_0_30px_rgba(249,115,22,0.3)]' : 'shadow-[inset_0_0_30px_rgba(34,211,238,0.2)]'
            }`}></div>
          </div>
        </div>
      </div>

      {/* Slider - Fixed at Bottom */}
      <div className="fixed bottom-0 left-0 right-0 z-20 p-4 pb-6 bg-gradient-to-t from-gray-900 via-gray-900/95 to-transparent">
        <div className="max-w-xl mx-auto">
          <MUECustomSlider
            text={
              playerState?.sus
                ? killCooldown > 0
                  ? "Cooldown active"
                  : "Slide to eliminate"
                : task 
                  ? "Slide to complete task"
                  : "No task assigned"
            }
            onSuccess={handleCompleteTask}
            sus={playerState?.sus}
          />
        </div>
      </div>

      {/* Animation Overlay */}
      {showAnimation && <AnimationOverlay onComplete={handleAnimationComplete} />}
    </div>
  );
};

CrewmemberPage.propTypes = {
  task: PropTypes.shape({
    task: PropTypes.string,
    location: PropTypes.string,
  }),
};

CrewmemberPage.defaultProps = {
  task: { task: "", location: "" },
};

export default CrewmemberPage;
