import React, { useContext, useState } from "react";
import { DataContext } from "../GameContext";
import { FaRadiation } from "react-icons/fa"; // For the nuclear icon

function ReactorNormal() {
    const { socket } = useContext(DataContext);
    const [isSabotaging, setIsSabotaging] = useState(false); // State to track animation

    const handleSabotage = () => {
        setIsSabotaging(true); // Trigger animation
        setTimeout(() => {
            socket.emit("meltdown"); // Emit after 3 seconds
            setIsSabotaging(false); // Reset animation state
        }, 3000); // 3-second delay
    };

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
                    disabled={isSabotaging} // Disable button during animation
                    className={`relative px-16 py-8 text-4xl font-bold text-white rounded-lg focus:outline-none transition-transform duration-300 bg-red-700 transform scale-95 ${
                        isSabotaging ? "opacity-50 cursor-not-allowed" : ""
                    }`}
                >
                    {isSabotaging ? "Sabotaging..." : "Sabotage Reactor"}
                </button>
            </div>
        </div>
    );
}

export default ReactorNormal;
