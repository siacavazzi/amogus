// ./pages/CrewmemberPage.jsx

import React, { useContext, useEffect } from 'react';
import PropTypes from 'prop-types';
import { DataContext } from '../GameContext';
import AnimationOverlay from '../components/AnimationOverlay';
import MUECustomSlider from '../components/swiper';
import { FaExclamationTriangle } from 'react-icons/fa';

const CrewmemberPage = () => {
  const {
    task,
    setTask,
    socket,
    setShowAnimation,
    showAnimation,
    handleCallMeeting,
    setAudio,
  } = useContext(DataContext); // Use DataContext here

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  // Function to handle completing a task
  const handleCompleteTask = () => {
    if (task) {
      socket.emit('complete_task', { player_id: localStorage.getItem('player_id') });
      setShowAnimation(true); // Trigger animation first
      setAudio('complete_task');
      console.log('Animation triggered:', showAnimation); // Debugging line
    } else {
      alert('No task to complete.');
    }
  };

  // Callback function to handle animation completion
  const handleAnimationComplete = () => {
    setShowAnimation(false);
    console.log('Animation completed and task cleared');
  };

  return (
    <div className="flex flex-col items-center p-8 bg-gray-800 text-white min-h-screen relative">
      {/* Crewmember Actions */}
      <div className="mb-8">
        
      <button
      onClick={handleCallMeeting}
      className="flex items-center px-6 py-3 bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-lg shadow-lg hover:from-orange-600 hover:to-orange-700 transition-colors duration-300"
    >
      <FaExclamationTriangle className="mr-2" />
      Call Meeting
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
            <p className="text-lg">No task assigned.</p>
          </div>
        )}
        <MUECustomSlider text="Slide to complete task" onSuccess={handleCompleteTask} />
      </div>

      {/* Animation Overlay */}
      {showAnimation && <AnimationOverlay onComplete={handleAnimationComplete} />}
    </div>
  );
};

// Define PropTypes for type checking
CrewmemberPage.propTypes = {
  task: PropTypes.shape({
    task: PropTypes.string,
    location: PropTypes.string,
  }),
};

// Define default props
CrewmemberPage.defaultProps = {
  task: { task: '', location: '' },
};

export default CrewmemberPage;
