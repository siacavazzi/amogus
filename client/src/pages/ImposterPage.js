// ./pages/ImposterPage.jsx

import React, { useContext } from 'react';
import { DataContext } from '../GameContext';
import './ImposterPage.css'; // Import CSS for styling
import MUECustomSlider from '../components/ui/swiper';

const ImposterPage = () => {
    const { 
        handleCallMeeting,
      } = useContext(DataContext);

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
      <MUECustomSlider text={"Slide to pretend to do a task"} />
    </div>
  );
};

export default ImposterPage;
