import React, { useContext } from 'react';
import { FlaskConical, Repeat } from 'lucide-react';
import { DataContext } from '../GameContext';

// Shown on the crew screen in a test game so a tester can try both roles.
const TestModeBar = () => {
    const { playerState, meetingState, switchTestRole, connected, testMode } = useContext(DataContext);
    if (!testMode || !playerState?.alive || meetingState) return null;
    const sus = !!playerState?.sus;

    return (
        <div className="relative z-10 -mt-3 mb-5 flex justify-center">
            <div className="flex items-center gap-2 rounded-full border border-amber-500/40 bg-gray-900/95 backdrop-blur-sm pl-3 pr-1 py-1 shadow-lg">
                <FlaskConical size={12} className="text-amber-400" />
                <span className="text-xs text-amber-200 whitespace-nowrap">
                    Test game · {sus ? 'Intruder' : 'Crewmate'}
                </span>
                <button
                    onClick={switchTestRole}
                    disabled={!connected}
                    className="flex items-center gap-1 rounded-full bg-amber-500/20 hover:bg-amber-500/30 px-2.5 py-1 text-xs font-semibold text-amber-100 transition-colors disabled:opacity-40"
                >
                    <Repeat size={12} />
                    Switch to {sus ? 'Crewmate' : 'Intruder'}
                </button>
            </div>
        </div>
    );
};

export default TestModeBar;
