import React, { useContext, useEffect } from 'react';
import { DataContext } from '../GameContext';
import './ImposterPage.css'; // Import CSS for styling
import MUECustomSlider from '../components/swiper';

const ImposterPage = () => {
  const {
    handleCallMeeting,
    setAudio,
    susPoints,
    socket,
  } = useContext(DataContext);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  function handleSwipe() {
    setAudio('complete_task');
  }

    // Conditions for sabotage buttons
    const canHack = susPoints >= 1;
    const canFake = susPoints >= 2; 

  function handleSabotage(type) {
    if(type === 'hack' && canHack) {
      socket.emit('hack')
    }else if(type === 'fake' && canFake) {
      // def way more logic for this one
    }

  }

  return (
    <div className="imposter-page">
      <h1>Imposter Dashboard</h1>
      <div className="points-display">
        <p>Points: {susPoints}</p>
      </div>
      <div className="imposter-actions">
        <button onClick={handleCallMeeting} className="action-button call-meeting">
          Call Meeting
        </button>
        <button
          onClick={() => handleSabotage('hack')}
          className={`action-button sabotage-button ${!canHack ? 'disabled' : ''}`}
          disabled={!canHack}
        >
          Hack Players
          (1 Point)
        </button>
        <button
          onClick={() => handleSabotage('fake')}
          className={`action-button sabotage-button ${!canFake ? 'disabled' : ''}`}
          disabled={!canFake}
        >
          Send a fake task (2 Points)
        </button>
      </div>
      {/* <div className="information">
        <p>
          As the Imposter, you can call meetings to discuss suspicious activities and eliminate Crewmates.
        </p>
        <p>
          Use the sabotage buttons to disrupt Crewmate activities. Points are required for sabotages.
        </p>
      </div> */}
      <MUECustomSlider onSuccess={handleSwipe} text={"Slide to pretend to do a task"} />
    </div>
  );
};

export default ImposterPage;
