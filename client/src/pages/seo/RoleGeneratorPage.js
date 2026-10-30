import React, { useState } from 'react';
import { usePageMeta } from '../../seo/usePageMeta';
import SeoPageLayout from './SeoPageLayout';
import GameSetupCta from './GameSetupCta';
import { MAX_PLAYERS, dealRoles, parseNames, suggestedIntruders } from './roleDeal';
import './RoleGenerator.css';

const CANONICAL = 'https://susparty.com/among-us-role-generator';
const DESCRIPTION = 'Free Among Us role generator for real-life games. Enter your players, pick how many intruders, then pass one phone around so each person sees their secret role.';
const FAQ = [
    ['Is the role picker random?', 'Yes. It shuffles the roles with your browser’s secure random number source each time you deal. Nobody can choose who becomes an intruder.'],
    ['Does it save the names or roles?', 'No. Names and roles stay in this browser tab. Close the tab or deal again and the old roles are gone.'],
    ['How many intruders should we use?', 'One intruder suits 3 to 9 players, two suit 10 to 14, and three suit 15 or more. The picker suggests a number when you change the group size.'],
    ['Can each player see their role on their own phone?', 'Not with this picker, which uses one shared phone. Sus Party gives every player a private role on their own phone, plus tasks, meetings, and votes.'],
];
const SCHEMA = {
    '@context': 'https://schema.org',
    '@graph': [
        {
            '@type': 'WebApplication', name: 'Among Us role generator', url: CANONICAL,
            applicationCategory: 'GameApplication', operatingSystem: 'Any web browser',
            offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' }, description: DESCRIPTION,
        },
        {
            '@type': 'FAQPage',
            mainEntity: FAQ.map(([question, answer]) => ({
                '@type': 'Question', name: question, acceptedAnswer: { '@type': 'Answer', text: answer },
            })),
        },
    ],
};
const ROLE_TEXT = {
    Crew: 'Finish your tasks and find the intruders. Vote out anyone who seems suspicious.',
    Intruder: 'Blend in. Pretend to do tasks, eliminate crew in secret, and avoid the vote.',
    Sheriff: 'You are crew. Once per game you may accuse someone outside a meeting. If they are an intruder, they are out. If not, you are out.',
    Jester: 'You win if the group votes you out. Act just suspicious enough.',
};
const EXTRA_ROLES = ['Sheriff', 'Jester'];

function RoleGenerator() {
    const [names, setNames] = useState('');
    const [count, setCount] = useState(8);
    const [intruders, setIntruders] = useState(suggestedIntruders(8));
    const [extras, setExtras] = useState([]);
    const [deal, setDeal] = useState(null);
    const [turn, setTurn] = useState(0);
    const [showing, setShowing] = useState(false);
    const [showAll, setShowAll] = useState(false);

    const players = parseNames(names, count);
    const playerCount = players.length;
    const maxIntruders = Math.max(1, Math.floor((playerCount - 1) / 2));

    const changeCount = value => {
        const next = Math.max(3, Math.min(MAX_PLAYERS, Number(value) || 3));
        setCount(next);
        setIntruders(suggestedIntruders(next));
    };
    const toggleExtra = role => setExtras(current => (
        current.includes(role) ? current.filter(item => item !== role) : [...current, role]
    ));
    const start = () => {
        setDeal(dealRoles(players, Math.min(intruders, maxIntruders), extras));
        setTurn(0);
        setShowing(false);
        setShowAll(false);
    };
    const next = () => {
        setShowing(false);
        setTurn(current => current + 1);
    };

    if (deal && turn < deal.length) {
        const player = deal[turn];
        return (
            <div className="role-gen role-gen--deal" aria-live="polite">
                <p className="role-gen__step">Player {turn + 1} of {deal.length}</p>
                {showing ? (
                    <>
                        <p className="role-gen__name">{player.name}, you are</p>
                        <p className={`role-gen__role role-gen__role--${player.role.toLowerCase()}`}>{player.role}</p>
                        <p className="role-gen__hint">{ROLE_TEXT[player.role]}</p>
                        <button type="button" className="seo-btn--primary" onClick={next}>Hide and pass the phone</button>
                    </>
                ) : (
                    <>
                        <p className="role-gen__name">Pass the phone to {player.name}</p>
                        <p className="role-gen__hint">Make sure nobody else can see the screen.</p>
                        <button type="button" className="seo-btn--primary" onClick={() => setShowing(true)}>I’m {player.name}. Show my role</button>
                    </>
                )}
            </div>
        );
    }

    if (deal) {
        return (
            <div className="role-gen role-gen--deal">
                <p className="role-gen__name">Everyone has a role. Start the game.</p>
                <div className="role-gen__buttons">
                    <button type="button" className="seo-btn--primary" onClick={start}>Deal new roles</button>
                    <button type="button" className="role-gen__plain" onClick={() => setDeal(null)}>Change players</button>
                    <button type="button" className="role-gen__plain" onClick={() => setShowAll(value => !value)}>
                        {showAll ? 'Hide all roles' : 'Show all roles (after the game)'}
                    </button>
                </div>
                {showAll && (
                    <ul className="role-gen__all">
                        {deal.map(entry => <li key={entry.name}><span>{entry.name}</span> {entry.role}</li>)}
                    </ul>
                )}
            </div>
        );
    }

    return (
        <form className="role-gen" onSubmit={event => { event.preventDefault(); start(); }}>
            <div className="role-gen__field">
                <label htmlFor="role-gen-names">Player names (optional, one per line)</label>
                <textarea id="role-gen-names" rows={5} value={names} onChange={event => setNames(event.target.value)}
                    placeholder={'Ana\nBen\nChloe'} />
            </div>
            {!names.trim() && (
                <div className="role-gen__field">
                    <label htmlFor="role-gen-count">Number of players</label>
                    <input id="role-gen-count" type="number" min={3} max={MAX_PLAYERS} value={count}
                        onChange={event => changeCount(event.target.value)} />
                </div>
            )}
            <div className="role-gen__field">
                <label htmlFor="role-gen-intruders">Intruders</label>
                <input id="role-gen-intruders" type="number" min={1} max={maxIntruders} value={Math.min(intruders, maxIntruders)}
                    onChange={event => setIntruders(Math.max(1, Math.min(maxIntruders, Number(event.target.value) || 1)))} />
            </div>
            <fieldset className="role-gen__field">
                <legend>Extra roles</legend>
                {EXTRA_ROLES.map(role => (
                    <label key={role} className="role-gen__check">
                        <input type="checkbox" checked={extras.includes(role)} onChange={() => toggleExtra(role)} />
                        {role}
                    </label>
                ))}
            </fieldset>
            <p className="role-gen__summary">
                {playerCount} players: {Math.min(intruders, maxIntruders)} intruder{Math.min(intruders, maxIntruders) === 1 ? '' : 's'}
                {extras.length ? `, ${extras.join(', ')}` : ''}, the rest crew.
            </p>
            <button type="submit" className="seo-btn--primary">Deal roles</button>
        </form>
    );
}

