// Phones going into pockets. In prod, phones dropped their connection 871 times in three days,
// mostly from screens locking. A locked iPhone hides the page, stops its JavaScript and loses the
// socket, so these tests do all three (h.lock), not just cut the network. Chromium only: freezing
// a page needs the DevTools protocol.
const { test, expect } = require('@playwright/test');
const h = require('./helpers');

test.afterEach(h.closeAll);
test.skip(({ browserName }) => browserName !== 'chromium', 'Freezing a page needs Chromium');

// Longer than socket.io's ping timeout (25s + 20s), so the server sees the phone go.
const POCKET_MS = 50 * 1000;

async function startRound(browser, names, { reactor: withReactor = false, settings } = {}) {
    const phones = await h.openPhones(browser, names);
    const reactor = withReactor ? await h.openReactor(browser) : null;
    await h.gatherRoom({ host: phones[0], phones, reactor, settings });
    await phones[0].getByText('Start Game').click();
    const intruder = await h.revealRoles(phones);
    return { phones, reactor, intruder, crew: phones.filter(phone => phone !== intruder) };
}

test('a phone locked mid-round for a minute comes back to its role and task', async ({ browser }) => {
    test.setTimeout(4 * 60 * 1000);
    const { phones, crew } = await startRound(browser, ['Sam', 'Alex', 'Jules', 'Riley']);
    const pocketed = crew[1];
    const task = (await pocketed.getByTestId('task-location').locator('..').textContent()).trim();

    const unlock = await h.lock(pocketed);
    await h.sleep(POCKET_MS);
    await unlock();

    await expect(pocketed.getByText('CALL MEETING')).toBeVisible({ timeout: 30000 });
    await expect(pocketed.getByTestId('task-location').locator('..')).toHaveText(task);
    // And it can still play: its next tap goes through.
    await h.swipe(pocketed);
    await expect(pocketed.getByTestId('task-location').locator('..')).not.toHaveText(task, { timeout: 15000 });

    h.expectNoPageErrors(phones);
});

test('half the room locks their phones during a meeting, and the vote opens once they are back', async ({ browser }) => {
    test.setTimeout(6 * 60 * 1000);
    const { phones, crew, intruder } = await startRound(browser, ['Sam', 'Alex', 'Jules', 'Riley', 'Kai', 'Noor', 'Mia', 'Theo']);
    const caller = crew[0];
    const pocketed = phones.filter(phone => phone !== caller).slice(0, 4);
    const awake = phones.filter(phone => !pocketed.includes(phone));

    await caller.getByText('CALL MEETING').click();
    for (const phone of phones) await expect(phone.getByText('Go to the meeting spot', { exact: false })).toBeVisible();
    // Four phones lock at the same moment, the way a group walking to the meeting spot does.
    const unlocks = await Promise.all(pocketed.map(phone => h.lock(phone)));
    await h.readyUp(awake);
    // The room sees all four go (the server waits out its ping timeout, as with a real lock).
    await expect(caller.getByText('Offline')).toHaveCount(4, { timeout: 90000 });
    await Promise.all(unlocks.map(unlock => unlock()));

    // Everyone back: the room sees them, they slide ready, and voting opens on every phone.
    await expect(caller.getByText('Offline')).toHaveCount(0, { timeout: 30000 });
    await h.readyUp(pocketed);
    for (const phone of phones) await expect(phone.getByText('Select a Player'), phone.person).toBeVisible({ timeout: 30000 });
    const someoneElse = phones.find(phone => phone !== intruder);
    await h.vote(phones.map(phone => [phone, phone === intruder ? someoneElse : intruder]));
    await h.continueAfterResults(phones);
    for (const phone of phones) await expect(phone.getByText('Crewmates Win!'), phone.person).toBeVisible({ timeout: 30000 });

    h.expectNoPageErrors(phones);
});

test('a phone locked mid-vote comes back to the vote, and its vote counts', async ({ browser }) => {
    test.setTimeout(4 * 60 * 1000);
    const { phones, crew, intruder } = await startRound(browser, ['Sam', 'Alex', 'Jules', 'Riley', 'Kai']);
    await h.callMeeting(crew[0], phones);
    for (const phone of phones) await expect(phone.getByText('Select a Player'), phone.person).toBeVisible({ timeout: 20000 });

    const pocketed = crew[1];
    const others = phones.filter(phone => phone !== pocketed);
    const unlock = await h.lock(pocketed);
    // Ejecting takes two thirds of the room (4 of 5), so the pocketed phone's vote decides it.
    await h.vote([[crew[0], intruder], [crew[2], intruder], [crew[3], intruder], [intruder, crew[2]]]);
    expect(others).toHaveLength(4);
    await h.sleep(10000);
    await unlock();

    await expect(pocketed.getByText('Select a Player')).toBeVisible({ timeout: 30000 });
    await h.vote([[pocketed, intruder]]);
    await h.continueAfterResults(phones);
    for (const phone of phones) await expect(phone.getByText('Crewmates Win!'), phone.person).toBeVisible({ timeout: 40000 });

    h.expectNoPageErrors(phones);
});

test('a phone locked during a meltdown still shows its code when unlocked, and the room stops it', async ({ browser }) => {
    test.setTimeout(4 * 60 * 1000);
    const { phones, reactor, crew } = await startRound(browser, ['Sam', 'Alex', 'Jules', 'Riley', 'Kai'], { reactor: true, settings: { meltdownTime: 90 } });

    await reactor.getByRole('button', { name: /SABOTAGE CORE/ }).click();
    await expect(reactor.getByText('CORE MELTDOWN')).toBeVisible();
    const pocketed = crew[1];
    await expect(pocketed.getByTestId('meltdown-code')).toHaveText(/^\d{4}$/);
    const before = (await pocketed.getByTestId('meltdown-code').textContent()).trim();
    const unlock = await h.lock(pocketed);
    await h.sleep(15000);
    await unlock();
    await expect(pocketed.getByTestId('meltdown-code')).toHaveText(before, { timeout: 20000 });

    // Everyone types their code at the reactor until it's safe.
    for (const phone of phones) {
        if (!(await reactor.getByText('CORE MELTDOWN').isVisible())) break;
        const pin = (await phone.getByTestId('meltdown-code').textContent()).trim();
        await reactor.getByLabel('Code digit 1').click();
        await reactor.keyboard.type(pin, { delay: 60 });
        await h.sleep(900);
    }
    await expect(reactor.getByText('CORE MELTDOWN')).toBeHidden();
    for (const phone of phones) await expect(phone.getByRole('dialog', { name: 'Meltdown averted' }), phone.person).toBeVisible({ timeout: 20000 });

    h.expectNoPageErrors([...phones, reactor]);
});

test('the big screen goes to sleep mid-round and wakes up following the round', async ({ browser }) => {
    test.setTimeout(4 * 60 * 1000);
    const { phones, reactor, crew } = await startRound(browser, ['Sam', 'Alex', 'Jules', 'Riley'], { reactor: true });

    const wake = await h.lock(reactor);
    await h.sleep(POCKET_MS);
    await wake();
    await expect(reactor.getByText('SABOTAGE CORE')).toBeVisible({ timeout: 30000 });
    // It still follows what the phones do.
    await crew[0].getByText('CALL MEETING').click();
    await expect(reactor.getByText('Cannot sabotage during meeting')).toBeVisible({ timeout: 20000 });

    h.expectNoPageErrors([...phones, reactor]);
});
