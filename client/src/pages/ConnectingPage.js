import React, { useEffect } from 'react';
import { FaSpinner } from 'react-icons/fa';

function ConnectingPage() {

  useEffect(() => {
    const timer = setTimeout(() => {
      alert(
        "Connection issue! Possible causes:\n1) No WiFi.\n2) Sam needs to start the server."
      );
    }, 6000);

    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-800 p-4">
      <div className="flex flex-col items-center bg-gray-800/80 backdrop-blur-sm p-8 rounded-xl shadow-2xl">
        <img
          src="https://media.tenor.com/gQV5VzHLWQIAAAAM/among-us-sus.gif"
          alt="Connecting animation"
          className="w-48 h-48 mb-4 rounded-lg"
        />
        <h2 className="text-3xl font-bold text-white mb-2">Connecting...</h2>
        <p className="text-gray-300 mb-6 text-center">
          We're establishing a connection to the sussy network.
        </p>
        <FaSpinner className="text-white animate-spin text-3xl" />
      </div>
    </div>
  );
}

export default ConnectingPage;
