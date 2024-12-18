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
    setKillCooldown
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

  // Function to handle completing a task or killing a player
  const handleCompleteTask = () => {
    if (playerState?.sus) {
      if (killCooldown > 0) return; // Prevent killing during cooldown
      setAudio("kill_player");
      socket.emit("kill_player", { player_id: localStorage.getItem("player_id") });
      setKillCooldown(60); // Set 60 seconds cooldown
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
    <div className="flex flex-col items-center p-8 bg-gray-800 text-white min-h-screen relative">
      {/* Crewmember Actions */}
      <div className="mb-8">
        <button
          onClick={handleClickButton}
          className="flex items-center px-6 py-3 bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-lg shadow-lg hover:from-orange-600 hover:to-orange-700 transition-colors duration-300"
        >
          <FaExclamationTriangle className="mr-2" />
          {playerState?.sus ? "Enter Vent" : "Call Meeting"}
        </button>
      </div>

      {/* Task Section */}
      <div className="w-full max-w-xl bg-gray-700 p-6 rounded-lg shadow-md">
        <p className="text-lg font-semibold mb-4">Task:</p>
        {task ? (
          <div className="flex flex-col items-center mb-4">
            <h2 className="text-2xl text-blue-400">{task.task}</h2>
            <p className="text-lg text-gray-300 mt-2">Location: {task.location}</p>
          </div>
        ) : (
          <div className="flex flex-col items-center mb-4">
            <p className="text-lg">
              {playerState?.sus
                ? `Eliminate all crewmates ${
                    killCooldown > 0 ? `(Cooldown: ${killCooldown}s)` : ""
                  }`
                : "No task assigned."}
            </p>
          </div>
        )}

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
