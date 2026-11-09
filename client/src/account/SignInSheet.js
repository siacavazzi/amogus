import React, { useEffect, useRef, useState } from 'react';
import { t, tk, getLanguage } from '../i18n';
import { currentInAppBrowser } from '../utils/inAppBrowser';
import { finishSignIn, googleStartUrl, requestEmailCode, useAccount, verifyEmailCode } from './accountStore';
import './account.css';

const CODE_LENGTH = 4;

const REASONS = {
    invalid_email: tk('That email address doesn\'t look right.'),
    wait: tk('A code is on its way. Wait a few seconds before asking for another.'),
    too_many: tk('Too many codes for now. Try again tomorrow.'),
    paused: tk('Too many wrong codes. Try again tomorrow.'),
    send_failed: tk('We couldn\'t send the email. Check the address and try again.'),
    unavailable: tk('Email sign-in isn\'t available right now.'),
    wrong: tk('That code isn\'t right. Check the email and try again.'),
    used_up: tk('That code has had too many tries. Ask for a new one.'),
    no_code: tk('That code has expired. Ask for a new one.'),
};

function reasonText(reason) {
    return t(REASONS[reason] || 'Something went wrong. Try again.');
}

/** Google sign-in is blocked inside Facebook, Instagram and other apps' built-in browsers. */
export function googleWorksHere() {
    const inApp = currentInAppBrowser();
    return !inApp || inApp.app === 'google_app';
}

export function GoogleMark() {
    return (
        <svg width="20" height="20" viewBox="0 0 48 48" aria-hidden="true">
            <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z" />
            <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
            <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z" />
            <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.3-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z" />
        </svg>
    );
}

/**
 * Opens Google in a small window so the page underneath (and the host's room) stays put.
 * Falls back to a full-page visit when the browser blocks the window.
 */
export function startGoogleSignIn(onDone) {
    const returnTo = window.location.pathname + window.location.search;
    const popup = window.open(googleStartUrl({ popup: true, returnTo }), 'sus-google-sign-in', 'width=480,height=640');
    if (!popup) {
        window.location.href = googleStartUrl({ popup: false, returnTo });
        return () => {};
    }
    let finished = false;
    const finish = async (ok, closedByHand = false) => {
        if (finished) return;
        finished = true;
        window.removeEventListener('message', onMessage);
        clearInterval(timer);
        const account = ok ? await finishSignIn() : null;
        if (onDone) onDone(Boolean(account), { cancelled: closedByHand && !account });
    };
    const onMessage = (event) => {
        if (event.origin !== window.location.origin || !event.data || event.data.type !== 'sus-sign-in') return;
        finish(Boolean(event.data.ok));
    };
    // Some phones lose the window's link back to this page; check the cookie when it closes.
    const timer = setInterval(() => { if (popup.closed) finish(true, true); }, 700);
    window.addEventListener('message', onMessage);
    return () => { finished = true; window.removeEventListener('message', onMessage); clearInterval(timer); };
}

