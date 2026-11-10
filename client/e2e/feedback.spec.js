// "How was this game?": 20 seconds after the result screen (2 s after Save this game), every phone (never the big screen)
// asks for optional feedback, and what a player sends is saved, even if Play Again resets the room mid-answer.
const { test, expect } = require('@playwright/test');
const h = require('./helpers');

test.afterEach(h.closeAll);

test('after a game each phone asks for feedback, keeps it through Play Again, sends it, and can say not now', async ({ browser }) => {
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

    // One player starts writing; the others wave the prompt off.
    await sender.getByRole('button', { name: 'Give feedback' }).click();
    await sender.getByText('Fun', { exact: true }).click();
    await sender.getByLabel('Comment (optional)').fill('Loved the meltdown codes.');
    await later.getByRole('button', { name: 'Maybe later' }).click();
    await snoozer.getByRole('button', { name: "Don't ask again" }).click();
    await leaver.getByRole('button', { name: 'Dismiss feedback' }).click();
    for (const phone of [later, snoozer, leaver]) await expect(phone.getByRole('dialog')).toHaveCount(0);
    expect(await snoozer.evaluate(() => Number(localStorage.getItem('sus_party_feedback_snoozed_until')) > Date.now())).toBe(true);

    // The big screen is not a player, so it never asks.
    await expect(reactor.getByRole('dialog')).toHaveCount(0);

    // Play Again sends the room back to the lobby while the sender is still writing: the answer survives.
    await reactor.getByRole('button', { name: /Play Again/ }).click();
    for (const phone of phones) await h.expectLobby(phone);
    await expect(sender.getByRole('dialog', { name: 'How was this game?' })).toBeVisible();
    await expect(sender.getByLabel('Comment (optional)')).toHaveValue('Loved the meltdown codes.');

    // It is saved for the round that ended; the phone thanks them only once it's saved.
    await sender.getByRole('button', { name: 'Send feedback' }).click();
    await expect(sender.getByText('Thanks for the feedback!')).toBeVisible();
    await expect(sender.getByRole('dialog')).toHaveCount(0);
    await h.expectLobby(sender);

    h.expectNoPageErrors([...phones, reactor]);
});
