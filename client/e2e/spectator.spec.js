// A player who is out watches the round on their phone: who is still in, and a live feed of
// tasks done, cards played, meetings and who went out. By default the feed never names who
// played a card or finished a task, so an out player can't give the intruder away.
const { test, expect } = require('@playwright/test');
const h = require('./helpers');

test.afterEach(h.closeAll);

test('an out player watches the round without learning who the intruder is', async ({ browser }) => {
    const phones = await h.openPhones(browser, ['Sam', 'Alex', 'Jules', 'Riley', 'Casey']);
    await h.gatherRoom({
        host: phones[0], phones,
        settings: { startingCards: 1, cardDrawChance: 0, deck: { 'Taunt Message': 1 } },
    });
    await phones[0].getByText('Start Game').click();
    const intruder = await h.revealRoles(phones);
    const crew = phones.filter(phone => phone !== intruder);
    const [caller, victim, suspect, worker] = crew;

    // A body is found: the victim says so at the meeting and is out.
    await caller.getByText('CALL MEETING').click();
    await expect(victim.getByText('Go to the meeting spot', { exact: false })).toBeVisible();
    await h.tapAndConfirm(victim.getByRole('button', { name: "I've Been Killed" }));
    await expect(victim.getByText("You're out")).toBeVisible();
    await expect(victim.getByText(`${victim.person} was tagged out`)).toBeVisible();
    await expect(victim.getByText(/don't tell anyone/)).toBeVisible();

    // The room votes out an innocent; the round goes on, three against one.
    const living = phones.filter(phone => phone !== victim);
    await h.readyUp(living);
    await h.vote(living.map(phone => [phone, phone === suspect ? caller : suspect]));
    await h.continueAfterResults(phones);
    await expect(victim.getByText(`${suspect.person} was voted out. They were crew.`)).toBeVisible({ timeout: 30000 });

    // A task and a card, both without a name on the out phones.
    await h.swipe(worker);
    await expect(victim.getByText(/^Someone finished a task/)).toBeVisible();
    await h.openVent(intruder);
    await h.playCard(intruder, 'Taunt Message');
    const taunt = intruder.getByRole('dialog', { name: 'Send Taunt' });
    await taunt.getByRole('combobox').selectOption({ label: worker.person });
    await taunt.getByRole('textbox').fill('Nice task');
    await taunt.getByRole('button', { name: /Send Taunt/ }).click();
    for (const out of [victim, suspect]) {
        await expect(out.getByText('An intruder played Taunt Message'), out.person).toBeVisible();
        await expect(out.getByText(`${intruder.person} played`, { exact: false }), out.person).toHaveCount(0);
        await expect(out.getByText('Intruder', { exact: true }), out.person).toHaveCount(0);
    }
    // Everyone still in shows on the out phone.
    for (const phone of [caller, worker, intruder]) {
        await expect(victim.getByText(phone.person, { exact: true }).first(), phone.person).toBeVisible();
    }
    // Living phones never get the feed.
    for (const phone of [caller, worker, intruder]) await expect(phone.getByText('What\'s happening'), phone.person).toHaveCount(0);

    if (process.env.SPECTATOR_SHOTS) {
        await h.sleep(800);
        await victim.screenshot({ path: `${process.env.SPECTATOR_SHOTS}/spectator-phone.png`, fullPage: false });
    }
    h.expectNoPageErrors(phones);
});
