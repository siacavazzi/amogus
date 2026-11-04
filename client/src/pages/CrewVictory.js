import React, { useContext } from 'react';
import { DataContext } from '../GameContext';
import VictoryScreen from '../signal/VictoryScreen';
import { t, tk } from '../i18n';

const CrewVictoryScreen = ({ message = tk("Crewmates Win!") }) => {
    const { players } = useContext(DataContext);
    const exposedIntruders = players.filter(p => p.sus);

    return (
        <VictoryScreen
            tone="round"
            kicker={t('Mission complete')}
            title={message}
            line={t('Every intruder was caught.')}
            winners={exposedIntruders}
            winnersLabel={exposedIntruders.length > 1 ? t('The intruders were') : t('The intruder was')}
            summaryTitle={tk('Lost along the way')}
            showSurvivors
        />
    );
};

export default CrewVictoryScreen;
