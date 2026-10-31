// Big groups: the room is made on the big screen and a crowd of phones piles in. The line
// naming the host has to stay on screen, and the first phone in has to get everyone started.
// Two groups this size never got a round going.
const { test, expect } = require('@playwright/test');
const h = require('./helpers');

test.afterEach(h.closeAll);

test('twenty phones join and the big screen still says who the host is', async ({ browser }) => {
    test.setTimeout(6 * 60 * 1000);
    const reactor = await h.openPage(browser, 'Reactor', { viewport: { width: 1366, height: 768 } });
    const code = await h.createRoom(reactor);

    const names = Array.from({ length: 20 }, (_, i) => `Guest ${i + 1}`);
    for (const name of names) await h.joinRoom(await h.openPhone(browser, name), code);
    await expect(reactor.getByText('20 players connected')).toBeAttached();

    const hint = reactor.getByTestId('reactor-host-hint');
    for (const viewport of [{ width: 1366, height: 768 }, { width: 1280, height: 720 }, { width: 1920, height: 1080 }]) {
        await reactor.setViewportSize(viewport);
        await expect(hint).toHaveText('Guest 1 is the host. Start the game from their phone.');
        await expect(hint).toBeInViewport({ ratio: 1 });
        await expect(reactor.getByTestId('room-code')).toBeInViewport({ ratio: 1 });
        if (process.env.E2E_SHOT) await reactor.screenshot({ path: `${process.env.E2E_SHOT}-${viewport.width}.png` });
    }
});

const NAMES = ['Sam', 'Alex', 'Jules', 'Riley', 'Kai', 'Noor', 'Mia', 'Theo',
    'Ava', 'Leo', 'Zoe', 'Max', 'Ivy', 'Eli', 'Ada', 'Ben'];

test('sixteen phones in a room made on the reactor: the first phone hosts and starts', async ({ browser }) => {
    test.setTimeout(8 * 60 * 1000);
    const reactor = await h.openReactor(browser);
    const code = await h.createRoom(reactor, { intruders: 2 });

    const phones = await h.openPhones(browser, NAMES);
    const [host, ...guests] = phones;
    await h.joinRoom(host, code);
    // Everyone else joins at the same moment, the way a room full of people does.
    await Promise.all(guests.map(phone => h.joinRoom(phone, code)));

    await expect(reactor.getByText(`${NAMES.length} players connected`)).toBeVisible();
    await expect(reactor.getByTestId('reactor-host-hint')).toHaveText('Sam is the host. Start the game from their phone.');
    for (const phone of phones) await expect(phone.getByRole('button', { name: `Players (${NAMES.length})` }), phone.person).toBeVisible();
    for (const guest of guests) await expect(guest.getByText('Waiting for host to start the game...'), guest.person).toBeVisible();

    // The example list has enough tasks for a room this size, so the host can start straight away.
    await expect(host.getByText('Start Game')).toBeVisible();
    await host.getByText('Start Game').click();
    let intruders = 0;
    for (const phone of phones) {
        const release = await h.hold(phone, phone.getByText('Hold to see it').first(), 500);
        if (/Intruder/.test(await phone.locator('body').innerText())) intruders++;
        await release();
        await phone.getByText('Got it').click();
    }
    expect(intruders, 'the two intruders the reactor asked for').toBe(2);
    for (const phone of phones) await expect(h.roundButton(phone), phone.person).toBeVisible();
    await expect(reactor.getByRole('progressbar')).toBeVisible();

    h.expectNoPageErrors([...phones, reactor]);
});

// A whole game at a big party's size, start to finish and into a second round: every phone has
// to reveal, ready up, vote and see the result, and nothing may wait on a phone forever.
test('thirty phones play a whole round with a meeting and vote, then start another', async ({ browser }) => {
    test.setTimeout(15 * 60 * 1000);
    const names = Array.from({ length: 30 }, (_, i) => `P${String(i + 1).padStart(2, '0')}`);
    const reactor = await h.openReactor(browser);
    const code = await h.createRoom(reactor, { intruders: 1 });

    const phones = await h.openPhones(browser, names);
    const [host, ...guests] = phones;
    await h.joinRoom(host, code);
    // A crowd joins in waves of ten, as people find the link at different moments.
    for (let i = 0; i < guests.length; i += 10) await Promise.all(guests.slice(i, i + 10).map(phone => h.joinRoom(phone, code)));
    await expect(reactor.getByText('30 players connected')).toBeVisible();
    for (const phone of phones) await expect(phone.getByRole('button', { name: 'Players (30)' }), phone.person).toBeVisible();

    // Thirty phones need 90 tasks; the room writes what the example list is short of.
    const needed = host.getByText(/^Need at least \d+ tasks\. The room has \d+\.$/);
    if (await needed.isVisible()) {
        const [, want, have] = (await needed.textContent()).match(/(\d+) tasks\. The room has (\d+)/).map(Number);
        await host.getByRole('button', { name: /^Tasks \(/ }).click();
        await host.getByTitle('Tap to let everyone add tasks').click();
        await host.getByRole('button', { name: /^Players \(/ }).click();
        const writers = guests.slice(0, 4);
        const each = Math.ceil((want - have) / writers.length);
        await Promise.all(writers.map(phone => h.addTasks(phone, each)));
        await expect(needed).toBeHidden();
    }

    await host.getByText('Start Game').click();
    const intruder = await h.revealRoles(phones);
    for (const phone of phones) await expect(h.roundButton(phone), phone.person).toBeVisible();
    const crew = phones.filter(phone => phone !== intruder);

    // Some tasks get done, and the big screen's bar moves.
    await Promise.all(crew.slice(0, 6).map(phone => h.swipe(phone)));
    await expect(reactor.getByRole('progressbar')).not.toHaveAttribute('aria-valuenow', '0', { timeout: 20000 });

    // A meeting: in a room this size voting opens at 80% ready (24 of 30), so the six who never
    // slide don't hold it up. Then all thirty vote, and the intruder goes.
    await crew[3].getByText('CALL MEETING').click();
    await expect(crew[3].getByTestId('ready-count')).toHaveText('0 of 30 ready');
    await expect(crew[3].getByTestId('ready-needed')).toHaveText('Voting opens at 24 ready');
    await expect(reactor.getByTestId('reactor-ready-needed')).toHaveText('Voting opens at 24 ready');
    await h.readyUp(phones.slice(0, 23));
    await expect(crew[3].getByTestId('ready-count')).toHaveText('23 of 30 ready');
    await h.readyUp(phones.slice(23, 24));
    for (const phone of phones) await expect(phone.getByText('Select a Player'), phone.person).toBeVisible({ timeout: 30000 });
    await h.vote(phones.map(phone => [phone, phone === intruder ? crew[0] : intruder]));
    await h.continueAfterResults(phones);
    for (const phone of phones) await expect(phone.getByText('Crewmates Win!'), phone.person).toBeVisible({ timeout: 30000 });

    // Everyone goes again.
    for (const phone of phones) await phone.getByRole('button', { name: /Play Again/ }).click();
    for (const phone of phones) await h.expectLobby(phone);
    await expect(host.getByRole('button', { name: 'Players (30)' })).toBeVisible();
    await host.getByText('Start Game').click();
    await h.revealRoles(phones);
    for (const phone of phones) await expect(h.roundButton(phone), phone.person).toBeVisible();

    h.expectNoPageErrors([...phones, reactor]);
});
