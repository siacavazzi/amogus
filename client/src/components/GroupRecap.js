import React from 'react';
import { t } from '../i18n';

// The group's score so far, kept with the group's link (not with any player), so a group that
// comes back sees where they left off: "Crew wins 5, Intruder wins 4" is a reason for one more.
export default function GroupRecap({ recap, style }) {
    if (!recap || !recap.rounds) return null;
    const cells = [
        ['rounds', t('Rounds'), recap.rounds],
        ['crew', t('Crew wins'), recap.crew_wins || 0],
        ['intruders', t('Intruder wins'), recap.intruder_wins || 0],
    ];
    return (
        <div data-testid="group-recap" style={{ textAlign: 'left', ...style }}>
            <p style={{ margin: '0 0 6px', fontSize: 13, fontWeight: 800, letterSpacing: 0.3, textTransform: 'uppercase', opacity: 0.7 }}>
                {t('Your group so far')}
            </p>
            <dl style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 8, margin: 0 }}>
                {cells.map(([key, label, value]) => (
                    <div key={key} data-testid={`group-recap-${key}`} style={{ borderRadius: 12, padding: '8px 10px', background: 'rgba(127, 127, 127, 0.12)' }}>
                        <dd style={{ margin: 0, fontSize: 22, fontWeight: 900, lineHeight: 1.1 }}>{value}</dd>
                        <dt style={{ margin: 0, fontSize: 13, fontWeight: 700, opacity: 0.75 }}>{label}</dt>
                    </div>
                ))}
            </dl>
        </div>
    );
}
