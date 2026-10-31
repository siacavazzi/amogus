// The other ways a round ends: the intruder wins, the reactor blows, and the crew's tasks
// reach 100% and expose the intruder.
const { test, expect } = require('@playwright/test');
const h = require('./helpers');

test.afterEach(h.closeAll);

test('the intruder wins once the crew is down to one', async ({ browser }) => {
    const phones = await h.openPhones(browser, ['Sam', 'Alex', 'Jules', 'Riley']);
    const reactor = await h.openReactor(browser);
    await h.gatherRoom({ host: phones[0], phones, reactor });
    await phones[0].getByText('Start Game').click();
    const intruder = await h.revealRoles(phones);
    const [caller, victim, suspect] = phones.filter(phone => phone !== intruder);

    // A body is found: the victim says so from the meeting screen and is out.
    await caller.getByText('CALL MEETING').click();
    await expect(victim.getByText('Go to the meeting spot', { exact: false })).toBeVisible();
    await h.tapAndConfirm(victim.getByRole('button', { name: "I've Been Killed" }));
    await expect(victim.getByText("You're out")).toBeVisible();
    await expect(victim.getByText('Murdered', { exact: true })).toBeVisible();

    // The room votes out the wrong person, leaving one crewmate against the intruder.
    const living = phones.filter(phone => phone !== victim);
    await h.readyUp(living);
    await h.vote(living.map(phone => [phone, phone === suspect ? caller : suspect]));
    // Everyone reads the result, the ghost included.
    await h.continueAfterResults(phones);
    for (const phone of phones) await expect(phone.getByText('Intruders Win!'), phone.person).toBeVisible({ timeout: 30000 });
    await expect(phones[0].getByText(`${intruder.person} got away with it.`)).toBeVisible();
    await expect(reactor.getByText('Intruders Win!')).toBeVisible();

    h.expectNoPageErrors([...phones, reactor]);
});

test('a meltdown nobody stops ends the game', async ({ browser }) => {
    test.setTimeout(5 * 60 * 1000);
    const phones = await h.openPhones(browser, ['Sam', 'Alex', 'Jules', 'Riley']);
    const reactor = await h.openReactor(browser);
    await h.gatherRoom({ host: phones[0], phones, reactor, settings: { meltdownTime: 30 } });
    await phones[0].getByText('Start Game').click();
    await h.revealRoles(phones);

    await reactor.getByRole('button', { name: /SABOTAGE CORE/ }).click();
    for (const phone of phones) await expect(phone.getByTestId('meltdown-code')).toHaveText(/^\d{4}$/);
    await expect(reactor.getByLabel(/seconds until meltdown/)).toBeVisible();

    for (const page of [...phones, reactor]) await expect(page.getByText('The reactor blew')).toBeVisible({ timeout: 60000 });
    await expect(phones[1].getByRole('button', { name: /Play Again/ })).toBeVisible();

    h.expectNoPageErrors([...phones, reactor]);
});

test('finishing every task exposes the intruder', async ({ browser }) => {
    test.setTimeout(6 * 60 * 1000);
    const phones = await h.openPhones(browser, ['Sam', 'Alex', 'Jules', 'Riley']);
    const reactor = await h.openReactor(browser);
    await h.gatherRoom({ host: phones[0], phones, reactor, settings: { tasksPerPlayer: 5, startingCards: 0, cardDrawChance: 0 } });
    await phones[0].getByText('Start Game').click();
    const intruder = await h.revealRoles(phones);
    const crew = phones.filter(phone => phone !== intruder);

    // The crew works through the list until the room hits 100%.
    const revealed = phone => phone.getByText('Every task is done').first();
    for (let turn = 0; turn < 60 && !(await revealed(crew[0]).isVisible()); turn++) {
        const phone = crew[turn % crew.length];
        if (await phone.getByRole('slider').first().isVisible()) {
            await h.swipe(phone);
            await h.sleep(1800);
        }
    }

    // Every phone, the intruder's included, shows the same reveal with the intruder's name.
    for (const phone of phones) {
        await expect(revealed(phone), phone.person).toBeVisible();
        await expect(phone.getByText('The intruder is')).toBeVisible();
        await expect(phone.getByText(intruder.person, { exact: true }).first()).toBeVisible();
    }
    await expect(reactor.getByText(intruder.person).first()).toBeVisible();

    h.expectNoPageErrors([...phones, reactor]);
});
