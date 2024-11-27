import React, { useState } from "react";
import { FaRadiation } from "react-icons/fa"; // For the nuclear icon

function ReactorNormal() {
  const [isSabotaged, setIsSabotaged] = useState(false);

  const handleSabotage = () => {
    setIsSabotaged(true);
    // You can trigger additional sabotage logic here
    setTimeout(() => {
      alert("Reactor is now in overload mode!");
      setIsSabotaged(false);
    }, 3000);
  };

  return (
    <div className="flex flex-col items-center justify-center h-screen bg-gradient-to-b from-gray-800 to-gray-900 text-white p-4">
      {/* Nuclear Icon */}
      <div className="flex items-center justify-center mb-8">
        <FaRadiation className="text-yellow-500 text-9xl animate-pulse" />
      </div>
      <div className="w-full max-w-lg bg-gray-800 p-12 rounded-lg shadow-lg flex flex-col items-center">
        <h1 className="text-5xl font-bold mb-12 text-center text-blue-400">
          Reactor Control
        </h1>
        <button
          onClick={handleSabotage}
          disabled={isSabotaged}
          className={`relative px-16 py-8 text-4xl font-bold text-white rounded-lg focus:outline-none transition-transform duration-300 ${
            isSabotaged
              ? "bg-red-700 cursor-not-allowed transform scale-95"
              : "bg-blue-500 hover:bg-blue-600 transform hover:scale-105"
          }`}
        >
          Sabotage Reactor
        </button>
        {isSabotaged && (
          <p className="text-red-500 text-xl font-bold mt-6">
            Reactor Overload Initiated!
          </p>
        )}
      </div>
    </div>
  );
}

export default ReactorNormal;
