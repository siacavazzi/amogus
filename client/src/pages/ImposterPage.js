// ./pages/ImposterPage.jsx

import React from 'react';
import './ImposterPage.css'; // Import CSS for styling

const ImposterPage = () => {

  // Mock function to handle calling a meeting
  const handleCallMeeting = () => {
    alert('Meeting called! Discuss with the crew.');
    // Implement meeting logic here, such as navigating to a meeting page
    // navigate('/meeting'); // Uncomment if you have a MeetingPage
  };

  return (
    <div className="imposter-page">
      <h1>Imposter Dashboard</h1>
      <div className="imposter-actions">
        <button onClick={handleCallMeeting} className="action-button call-meeting">
          Call Meeting
        </button>
      </div>
      <div className="information">
        <p>
          As the Imposter, you can call meetings to discuss suspicious activities and eliminate Crewmates.
        </p>
        <p>
          Use the button above to initiate a meeting when necessary.
        </p>
      </div>
    </div>
  );
};

export default ImposterPage;
