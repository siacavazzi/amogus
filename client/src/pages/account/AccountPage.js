import React, { useEffect, useState } from 'react';
import { usePageMeta } from '../../seo/usePageMeta';
import SeoPageLayout from '../seo/SeoPageLayout';
import { SignInForm } from '../../account/SignInSheet';
import { deleteAccount, fetchAccountLists, removeAccountList, signInAvailable, signOut, starAccountList, useAccount } from '../../account/accountStore';
import { Star, StarFilled, Trash2 } from '../../signal/icons';
import { t } from '../../i18n';
import '../info/InfoPage.css';
import '../../account/account.css';

// Starred lists first, then the newest (the server sends them in this order too).
export function sortLists(lists) {
    return [...lists].sort((a, b) => (Boolean(b.starred) - Boolean(a.starred)) || ((b.updated_at || 0) - (a.updated_at || 0)));
}

// One saved list: star it, or delete it after a second tap (lots of players are kids).
function ListRow({ list, onStar, onDelete }) {
    const [confirming, setConfirming] = useState(false);
    const [busy, setBusy] = useState(false);
    return (
        <li className="sp-acct__listrow" data-testid={`account-list-${list.code}`}>
            <div className="sp-acct__listmain">
                <button
                    type="button"
                    className={`sp-acct__icon${list.starred ? ' sp-acct__icon--on' : ''}`}
                    aria-pressed={Boolean(list.starred)}
                    aria-label={list.starred ? t('Unstar {name}', { name: list.name }) : t('Star {name}', { name: list.name })}
                    title={list.starred ? t('Starred') : t('Star')}
                    onClick={() => onStar(list)}
                >
                    {list.starred ? <StarFilled size={22} /> : <Star size={22} />}
                </button>
                <div className="sp-acct__listtext">
                    <b>{list.name}</b>
                    <span>{t('{tasks} tasks · {code}', { tasks: list.task_count, code: list.code })}</span>
                </div>
                <button
                    type="button"
                    className="sp-acct__icon"
                    aria-label={t('Delete {name}', { name: list.name })}
                    title={t('Delete')}
                    onClick={() => setConfirming(true)}
                    hidden={confirming}
                >
                    <Trash2 size={20} />
                </button>
            </div>
            {confirming && (
                <div className="sp-acct__confirm" role="group" aria-label={t('Delete {name}', { name: list.name })}>
                    <p>{t('Delete this list? It leaves your lists, but anyone with the code can still play it.')}</p>
                    <div className="sp-acct__confirmrow">
                        <button
                            type="button"
                            className="sp-acct__btn sp-acct__btn--danger"
                            disabled={busy}
                            onClick={async () => {
                                setBusy(true);
                                if (!(await onDelete(list))) { setBusy(false); setConfirming(false); }
                            }}
                        >
                            {t('Yes, delete')}
                        </button>
                        <button type="button" className="sp-acct__btn sp-acct__btn--line" onClick={() => setConfirming(false)}>{t('Keep it')}</button>
                    </div>
                </div>
            )}
        </li>
    );
}

// /account: the host's saved lists, sign out, and delete the account.
function AccountPage() {
    usePageMeta({
        title: 'My account | Sus Party',
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
        fetchAccountLists().then((reply) => { if (live) setLists(reply.ok ? sortLists(reply.lists) : []); }).catch(() => live && setLists([]));
        return () => { live = false; };
    }, [accountId, current.listsVersion]);

    const toggleStar = async (list) => {
        const starred = !list.starred;
        const mark = (value) => setLists((prev) => prev && sortLists(prev.map((item) => (item.code === list.code ? { ...item, starred: value } : item))));
        mark(starred);
        let ok = false;
        try { ok = (await starAccountList(list.code, starred)).ok; } catch (_) { /* put it back below */ }
        if (!ok) mark(!starred);
    };

    const removeList = async (list) => {
        let ok = false;
        try { ok = (await removeAccountList(list.code)).ok; } catch (_) { /* row stays */ }
        if (ok) setLists((prev) => prev && prev.filter((item) => item.code !== list.code));
        return ok;
    };

    let body;
    if (!current.loaded) {
        body = <p className="info-lead">{t('Loading…')}</p>;
    } else if (deleted) {
        body = (
            <section className="info-body info-prose">
                <h2>{t('Your account is deleted')}</h2>
                <p>{t('Your email, sign-in and game stats are gone. Lists you made still open with their code, but they are no longer linked to anyone.')}</p>
                <p><a href="/play">{t('Back to Sus Party')}</a></p>
            </section>
        );
    } else if (!current.account) {
        body = (
            <section className="info-body">
                <div className="sp-acct__card" style={{ maxWidth: 440, border: '1px solid #dde0ea' }}>
                    <p className="sp-acct__cardtitle">{t('Sign in')}</p>
                    <p className="sp-acct__lede">{t('Keep your task lists and game stats on any phone or laptop. Signing in is optional; nobody needs it to play.')}</p>
                    {signInAvailable(current) ? <SignInForm /> : <p className="sp-acct__muted">{t('Sign-in isn\'t available right now.')}</p>}
                </div>
            </section>
        );
    } else {
        body = (
            <section className="info-body info-prose">
                <p>{t('Signed in as {email}', { email: current.account.email || current.account.name })}</p>
                <p><a href="/account/stats" data-testid="account-stats-link">{t('See my game stats')}</a></p>
                <h2>{t('Your task lists')}</h2>
                {lists === null && <p>{t('Loading…')}</p>}
                {lists && lists.length === 0 && <p>{t('No saved lists yet. Lists you make or load while signed in show up here.')}</p>}
                {lists && lists.length > 0 && (
                    <>
                        <p className="sp-acct__muted">{t('Star the lists you use most to keep them at the top.')}</p>
                        <ul className="sp-acct__lists" data-testid="account-lists">
                            {lists.map((list) => (
                                <ListRow key={list.code} list={list} onStar={toggleStar} onDelete={removeList} />
                            ))}
                        </ul>
                    </>
                )}
                <p><a href="/play">{t('Host a game with your lists')}</a></p>
                <h2>{t('Account')}</h2>
                <div style={{ display: 'grid', gap: 10, maxWidth: 360 }}>
                    <button type="button" className="sp-acct__btn sp-acct__btn--line" onClick={() => signOut()}>{t('Sign out')}</button>
                    {!confirmDelete ? (
                        <button type="button" className="sp-acct__btn sp-acct__btn--danger" onClick={() => setConfirmDelete(true)}>{t('Delete my account')}</button>
                    ) : (
                        <div className="sp-acct__card" style={{ border: '2px solid #c0182c' }}>
                            <p className="sp-acct__lede">{t('This deletes your email, sign-in and game stats for good. Your lists will still open with their code, but you won\'t see them here any more.')}</p>
                            <button type="button" className="sp-acct__btn sp-acct__btn--danger" onClick={async () => { if (await deleteAccount()) setDeleted(true); }}>
                                {t('Yes, delete my account')}
                            </button>
                            <button type="button" className="sp-acct__link" onClick={() => setConfirmDelete(false)}>{t('Keep my account')}</button>
                        </div>
                    )}
                </div>
                <h2>{t('About your stats')}</h2>
                <p>{t('Only you can see them. We count games you play while signed in on that phone: your role, if your side won, and what you did. Nothing about the other players, and nothing for anyone who isn\'t signed in.')}</p>
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
