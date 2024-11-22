// ./pages/CrewmemberPage.jsx

import React, { useContext } from 'react';
import './CrewmemberPage.css'; // Import CSS for styling
import PropTypes from 'prop-types';
import { DataContext } from '../GameContext';
import AnimationOverlay from '../components/AnimationOverlay';
import MUECustomSlider from '../components/swiper';

const CrewmemberPage = () => {
  const { 
    task,
    setTask,
    socket,
    playerState,
    setShowAnimation,
    showAnimation,
    handleCallMeeting,
  } = useContext(DataContext); // Use DataContext here
 // State for animation visibility


  // Function to handle completing a task
  const handleCompleteTask = () => {
    if (task) {
      socket.emit('complete_task', { player_id: localStorage.getItem('player_id') });
      setTask(undefined);  
      setShowAnimation(true); // Trigger animation first
      console.log('Animation triggered:', showAnimation); // Debugging line
      // Note: Do not setTask(undefined) here
    } else {
      alert('No task to complete.');
    }
  };

  // Callback function to handle animation completion
  const handleAnimationComplete = () => {
    setShowAnimation(false); // Hide animation    // Clear the task after animation
    console.log('Animation completed and task cleared');
  };

  return (
    <div className="crewmember-page">
      {/* <h2>Crewmember Dashboard</h2> */}
      <div className="crewmember-actions">
        <button onClick={handleCallMeeting} className="action-button call-meeting">
          Call Meeting
        </button>
      </div>
      {/* <h3>Current Task</h3> */}
      <div className="task-section">
        <p>Task:</p>
        {task ? (
          <div className="task-display">
            <h2>{task}</h2>
          </div>
        ) : (
          <div className="task-display">
            <p>No task assigned.</p>
          </div>
        )}
        <MUECustomSlider text={"Slide to complete task"} onSuccess={handleCompleteTask}/>
      </div>

      {/* Animation Overlay */}
      {showAnimation && <AnimationOverlay  onComplete={handleAnimationComplete} />}
    </div>
  );
};

// Define PropTypes for type checking
CrewmemberPage.propTypes = {
  task: PropTypes.string,
};

// Define default props
CrewmemberPage.defaultProps = {
  task: '',
};

export default CrewmemberPage;
