import React, { useContext, useState, useEffect } from "react";
import { DataContext } from "../GameContext";
import { FaRadiation } from "react-icons/fa";
import { AlertTriangle, Zap, Activity, LogOut } from "lucide-react";

function ReactorNormal() {
    const { socket,
        meeting,
        hackTime,
        endState,
        roomCode,
     } = useContext(DataContext);
    const [isSabotaging, setIsSabotaging] = useState(false);
    const [pulseIntensity, setPulseIntensity] = useState(0);

    useEffect(() => {
        console.log("Context values:", { meeting, hackTime, endState });
    }, [meeting, hackTime, endState]);

    // Animate pulse effect when sabotaging
    useEffect(() => {
        if (isSabotaging) {
            const interval = setInterval(() => {
                setPulseIntensity(prev => (prev + 1) % 100);
            }, 30);
            return () => clearInterval(interval);
        } else {
            setPulseIntensity(0);
        }
    }, [isSabotaging]);
    

    const handleSabotage = () => {
        setIsSabotaging(true);
        setTimeout(() => {
            // Send both player_id and room_code for maximum compatibility
            socket.emit("meltdown", { 
                player_id: localStorage.getItem('player_id'),
                room_code: roomCode 
            });
            setIsSabotaging(false);
        }, 3000);
    };

    console.log(meeting)

    function isDisabled() {
        // TODO FIX THIS WHEN THERE IS A HACK IT BREAKS AND THE BUTTON CANT BE CLICKED
        console.log(isSabotaging || meeting || hackTime > 0 || endState)
        return (isSabotaging || meeting || hackTime > 0 || endState)
    }

    const handleLeaveRoom = () => {
        // Clear local storage first
        localStorage.removeItem('room_code');
        sessionStorage.removeItem('is_room_creator');
        // Send leave_room with room_code (reactor doesn't have player_id)
        socket.emit('leave_room', { room_code: roomCode });
    };

    return (
        <div className="fixed inset-0 flex flex-col items-center justify-center bg-gradient-to-b from-gray-900 via-gray-800 to-gray-900 text-white overflow-hidden pt-8 pb-20">
            {/* Leave Room Button */}
            <button
                onClick={handleLeaveRoom}
                className="fixed top-4 right-4 z-50 flex items-center gap-2 px-3 py-2 bg-gray-800/80 hover:bg-red-600/80 border border-gray-600 hover:border-red-500 rounded-lg text-gray-400 hover:text-white transition-all text-sm backdrop-blur-sm"
                title="Leave Room"
            >
                <LogOut size={16} />
                <span className="hidden md:inline">Leave Room</span>
            </button>
            {/* Animated Background Effects */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                {/* Core glow */}
                <div 
                    className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full blur-3xl transition-all duration-300 ${
                        isSabotaging 
                            ? 'bg-red-500/30 animate-pulse' 
                            : 'bg-cyan-500/20'
                    }`}
                    style={isSabotaging ? { 
                        boxShadow: `0 0 ${100 + pulseIntensity}px ${50 + pulseIntensity/2}px rgba(239, 68, 68, 0.4)` 
                    } : {}}
                ></div>
                
                {/* Reactor rings */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] border-2 border-cyan-500/20 rounded-full animate-spin" style={{ animationDuration: '20s' }}></div>
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] border border-cyan-500/10 rounded-full animate-spin" style={{ animationDuration: '30s', animationDirection: 'reverse' }}></div>
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px] border-4 border-cyan-500/30 rounded-full animate-pulse"></div>
                
                {/* Warning stripes when sabotaging */}
                {isSabotaging && (
                    <>
                        <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-yellow-500 via-black to-yellow-500 animate-pulse"></div>
                        <div className="absolute bottom-0 left-0 right-0 h-2 bg-gradient-to-r from-yellow-500 via-black to-yellow-500 animate-pulse"></div>
                    </>
                )}
            </div>

            {/* Main Content */}
            <div className="relative z-10 flex flex-col items-center">
                {/* Status Indicators */}
                <div className="flex items-center gap-6 mb-8">
                    <div className={`flex items-center gap-2 px-4 py-2 rounded-full ${isSabotaging ? 'bg-red-500/20 border border-red-500' : 'bg-green-500/20 border border-green-500'}`}>
                        <Activity size={20} className={isSabotaging ? 'text-red-400 animate-pulse' : 'text-green-400'} />
                        <span className={`font-medium ${isSabotaging ? 'text-red-400' : 'text-green-400'}`}>
                            {isSabotaging ? 'INITIATING MELTDOWN' : 'STABLE'}
                        </span>
                    </div>
                    <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-cyan-500/20 border border-cyan-500">
                        <Zap size={20} className="text-cyan-400" />
                        <span className="font-medium text-cyan-400">ONLINE</span>
                    </div>
                </div>

                {/* Reactor Core Icon */}
                <div className="relative mb-8">
                    <div className={`absolute inset-0 blur-xl ${isSabotaging ? 'bg-red-500' : 'bg-cyan-500'} opacity-50 rounded-full animate-pulse`}></div>
                    <FaRadiation 
                        className={`relative text-[150px] transition-all duration-300 ${
                            isSabotaging 
                                ? "text-red-500 animate-spin" 
                                : "text-cyan-400 animate-pulse"
                        }`}
                        style={isSabotaging ? { animationDuration: '0.5s' } : {}}
                    />
                </div>

                {/* Title */}
                <h1 className={`text-5xl font-bold mb-4 tracking-wider transition-colors duration-300 ${
                    isSabotaging ? 'text-red-400' : 'text-cyan-400'
                }`}>
                    CORE
                </h1>
                <p className="text-gray-400 text-lg mb-10">Nuclear Fusion Control System</p>

                {/* Sabotage Button */}
                <button
                    onClick={handleSabotage}
                    disabled={isDisabled()}
                    className={`relative group px-16 py-8 text-3xl font-bold text-white rounded-2xl focus:outline-none transition-all duration-300 ${
                        isDisabled() 
                            ? "bg-gray-700 opacity-50 cursor-not-allowed" 
                            : isSabotaging
                                ? "bg-red-600 animate-pulse shadow-[0_0_50px_rgba(239,68,68,0.5)]"
                                : "bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 hover:shadow-[0_0_30px_rgba(239,68,68,0.4)] hover:scale-105"
                    }`}
                >
                    {!isDisabled() && !isSabotaging && (
                        <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-red-400 to-red-600 opacity-0 group-hover:opacity-20 transition-opacity"></div>
                    )}
                    <div className="flex items-center gap-3">
                        {isSabotaging ? (
                            <>
                                <AlertTriangle className="animate-bounce" size={32} />
                                <span>INITIATING...</span>
                            </>
                        ) : (
                            <>
                                <FaRadiation size={28} />
                                <span>SABOTAGE CORE</span>
                            </>
                        )}
                    </div>
                </button>

                {/* Status Text */}
                {isSabotaging && (
                    <div className="mt-8 flex items-center gap-3 text-red-400 animate-pulse">
                        <AlertTriangle size={24} />
                        <span className="text-xl font-medium">Overloading core...</span>
                    </div>
                )}

                {isDisabled() && !isSabotaging && (
                    <p className="mt-6 text-gray-500">
                        {meeting ? "Cannot sabotage during meeting" : 
                         hackTime > 0 ? "Sabotage in progress..." : 
                         endState ? "Game has ended" : ""}
                    </p>
                )}
            </div>

            {/* Bottom Stats Bar */}
            <div className="absolute bottom-0 left-0 right-0 bg-gray-900/80 backdrop-blur-sm border-t border-cyan-500/30 px-8 py-4">
                <div className="max-w-4xl mx-auto flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${isSabotaging ? 'bg-red-500 animate-pulse' : 'bg-green-500'}`}></div>
                        <span className="text-gray-400">Core Temperature: <span className={isSabotaging ? 'text-red-400' : 'text-green-400'}>{isSabotaging ? 'CRITICAL' : 'Normal'}</span></span>
                    </div>
                    <div className="text-gray-500">Room: <span className="text-cyan-400 font-mono">{roomCode}</span></div>
                    <div className="flex items-center gap-2">
                        <span className="text-gray-400">Containment:</span>
                        <span className={isSabotaging ? 'text-red-400' : 'text-green-400'}>{isSabotaging ? 'FAILING' : 'Secure'}</span>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default ReactorNormal;
