// "How was this game?": 20 seconds after the result screen (2 s after Save this game), every phone (never the big screen)
// asks for optional feedback, and what a player sends is saved.
const { test, expect } = require('@playwright/test');
const h = require('./helpers');

test.afterEach(h.closeAll);

test('after a game each phone asks for feedback, sends it, and can say not now', async ({ browser }) => {
    const phones = await h.openPhones(browser, ['Sam', 'Alex', 'Jules', 'Riley'], { feedbackPrompt: true });
    const reactor = await h.openReactor(browser, { feedbackPrompt: true });
    await h.gatherRoom({ host: phones[0], phones, reactor });
    await phones[0].getByText('Start Game').click();
    const intruder = await h.revealRoles(phones);
    const caller = phones.find(phone => phone !== intruder);
    await h.voteOutIntruder(caller, phones, intruder);

    const [sender, later, snoozer, leaver] = phones;
    for (const phone of phones) {
        await expect(phone.getByRole('dialog', { name: 'How was this game?' }), phone.person).toBeVisible({ timeout: 30000 });
    }

    // One player rates the game and writes a comment; the phone thanks them only once it's saved.
    await sender.getByRole('button', { name: 'Give feedback' }).click();
    await sender.getByText('Fun', { exact: true }).click();
    await sender.getByLabel('Comment (optional)').fill('Loved the meltdown codes.');
    await sender.getByRole('button', { name: 'Send feedback' }).click();
    await expect(sender.getByText('Thanks for the feedback!')).toBeVisible();
    await expect(sender.getByRole('dialog')).toHaveCount(0);

    // The others can wave it off, and Play Again still works afterwards.
    await later.getByRole('button', { name: 'Maybe later' }).click();
    await snoozer.getByRole('button', { name: "Don't ask again" }).click();
    await leaver.getByRole('button', { name: 'Dismiss feedback' }).click();
    for (const phone of phones) await expect(phone.getByRole('dialog')).toHaveCount(0);
    expect(await snoozer.evaluate(() => Number(localStorage.getItem('sus_party_feedback_snoozed_until')) > Date.now())).toBe(true);

    // The big screen is not a player, so it never asks.
    await expect(reactor.getByRole('dialog')).toHaveCount(0);

    for (const phone of phones) await phone.getByRole('button', { name: /Play Again/ }).click();
    for (const phone of phones) await h.expectLobby(phone);

    h.expectNoPageErrors([...phones, reactor]);
});
