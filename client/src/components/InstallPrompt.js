import React, { useContext, useEffect, useState } from 'react';
import { DataContext } from '../GameContext';
import { Download, X, ShareIos, MoreHorizontal, MoreVertical } from '../signal/icons';
import { installMethod, promptInstall, installPromptDismissed, dismissInstallPrompt } from '../utils/installPrompt';
import { sendClientMetric } from '../utils/clientMetrics';
import { t, tk } from '../i18n';

const SCROLL_STEP = tk('Scroll down and tap "Add to Home Screen"');
// The browser's own buttons, step by step. {icon} is drawn the way the button looks on the phone.
const STEPS = {
    safari: [[tk('Tap the Share button {icon} at the bottom of Safari'), ShareIos], [SCROLL_STEP]],
    safari_menu: [[tk('Tap {icon} next to the address bar, then "Share"'), MoreHorizontal], [SCROLL_STEP]],
    chrome_ios: [[tk('Tap the Share button {icon} in Chrome\'s address bar'), ShareIos], [SCROLL_STEP]],
    ios_menu: [[tk('Open your browser\'s menu, then tap {icon} "Share"'), ShareIos], [SCROLL_STEP]],
    android_menu: [[tk('Tap the menu button {icon} in your browser'), MoreVertical], [tk('Tap "Add to Home screen" or "Install"')]],
};

function Step({ number, text, Icon }) {
    const [before, after] = t(text).split('{icon}');
    return (
        <li style={{ display: 'flex', gap: 8, alignItems: 'baseline' }}>
            <span className="sg-num" style={{ fontWeight: 900 }}>{number}.</span>
            <span>
                {before}
                {Icon && after !== undefined && (
                    <span style={{ display: 'inline-flex', verticalAlign: 'middle', background: '#fff', borderRadius: 6, padding: '1px 3px', margin: '0 2px' }}>
                        <Icon size={16} strokeWidth={2.2} />
                    </span>
                )}
                {after}
            </span>
        </li>
    );
}

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
            {method === 'native' ? (
                <p className="sg-small" style={{ margin: '4px 0 0', opacity: 0.8 }}>{t('Your next game is one tap away.')}</p>
            ) : (
                <>
                    <ol className="sg-small" style={{ margin: '6px 0 0', padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 4 }}>
                        {(STEPS[method] || []).map(([text, Icon], i) => <Step key={text} number={i + 1} text={text} Icon={Icon} />)}
                    </ol>
                    <p className="sg-small" style={{ margin: '6px 0 0', opacity: 0.7 }}>{t('These are your browser\'s own buttons, not "Save this game".')}</p>
                </>
            )}
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
