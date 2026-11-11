import React, { useState } from 'react';
import '../signal/signal.css';
import { t } from '../i18n';

// Shown in a tab whose seat another tab of the game took (the QR code scanned again, the invite
// tapped twice). Before, this tab kept showing the game and the server refused every tap in it.
export default function OpenElsewhere({ onPlayHere }) {
    const [busy, setBusy] = useState(false);
    const playHere = async () => {
        setBusy(true);
        try {
            await onPlayHere?.();
        } finally {
            setBusy(false);
        }
    };
    return (
        <div className="sg-screen sg-round" role="alert" data-testid="open-elsewhere">
            <div className="sg-center sg-a sg-rise" style={{ gap: 18 }}>
                <h1 className="sg-big sg-h2">{t('Your game is open in another tab')}</h1>
                <p className="sg-lede" style={{ opacity: 0.85 }}>
                    {t('You opened Sus Party again, so your game moved there. Play there, or tap Play here to keep playing in this tab.')}
                </p>
                <button type="button" className="sg-btn sg-btn-white" style={{ width: '100%', maxWidth: 320 }}
                    onClick={playHere} disabled={busy}>
                    {t('Play here')}
                </button>
            </div>
        </div>
    );
}
