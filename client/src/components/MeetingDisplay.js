// src/components/MeetingDisplay.jsx
import React from 'react';
import PropTypes from 'prop-types';
import { AlertTriangle } from 'lucide-react';

const MeetingDisplay = ({ message = "Meeting called" }) => {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-orange-500/50 bg-gradient-to-r from-gray-900 via-orange-950/30 to-gray-900 shadow-lg my-4">
      {/* Animated background pulse */}
      <div className="absolute inset-0 bg-orange-500/10 animate-pulse" />
      
      <div className="relative flex items-center gap-4 p-5">
        {/* Icon */}
        <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-orange-500/20 border border-orange-500/30 flex items-center justify-center">
          <AlertTriangle size={24} className="text-orange-400" />
        </div>

        {/* Message */}
        <div className="flex-1">
          <p className="text-lg font-bold text-white">{message}</p>
          <p className="text-sm text-orange-300/70">Emergency meeting in progress</p>
        </div>
      </div>
      
      {/* Bottom accent line */}
      <div className="h-1 bg-gradient-to-r from-transparent via-orange-500 to-transparent" />
    </div>
  );
};

MeetingDisplay.propTypes = {
  message: PropTypes.string,
};

export default MeetingDisplay;
