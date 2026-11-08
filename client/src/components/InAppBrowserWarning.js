import React, { useContext, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { X } from '../signal/icons';
import { DataContext } from '../GameContext';
import { sendClientMetric } from '../utils/clientMetrics';
import { buildRoomInviteUrl } from '../utils/inviteLinks';
import {
    IN_APP_NAMES, currentInAppBrowser, openInBrowserUrl, rememberDismissed, wasDismissed,
} from '../utils/inAppBrowser';
import { t } from '../i18n';

const COPY = {
    ios: {
        title: () => t('Open this in Safari'),
        open: () => t('Open in Safari'),
        copied: () => t('Link copied. Paste it into Safari.'),
        hint: () => t('Or tap ⋯ or the share button, then Open in Safari.'),
    },
    android: {
        title: () => t('Open this in Chrome'),
        open: () => t('Open in Chrome'),
        copied: () => t('Link copied. Paste it into Chrome.'),
        hint: () => t('Or tap ⋮, then Open in Chrome.'),
    },
    other: {
        title: () => t('Open this in your browser'),
        open: () => null,
        copied: () => t('Link copied. Paste it into your browser.'),
        hint: () => null,
    },
};

// Reported once per page load, so the stats show how many phones arrive in an app's browser.
let reported = false;
export function resetInAppReportForTests() { reported = false; }

/** "Open this in Safari": in-app browsers (Facebook, Reddit, X...) can drop the game. The player can still carry on. */
export default function InAppBrowserWarning() {
    const { socket, connected, roomCode } = useContext(DataContext);
    const detected = useMemo(() => currentInAppBrowser(), []);
    const [open, setOpen] = useState(() => Boolean(detected) && !wasDismissed());
    const [copyState, setCopyState] = useState(null); // null | 'copied' | 'failed'
    const dialogRef = useRef(null);
    const shownAtLoad = useRef(open);

    const metric = action => sendClientMetric(socket, {
        kind: 'in_app_browser', app: detected?.app, os: detected?.os, action,
    });

    useEffect(() => {
        if (!detected || reported || !connected || !socket) return;
        reported = true;
        metric(shownAtLoad.current ? 'shown' : 'already_dismissed');
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [detected, connected, socket]);

    useEffect(() => {
        const dialog = dialogRef.current;
        if (open && dialog && !dialog.open && typeof dialog.showModal === 'function') dialog.showModal();
        return () => { if (dialog?.open) dialog.close(); };
    }, [open]);

    if (!detected || !open) return null;

    const copy = COPY[detected.os] || COPY.other;
    const link = (roomCode && buildRoomInviteUrl(roomCode)) || window.location.href;
    const openUrl = openInBrowserUrl(link, detected.os);
    const appName = IN_APP_NAMES[detected.app];

    const close = () => {
        rememberDismissed();
        metric('keep_playing');
        setOpen(false);
    };

    const copyLink = async () => {
        metric('copy_link');
        try {
            await navigator.clipboard.writeText(link);
            setCopyState('copied');
        } catch (_) {
            setCopyState('failed');
        }
    };

    return createPortal(
        <dialog ref={dialogRef} aria-labelledby="in-app-title" aria-describedby="in-app-lede" className="sg sg-feedback"
            data-testid="in-app-browser-warning"
            onCancel={(event) => { event.preventDefault(); close(); }}>
            <button type="button" aria-label={t('Dismiss')} onClick={close} className="sg-feedback__close">
                <X size={22} />
            </button>
            <h2 id="in-app-title" className="sg-feedback__title">{copy.title()}</h2>
            <p id="in-app-lede" className="sg-feedback__lede">
                {appName ? t('You\'re in {app}\'s built-in browser.', { app: appName }) : t('You\'re in an app\'s built-in browser.')}
                {' '}{t('It can drop your game when your phone locks or you switch apps.')}
            </p>
            <div className="flex flex-col" style={{ gap: 10 }}>
                {openUrl && (
                    <a href={openUrl} onClick={() => metric('open_browser')} className="sg-btn sg-btn-blue"
                        style={{ textDecoration: 'none' }}>
                        {copy.open()}
                    </a>
                )}
                <button type="button" onClick={copyLink} className={`sg-btn ${openUrl ? 'sg-btn-soft' : 'sg-btn-blue'}`}>
                    {t('Copy link')}
                </button>
                {copyState === 'copied' && <p role="status" className="sg-feedback__note" style={{ opacity: 0.85 }}>{copy.copied()}</p>}
                {copyState === 'failed' && (
                    <p role="status" className="sg-feedback__note" style={{ opacity: 0.85, userSelect: 'all', wordBreak: 'break-all' }}>
                        {t('Copy this link:')} {link}
                    </p>
                )}
                {copy.hint() && <p className="sg-feedback__note">{copy.hint()}</p>}
                <button type="button" onClick={close} className="sg-btn sg-btn-flat" style={{ minHeight: 44, fontSize: 15 }}>
                    {t('Keep playing here')}
                </button>
            </div>
        </dialog>, document.body
    );
}
