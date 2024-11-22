// ./pages/PlayersPage.jsx

import React, { useContext, useEffect } from "react";
import { DataContext } from "../GameContext";
import MUECustomSlider from "../components/swiper";
import PlayerCard from "../components/PlayerCard"; // Ensure this path is correct

export default function PlayersPage() {
    const { players, socket, setMessage, setAudio } = useContext(DataContext);

    // useEffect(() => {
    //     if (players && players.length > 0) {
    //         console.log(players[0]?.username);
    //     }
    // }, [players]);

    if (!players || players.length === 0) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-gradient-to-tr from-gray-800 to-gray-900 p-6">
                <div className="text-center text-gray-400">
                    <p className="text-lg">No players available</p>
                </div>
            </div>
        );
    }

    function startGame() {
        if (players.length >= 0) {
            socket.emit('start_game', {});
        } else {
            setMessage({ text: "At least 3 players are needed to start the game.", status: "warning" });
        }
    }

    return (
        <div className="min-h-screen bg-gradient-to-tr from-gray-800 to-gray-900 p-6">
            <div className="max-w-6xl mx-auto">
                <div className="flex flex-col items-center mb-6">
                    <button
                        className="mb-4 bg-indigo-600 text-white py-2 px-6 rounded-full shadow-lg hover:bg-indigo-700 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-400"
                        onClick={() => setAudio('test')}
                    >
                        Test Sound
                    </button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
                    {players.map((player) => (
                        <PlayerCard key={player.id} player={player} />
                    ))}
                </div>
                <div className="mt-8 flex justify-center p-4">
                    <MUECustomSlider text={"Swipe to start game"} onSuccess={startGame} />
                </div>
            </div>
        </div>
    );
}