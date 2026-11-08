import React, { useEffect, useState } from 'react';
import { usePageMeta } from '../../seo/usePageMeta';
import SeoPageLayout from '../seo/SeoPageLayout';
import { SignInForm } from '../../account/SignInSheet';
import { deleteAccount, fetchAccountLists, signInAvailable, signOut, useAccount } from '../../account/accountStore';
import { t } from '../../i18n';
import '../info/InfoPage.css';
import '../../account/account.css';

// /account: the host's saved lists, sign out, and delete the account.
function AccountPage() {
    usePageMeta({
        title: 'My lists | Sus Party',
        description: 'Your saved Sus Party task lists.',
        canonical: 'https://susparty.com/account',
    });
    useEffect(() => {
        const meta = document.createElement('meta');
        meta.setAttribute('name', 'robots');
        meta.setAttribute('content', 'noindex');
        document.head.appendChild(meta);
        return () => meta.remove();
    }, []);

    const current = useAccount();
    const [lists, setLists] = useState(null);
    const [confirmDelete, setConfirmDelete] = useState(false);
    const [deleted, setDeleted] = useState(false);
    const accountId = current.account?.id;

    useEffect(() => {
        if (!accountId) { setLists(null); return; }
        let live = true;
        fetchAccountLists().then((reply) => { if (live) setLists(reply.ok ? reply.lists : []); }).catch(() => live && setLists([]));
        return () => { live = false; };
    }, [accountId, current.listsVersion]);

    let body;
    if (!current.loaded) {
        body = <p className="info-lead">{t('Loading…')}</p>;
    } else if (deleted) {
        body = (
            <section className="info-body info-prose">
                <h2>{t('Your account is deleted')}</h2>
                <p>{t('Your email and sign-in are gone. Lists you made still open with their code, but they are no longer linked to anyone.')}</p>
                <p><a href="/play">{t('Back to Sus Party')}</a></p>
            </section>
        );
    } else if (!current.account) {
        body = (
            <section className="info-body">
                <div className="sp-acct__card" style={{ maxWidth: 440, border: '1px solid #dde0ea' }}>
                    <p className="sp-acct__cardtitle">{t('Sign in')}</p>
                    <p className="sp-acct__lede">{t('Keep your task lists on any phone or laptop. Only hosts need this; players never sign in.')}</p>
                    {signInAvailable(current) ? <SignInForm /> : <p className="sp-acct__muted">{t('Sign-in isn\'t available right now.')}</p>}
                </div>
            </section>
        );
    } else {
        body = (
            <section className="info-body info-prose">
                <p>{t('Signed in as {email}', { email: current.account.email || current.account.name })}</p>
                <h2>{t('Your task lists')}</h2>
                {lists === null && <p>{t('Loading…')}</p>}
                {lists && lists.length === 0 && <p>{t('No saved lists yet. Lists you make or load while signed in show up here.')}</p>}
                {lists && lists.length > 0 && (
                    <ul data-testid="account-lists">
                        {lists.map((list) => (
                            <li key={list.code}>
                                <b>{list.name}</b> · {t('{tasks} tasks · {code}', { tasks: list.task_count, code: list.code })}
                            </li>
                        ))}
                    </ul>
                )}
                <p><a href="/play">{t('Host a game with your lists')}</a></p>
                <h2>{t('Account')}</h2>
                <div style={{ display: 'grid', gap: 10, maxWidth: 360 }}>
                    <button type="button" className="sp-acct__btn sp-acct__btn--line" onClick={() => signOut()}>{t('Sign out')}</button>
                    {!confirmDelete ? (
                        <button type="button" className="sp-acct__btn sp-acct__btn--danger" onClick={() => setConfirmDelete(true)}>{t('Delete my account')}</button>
                    ) : (
                        <div className="sp-acct__card" style={{ border: '2px solid #c0182c' }}>
                            <p className="sp-acct__lede">{t('This deletes your email and sign-in for good. Your lists will still open with their code, but you won\'t see them here any more.')}</p>
                            <button type="button" className="sp-acct__btn sp-acct__btn--danger" onClick={async () => { if (await deleteAccount()) setDeleted(true); }}>
                                {t('Yes, delete my account')}
                            </button>
                            <button type="button" className="sp-acct__link" onClick={() => setConfirmDelete(false)}>{t('Keep my account')}</button>
                        </div>
                    )}
                </div>
                <p><a href="/privacy">{t('Privacy')}</a></p>
            </section>
        );
    }

    return (
        <SeoPageLayout className="info-shell">
            <main className="info-page">
                <header className="info-header">
                    <p className="info-eyebrow">{t('Account')}</p>
                    <h1 className="info-title">{t('My lists')}</h1>
                </header>
                {body}
            </main>
        </SeoPageLayout>
    );
}

export default AccountPage;
