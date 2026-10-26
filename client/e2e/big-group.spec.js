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
