import React from 'react';

function ConnectingPage() {
    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100">
            <div className="flex flex-col items-center bg-white p-8 rounded shadow-md">
                <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-blue-500 mb-6"></div>
                <h2 className="text-2xl font-semibold text-gray-800">Connecting...</h2>
                <p className="text-gray-600 mt-2">Please wait while we establish a connection.</p>
            </div>
        </div>
    );
}

export default ConnectingPage;
