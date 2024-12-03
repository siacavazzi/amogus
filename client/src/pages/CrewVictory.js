import React from 'react';

const CrewVictoryScreen = ({ message = "Crewmates Win!" }) => {
    return (
        <div className="flex flex-col items-center justify-center h-screen bg-gradient-to-b from-blue-800 to-blue-500 text-white">
            <div className="text-center p-10">
                <div className="text-6xl mb-6 animate-fadeIn">
                    🚀
                </div>
                <h1 className="text-5xl font-bold mb-4">
                    {message}
                </h1>
                <p className="text-2xl">
                    All tasks completed successfully.
                </p>
            </div>
        </div>
    );
};

export default CrewVictoryScreen;
