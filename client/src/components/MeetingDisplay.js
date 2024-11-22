import React from 'react';
import '../CSS/MeetingDisplay.css';

const MeetingDisplay = ({ message = "Meeting called"}) => {
    return (
      <div className="emergency-meeting">
        <div className="meeting-icon">
          📢
        </div>
        <div className="meeting-message">{message}</div>
      </div>
    );
  };


export default MeetingDisplay;
