// ./pages/DeadPage.jsx

import React from 'react';
import './DeadPage.css'; // Import the corresponding CSS file

const DeadPage = () => {
  return (
    <div className="dead-page">
      <div className="dead-container">
        <div className="dead-icon">
          <img src="https://preview.redd.it/rnj1si3kzwn51.png?width=720&format=png&auto=webp&s=6e7243bb5c2d8f27921313b0f8ef27617523d604"></img>
        </div>
        <h1 className="dead-title">You Are Dead</h1>
        <p className="dead-message">
          rip bozo
        </p>
      </div>
    </div>
  );
};

export default DeadPage;
