import React from 'react';
import EndGameButtons from '../components/EndGameButtons';
import { FaRadiation } from 'react-icons/fa';
import { AlertTriangle } from 'lucide-react';

const NuclearMeltdownScreen = ({ message = "Meltdown Occurred!" }) => {
    return (
        <div className="relative flex flex-col items-center justify-center min-h-screen h-full bg-gradient-to-b from-red-950 via-orange-950 to-gray-900 text-white p-6 pt-12 overflow-hidden">
            {/* Animated Background Effects */}
            <div className="fixed inset-0 overflow-hidden pointer-events-none">
                {/* Explosion glow */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] rounded-full blur-3xl bg-orange-500/30 animate-pulse"></div>
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] rounded-full blur-2xl bg-red-500/40 animate-pulse"></div>
                
                {/* Destroyed reactor rings */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] border-4 border-red-500/30 rounded-full opacity-50" style={{ transform: 'translate(-50%, -50%) rotate(15deg)' }}></div>
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] border-2 border-orange-500/20 rounded-full opacity-30" style={{ transform: 'translate(-50%, -50%) rotate(-10deg)' }}></div>
                
                {/* Warning stripes */}
                <div className="absolute top-0 left-0 right-0 h-3 bg-gradient-to-r from-yellow-500 via-red-600 to-yellow-500"></div>
                <div className="absolute bottom-0 left-0 right-0 h-3 bg-gradient-to-r from-yellow-500 via-red-600 to-yellow-500"></div>
            </div>

            <div className="relative z-10 text-center flex flex-col items-center">
                {/* Radiation Icon */}
                <div className="relative mb-8">
                    <div className="absolute inset-0 blur-2xl bg-red-500 opacity-60 rounded-full animate-pulse"></div>
                    <FaRadiation className="relative text-8xl md:text-9xl text-red-500 animate-pulse" />
                </div>

                {/* Status Badge */}
                <div className="flex items-center gap-2 px-6 py-3 rounded-full bg-red-500/30 border-2 border-red-500 mb-6 animate-pulse">
                    <AlertTriangle size={24} className="text-red-400" />
                    <span className="font-bold text-red-400 text-lg">CONTAINMENT BREACH</span>
                </div>

                <h1 className="text-5xl md:text-6xl font-bold mb-4 text-red-400 drop-shadow-[0_0_20px_rgba(239,68,68,0.5)]">
                    {message}
                </h1>
                <p className="text-xl md:text-2xl mb-10 text-orange-200">
                    The imposters caused a catastrophic reactor meltdown.
                </p>
                
                <div className="bg-gray-900/60 backdrop-blur-sm p-6 rounded-2xl border border-red-500/30">
                    <EndGameButtons />
                </div>
            </div>
        </div>
    );
};

export default NuclearMeltdownScreen;
