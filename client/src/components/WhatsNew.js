import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Sparkles } from '../signal/icons';
import { WHATS_NEW } from '../whatsNew';
import { markWhatsNewSeen, noteWhatsNewShown, pendingWhatsNew } from '../utils/whatsNew';
import { currentInAppBrowser } from '../utils/inAppBrowser';
import { useFeedbackPrompt } from './GameFeedback';
import { t } from '../i18n';

// Waits a moment first, so it never flashes over a screen that is about to move on (a join link, a saved game).
export const WHATS_NEW_DELAY_MS = 900;

/**
 * "Welcome back, here's what's new": once per release, for phones that have been here before.
 * Only placed on quiet screens (the home page, the start screen, the waiting room), and `paused`
 * while another pop-up is up. Leaving the screen closes it, so a round starting takes it away.
 */
export default function WhatsNew({ paused = false, news = WHATS_NEW, delayMs = WHATS_NEW_DELAY_MS }) {
    // In Instagram or Facebook's browser the "Open in Safari" pop-up comes first, and storage there is the app's own.
    const [pending] = useState(() => (currentInAppBrowser() ? null : pendingWhatsNew(news)));
    const [open, setOpen] = useState(false);
    const [done, setDone] = useState(false);
    const { open: feedbackOpen } = useFeedbackPrompt();
    const blocked = paused || Boolean(feedbackOpen);
    const buttonRef = useRef(null);

    useEffect(() => {
        if (!pending || done || open || blocked) return undefined;
        const timer = setTimeout(() => { setOpen(true); noteWhatsNewShown(pending); }, delayMs);
        return () => clearTimeout(timer);
    }, [pending, done, open, blocked, delayMs]);

    const visible = open && !done && !blocked;
    useEffect(() => { if (visible) buttonRef.current?.focus(); }, [visible]);
    useEffect(() => {
        if (!visible) return undefined;
        const onKey = event => { if (event.key === 'Escape') close(); };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    });

    function close() {
        markWhatsNewSeen(pending);
        setDone(true);
    }

    if (!visible) return null;
    return createPortal(
        <div className="sg sg-home__scrim sg-whats-new" role="dialog" aria-modal="true" aria-labelledby="whats-new-title"
            data-testid="whats-new" onClick={event => { if (event.target === event.currentTarget) close(); }}>
            <div className="sg-home__sheet sg-a sg-rise">
                <p className="sg-pill" style={{ background: 'var(--sg-meet)', color: 'var(--sg-ink)' }}>{t('Welcome back')}</p>
                <h2 id="whats-new-title" className="sg-big sg-h2" style={{ margin: '12px 0 4px' }}>{t("Here's what's new")}</h2>
                <ul className="sg-home__learn">
                    {pending.items.map(item => (
                        <li key={item}><Sparkles size={22} /> <span>{t(item)}</span></li>
                    ))}
                </ul>
                <button ref={buttonRef} type="button" className="sg-btn sg-btn-blue" onClick={close}>{t('Got it')}</button>
            </div>
        </div>,
        document.body,
    );
}
