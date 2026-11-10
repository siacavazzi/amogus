// Groups that come back: a finished game stays on each phone with its group's link token. The
// welcome back card shows the group's score, any player can start the next game with the same
// tasks, and a friend who opens the card after that joins the room instead of starting another.
const { test, expect } = require('@playwright/test');
const h = require('./helpers');

test.afterEach(h.closeAll);

const lastGame = page => page.evaluate(() => JSON.parse(localStorage.getItem('sus_last_game_v1') || 'null'));

test("any player starts the group's next game from the welcome back card, and friends join it", async ({ browser }) => {
    const phones = await h.openPhones(browser, ['Sam', 'Alex', 'Jules', 'Riley']);
    await h.gatherRoom({ host: phones[0], phones });
    await phones[0].getByText('Start Game').click();
    const intruder = await h.revealRoles(phones);
    const caller = phones.find(phone => phone !== intruder);
    await h.voteOutIntruder(caller, phones, intruder);

    // Every phone keeps the game, with its group token, once the end screen is up.
    const [, alex, jules] = phones;
    await expect.poll(async () => (await lastGame(alex))?.group).toMatch(/^[A-Za-z0-9_-]{8,32}$/);
    await expect.poll(async () => (await lastGame(jules))?.group).toBeTruthy();

    // Everyone goes home. Days later Alex, who never hosted, starts the next game from the home page.
    // (The test can't wait days for the room to expire, so the phones forget it the way they would.)
    for (const phone of phones) {
        await phone.goto('/among-us-irl');
        await phone.evaluate(() => ['room_code', 'player_id'].forEach(key => localStorage.removeItem(key)));
    }
    await alex.reload();
    const card = alex.locator('.sg-welcome-back');
    await expect(card.getByText('Welcome back')).toBeVisible();
    await expect(card.getByTestId('group-recap-rounds')).toContainText('1');
    await expect(card.getByTestId('group-recap-crew')).toContainText('1');
    await expect(card.getByTestId('group-recap-intruders')).toContainText('0');
    // One tap: the card's link opens a room for the group straight away, with the game's tasks.
    await card.getByRole('link', { name: 'Play it again' }).click();
    await expect(alex.getByText('Use This Task List').first()).toBeVisible({ timeout: 20000 });

    // Jules opens the card a minute later: the group already has a room, so the card joins it.
    await jules.goto('/');
    const julesCard = jules.locator('.sg-welcome-back');
    await expect(julesCard.getByTestId('group-room-live')).toBeVisible();
    await julesCard.getByRole('link', { name: 'Join your group' }).click();
    await expect(jules.getByText('Waiting for the host to open the room')).toBeVisible();

    await alex.getByText('Use This Task List').first().click();
    await alex.getByText('Open Room').first().click();
    await expect(jules.getByPlaceholder(/name/i).first()).toBeVisible({ timeout: 20000 });

    h.expectNoPageErrors(phones);
});
