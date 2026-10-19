import React, { useContext } from 'react';
import { DataContext } from '../GameContext';
import VictoryScreen from '../signal/VictoryScreen';

const IntruderVictoryScreen = ({ message = "Intruders Win!" }) => {
    const { players } = useContext(DataContext);
    const intruders = players.filter(p => p.sus);
    const names = intruders.map(p => p.username);
    const line = names.length
        ? `${names.length > 1 ? `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}` : names[0]} got away with it.`
        : 'The intruders got away with it.';

    return (
        <VictoryScreen
            tone="out"
            title={message}
            line={line}
            winners={intruders}
            summaryTitle="The body count"
            showSurvivors={false}
        />
    );
};

export default IntruderVictoryScreen;
