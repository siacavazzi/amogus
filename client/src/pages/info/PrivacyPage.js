import React from 'react';
import { usePageMeta } from '../../seo/usePageMeta';
import SeoPageLayout from '../seo/SeoPageLayout';
import './InfoPage.css';

function PrivacyPage() {
    usePageMeta({
        title: 'Privacy | Sus Party',
        description: 'What Sus Party stores, why, and how to delete it. Players never need an account; hosts can sign in to keep their task lists.',
        canonical: 'https://susparty.com/privacy',
    });

    return (
        <SeoPageLayout className="info-shell">
            <main className="info-page">
                <header className="info-header">
                    <p className="info-eyebrow">Privacy</p>
                    <h1 className="info-title">What Sus Party keeps</h1>
                    <p className="info-lead">
                        Players join with a name and a room code. Nobody needs an account to play.
                    </p>
                </header>

                <section className="info-body info-prose">
                    <h2>Playing a game</h2>
                    <p>
                        The name and photo a player picks are used for that room only. Photos are deleted within a
                        day. The server keeps game records (how many players, how long a round took, who won) so we
                        can see what works and fix what doesn't, and its request logs, which include IP addresses, are
                        kept for two weeks. We use no ads and no third-party tracking scripts.
                    </p>

                    <h2>Host accounts</h2>
                    <p>
                        Hosts can sign in, with Google or with a code sent to their email, so their saved task lists
                        follow them to any phone or laptop. Accounts are for people 13 or older. For an account we keep:
                    </p>
                    <ul>
                        <li>your email address,</li>
                        <li>your Google account ID and first name, if you signed in with Google,</li>
                        <li>when you made the account and last used it,</li>
                        <li>which task lists are yours.</li>
                    </ul>
                    <p>
                        That's all. We don't get your contacts, photos or anything else from Google. We only email you
                        the sign-in codes you ask for; we never send marketing email and never share or sell your
                        address. Sign-in codes are sent through our email provider, Resend.
                    </p>
                    <p>
                        Staying signed in uses one cookie, for 90 days after you last visit. It is only used for
                        signing in.
                    </p>

                    <h2>Deleting your account</h2>
                    <p>
                        Go to <a href="/account">My lists</a> and tap Delete my account. Your email, Google ID and
                        sign-in are deleted right away. Task lists you made still open with their code (people you shared
                        them with may be using them), but they are no longer linked to you.
                    </p>

                    <h2>Questions</h2>
                    <p>
                        Email <a href="mailto:support@susparty.com">support@susparty.com</a>.
                    </p>
                </section>
            </main>
        </SeoPageLayout>
    );
}

export default PrivacyPage;
