import React, { useEffect, useRef, useState } from 'react';
import { t } from '../i18n';
import SignInSheet from './SignInSheet';
import { signInAvailable, signOut, useAccount } from './accountStore';
import './account.css';

/**
 * The small "Sign in" link at the top of the site, the game's home screen and host setup.
 * Signed in, it becomes the host's initial with My lists and Sign out. It never shows during a
 * round: only those screens render it.
 */
export default function AccountButton({ tone = 'light', className = '' }) {
    const current = useAccount();
    const [sheetOpen, setSheetOpen] = useState(false);
    const [menuOpen, setMenuOpen] = useState(false);
    const menuRef = useRef(null);

    useEffect(() => {
        if (!menuOpen) return undefined;
        const close = (event) => { if (menuRef.current && !menuRef.current.contains(event.target)) setMenuOpen(false); };
        document.addEventListener('pointerdown', close);
        return () => document.removeEventListener('pointerdown', close);
    }, [menuOpen]);

    if (!current.account && !signInAvailable(current)) return null;

    if (!current.account) {
        return (
            <>
                <button type="button" className={`sp-acct__top sp-acct__top--${tone} ${className}`} onClick={() => setSheetOpen(true)}>
                    {t('Sign in')}
                </button>
                <SignInSheet open={sheetOpen} onClose={() => setSheetOpen(false)} />
            </>
        );
    }

    const label = (current.account.name || current.account.email || '?').trim();
    return (
        <div className={`sp-acct__menuwrap ${className}`} ref={menuRef}>
            <button
                type="button"
                className={`sp-acct__avatar sp-acct__avatar--${tone}`}
                aria-haspopup="menu"
                aria-expanded={menuOpen}
                aria-label={t('Account')}
                onClick={() => setMenuOpen((open) => !open)}
            >
                {label.charAt(0).toUpperCase()}
            </button>
            {menuOpen && (
                <div className="sp-acct__menu" role="menu">
                    <p className="sp-acct__menuemail">{current.account.email || label}</p>
                    <a role="menuitem" href="/account/stats" className="sp-acct__menuitem">{t('My stats')}</a>
                    <a role="menuitem" href="/account" className="sp-acct__menuitem">{t('My lists')}</a>
                    <button role="menuitem" type="button" className="sp-acct__menuitem" onClick={() => { setMenuOpen(false); signOut(); }}>
                        {t('Sign out')}
                    </button>
                </div>
            )}
        </div>
    );
}
