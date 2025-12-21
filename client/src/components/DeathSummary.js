import React, { useContext } from 'react';
import { DataContext } from '../GameContext';
import { Skull, Heart } from 'lucide-react';
import { PlayerCardCompact, PlayerBadge } from './PlayerCard';

const DeathSummary = ({ title = "Fallen Players", showSurvivors = false, theme = "default" }) => {
    const { players } = useContext(DataContext);

    const deadPlayers = players.filter(p => !p.alive && p.death_message);
    const survivors = players.filter(p => p.alive);

    if (deadPlayers.length === 0 && (!showSurvivors || survivors.length === 0)) {
        return null;
    }

    return (
        <div className="w-full max-w-md mx-auto">
            {/* Dead Players */}
            {deadPlayers.length > 0 && (
                <div className="mb-6">
                    <div className="flex items-center justify-center gap-2 mb-4">
                        <Skull size={18} className="text-gray-500" />
                        <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">
                            {title}
                        </h3>
                    </div>
                    <div className="space-y-2">
                        {deadPlayers.map((player) => (
                            <PlayerCardCompact 
                                key={player.player_id}
                                player={player}
                                showDeathInfo={true}
                                variant="dead"
                            />
                        ))}
                    </div>
                </div>
            )}

            {/* Survivors */}
            {showSurvivors && survivors.length > 0 && (
                <div>
                    <div className="flex items-center justify-center gap-2 mb-4">
                        <Heart size={18} className="text-green-500" />
                        <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">
                            Survivors
                        </h3>
                    </div>
                    <div className="flex flex-wrap justify-center gap-2">
                        {survivors.map((player) => (
                            <PlayerBadge 
                                key={player.player_id}
                                player={player}
                                variant="survivor"
                            />
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

export default DeathSummary;
