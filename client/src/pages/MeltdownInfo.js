import React, { useContext } from "react";
import { DataContext } from "../GameContext";

function MeltdownInfo() {
    const { meltdownTimer, meltdownCode } = useContext(DataContext);

    return (
        <div
            className={`flex flex-col items-center justify-center h-screen p-4 bg-gradient-to-b from-gray-900 to-red-900 text-white ${
                meltdownTimer <= 10 ? "animate-pulse" : ""
            }`}
        >
            <div className="w-full max-w-3xl bg-gray-800 p-12 rounded-lg shadow-lg flex flex-col items-center">
                <h1 className="text-6xl font-bold mb-12 text-center text-red-500">
                    Reactor Meltdown
                </h1>
                <div className="w-full max-w-2xl mb-12">
                <p className="text-center text-2xl font-bold">Your shutdown code:</p>
                    <div className="flex justify-center space-x-6 mb-10">
   
                            <div
            
                                className="text-6xl bg-yellow-700"
                            >
                                {meltdownCode}
                            </div>
                    </div>
                    <p
                        className={`text-center text-4xl font-bold ${
                            meltdownTimer <= 10 ? "text-red-500" : ""
                        }`}
                    >
                        Time Remaining: {meltdownTimer}s
                    </p>
                    {meltdownTimer <= 10 && (
                        <p className="text-red-500 text-center text-3xl mt-6 animate-pulse">
                            Warning! Meltdown imminent!
                        </p>
                    )}
                </div>
            </div>
        </div>
    );
}

export default MeltdownInfo;
