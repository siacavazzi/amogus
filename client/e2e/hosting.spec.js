// Who hosts the room, and what happens to the lobby when phones and the big screen come and go.
// Tests marked test.fail() reproduce known bugs: they pass while the bug is there, and start
// failing once it's fixed, as a reminder to drop the marker. E2E_SHOW_BUGS=1 runs them as
// ordinary tests, to see where each one breaks.
const { test, expect } = require('@playwright/test');
const h = require('./helpers');

test.afterEach(h.closeAll);

// The phone closes the page without tapping Leave: the battery dies, the tab is swiped away,
// or the browser drops it while the phone sleeps.
const closeWithoutLeaving = phone => phone.context().close();

test('in a room made on the reactor, host passes on when the host leaves and the big screen says so', async ({ browser }) => {
    const reactor = await h.openReactor(browser);
    const code = await h.createRoom(reactor);
    const phones = await h.openPhones(browser, ['Sam', 'Alex', 'Jules', 'Riley', 'Kai']);
    for (const phone of phones) await h.joinRoom(phone, code);
    const [host, next, ...rest] = phones;
    await expect(reactor.getByTestId('reactor-host-hint')).toHaveText('Sam is the host. Start the game from their phone.');

    await h.tapAndConfirm(host.getByRole('button', { name: 'Leave room' }));
    await expect(host.getByText('Create New Game')).toBeVisible();
    await expect(reactor.getByText('4 players connected')).toBeVisible();
    await expect(reactor.getByTestId('reactor-host-hint')).toHaveText('Alex is the host. Start the game from their phone.');
    await expect(next.getByText('Start Game')).toBeVisible();
    for (const phone of rest) await expect(phone.getByText('Waiting for host to start the game...')).toBeVisible();

    await next.getByText('Start Game').click();
    await h.revealRoles([next, ...rest]);
    await expect(reactor.getByRole('progressbar')).toBeVisible();

    h.expectNoPageErrors([...phones, reactor]);
});

test('phones that reload or reopen the page in the lobby keep their seat, and the host keeps Start', async ({ browser }) => {
    const phones = await h.openPhones(browser, ['Sam', 'Alex', 'Jules']);
    const [host, guest] = phones;
    await h.gatherRoom({ host, phones });

    await host.reload();
    await expect(host.getByText('You', { exact: true })).toBeVisible();
    await expect(host.getByText('Start Game')).toBeVisible();

    // The guest's tab is killed while the phone sleeps, then opened again from the same browser.
    const reopened = await guest.context().newPage();
    reopened.person = guest.person;
    reopened.errors = [];
    reopened.on('pageerror', error => reopened.errors.push(error.message));
    await guest.close();
    await reopened.goto('/play');
    await expect(reopened.getByText('You', { exact: true })).toBeVisible();
    await expect(reopened.getByText('Waiting for host to start the game...')).toBeVisible();

    // Nobody came back as a second copy of themselves.
    for (const phone of [host, reopened, phones[2]]) {
        await expect(phone.getByRole('button', { name: 'Players (3)' }), phone.person).toBeVisible();
        await expect(phone.getByText('Alex', { exact: true }), phone.person).toHaveCount(1);
    }

    await host.getByText('Start Game').click();
    await h.revealRoles([host, reopened, phones[2]]);

    h.expectNoPageErrors([host, reopened, phones[2]]);
});

test('the big screen reloads in the lobby and comes back to the same room', async ({ browser }) => {
    const reactor = await h.openReactor(browser);
    const code = await h.createRoom(reactor);
    const phones = await h.openPhones(browser, ['Sam', 'Alex', 'Jules']);
    for (const phone of phones) await h.joinRoom(phone, code);

    await reactor.reload();
    await expect(reactor.getByTestId('room-code')).toHaveText(code);
    await expect(reactor.getByText('3 players connected')).toBeVisible();
    await expect(reactor.getByTestId('reactor-host-hint')).toHaveText('Sam is the host. Start the game from their phone.');

    // The round still reaches the reloaded screen.
    await phones[0].getByText('Start Game').click();
    await h.revealRoles(phones);
    await expect(reactor.getByRole('progressbar')).toBeVisible();

    h.expectNoPageErrors([...phones, reactor]);
});

test('two intruders need five players before the host can start', async ({ browser }) => {
    const phones = await h.openPhones(browser, ['Sam', 'Alex', 'Jules', 'Riley', 'Kai']);
    const [host] = phones;
    const code = await h.createRoomOnPhone(host, { intruders: 2 });
    await h.enterName(host);
    for (const phone of phones.slice(1, 4)) await h.joinRoom(phone, code);

    await expect(host.getByText('Need at least 5 players for 2 intruder(s).')).toBeVisible();
    await expect(host.getByText('Start Game')).toHaveCount(0);

    await h.joinRoom(phones[4], code);
    await expect(host.getByText('Start Game')).toBeVisible();

    h.expectNoPageErrors(phones);
});

test('BUG: when the host phone drops out of the lobby, someone else can start', async ({ browser }) => {
    test.fail(!process.env.E2E_SHOW_BUGS, 'Host only moves on when the host taps Leave; see the lobby bug report');
    const phones = await h.openPhones(browser, ['Sam', 'Alex', 'Jules', 'Riley']);
    const [host, ...rest] = phones;
    await h.gatherRoom({ host, phones });

    await closeWithoutLeaving(host);
    const startButtons = () => Promise.all(rest.map(phone => phone.getByText('Start Game').count()));
    await expect.poll(async () => (await startButtons()).reduce((a, b) => a + b, 0), { timeout: 30000 }).toBe(1);
});

test('BUG: a phone that closed the page in the lobby is not dealt into the round', async ({ browser }) => {
    test.fail(!process.env.E2E_SHOW_BUGS, 'Players who are gone still get a role, and every meeting waits for them forever');
    const phones = await h.openPhones(browser, ['Sam', 'Alex', 'Jules', 'Riley', 'Kai']);
    await h.gatherRoom({ host: phones[0], phones });
    const gone = phones[4];
    const here = phones.slice(0, 4);
    await closeWithoutLeaving(gone);

    await here[0].getByText('Start Game').click();
    let intruder;
    for (const phone of here) {
        const release = await h.hold(phone, phone.getByText('Hold to see it').first(), 500);
        if (/Intruder/.test(await phone.locator('body').innerText())) intruder = phone;
        await release();
        await phone.getByText('Got it').click();
    }
    // Everyone still here calls a meeting and gets ready; voting should open.
    await h.callMeeting(here.find(phone => phone !== intruder), here);
    for (const phone of here) await expect(phone.getByText('Go to the meeting spot', { exact: false }), phone.person).toHaveCount(0, { timeout: 30000 });
});
