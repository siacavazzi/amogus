import React from 'react';
import EndGameButtons from '../components/EndGameButtons';

const ImposterVictoryScreen = ({ message = "Imposters Win!" }) => {
    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-b from-gray-800 to-red-800 text-white p-6">
            <div className="text-center">
                <div className="text-6xl mb-6 animate-fadeIn">
                    🛸
                </div>
                <h1 className="text-5xl font-bold mb-4">
                    {message}
                </h1>
                <p className="text-2xl mb-8 text-red-200">
                    The imposters have taken over.
                </p>
                <EndGameButtons />
            </div>
        </div>
    );
};

export default ImposterVictoryScreen;
