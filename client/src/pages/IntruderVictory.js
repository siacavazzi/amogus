import React, { useContext } from 'react';
import { DataContext } from '../GameContext';
import VictoryScreen from '../signal/VictoryScreen';
import { t, tk } from '../i18n';

const IntruderVictoryScreen = ({ message = tk("Intruders Win!") }) => {
    const { players } = useContext(DataContext);
    const intruders = players.filter(p => p.sus);
    const names = intruders.map(p => p.username);
    const line = names.length
        ? t('{names} got away with it.', { names: names.length > 1 ? t('{list} and {last}', { list: names.slice(0, -1).join(', '), last: names[names.length - 1] }) : names[0] })
        : t('The intruders got away with it.');

    return (
        <VictoryScreen
            tone="out"
            title={message}
            line={line}
            winners={intruders}
            summaryTitle={tk('The body count')}
            showSurvivors={false}
        />
    );
};

export default IntruderVictoryScreen;
