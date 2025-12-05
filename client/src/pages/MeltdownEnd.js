import React from 'react';
import EndGameButtons from '../components/EndGameButtons';

const NuclearMeltdownScreen = ({ message = "Meltdown Occurred!" }) => {
    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-b from-yellow-700 to-red-700 text-white p-6">
            <div className="text-center">
                <div className="text-6xl mb-6 animate-pulse">
                    ☢️
                </div>
                <h1 className="text-5xl font-bold mb-4">
                    {message}
                </h1>
                <p className="text-2xl mb-8 text-yellow-100">
                    The imposters caused a meltdown.
                </p>
                <EndGameButtons />
            </div>
        </div>
    );
};

export default NuclearMeltdownScreen;
