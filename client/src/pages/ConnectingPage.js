import React, { useEffect } from 'react';

function ConnectingPage() {

    useEffect(() => {
        const timer = setTimeout(() => {
            alert("This probably isn't working for 1 of 2 reasons. 1) You are not connected to WiFi. 2) Sam didn't do his job and update the endpoint and/ or start the server. Go tell him he needs to lock in.");
        }, 6000);

        // Cleanup the timer when the component unmounts
        return () => clearTimeout(timer);
    }, []);

    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100">
            <div className="flex flex-col items-center bg-white p-8 rounded shadow-md">
                <img
                    src="https://media.tenor.com/gQV5VzHLWQIAAAAM/among-us-sus.gif"
                    alt="Connecting animation"
                />
                <h2 className="text-2xl font-semibold text-gray-800">Connecting...</h2>
                <p className="text-gray-600 mt-2">Please wait while we establish a connection.</p>
            </div>
        </div>
    );
}

export default ConnectingPage;

