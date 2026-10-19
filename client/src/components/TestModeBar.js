import React, { useContext } from 'react';
import { FlaskConical, Repeat } from 'lucide-react';
import { DataContext } from '../GameContext';

// Shown on the crew screen in a test game so a tester can try both roles.
const TestModeBar = () => {
    const { playerState, meetingState, switchTestRole, connected, testMode } = useContext(DataContext);
    if (!testMode || !playerState?.alive || meetingState) return null;
    const sus = !!playerState?.sus;

    return (
        <div className="flex justify-center">
            <div className="sg flex items-center gap-2 rounded-full pl-3 pr-1 py-1" style={{ background: 'rgba(0,0,0,0.22)', color: '#fff', fontWeight: 700, fontSize: 13 }}>
                <FlaskConical size={13} />
                <span className="whitespace-nowrap">Test game · {sus ? 'Intruder' : 'Crewmate'}</span>
                <button
                    onClick={switchTestRole}
                    disabled={!connected}
                    className="flex items-center gap-1 rounded-full px-2.5 py-1 disabled:opacity-40"
                    style={{ background: '#fff', color: 'var(--sg-round)', fontWeight: 700 }}
                >
                    <Repeat size={12} />
                    Switch to {sus ? 'Crewmate' : 'Intruder'}
                </button>
            </div>
        </div>
    );
};

export default TestModeBar;
