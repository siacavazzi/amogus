// ./pages/CrewmemberPage.jsx

import React, { useContext } from 'react';
import './CrewmemberPage.css'; // Import CSS for styling
import PropTypes from 'prop-types';
import { DataContext } from '../GameContext';

const CrewmemberPage = () => {

    const { 
        task,
    } = useContext(DataContext); // Use DataContext here

  // Placeholder function to handle calling a meeting
  const handleCallMeeting = () => {
    alert('Meeting called! Discuss with the crew.');
    // Implement meeting logic here, such as navigating to a meeting page
    // navigate('/meeting'); // Uncomment if you have a MeetingPage
  };

  // Placeholder function to handle completing a task
  const handleCompleteTask = () => {
    if (task) {
      alert(`Task "${task}" completed!`);
      // Implement task completion logic here
      // For example, update game state, notify server, etc.
    } else {
      alert('No task to complete.');
    }
  };

  return (
    <div className="crewmember-page">
      <h1>Crewmember Dashboard</h1>
      <div className="crewmember-actions">
        <button onClick={handleCallMeeting} className="action-button call-meeting">
          Call Meeting
        </button>
      </div>
      <div className="task-section">
        <h2>Current Task</h2>
        {task ? (
          <div className="task-display">
            <p>{task}</p>
            <button onClick={handleCompleteTask} className="action-button complete-task">
              Complete Task
            </button>
          </div>
        ) : (
          <div className="task-display">
            <p>No task assigned.</p>
          </div>
        )}
      </div>
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
