import React, { useContext, useState } from 'react';
import { DataContext } from '../GameContext';
import { LogOut } from '../signal/icons';
import '../signal/signal.css';

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
            {/* Leave Button: a quiet round button that sits on any screen colour */}
            <button
                onClick={handleLeaveClick}
                className={`sg flex items-center justify-center gap-2 rounded-full transition-opacity hover:opacity-100 ${className}`}
                style={{ minWidth: 40, height: 40, padding: '0 11px', background: 'rgba(0,0,0,0.18)', color: 'inherit', opacity: 0.85, fontWeight: 700, fontSize: 14 }}
                title="Leave Game"
                aria-label="Leave game"
            >
                <LogOut size={17} strokeWidth={2.5} />
                <span className="hidden sm:inline">Leave</span>
            </button>

            {/* Confirmation */}
            {showConfirm && (
                <div className="sg fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.55)' }}>
                    <div className="sg-a sg-rise w-full max-w-sm" style={{ background: '#fff', color: 'var(--sg-ink)', borderRadius: 24, padding: 22 }}>
                        <h2 className="sg-big" style={{ fontSize: 30, marginBottom: 10 }}>Leave game?</h2>
                        <p style={{ fontWeight: 500, fontSize: 16, lineHeight: 1.4, marginBottom: 20, opacity: 0.8 }}>
                            {running
                                ? "You'll be marked as eliminated and can't rejoin this game."
                                : "You'll leave this room."
                            }
                        </p>
                        <div className="flex gap-3">
                            <button onClick={handleCancel} className="sg-btn" style={{ background: '#eceae4', color: 'var(--sg-ink)' }}>
                                Stay
                            </button>
                            <button onClick={handleConfirmLeave} className="sg-btn" style={{ background: 'var(--sg-out)', color: '#fff' }}>
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
