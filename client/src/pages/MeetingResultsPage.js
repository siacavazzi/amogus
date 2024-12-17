import React, { useEffect, useState, useContext } from "react";
import { DataContext } from "../GameContext";

export default function MeetingResultPage() {
    const { meetingState, players, setMeetingState, setVotes, setVetoVotes } = useContext(DataContext);
    const [fadeIn, setFadeIn] = useState(false);
    const [votedOutPlayer, setVotedOutPlayer] = useState(undefined)
    console.log(meetingState?.voted_out)

    useEffect(() => {
        setVotes(undefined)
        setVetoVotes(0)
        if(!meetingState?.voted_out) {
            return
        }
        for (const player of players) {
            if(player.player_id === meetingState?.voted_out) {
                console.log(player)
                setVotedOutPlayer(player)
                return;
            }
        }
    },[])


    // Trigger fade-in effect on mount
    useEffect(() => {
        setTimeout(() => setFadeIn(true), 300); // Delay slightly for dramatic effect
    }, []);

    const renderContent = () => {
        if (meetingState?.reason === "veto") {
            return (
                <div className="text-3xl text-gray-300 font-semibold mb-4">
                    The vote was <span className="text-red-500">vetoed</span>.
                </div>
            );
        }

        if (!meetingState?.voted_out) {
            return (
                <div className="text-3xl text-gray-300 font-semibold mb-4">
                    <span className="text-red-500">No one</span> was voted out.
                </div>
            );
        }

        return (
            <>
                <div className="text-4xl text-white font-bold mb-6">
                    {meetingState?.voted_out
                        ? `${votedOutPlayer?.username} was voted out!`
                        : "No one was voted out!"}
                </div>
                {votedOutPlayer?.sus !== undefined && (
                    <div
                        className={`text-3xl font-semibold ${votedOutPlayer?.sus ? "text-red-500" : "text-blue-500"
                            }`}
                    >
                        {votedOutPlayer?.sus
                            ? "They were an Impostor!"
                            : "They were not an Impostor."}
                    </div>
                )}
            </>
        );
    };

    return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-gray-900 p-6">
            {/* Fade-in container */}
            <div
                className={`transition-opacity duration-1000 ${fadeIn ? "opacity-100" : "opacity-0"
                    } flex flex-col items-center`}
            >
                {renderContent()}
            </div>

            {/* Acknowledge button */}
            <button
                className="mt-12 bg-green-600 text-white py-3 px-6 rounded-full shadow-lg hover:bg-green-700 transition-colors focus:outline-none focus:ring-2 focus:ring-green-400"
                onClick={() => setMeetingState(undefined)}
            >
                Acknowledge
            </button>
        </div>
    );
}
