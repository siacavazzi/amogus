// src/components/MeetingDisplay.jsx
import React from 'react';
import PropTypes from 'prop-types';

const MeetingDisplay = ({ message = "Meeting called" }) => {
  return (
    <div className="flex flex-col items-center p-5 md:p-6 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-lg shadow-lg animate-fadeIn my-5">
      {/* Meeting Icon */}
      <div className="mb-4 text-5xl">
        📢
      </div>

      {/* Meeting Message */}
      <div className="mb-5 text-center text-xl font-semibold">
        {message}
      </div>
    </div>
  );
};

MeetingDisplay.propTypes = {
  message: PropTypes.string,
};

export default MeetingDisplay;
