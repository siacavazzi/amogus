import React, { useContext } from 'react';
import { DataContext } from '../GameContext';
import VictoryScreen from '../signal/VictoryScreen';
import { t, tk } from '../i18n';

const NuclearMeltdownScreen = ({ message = tk("Meltdown!") }) => {
    const { players } = useContext(DataContext);
    const intruders = players.filter(p => p.sus);

    return (
        <VictoryScreen
            tone="hazard"
            kicker={t('The reactor blew')}
            title={message}
            line={t('Nobody got the codes in on time. The intruders win.')}
            winners={intruders}
            winnersLabel={intruders.length > 1 ? t('The intruders were') : t('The intruder was')}
            summaryTitle={tk('The body count')}
            showSurvivors={false}
        />
    );
};

export default NuclearMeltdownScreen;
