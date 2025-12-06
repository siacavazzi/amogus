import React, { useState, useContext, useEffect } from 'react';
import { ChevronLeft, Camera } from 'lucide-react';
import { DataContext } from '../GameContext';
import CameraCapture from '../components/CameraCapture';

function LoginPage() {
    const [username, setUsername] = useState('');
    const [step, setStep] = useState('username'); // 'username', 'camera', 'joining'
    const { setPlayerState, socket, setTaskEntry, roomCode } = useContext(DataContext);

    useEffect(() => {
        window.scrollTo(0, 0);
      }, []);
    
    const handleUsernameSubmit = (e) => {
        e.preventDefault();
        if (username.trim()) {
            setStep('camera');
        }
    };

    const handleCameraCapture = (imageData) => {
        joinGame(imageData);
    };

    const handleCameraSkip = () => {
        joinGame(null);
    };

    const joinGame = (selfie) => {
        setStep('joining');
        setPlayerState(prevState => ({ ...prevState, username: username }));
        let playerId = localStorage.getItem('player_id');
        const storedRoomCode = roomCode || localStorage.getItem('room_code');
        socket.emit('join', { player_id: playerId, username: username, selfie: selfie, room_code: storedRoomCode });
    };

    const handleEnterTasks = () => {
        setTaskEntry(true)
    };

    return (
        <div className="flex items-center justify-center min-h-screen bg-gradient-to-tr from-gray-800 to-gray-900 p-6 relative">
            {/* Back Button Styled */}
            {/* {step === 'username' && (
                <button
                    type="button"
                    onClick={handleEnterTasks}
                    className="absolute top-6 left-6 flex items-center text-gray-300 hover:text-white transition-colors"
                >
                    <ChevronLeft className="mr-1" />
                    <span className="text-sm">Task Entry</span>
                </button>
            )} */}
            {step === 'camera' && (
                <button
                    type="button"
                    onClick={() => setStep('username')}
                    className="absolute top-6 left-6 flex items-center text-gray-300 hover:text-white transition-colors"
                >
                    <ChevronLeft className="mr-1" />
                    <span className="text-sm">Back</span>
                </button>
            )}

            <div className="relative bg-gray-700 bg-opacity-90 backdrop-blur-md p-8 rounded-lg shadow-lg max-w-sm w-full">
                {/* Step 1: Username Entry */}
                {step === 'username' && (
                    <>
                        <div className="flex flex-col items-center mb-6">
                            <img src="https://i1.sndcdn.com/artworks-Uii8SMJvNPxy8ePA-romBoQ-t1080x1080.jpg" alt="Among Us" className="w-32 h-32 rounded-full mb-4"/>
                            <h2 className="text-2xl font-bold mb-2 text-gray-100">Join the Game</h2>
                            <p className="text-sm text-gray-300">Enter your username to start playing</p>
                        </div>
                        <form onSubmit={handleUsernameSubmit}>
                            <div className="mb-4">
                                <label htmlFor="username" className="block text-gray-300 mb-2">
                                    Username
                                </label>
                                <input
                                    type="text"
                                    id="username"
                                    value={username}
                                    onChange={(e) => setUsername(e.target.value)}
                                    className="w-full px-4 py-2 border border-gray-500 rounded-lg bg-gray-600 text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-400 transition-colors"
                                    placeholder="Enter your username"
                                    required
                                />
                            </div>
                            <button
                                type="submit"
                                className="w-full bg-indigo-600 text-white py-2 px-4 rounded-lg hover:bg-indigo-700 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-400 transform hover:scale-105 flex items-center justify-center gap-2"
                            >
                                <Camera size={20} />
                                Next: Take Selfie
                            </button>
                        </form>
                        <div className="mt-6 text-center text-gray-400 text-sm">
                            <p>sussy amogus time ;)</p>
                        </div>
                    </>
                )}

                {/* Step 2: Camera Capture */}
                {step === 'camera' && (
                    <>
                        <div className="flex flex-col items-center mb-4">
                            <h2 className="text-xl font-bold text-gray-100">Hey {username}!</h2>
                            <p className="text-sm text-gray-300 mt-1">Take a selfie for your profile</p>
                        </div>
                        <CameraCapture 
                            onCapture={handleCameraCapture}
                            onCancel={handleCameraSkip}
                        />
                    </>
                )}

                {/* Step 3: Joining */}
                {step === 'joining' && (
                    <div className="flex flex-col items-center py-8">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-500 mb-4"></div>
                        <h2 className="text-xl font-bold text-gray-100">Joining game...</h2>
                        <p className="text-sm text-gray-400 mt-2">Get ready to be sus!</p>
                    </div>
                )}
            </div>
        </div>
    );
}

export default LoginPage;