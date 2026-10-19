import React, { useContext } from 'react';
import { DataContext } from '../GameContext';
import VictoryScreen from '../signal/VictoryScreen';

const CrewVictoryScreen = ({ message = "Crewmates Win!" }) => {
    const { players } = useContext(DataContext);
    const exposedIntruders = players.filter(p => p.sus);

    return (
        <VictoryScreen
            tone="round"
            kicker="Mission complete"
            title={message}
            line="Every intruder was caught."
            winners={exposedIntruders}
            winnersLabel={exposedIntruders.length > 1 ? 'The intruders were' : 'The intruder was'}
            summaryTitle="Lost along the way"
            showSurvivors
        />
    );
};

export default CrewVictoryScreen;
