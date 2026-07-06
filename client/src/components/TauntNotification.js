import React from 'react';
import { MessageSquare } from 'lucide-react';

/**
 * Rich in-modal display for a taunt message received from an intruder.
 * Mirrors the PlayerRole component style but with a sinister red/orange theme.
 */
const TauntNotification = ({ message }) => {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-red-500/30 bg-gradient-to-br from-gray-950 via-red-950/20 to-gray-950 shadow-lg mt-1 mb-2">
      {/* Ambient pulse */}
      <div className="absolute inset-0 bg-red-500/5 animate-pulse" />

      {/* Top accent line */}
      <div className="h-px bg-gradient-to-r from-transparent via-red-500/60 to-transparent" />

      {/* From label */}
      <div className="relative flex items-center gap-2 px-4 pt-4 pb-2">
        <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-red-500/15 border border-red-500/30 flex items-center justify-center">
          <MessageSquare size={20} className="text-red-400" />
        </div>
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-widest text-red-400/80">
            From an Intruder
          </p>
          <p className="text-[10px] text-gray-500">Anonymous</p>
        </div>
      </div>

      {/* Message bubble */}
      <div className="relative mx-4 mb-4 px-4 py-3 rounded-xl bg-gray-900/70 border border-red-500/20">
        {/* Quote mark */}
        <span className="absolute -top-2 left-3 text-3xl text-red-500/30 leading-none select-none font-serif">"</span>
        <p className="text-white text-base font-medium leading-snug pt-1">
          {message}
        </p>
      </div>

      {/* Bottom accent */}
      <div className="h-px bg-gradient-to-r from-transparent via-red-500/40 to-transparent" />
    </div>
  );
};

export default TauntNotification;
