import React from 'react';
import { AlertTriangle, Skull, Target, ShieldAlert } from 'lucide-react';

/**
 * IntrudersRevealedDisplay - Shown to crewmates when tasks reach 100%
 * Reveals who the intruders are
 */
const IntrudersRevealedDisplay = ({ intruderNames = [], isIntruder = false }) => {
  if (isIntruder) {
    // Special display for intruders - they've been exposed!
    return (
      <div className="relative overflow-hidden rounded-2xl border-2 border-red-500 bg-gradient-to-r from-gray-900 via-red-950/50 to-gray-900 shadow-lg my-4">
        {/* Animated warning pulse */}
        <div className="absolute inset-0 bg-red-500/20 animate-pulse" />
        
        {/* Scan line effect */}
        <div 
          className="absolute inset-0 pointer-events-none"
          style={{
            background: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(255,0,0,0.03) 2px, rgba(255,0,0,0.03) 4px)',
          }}
        />
        
        <div className="relative flex flex-col items-center gap-3 p-6">
          {/* Icon */}
          <div className="w-16 h-16 rounded-full bg-red-500/30 border-2 border-red-500 flex items-center justify-center animate-pulse">
            <ShieldAlert size={32} className="text-red-400" />
          </div>

          {/* Title */}
          <h2 className="text-2xl font-black text-red-500 tracking-wider text-center">
            LOCKED OUT
          </h2>
          
          {/* Message */}
          <p className="text-red-300 text-center text-sm font-medium">
            All systems compromised. Eliminate remaining crew immediately!
          </p>
          
          {/* Warning badges */}
          <div className="flex flex-wrap justify-center gap-2 mt-2">
            <span className="px-3 py-1 bg-red-500/20 border border-red-500/50 rounded-full text-red-400 text-xs font-bold">
              VENTS DISABLED
            </span>
            <span className="px-3 py-1 bg-red-500/20 border border-red-500/50 rounded-full text-red-400 text-xs font-bold">
              IDENTITY EXPOSED
            </span>
          </div>
        </div>
        
        {/* Bottom accent line */}
        <div className="h-1 bg-gradient-to-r from-transparent via-red-500 to-transparent" />
      </div>
    );
  }

  // Display for crewmates - shows who the intruders are
  return (
    <div className="relative overflow-hidden rounded-2xl border-2 border-emerald-500 bg-gradient-to-r from-gray-900 via-emerald-950/30 to-gray-900 shadow-lg my-4">
      {/* Animated background pulse */}
      <div className="absolute inset-0 bg-emerald-500/10 animate-pulse" />
      
      <div className="relative flex flex-col items-center gap-4 p-6">
        {/* Icon */}
        <div className="w-16 h-16 rounded-full bg-emerald-500/30 border-2 border-emerald-500 flex items-center justify-center">
          <Target size={32} className="text-emerald-400" />
        </div>

        {/* Title */}
        <div className="text-center">
          <h2 className="text-xl font-black text-emerald-400 tracking-wider mb-1">
            TASKS COMPLETE!
          </h2>
          <p className="text-emerald-300/70 text-sm">Intruder identities revealed</p>
        </div>
        
        {/* Intruder names */}
        <div className="flex flex-col items-center gap-2 w-full">
          <div className="flex items-center gap-2 text-amber-400 text-xs uppercase tracking-wider">
            <AlertTriangle size={14} />
            <span>The {intruderNames.length > 1 ? 'intruders are' : 'intruder is'}</span>
            <AlertTriangle size={14} />
          </div>
          
          <div className="flex flex-wrap justify-center gap-2">
            {intruderNames.map((name, index) => (
              <div 
                key={index}
                className="flex items-center gap-2 px-4 py-2 bg-red-500/20 border border-red-500/50 rounded-xl"
              >
                <Skull size={16} className="text-red-400" />
                <span className="text-red-300 font-bold">{name}</span>
              </div>
            ))}
          </div>
        </div>
        
        {/* Call to action */}
        <p className="text-gray-400 text-sm text-center mt-2">
          Find them and vote them out!
        </p>
      </div>
      
      {/* Bottom accent line */}
      <div className="h-1 bg-gradient-to-r from-transparent via-emerald-500 to-transparent" />
    </div>
  );
};

export default IntrudersRevealedDisplay;