export default function RoleGeneratorPage() {
    usePageMeta({
        title: 'Among Us Role Generator and Picker for Real Life | Sus Party',
        description: DESCRIPTION, canonical: CANONICAL, schema: SCHEMA,
    });
    return (
        <SeoPageLayout>
            <header className="seo-hero">
                <p className="seo-eyebrow">Free tool · One phone, secret roles</p>
                <h1 className="seo-h1">Among Us role generator</h1>
                <p className="seo-lead">
                    Pick who is crew and who is an intruder for a real-life Among Us game.
                    Enter your players, choose the number of intruders, and pass one phone around the circle.
                    Each person sees only their own role.
                </p>
            </header>
            <main className="seo-content">
                <section className="seo-section" aria-label="Role generator">
                    <RoleGenerator />
                </section>

                <section className="seo-section">
                    <h2>How to use the role picker</h2>
                    <ol className="seo-list">
                        <li>Type the player names, or just set the number of players.</li>
                        <li>Keep the suggested number of intruders, or change it.</li>
                        <li>Tap Deal roles and hand the phone to the first player.</li>
                        <li>Each player taps to see their role, then taps again to hide it before passing the phone on.</li>
                        <li>When the last player is done, put the phone away and start the round.</li>
                    </ol>
                    <p>
                        The picker works for any hidden-role game: Among Us IRL, Mafia, Werewolf, or a game you made up.
                        It does not run the game itself. For tasks and meetings, see the <a href="/how-to-play-among-us-irl">Among Us IRL rules</a>.
                    </p>
                </section>

                <section className="seo-section">
                    <h2>How many intruders to pick</h2>
                    <div className="seo-table-wrap">
                        <table className="seo-table seo-table--plain">
                            <thead><tr><th>Players</th><th>Intruders</th><th>Notes</th></tr></thead>
                            <tbody>
                                <tr><td>3 to 9</td><td>1</td><td>Short rounds. Good for a first game.</td></tr>
                                <tr><td>10 to 14</td><td>2</td><td>The classic setup. Intruders can cover for each other.</td></tr>
                                <tr><td>15 to 20</td><td>3</td><td>Use a bigger play area and a longer task list.</td></tr>
                            </tbody>
                        </table>
                    </div>
                    <p>
                        Fewer intruders make the crew stronger. If the intruders win every round, drop one.
                        If the crew finds them in the first meeting, add one or spread the tasks across more rooms.
                    </p>
                </section>

                <section className="seo-section">
                    <h2>The roles</h2>
                    <div className="seo-cards seo-cards--2">
                        {Object.entries(ROLE_TEXT).map(([role, text]) => (
                            <div className="seo-card" key={role}>
                                <h3>{role}{EXTRA_ROLES.includes(role) ? ' (optional)' : ''}</h3>
                                <p>{text}</p>
                            </div>
                        ))}
                    </div>
                    <p>
                        Add the optional roles once your group knows the basic game. Use one extra role at a time,
                        and explain it out loud before you deal.
                    </p>
                </section>

                <section className="seo-section">
                    <h2>When one shared phone is not enough</h2>
                    <p>
                        Passing a phone works for a quick round. It gets slow with a big group, and nobody tracks tasks or votes.
                        Sus Party gives each player a secret role on their own phone, a task list for your rooms, emergency meetings,
                        and app-counted votes. It is free in the browser, with no account or download.
                    </p>
                    <p>
                        Need tasks too? Build a list with the <a href="/among-us-irl-task-generator">task generator</a>,
                        browse <a href="/among-us-irl-task-ideas">task ideas</a>,
                        or print <a href="/among-us-task-cards-printable">paper task cards</a>.
                    </p>
                </section>

                <section className="seo-section seo-faq">
                    <h2>Questions</h2>
                    {FAQ.map(([question, answer]) => (
                        <div key={question}>
                            <h3>{question}</h3>
                            <p>{answer}</p>
                        </div>
                    ))}
                </section>

                <GameSetupCta title="Give everyone a role on their own phone."
                    href="/play" label="Start a free Sus Party game"
                    secondaryHref="/how-to-play" secondaryLabel="Learn how to play">
                    Sus Party deals the roles, hands out real-world tasks, and runs the meetings and votes.
                </GameSetupCta>
            </main>
        </SeoPageLayout>
    );
}
