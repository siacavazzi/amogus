import React, { useContext } from 'react';
import { DataContext } from '../GameContext';
import VictoryScreen from '../signal/VictoryScreen';

const NuclearMeltdownScreen = ({ message = "Meltdown!" }) => {
    const { players } = useContext(DataContext);
    const intruders = players.filter(p => p.sus);

    return (
        <VictoryScreen
            tone="hazard"
            kicker="The reactor blew"
            title={message}
            line="Nobody got the codes in on time. The intruders win."
            winners={intruders}
            winnersLabel={intruders.length > 1 ? 'The intruders were' : 'The intruder was'}
            summaryTitle="The body count"
            showSurvivors={false}
        />
    );
};

export default NuclearMeltdownScreen;
