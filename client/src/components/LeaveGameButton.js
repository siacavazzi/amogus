import React, { useContext, useState } from 'react';
import { DataContext } from '../GameContext';
import { LogOut, AlertTriangle } from 'lucide-react';

function LeaveGameButton({ className = '' }) {
    const { socket, roomCode, running } = useContext(DataContext);
    const [showConfirm, setShowConfirm] = useState(false);

    const handleLeaveClick = () => {
        setShowConfirm(true);
    };

    const handleConfirmLeave = () => {
        const playerId = localStorage.getItem('player_id');
        // Clear local storage
        localStorage.removeItem('player_id');
        localStorage.removeItem('room_code');
        sessionStorage.removeItem('is_room_creator');
        
        // Emit leave_room with both player_id and room_code
        socket.emit('leave_room', { 
            player_id: playerId || undefined,
            room_code: roomCode 
        });
        setShowConfirm(false);
    };

    const handleCancel = () => {
        setShowConfirm(false);
    };

    return (
        <>
            {/* Leave Button */}
            <button
                onClick={handleLeaveClick}
                className={`flex items-center gap-2 px-3 py-2 bg-gray-800/80 hover:bg-red-600/80 border border-gray-600 hover:border-red-500 rounded-lg text-gray-400 hover:text-white transition-all text-sm backdrop-blur-sm ${className}`}
                title="Leave Game"
            >
                <LogOut size={16} />
                <span className="hidden sm:inline">Leave</span>
            </button>

            {/* Confirmation Modal */}
            {showConfirm && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
                    <div className="bg-gray-800 rounded-2xl p-6 max-w-sm w-full border border-gray-600 shadow-2xl">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="p-3 bg-red-500/20 rounded-full">
                                <AlertTriangle size={24} className="text-red-400" />
                            </div>
                            <h2 className="text-xl font-bold text-white">Leave Game?</h2>
                        </div>
                        
                        <p className="text-gray-300 mb-6">
                            {running 
                                ? "You will be marked as eliminated and cannot rejoin this game. Are you sure you want to leave?"
                                : "Are you sure you want to leave this room?"
                            }
                        </p>
                        
                        <div className="flex gap-3">
                            <button
                                onClick={handleCancel}
                                className="flex-1 px-4 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-lg font-medium transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleConfirmLeave}
                                className="flex-1 px-4 py-3 bg-red-600 hover:bg-red-500 text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
                            >
                                <LogOut size={18} />
                                Leave
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}

export default LeaveGameButton;
