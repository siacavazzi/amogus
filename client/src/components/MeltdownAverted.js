import React from 'react';

const MeltdownAvertedDisplay = ({ message = "Meltdown Averted!" }) => {
    return (
        <div className="flex flex-col items-center justify-center p-5 bg-gradient-to-br from-green-500 to-blue-500 text-white rounded-lg shadow-lg animate-fadeIn transition-opacity duration-500 ease-in-out m-5">
            <div className="text-4xl mb-4">
                ✅
            </div>
            <div className="text-center text-2xl font-bold">
                {message}
            </div>
        </div>
    );
};

export default MeltdownAvertedDisplay;
