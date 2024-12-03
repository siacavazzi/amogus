import React from 'react';

const NuclearMeltdownScreen = ({ message = "Meltdown Occurred!" }) => {
    return (
        <div className="flex flex-col items-center justify-center h-screen bg-gradient-to-b from-yellow-700 to-red-700 text-white">
            <div className="text-center p-10">
                <div className="text-6xl mb-6 animate-pulse">
                    ☢️
                </div>
                <h1 className="text-5xl font-bold mb-4">
                    {message}
                </h1>
                <p className="text-2xl">
                    The imposters caused a meltdown.
                </p>
            </div>
        </div>
    );
};

export default NuclearMeltdownScreen;
