import React, { useContext } from "react";
import { DataContext } from "../GameContext";
import { FaRadiation } from "react-icons/fa";
import { AlertTriangle, Key } from "lucide-react";

function MeltdownInfo() {
    const { meltdownTimer, meltdownCode } = useContext(DataContext);

    return (
        <div
            className={`relative flex flex-col items-center justify-center min-h-screen h-full p-4 pt-12 pb-8
                        text-white overflow-hidden
                        bg-gradient-to-b from-gray-900 via-red-950 to-gray-900
                        ${meltdownTimer <= 10 ? "" : ""}`}
        >
            {/* Animated Background Effects */}
            <div className="fixed inset-0 overflow-hidden pointer-events-none">
                {/* Warning glow */}
                <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full blur-3xl bg-red-500/20 ${meltdownTimer <= 10 ? 'animate-pulse' : ''}`}></div>
                
                {/* Reactor rings */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] border-2 border-red-500/20 rounded-full animate-spin" style={{ animationDuration: '10s' }}></div>
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] border border-red-500/10 rounded-full animate-spin" style={{ animationDuration: '15s', animationDirection: 'reverse' }}></div>
                
                {/* Warning stripes */}
                <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-yellow-500 via-black to-yellow-500 animate-pulse"></div>
                <div className="absolute bottom-0 left-0 right-0 h-2 bg-gradient-to-r from-yellow-500 via-black to-yellow-500 animate-pulse"></div>
            </div>

            {/* Status Header */}
            <div className="relative z-10 flex items-center gap-4 mb-6">
                <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-red-500/20 border border-red-500 animate-pulse">
                    <AlertTriangle size={20} className="text-red-400" />
                    <span className="font-bold text-red-400">MELTDOWN IN PROGRESS</span>
                </div>
            </div>

            {/* Reactor Icon */}
            <div className="relative z-10 mb-6">
                <div className="absolute inset-0 blur-xl bg-red-500 opacity-50 rounded-full animate-pulse"></div>
                <FaRadiation className="relative text-red-500 text-6xl animate-spin" style={{ animationDuration: '2s' }} />
            </div>

            <div className="relative z-10 w-full max-w-lg bg-gray-800/80 backdrop-blur-sm p-8 rounded-2xl shadow-2xl flex flex-col items-center border border-red-500/30">
                <h1 className="text-3xl md:text-4xl font-bold mb-6 text-center text-red-400 drop-shadow-[0_0_10px_rgba(239,68,68,0.5)]">
                    REACTOR MELTDOWN
                </h1>
                
                {/* Your Code Section */}
                <div className="w-full flex flex-col items-center mb-6">
                    <div className="flex items-center gap-2 text-gray-300 mb-4">
                        <Key size={20} className="text-yellow-400" />
                        <span className="text-lg">Your shutdown code:</span>
                    </div>
                    
                    <div className="relative">
                        <div className="absolute inset-0 blur-lg bg-yellow-500/30 rounded-2xl"></div>
                        <div className="relative flex justify-center gap-3 px-8 py-6 bg-gray-900/90 rounded-2xl border-4 border-yellow-500 shadow-[0_0_30px_rgba(234,179,8,0.3)]">
                            {meltdownCode && String(meltdownCode).split('').map((digit, index) => (
                                <span
                                    key={index}
                                    className="text-5xl md:text-6xl font-mono font-bold text-yellow-400 drop-shadow-[0_0_10px_rgba(234,179,8,0.5)]"
                                >
                                    {digit}
                                </span>
                            ))}
                        </div>
                    </div>
                    
                    <p className="text-gray-400 text-sm mt-4">
                        Enter this code at the reactor terminal
                    </p>
                </div>

                {/* Timer */}
                <div className={`text-center mt-2 ${meltdownTimer <= 10 ? "animate-pulse" : ""}`}>
                    <p className={`text-5xl md:text-6xl font-bold font-mono ${meltdownTimer <= 10 ? "text-red-500" : "text-white"}`}>
                        {meltdownTimer}s
                    </p>
                    <p className="text-gray-400 text-sm mt-1">until meltdown</p>
                </div>
                
                {meltdownTimer <= 10 && (
                    <div className="flex items-center gap-2 mt-6 text-red-400 animate-pulse">
                        <AlertTriangle size={24} />
                        <span className="text-lg font-bold">CRITICAL - MELTDOWN IMMINENT!</span>
                    </div>
                )}
            </div>
        </div>
    );
}

export default MeltdownInfo;
