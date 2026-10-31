// Dropped connections, refreshes and people who leave: what each screen does after.
// Tests marked test.fail() reproduce a bug found in the 2026-10-26 bug hunt that is not fixed yet.
// They pass while the bug is there; once it is fixed Playwright reports them, so drop the marker.
// E2E_SHOW_BUGS=1 runs them as normal tests, to watch each one fail where the bug shows.
const { test, expect } = require('@playwright/test');
const h = require('./helpers');

test.afterEach(h.closeAll);

// Phones gather (with a big screen when asked), the host starts, and everyone peeks at their role.
async function startRound(browser, names, { reactor: withReactor = false } = {}) {
    const phones = await h.openPhones(browser, names);
    const reactor = withReactor ? await h.openReactor(browser) : null;
    const code = await h.gatherRoom({ host: phones[0], phones, reactor });
    await phones[0].getByText('Start Game').click();
    const intruder = await h.revealRoles(phones);
    return { phones, reactor, code, intruder, crew: phones.filter(phone => phone !== intruder) };
}

// Cut a page off the network for a moment, as a phone locking or a wifi blink would.
async function blink(page, ms = 3000) {
    await h.goOffline(page);
    // Chromium doesn't always close the socket when it goes offline; then the drop only shows
    // after socket.io's ping timeout (25s interval + 20s wait).
    await expect(page.getByText(/Reconnect|Connection lost/).first()).toBeVisible({ timeout: 60000 });
    await h.sleep(ms);
    await h.goOnline(page);
}

test('someone who refreshes mid-round keeps their role and task', async ({ browser }) => {
    const { phones, crew } = await startRound(browser, ['Sam', 'Alex', 'Jules', 'Riley']);
    const refresher = crew[1];
    const task = (await refresher.getByTestId('task-location').locator('..').textContent()).trim();

    await refresher.reload();
    await expect(refresher.getByText('CALL MEETING')).toBeVisible({ timeout: 30000 });
    await expect(refresher.getByTestId('task-location').locator('..')).toHaveText(task);

    h.expectNoPageErrors(phones);
});

test('the big screen keeps following the round after someone refreshes it', async ({ browser }) => {
    const { phones, reactor, crew } = await startRound(browser, ['Sam', 'Alex', 'Jules', 'Riley'], { reactor: true });

    await reactor.reload();
    await expect(reactor.getByText('SABOTAGE CORE')).toBeVisible({ timeout: 30000 });
    await crew[0].getByText('CALL MEETING').click();
    await expect(reactor.getByText('Cannot sabotage during meeting')).toBeVisible();

    h.expectNoPageErrors([...phones, reactor]);
});

test('a phone that drops during a meeting can come back, ready up, and the vote opens', async ({ browser }) => {
    const { phones, crew } = await startRound(browser, ['Sam', 'Alex', 'Jules', 'Riley']);
    const dropper = crew[1];
    await crew[0].getByText('CALL MEETING').click();
    for (const phone of phones) await expect(phone.getByText('Go to the meeting spot', { exact: false })).toBeVisible();

    await blink(dropper);
    // Wait until the room sees it back. A slide made before the phone rejoins is sent from a socket
    // the server doesn't know yet and is refused (the queued-taps burst from the bug hunt).
    await expect(phones[0].getByText('Offline')).toHaveCount(0, { timeout: 30000 });
    await h.readyUp(phones);
    for (const phone of phones) await expect(phone.getByText('Select a Player'), phone.person).toBeVisible({ timeout: 20000 });

    h.expectNoPageErrors(phones);
});

test('the big screen gets back into the round after its wifi blinks', async ({ browser }) => {
    // Passes when the server sees the old socket close at once. When it doesn't (a real wifi drop
    // is silent, so the server waits out the ping timeout), the server refuses the big screen's new
    // socket mid-round and it freezes; server/tests/test_server_robustness.py reproduces that.
    const { phones, reactor, crew } = await startRound(browser, ['Sam', 'Alex', 'Jules', 'Riley'], { reactor: true });

    await blink(reactor);
    await expect(reactor.getByText('SABOTAGE CORE')).toBeVisible({ timeout: 30000 });
    await crew[0].getByText('CALL MEETING').click();
    await expect(reactor.getByText('Cannot sabotage during meeting')).toBeVisible();

    h.expectNoPageErrors([...phones, reactor]);
});

test('a phone opened as a second big screen mid-round takes over the big screen', async ({ browser }) => {
    test.fail(!process.env.E2E_SHOW_BUGS, 'Bug: the server refuses a new big screen while it still holds the old one, so the new screen freezes');
    const { phones, reactor, code, crew } = await startRound(browser, ['Sam', 'Alex', 'Jules', 'Riley'], { reactor: true });

    // The host moves the big screen to the TV while the laptop is still open (or the laptop's
    // old connection hasn't timed out yet). The new screen should follow the round.
    const tv = await h.openPage(browser, 'TV', { viewport: { width: 1440, height: 900 } });
    await tv.goto('/play');
    await tv.evaluate(room => localStorage.setItem('room_code', room), code);
    await tv.reload();
    await expect(tv.getByText('SABOTAGE CORE')).toBeVisible({ timeout: 15000 });
    await crew[0].getByText('CALL MEETING').click();
    await expect(tv.getByText('Cannot sabotage during meeting')).toBeVisible({ timeout: 10000 });

    h.expectNoPageErrors([...phones, reactor, tv]);
});

test('a phone that slid ready and then locked still counts as ready', async ({ browser }) => {
    test.fail(!process.env.E2E_SHOW_BUGS, 'Bug: a dropped socket un-readies the player, so the meeting waits until they unlock and slide again');
    const { phones, crew } = await startRound(browser, ['Sam', 'Alex', 'Jules', 'Riley']);
    const pocketed = crew[1];
    await crew[0].getByText('CALL MEETING').click();
    await h.readyUp([pocketed]);

    await blink(pocketed);
    await expect(pocketed.getByText('Go to the meeting spot', { exact: false })).toBeVisible({ timeout: 30000 });
    await expect(pocketed.getByRole('slider'), 'the phone still shows its ready slide after coming back').toHaveCount(0, { timeout: 5000 });

    h.expectNoPageErrors(phones);
});

test('someone who leaves mid-round is gone from the lobby after Play Again', async ({ browser }) => {
    test.fail(!process.env.E2E_SHOW_BUGS, 'Bug: a player who leaves mid-round stays in the room and is dealt into later rounds, where they block every meeting');
    const { phones, intruder, crew } = await startRound(browser, ['Sam', 'Alex', 'Jules', 'Riley', 'Kai']);
    const leaver = crew[crew.length - 1];
    const stayers = phones.filter(phone => phone !== leaver);

    await leaver.getByRole('button', { name: 'Leave game' }).click();
    await leaver.getByRole('button', { name: 'Leave', exact: true }).click();
    await expect(leaver.getByText('Create New Game')).toBeVisible();

    await h.voteOutIntruder(stayers.find(phone => phone !== intruder), stayers, intruder);
    for (const phone of stayers) await phone.getByRole('button', { name: /Play Again/ }).click();
    await h.expectLobby(phones[0]);
    await expect(phones[0].getByText(leaver.person, { exact: true })).toHaveCount(0);

    h.expectNoPageErrors(stayers);
});
