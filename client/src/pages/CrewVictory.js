import React from 'react';
import EndGameButtons from '../components/EndGameButtons';

const CrewVictoryScreen = ({ message = "Crewmates Win!" }) => {
    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-b from-blue-800 to-blue-500 text-white p-6">
            <div className="text-center">
                <div className="text-6xl mb-6 animate-fadeIn">
                    🚀
                </div>
                <h1 className="text-5xl font-bold mb-4">
                    {message}
                </h1>
                <p className="text-2xl mb-8 text-blue-100">
                    The crew completed all tasks!
                </p>
                <EndGameButtons />
            </div>
        </div>
    );
};

export default CrewVictoryScreen;
