// Bug hunt 2026-11-11: checks that failed on beta 2026.11.10.85 (prod has the same bugs).
//   1. The vote screen blanked the phone when the meeting ended under it.
//   2. A second tab of the game took the player's seat and the first tab refused every tap.
//   5. A phone coming back after its room was gone landed on an error that hid the welcome back card.
const { test, expect } = require('@playwright/test');
const h = require('./helpers');

test.afterEach(h.closeAll);

const expectScreenAlive = async (page, why) => {
    expect((await page.locator('#root').innerHTML()).length, `${page.person}'s screen is empty: ${why}`).toBeGreaterThan(200);
    expect(page.errors, `${page.person} hit a page error: ${why}`).toEqual([]);
};

test('finding 1a: a kill reported during a 3-player vote does not blank the other two phones', async ({ browser }) => {
    const phones = await h.openPhones(browser, ['Sam', 'Alex', 'Jules']);
    await h.gatherRoom({ host: phones[0], phones });
    await phones[0].getByText('Start Game').click();
    const intruder = await h.revealRoles(phones);
    const [caller, victim] = phones.filter(p => p !== intruder);
    await h.callMeeting(caller, phones);
    await expect(caller.getByText('Tap who you think it is')).toBeVisible();
    await h.tapAndConfirm(victim.getByRole('button', { name: "I've Been Killed" }));
    await h.sleep(4000);
    for (const phone of phones) await expectScreenAlive(phone, 'last stand closed the meeting under the vote screen');
});

test('finding 1b: a phone that sleeps through the end of a vote wakes to a working screen', async ({ browser }) => {
    test.skip(browser.browserType().name() !== 'chromium', 'lock() is Chromium only');
    const phones = await h.openPhones(browser, ['Sam', 'Alex', 'Jules', 'Riley']);
    await h.gatherRoom({ host: phones[0], phones });
    await phones[0].getByText('Start Game').click();
    const intruder = await h.revealRoles(phones);
    const crew = phones.filter(p => p !== intruder);
    const sleeper = crew[1];
    await h.callMeeting(crew[0], phones);
    await expect(sleeper.getByText('Tap who you think it is')).toBeVisible();
    const unlock = await h.lock(sleeper);
    const awake = phones.filter(p => p !== sleeper);
    for (const phone of awake) await phone.getByRole('button', { name: /Veto Meeting/ }).click().catch(() => {});
    await expect(awake[0].getByText('Meeting Vetoed')).toBeVisible({ timeout: 60000 });
    await h.continueAfterResults(awake);
    await h.sleep(2000);
    await unlock();
    await h.sleep(6000);
    await expectScreenAlive(sleeper, 'the meeting ended while the phone was locked');
});

test('finding 2: opening the invite again in a second tab does not leave the first tab refusing taps', async ({ browser }) => {
    const phones = await h.openPhones(browser, ['Sam', 'Alex', 'Jules', 'Riley']);
    const code = await h.gatherRoom({ host: phones[0], phones });
    await phones[0].getByText('Start Game').click();
    const intruder = await h.revealRoles(phones);
    const first = phones.find(p => p !== intruder);
    const second = await first.context().newPage();
    second.person = `${first.person} (second tab)`;
    await second.goto(`/play?room=${code}&via=qr`);
    // The newest tab plays; the old one says so plainly instead of refusing taps.
    await expect(first.getByText('Your game is open in another tab')).toBeVisible();
    // Back in the first tab, Play here takes the seat back and the tasks go through again.
    await first.bringToFront();
    await first.getByRole('button', { name: 'Play here' }).click();
    await expect(second.getByText('Your game is open in another tab')).toBeVisible();
    await h.swipe(first);
    await h.sleep(2500);
    await expect(first.getByText('Reconnect before you send this command.').first()).toHaveCount(0);
    await expect(first.getByText(/Task was not recorded/).first()).toHaveCount(0);
    await expect(first.getByText('Your game is open in another tab')).toHaveCount(0);
});

test('finding 5: a returning phone gets the start screen and the welcome back card, not an error about its old room', async ({ browser }) => {
    const [phone] = await h.openPhones(browser, ['Returning']);
    await phone.context().addInitScript(() => {
        try {
            if (localStorage.getItem('seeded')) return;
            localStorage.setItem('seeded', '1');
            localStorage.setItem('sus_last_game_v1', JSON.stringify({ code: 'ABC123', taskCount: 24, playedAt: Date.now() - 6 * 86400000 }));
            localStorage.setItem('player_id', '11111111-2222-4333-8444-555555555555');
            localStorage.setItem('room_code', 'XYAH');
        } catch (_) { /* about:blank */ }
    });
    await phone.goto('/play');
    await expect(phone.getByText('Create New Game').first()).toBeVisible();
    await h.sleep(3000);
    await expect(phone.getByText('Previous session unavailable')).toHaveCount(0);
    // finding 5b: and the welcome back card still shows on /play
    await expect(phone.getByText('Welcome back')).toBeVisible();
});
