// The intruder's cards, played from the vent the way a person would: hold the card down.
const { test, expect } = require('@playwright/test');
const h = require('./helpers');

test.afterEach(h.closeAll);

test('taunt, fake task, EMP and self report reach the other phones', async ({ browser }) => {
    const phones = await h.openPhones(browser, ['Sam', 'Alex', 'Jules', 'Riley']);
    const reactor = await h.openReactor(browser);
    await h.gatherRoom({
        host: phones[0], phones, reactor,
        settings: {
            startingCards: 4, cardDrawChance: 0,
            deck: { 'Taunt Message': 1, 'Fake Task': 1, 'EMP': 1, 'Self Report': 1 },
        },
    });
    await phones[0].getByText('Start Game').click();
    const intruder = await h.revealRoles(phones);
    const crew = phones.filter(phone => phone !== intruder);
    const [target] = crew;

    // Taunt: the chosen crewmate gets the message.
    await h.openVent(intruder);
    await h.playCard(intruder, 'Taunt Message');
    const taunt = intruder.getByRole('dialog', { name: 'Send Taunt' });
    await taunt.getByRole('combobox').selectOption({ label: target.person });
    await taunt.getByRole('textbox').fill('I saw you skip that task');
    await taunt.getByRole('button', { name: /Send Taunt/ }).click();
    await expect(target.getByText('I saw you skip that task')).toBeVisible();
    await expect(intruder.getByText(`Taunt sent to ${target.person}`)).toBeVisible();
    await h.dismissMessage(intruder);

    // Fake task: it's the target's next task, and finishing it gives the trick away.
    await h.playCard(intruder, 'Fake Task');
    const fake = intruder.getByRole('dialog', { name: 'Send Fake Task' });
    await fake.getByRole('combobox').first().selectOption({ label: target.person });
    await fake.getByRole('textbox').fill('Count the spoons in the kitchen');
    await fake.getByRole('button', { name: /Send Task/ }).click();
    await h.dismissMessage(intruder);
    await h.dismissMessage(target);
    await h.swipe(target);
    await expect(target.getByText('Count the spoons in the kitchen')).toBeVisible();
    await h.sleep(1500);
    await h.swipe(target);
    await expect(target.getByText('FAKE TASK!')).toBeVisible();

    // EMP: every crew phone goes down for a while.
    await h.playCard(intruder, 'EMP');
    await h.dismissMessage(intruder);
    for (const phone of crew) await expect(phone.getByText('Devices down'), phone.person).toBeVisible();
    for (const phone of crew) await expect(phone.getByText('Devices down'), phone.person).toBeHidden({ timeout: 90000 });

    // Self report: the intruder calls a meeting from the vent.
    await h.playCard(intruder, 'Self Report');
    for (const phone of phones) await expect(phone.getByText('EMERGENCY'), phone.person).toBeVisible();
    await expect(reactor.getByText(/called it/)).toBeVisible();

    h.expectNoPageErrors([...phones, reactor]);
});

test('area denial keeps new tasks out of the denied room', async ({ browser }) => {
    const phones = await h.openPhones(browser, ['Sam', 'Alex', 'Jules', 'Riley']);
    await h.gatherRoom({
        host: phones[0], phones,
        settings: { startingCards: 1, cardDrawChance: 0, deck: { 'Area Denial / Location': 1 } },
    });
    await phones[0].getByText('Start Game').click();
    const intruder = await h.revealRoles(phones);
    const crew = phones.filter(phone => phone !== intruder);

    await h.openVent(intruder);
    await h.playCard(intruder, 'Area Denial');
    const effect = intruder.getByText('Active Effects').locator('..');
    await expect(effect).toContainText('Area Denial');
    const denied = (await effect.locator('.sg-effect__text').last().textContent()).trim();

    // Every task handed out while it's active is somewhere else.
    const worker = crew[0];
    for (let i = 0; i < 4; i++) {
        await h.swipe(worker);
        await h.sleep(2000);
        // Tasks with no room ("Other") show no location chip, so check the chip only when there is one.
        await expect(worker.getByTestId('current-task')).toBeVisible();
        await expect(worker.getByTestId('task-location').getByText(denied, { exact: true })).toHaveCount(0);
    }

    h.expectNoPageErrors(phones);
});
