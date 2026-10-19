import React, { useContext } from 'react';
import { FlaskConical, Repeat } from '../signal/icons';
import { DataContext } from '../GameContext';

// Shown on the crew screen in a test game so a tester can try both roles.
const TestModeBar = () => {
    const { playerState, meetingState, switchTestRole, connected, testMode } = useContext(DataContext);
    if (!testMode || !playerState?.alive || meetingState) return null;
    const sus = !!playerState?.sus;

    return (
        <div className="flex justify-center">
            <div className="sg flex items-center gap-2 rounded-full" style={{ background: 'rgba(0,0,0,0.22)', color: '#fff', fontWeight: 800, fontSize: 15, padding: '4px 4px 4px 14px' }}>
                <FlaskConical size={16} />
                <span className="whitespace-nowrap">Test game · {sus ? 'Intruder' : 'Crewmate'}</span>
                <button
                    onClick={switchTestRole}
                    disabled={!connected}
                    className="flex items-center gap-1 rounded-full disabled:opacity-40"
                    style={{ background: '#fff', color: 'var(--sg-round)', fontWeight: 900, minHeight: 36, padding: '6px 12px' }}
                >
                    <Repeat size={15} />
                    Switch to {sus ? 'Crewmate' : 'Intruder'}
                </button>
            </div>
        </div>
    );
};

export default TestModeBar;
