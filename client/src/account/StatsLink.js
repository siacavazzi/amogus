import React from 'react';
import { t } from '../i18n';
import { useAccount } from './accountStore';

/**
 * On the end screen, for a phone that's signed in: this game went into My stats. Opens in a new
 * tab so the room stays connected. Signed-out phones see nothing (no sign-in nudge in a game).
 */
export default function StatsLink() {
    const current = useAccount();
    if (!current.account) return null;
    return (
        <a
            href="/account/stats"
            target="_blank"
            rel="noopener"
            data-testid="end-stats-link"
            style={{ display: 'block', textAlign: 'center', fontWeight: 800, fontSize: 15, color: 'inherit', opacity: 0.9, textUnderlineOffset: 3 }}
        >
            {t('This game is in My stats →')}
        </a>
    );
}
