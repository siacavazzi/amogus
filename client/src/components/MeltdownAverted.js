import React from 'react';
import { ShieldCheck } from 'lucide-react';

const MeltdownAvertedDisplay = ({ message = "Meltdown Averted!" }) => {
    return (
        <div className="relative overflow-hidden rounded-2xl border border-emerald-500/50 bg-gradient-to-r from-gray-900 via-emerald-950/30 to-gray-900 shadow-lg my-4">
            {/* Animated background pulse */}
            <div className="absolute inset-0 bg-emerald-500/10 animate-pulse" />
            
            <div className="relative flex items-center gap-4 p-5">
                {/* Icon */}
                <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center">
                    <ShieldCheck size={24} className="text-emerald-400" />
                </div>

                {/* Message */}
                <div className="flex-1">
                    <p className="text-lg font-bold text-white">{message}</p>
                    <p className="text-sm text-emerald-300/70">Crisis has been contained</p>
                </div>
            </div>
            
            {/* Bottom accent line */}
            <div className="h-1 bg-gradient-to-r from-transparent via-emerald-500 to-transparent" />
        </div>
    );
};

export default MeltdownAvertedDisplay;
