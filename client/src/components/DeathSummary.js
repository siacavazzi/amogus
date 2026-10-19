import React, { useContext } from 'react';
import { DataContext } from '../GameContext';
import { PlayerCardCompact, PlayerBadge } from './PlayerCard';

const DeathSummary = ({ title = "Fallen Players", showSurvivors = false, theme = "default" }) => {
    const { players } = useContext(DataContext);

    const deadPlayers = players.filter(p => !p.alive && p.death_message);
    const survivors = players.filter(p => p.alive);

    if (deadPlayers.length === 0 && (!showSurvivors || survivors.length === 0)) {
        return null;
    }

    return (
        <div className="sg w-full max-w-md mx-auto text-left">
            {/* Dead Players */}
            {deadPlayers.length > 0 && (
                <div className="mb-6">
                    <h3 className="sg-big" style={{ fontSize: 26, marginBottom: 12 }}>{title}</h3>
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
                    <h3 className="sg-big" style={{ fontSize: 26, marginBottom: 12 }}>Survivors</h3>
                    <div className="flex flex-wrap gap-2">
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
