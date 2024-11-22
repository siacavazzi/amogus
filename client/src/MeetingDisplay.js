// ./components/EmergencyMeeting.jsx

import React from 'react';
import './MeetingDisplay.css'; // Create this CSS file

const MeetingDisplay = ({ message = "Meeting called"}) => {
    return (
      <div className="emergency-meeting">
        <div className="meeting-icon">
          {/* You can replace this with an actual icon or image */}
          📢
        </div>
        <div className="meeting-message">{message}</div>
      </div>
    );
  };


export default MeetingDisplay;