/** The sign-in steps: Google (where it works) or an email, then the 4-digit code. */
export function SignInForm({ onSignedIn, startWithEmail = false, compact = false }) {
    const current = useAccount();
    const [step, setStep] = useState('choose');
    const [email, setEmail] = useState('');
    const [code, setCode] = useState('');
    const [error, setError] = useState('');
    const [busy, setBusy] = useState(false);
    const [devCode, setDevCode] = useState('');
    // On the setup screen the card stays small: the email box opens only when asked for.
    const [emailOpen, setEmailOpen] = useState(!compact || startWithEmail);
    const emailRef = useRef(null);
    const codeRef = useRef(null);
    const stopGoogle = useRef(null);
    const showGoogle = current.google && googleWorksHere();
    const showEmail = current.email;

    useEffect(() => () => stopGoogle.current && stopGoogle.current(), []);
    useEffect(() => { if ((startWithEmail || (compact && emailOpen)) && emailRef.current) emailRef.current.focus(); }, [startWithEmail, compact, emailOpen]);
    useEffect(() => { if (step === 'code' && codeRef.current) codeRef.current.focus(); }, [step]);

    const sendCode = async (event) => {
        if (event) event.preventDefault();
        if (busy) return;
        setBusy(true);
        setError('');
        try {
            const reply = await requestEmailCode(email.trim(), getLanguage());
            if (reply.ok) {
                setDevCode(reply.dev_code || '');
                setCode('');
                setStep('code');
            } else {
                setError(reasonText(reply.reason));
            }
        } catch (_) {
            setError(t('No connection. Check your internet and try again.'));
        }
        setBusy(false);
    };

    const checkCode = async (value) => {
        if (busy || value.length !== CODE_LENGTH) return;
        setBusy(true);
        setError('');
        try {
            const reply = await verifyEmailCode(email.trim(), value);
            if (reply.ok) {
                setBusy(false);
                if (onSignedIn) onSignedIn();
                return;
            }
            setError(reasonText(reply.reason));
            setCode('');
        } catch (_) {
            setError(t('No connection. Check your internet and try again.'));
        }
        setBusy(false);
    };

    const google = () => {
        setError('');
        stopGoogle.current = startGoogleSignIn((ok, { cancelled } = {}) => {
            if (ok) {
                if (onSignedIn) onSignedIn();
            } else if (!cancelled) {
                setError(t('Google sign-in didn\'t finish. Try again, or use your email.'));
            }
        });
    };

    if (!current.loaded) return null;
    if (!showGoogle && !showEmail) {
        return <p className="sp-acct__muted">{t('Sign-in isn\'t available right now.')}</p>;
    }

    if (step === 'code') {
        return (
            <div className="sp-acct__form">
                <p className="sp-acct__lede">{t('We emailed a 4-digit code to {email}.', { email: email.trim() })}</p>
                <label className="sp-acct__label" htmlFor="sp-acct-code">{t('Code')}</label>
                <input
                    id="sp-acct-code"
                    ref={codeRef}
                    className="sp-acct__input sp-acct__input--code"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    pattern="[0-9]*"
                    maxLength={CODE_LENGTH}
                    value={code}
                    disabled={busy}
                    onChange={(event) => {
                        const value = event.target.value.replace(/\D/g, '').slice(0, CODE_LENGTH);
                        setCode(value);
                        if (value.length === CODE_LENGTH) checkCode(value);
                    }}
                />
                {devCode && <p className="sp-acct__muted" data-testid="dev-code">{t('Test code: {code}', { code: devCode })}</p>}
                {error && <p className="sp-acct__error" role="alert">{error}</p>}
                <button type="button" className="sp-acct__btn sp-acct__btn--main" disabled={busy || code.length !== CODE_LENGTH} onClick={() => checkCode(code)}>
                    {busy ? t('Signing in…') : t('Sign in')}
                </button>
                <div className="sp-acct__row">
                    <button type="button" className="sp-acct__link" disabled={busy} onClick={() => sendCode()}>{t('Send a new code')}</button>
                    <button type="button" className="sp-acct__link" disabled={busy} onClick={() => { setStep('choose'); setError(''); }}>{t('Use a different email')}</button>
                </div>
            </div>
        );
    }

    return (
        <div className="sp-acct__form">
            {showGoogle && (
                <button type="button" className="sp-acct__btn sp-acct__btn--google" onClick={google}>
                    <GoogleMark /> {t('Continue with Google')}
                </button>
            )}
            {showEmail && !emailOpen && (
                <button type="button" className={`sp-acct__btn ${showGoogle ? 'sp-acct__btn--line' : 'sp-acct__btn--main'}`} onClick={() => setEmailOpen(true)}>
                    {t('Email me a code')}
                </button>
            )}
            {showEmail && emailOpen && (
                <form onSubmit={sendCode} className="sp-acct__form">
                    {showGoogle && !compact && <p className="sp-acct__or">{t('or')}</p>}
                    <label className="sp-acct__label" htmlFor="sp-acct-email">{t('Email')}</label>
                    <input
                        id="sp-acct-email"
                        ref={emailRef}
                        className="sp-acct__input"
                        type="email"
                        inputMode="email"
                        autoComplete="email"
                        autoCapitalize="none"
                        spellCheck="false"
                        placeholder={t('you@example.com')}
                        value={email}
                        onChange={(event) => setEmail(event.target.value)}
                    />
                    <button type="submit" className={`sp-acct__btn ${showGoogle ? 'sp-acct__btn--line' : 'sp-acct__btn--main'}`} disabled={busy || !email.includes('@')}>
                        {busy ? t('Sending…') : t('Email me a code')}
                    </button>
                </form>
            )}
            {current.google && !showGoogle && (
                <p className="sp-acct__muted">{t('To use Google, open susparty.com in Safari or Chrome.')}</p>
            )}
            {error && <p className="sp-acct__error" role="alert">{error}</p>}
            <p className="sp-acct__fine">
                {t('By creating an account, I confirm I\'m 13 or older.')}{' '}
                <a href="/privacy" target="_blank" rel="noopener">{t('Privacy')}</a>
            </p>
        </div>
    );
}

/** A bottom sheet holding the sign-in form. */
export default function SignInSheet({ open, onClose, title, startWithEmail = false }) {
    useEffect(() => {
        if (!open) return undefined;
        const onKey = (event) => { if (event.key === 'Escape') onClose(); };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [open, onClose]);

    if (!open) return null;
    return (
        <div className="sp-acct__scrim" role="presentation" onClick={(event) => { if (event.target === event.currentTarget) onClose(); }}>
            <div className="sp-acct__sheet" role="dialog" aria-modal="true" aria-labelledby="sp-acct-title">
                <div className="sp-acct__head">
                    <h2 id="sp-acct-title" className="sp-acct__title">{title || t('Sign in')}</h2>
                    <button type="button" className="sp-acct__close" onClick={onClose} aria-label={t('Close')}>×</button>
                </div>
                <p className="sp-acct__lede">{t('Keep your task lists and game stats on any phone or laptop. Signing in is optional; nobody needs it to play.')}</p>
                <SignInForm onSignedIn={onClose} startWithEmail={startWithEmail} />
            </div>
        </div>
    );
}
