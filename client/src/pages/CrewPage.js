import React, { useContext, useEffect, useState } from "react";
import PropTypes from "prop-types";
import { DataContext } from "../GameContext";
import AnimationOverlay from "../components/AnimationOverlay";
import MUECustomSlider from "../components/swiper";
import { FaExclamationTriangle } from "react-icons/fa";

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

  useEffect(() => {
    window.scrollTo(0, 0);
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
      socket.emit("kill_player", { player_id: localStorage.getItem("player_id") });
      setKillCooldown(60); // 60 second cooldown
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

  // Keeping the page styling consistent for both crewmates and sus players:
  // The button, backgrounds, and layout remain the same. Only text changes slightly.
  return (
    <div className="relative flex flex-col items-center min-h-screen p-8 pt-12 pb--16 bg-gradient-to-br from-gray-900 via-black to-gray-800 text-white">
      {/* Meeting / Vent Button */}
      <div className="mb-8">
        <button
          onClick={handleClickButton}
          className="flex items-center justify-center px-6 py-3 rounded-full shadow-lg transition-transform duration-300 focus:outline-none focus:ring-2 bg-orange-600 hover:bg-orange-700 focus:ring-orange-500 transform hover:scale-105"
        >
          <FaExclamationTriangle className="mr-2" />
          {playerState?.sus ? "Enter Vent" : "Call Meeting"}
        </button>
      </div>

      {/* Task / Elimination Section */}
      <div className="w-full max-w-xl bg-gray-700/90 backdrop-blur-md p-6 rounded-xl shadow-xl">
        <p className="text-lg font-semibold mb-4 underline underline-offset-4 decoration-blue-400">
          {playerState?.sus ? "Current Objective:" : "Current Task:"}
        </p>

        {task && !playerState?.sus ? (
          <div className="flex flex-col items-center mb-4">
            <h2 className="text-2xl text-blue-400 font-bold">{task.task}</h2>
            <p className="text-lg text-gray-300 mt-2">Location: {task.location}</p>
          </div>
        ) : (
          <div className="flex flex-col items-center mb-4">
            <p className="text-lg text-gray-300">
              {playerState?.sus
                ? `Eliminate all crewmates ${
                    killCooldown > 0 ? `(Cooldown: ${killCooldown}s)` : ""
                  }`
                : "No task assigned."}
            </p>
          </div>
        )}

      </div>
      <MUECustomSlider
          text={
            playerState?.sus
              ? killCooldown > 0
                ? "Cooldown active"
                : "Slide to eliminate player"
              : "Slide to complete task"
          }
          onSuccess={handleCompleteTask}
        />

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
