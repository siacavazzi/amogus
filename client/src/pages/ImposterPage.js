// src/pages/ImposterPage.jsx
import React, { useContext, useEffect } from 'react';
import { DataContext } from '../GameContext';
import MUECustomSlider from '../components/swiper';



const ImposterPage = ({ setShowSusPage }) => {
    const {
        setAudio,
        taskLocations,
        deniedLocation,
        playerState,
        socket,
        activeCards
    } = useContext(DataContext);

    function playCard(id, action) {
        if (action === 'area_denial' && deniedLocation) {
            return
        }
        socket.emit('play_card', { player_id: localStorage.getItem('player_id'), card_id: id })
    }


    // ActionCard Component to display individual game actions
    function ActionCard({ action, text, location, duration, id, time_left, active=false }) {
        if(time_left <= 0 ) {
            return null
        }
        return (
            <div
                className={`${active? "bg-green-300": "bg-gray-300 hover:scale-105 transition-transform transform"} text-gray-800 rounded-lg shadow-md p-6 flex flex-col`}
                onClick={() => playCard(id, action)}
            >
                <h3 className="text-xl font-semibold mb-2 capitalize">
                    {action.replace('_', ' ')}
                </h3>
                <p className="flex-grow">{text}</p>
                {/* Conditionally render Location if it's provided */}
                {location && (
                    <div className="mt-4">
                        <span className="block text-sm text-gray-600">Location: {location}</span>
                    </div>
                )}
                {/* Conditionally render Duration if it's provided */}
                {duration && (
                    <div className="mt-2">
                        {!active && <span className="block text-sm text-gray-600">
                            Duration: {duration} seconds
                        </span>}
                        <span className="block text-sm text-gray-600">
                            time left: {time_left} seconds
                        </span>
                    </div>
                )}
            </div>
        )
    }


    useEffect(() => {
        window.scrollTo(0, 0);
    }, []);


    return (
        <div className="flex flex-col items-center p-8 bg-red-600 text-white min-h-screen">

            <h2 className="text-xl mb-4">Active Cards</h2>
            <div className="w-full max-w-xl bg-gray-700 p-6 rounded-lg shadow-md mt-6">
                {activeCards
                    .filter((card) => !(card.time_left && card.time_left <= 0)) // Filter out expired cards
                    .map((card) => {
                        const { action, text, location, duration, id, time_left } = card;
                        console.log(time_left)

                        // Prepare the action object without 'id' and 'sound'
                        const actionData = {
                            action,
                            text,
                            location,
                            duration: duration !== undefined && duration !== null ? duration : null,
                            time_left: time_left !== undefined && time_left !== null ? time_left : null,
                        };

                        return (
                            <ActionCard
                                key={id}
                                id={id}
                                action={actionData.action}
                                text={actionData.text}
                                location={actionData.location}
                                duration={actionData.duration}
                                time_left={actionData.time_left}
                                active
                            />
                        );
                    })}
            </div>


            {/* Game Actions Cards Section */}
            <div className="w-full max-w-4xl bg-gray-700 p-6 rounded-lg shadow-md mt-6">
                <h2 className="text-xl mb-4">Cards</h2>
                {(!playerState.cards || playerState.cards.length === 0) ? (
                    <p className="text-center text-gray-300">No cards available.</p>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                        {playerState.cards.map((cardJson) => {
                            try {
                                // Parse each card JSON string into an object
                                const card = JSON.parse(cardJson);

                                // Destructure required fields, handling potential typos
                                const { action, text, location, duration, id } = card;

                                // Prepare the action object without 'id' and 'sound'
                                const actionData = {
                                    action,
                                    text,
                                    location,
                                    duration: duration !== undefined && duration !== null ? duration : null,
                                };

                                return (
                                    <ActionCard
                                        key={id}
                                        id={id}
                                        action={actionData.action}
                                        text={actionData.text}
                                        location={actionData.location}
                                        duration={actionData.duration}
                                    />
                                );
                            } catch (error) {
                                console.error('Error parsing game action card:', error);
                                return null; // Skip rendering this card if JSON is invalid
                            }
                        })}
                    </div>
                )}
            </div>

            <MUECustomSlider
                sus
                onSuccess={() => setShowSusPage(false)}
                text="Slide to go back to crew page"
                className="mt-6"
            />
        </div>
    );
};

export default ImposterPage;
