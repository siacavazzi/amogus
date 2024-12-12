import React, { useContext, useState, useEffect } from "react";
import { DataContext } from "../GameContext";
import { FaRadiation } from "react-icons/fa";

function ReactorNormal() {
    const { socket,
        meeting,
        hackTime,
        endState,
     } = useContext(DataContext);
    const [isSabotaging, setIsSabotaging] = useState(false);

    useEffect(() => {
        console.log("Context values:", { meeting, hackTime, endState });
    }, [meeting, hackTime, endState]);
    

    const handleSabotage = () => {
        setIsSabotaging(true);
        setTimeout(() => {
            socket.emit("meltdown");
            setIsSabotaging(false);
        }, 3000);
    };

    console.log(meeting)

    function isDisabled() {
        // TODO FIX THIS WHEN THERE IS A HACK IT BREAKS AND THE BUTTON CANT BE CLICKED
        console.log(isSabotaging || meeting || hackTime > 0 || endState)
        return (isSabotaging || meeting || hackTime > 0 || endState)
    }

    return (
        <div className="flex flex-col items-center justify-center h-screen bg-gradient-to-b from-gray-800 to-gray-900 text-white p-4">
            <div className="flex items-center justify-center mb-8">
                <FaRadiation className={`text-yellow-500 text-9xl ${isSabotaging ? "animate-spin" : "animate-pulse"}`} />
            </div>
            <div className="w-full max-w-lg bg-gray-800 p-12 rounded-lg shadow-lg flex flex-col items-center">
                <h1 className="text-5xl font-bold mb-12 text-center text-blue-400">
                    Reactor Control
                </h1>
                <button
                    onClick={handleSabotage}
                    disabled={isDisabled()}
                    className={`relative px-16 py-8 text-4xl font-bold text-white rounded-lg focus:outline-none transition-transform duration-300 bg-red-700 transform scale-95 ${
                        isDisabled() ? "opacity-50 cursor-not-allowed" : ""
                    }`}
                >
                    {isSabotaging ? "Sabotaging..." : "Sabotage Reactor"}
                </button>
            </div>
        </div>
    );
}

export default ReactorNormal;
