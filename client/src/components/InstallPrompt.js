import React, { useContext, useEffect, useState } from 'react';
import { DataContext } from '../GameContext';
import { Download, X } from '../signal/icons';
import { installMethod, promptInstall, installPromptDismissed, dismissInstallPrompt } from '../utils/installPrompt';
import { sendClientMetric } from '../utils/clientMetrics';
import { t } from '../i18n';

// Hosts only, once per phone: the people who set a game up are the ones worth bringing back.
function InstallPrompt() {
    const { socket, isRoomCreator } = useContext(DataContext);
    const [method] = useState(() => (installPromptDismissed() ? null : installMethod()));
    const [hidden, setHidden] = useState(false);
    const show = isRoomCreator && method && !hidden;

    useEffect(() => {
        if (show) sendClientMetric(socket, { kind: 'end_screen_action', action: 'install_shown' });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [show]);

    if (!show) return null;

    const close = (value) => {
        dismissInstallPrompt(value);
        setHidden(true);
    };

    const handleInstall = async () => {
        const added = await promptInstall();
        sendClientMetric(socket, { kind: 'end_screen_action', action: added ? 'install_added' : 'install_dismissed' });
        close(added ? 'added' : 'dismissed');
    };

    const handleDismiss = () => {
        sendClientMetric(socket, { kind: 'end_screen_action', action: 'install_dismissed' });
        close('dismissed');
    };

    return (
        <div style={{ position: 'relative', background: 'var(--sg-meet)', borderRadius: 16, padding: '14px 44px 14px 14px', color: 'var(--sg-ink)' }}>
            <button type="button" onClick={handleDismiss} aria-label={t('Close')}
                style={{ position: 'absolute', top: 8, right: 8, background: 'transparent', border: 0, padding: 6, color: 'var(--sg-ink)' }}>
                <X size={18} />
            </button>
            <p style={{ fontWeight: 900, fontSize: 17, margin: 0 }}>{t('Keep Sus Party on your home screen')}</p>
            <p className="sg-small" style={{ margin: '4px 0 0', opacity: 0.8 }}>
                {method === 'ios'
                    ? t('Tap the Share button, then "Add to Home Screen", so your next game is one tap away.')
                    : t('Your next game is one tap away.')}
            </p>
            {method === 'native' && (
                <button type="button" className="sg-btn" onClick={handleInstall}
                    style={{ marginTop: 10, background: 'var(--sg-ink)', color: '#fff', minHeight: 44, padding: 8, fontWeight: 800, fontSize: 15 }}>
                    <Download size={18} /> {t('Add to Home Screen')}
                </button>
            )}
        </div>
    );
}

export default InstallPrompt;
