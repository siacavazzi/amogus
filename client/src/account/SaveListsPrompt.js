import React, { useState } from 'react';
import { t } from '../i18n';
import { SignInForm } from './SignInSheet';
import { signInAvailable, snooze, snoozed, useAccount } from './accountStore';
import './account.css';

/**
 * The one sign-in nudge, shown only to a signed-out host at three moments on the setup screen
 * (Sam, 2026-11-07):
 *   'created' — they just made or saved a new list (including a task-generator pack)
 *   'code'    — they just loaded a list by typing its code
 *   'saved'   — they just picked a list saved in this browser
 * A card under the list, never a pop-up, so setup is never blocked. "Not now" quiets it on this
 * browser for 30 days, except that a brand-new list brings it back. Players never see it.
 */
export default function SaveListsPrompt({ moment, onDismiss }) {
    const current = useAccount();
    const [dismissed, setDismissed] = useState(false);
    const [done, setDone] = useState(false);

    if (!moment || dismissed || (current.account && !done)) return null;
    if (!signInAvailable(current) && !done) return null;
    if (moment !== 'created' && snoozed() && !done) return null;

    if (done) {
        return (
            <div className="sp-acct__card" role="status" data-testid="save-lists-done">
                <p className="sp-acct__cardtitle">{t('Your lists are saved to your account')}</p>
                <p className="sp-acct__lede">{t('Sign in on any phone or laptop to find them again.')}</p>
            </div>
        );
    }

    const notNow = () => {
        snooze();
        setDismissed(true);
        if (onDismiss) onDismiss();
    };

    return (
        <div className="sp-acct__card" data-testid="save-lists-prompt">
            <p className="sp-acct__cardtitle">{t('Keep your lists for good')}</p>
            <p className="sp-acct__lede">{t('This list is only saved in this browser and can get lost. Sign in to keep your lists on any phone or laptop.')}</p>
            <SignInForm compact onSignedIn={() => setDone(true)} />
            <button type="button" className="sp-acct__link sp-acct__notnow" onClick={notNow}>{t('Not now')}</button>
        </div>
    );
}
