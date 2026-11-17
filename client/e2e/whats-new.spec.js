// "Welcome back, here's what's new": once per release, only for phones that have been here before,
// and never in the middle of joining a room or playing a round.
const { test, expect } = require('@playwright/test');
const h = require('./helpers');

test.afterEach(h.closeAll);

// A phone that last visited before the current release.
async function returningPhone(browser, name) {
    const phone = await h.openPhone(browser, name, { whatsNew: true });
    await phone.addInitScript(() => {
        try { if (!localStorage.getItem('sus_whats_new_v1')) localStorage.setItem('sus_whats_new_v1', JSON.stringify({ seen: 'an-older-release' })); } catch (_) { /* about:blank */ }
    });
    return phone;
}

test('a first visit never shows it, a return after an update shows it once', async ({ browser }) => {
    const newcomer = await h.openPhone(browser, 'New', { whatsNew: true });
    await newcomer.goto('/play');
    await h.skipTutorialPrompt(newcomer);
    await h.sleep(2000);
    await expect(newcomer.getByTestId('whats-new')).toHaveCount(0);
    await newcomer.reload();
    await h.sleep(2000);
    await expect(newcomer.getByTestId('whats-new')).toHaveCount(0);

    const back = await returningPhone(browser, 'Back');
    await back.goto('/play');
    const sheet = back.getByTestId('whats-new');
    await expect(sheet).toBeVisible();
    await expect(sheet).toContainText("Here's what's new");
    await expect(back.getByText('Try the tutorial first')).toHaveCount(0);
    await sheet.getByRole('button', { name: 'Got it' }).click();
    await expect(sheet).toHaveCount(0);
    await back.reload();
    await h.sleep(2000);
    await expect(back.getByTestId('whats-new')).toHaveCount(0);
    h.expectNoPageErrors([newcomer, back]);
});

test('a returning player reads it in the waiting room, and the round starting puts it away', async ({ browser }) => {
    const [host, alex] = await h.openPhones(browser, ['Sam', 'Alex']);
    const kim = await returningPhone(browser, 'Kim');
    const code = await h.createRoomOnPhone(host);
    await h.enterName(host);

    // The invite link and the name screen go by without it.
    await kim.goto(`/play?room=${code}`);
    await expect(kim.getByPlaceholder(/name/i).first()).toBeVisible();
    await h.sleep(1500);
    await expect(kim.getByTestId('whats-new')).toHaveCount(0);
    await h.enterName(kim);
    await expect(kim.getByTestId('whats-new')).toBeVisible();

    await h.joinRoom(alex, code);
    await host.getByText('Start Game').click();
    await expect(kim.getByTestId('whats-new')).toHaveCount(0);
    h.expectNoPageErrors([host, alex, kim]);
});
