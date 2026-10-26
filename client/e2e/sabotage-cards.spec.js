// The intruder's meltdown cards: Shorten Meltdown, then Remote Sabotage from the vent, and the
// room typing its codes in at the reactor. Plus two ways those cards go wrong today.
const { test, expect } = require('@playwright/test');
const h = require('./helpers');

test.afterEach(h.closeAll);

// Collect every phone's code as it appears, then type them in at the reactor until it's safe.
async function rescue(reactor, phones) {
    const codes = [];
    for (const phone of phones) {
        const shown = phone.getByTestId('meltdown-code');
        await expect(shown, phone.person).toHaveText(/^\d{4}$/);
        codes.push((await shown.textContent()).trim());
    }
    for (const pin of codes) {
        if (!(await reactor.getByText('CORE MELTDOWN').isVisible())) break;
        await reactor.getByLabel('Code digit 1').click();
        await reactor.keyboard.type(pin, { delay: 60 });
        await h.sleep(900);
    }
    await expect(reactor.getByText('CORE MELTDOWN')).toBeHidden();
}

test('Shorten Meltdown, then Remote Sabotage from the vent, and the room stops it', async ({ browser }) => {
    const phones = await h.openPhones(browser, ['Sam', 'Alex', 'Jules', 'Riley']);
    const reactor = await h.openReactor(browser);
    await h.gatherRoom({
        host: phones[0], phones, reactor,
        settings: { meltdownTime: 60, startingCards: 2, cardDrawChance: 0, deck: { 'Shorten Meltdown': 1, 'Remote Sabotage': 1 } },
    });
    await phones[0].getByText('Start Game').click();
    const intruder = await h.revealRoles(phones);

    await h.openVent(intruder);
    await h.playCard(intruder, 'Shorten Meltdown');
    await expect(intruder.getByText('Active Effects').locator('..')).toContainText('Shorten Meltdown');

    // The sabotage goes off without anyone touching the reactor, and it's shorter than 60s.
    await h.playCard(intruder, 'Remote Sabotage');
    await expect(reactor.getByText('CORE MELTDOWN')).toBeVisible();
    const timer = reactor.getByLabel(/seconds until meltdown/);
    const seconds = Number((await timer.getAttribute('aria-label')).match(/\d+/)[0]);
    expect(seconds, 'Shorten Meltdown took time off').toBeLessThanOrEqual(50);

    await rescue(reactor, phones);
    for (const phone of phones) {
        await expect(phone.getByRole('dialog', { name: 'Meltdown averted' }), phone.person).toBeVisible();
        await phone.getByRole('button', { name: 'Got it' }).click();
    }
    // The intruder is back in the vent they played from; the shortening was used up.
    await expect(intruder.getByText('Vent network active')).toBeVisible();
    await expect(intruder.getByText('Active Effects')).toHaveCount(0);
    await intruder.getByText('Exit to safety', { exact: false }).click();
    for (const phone of phones) await expect(h.roundButton(phone), phone.person).toBeVisible();

    h.expectNoPageErrors([...phones, reactor]);
});

// KNOWN BUG: each Shorten Meltdown takes 10-15s off the next meltdown and they add up with a
// floor of 1 second. Three of them against a 30s meltdown leave the room 1 second. Remove
// test.fail() once there's a sensible floor.
test('stacked Shorten Meltdown cards still leave time to reach the reactor', async ({ browser }) => {
    test.fail();
    const phones = await h.openPhones(browser, ['Sam', 'Alex', 'Jules', 'Riley']);
    const reactor = await h.openReactor(browser);
    await h.gatherRoom({
        host: phones[0], phones, reactor,
        settings: { meltdownTime: 30, startingCards: 3, cardDrawChance: 0, deck: { 'Shorten Meltdown': 3 } },
    });
    await phones[0].getByText('Start Game').click();
    const intruder = await h.revealRoles(phones);
    await h.openVent(intruder);
    for (let i = 0; i < 3; i++) {
        await h.playCard(intruder, 'Shorten Meltdown');
        await h.dismissMessage(intruder);
        await h.sleep(500);
    }
    // Today the meltdown lasts one second: the round is over before anyone can move.
    await reactor.getByRole('button', { name: /SABOTAGE CORE/ }).click();
    for (const phone of phones) await expect(phone.getByTestId('meltdown-code'), phone.person).toHaveText(/^\d{4}$/);
    await h.sleep(5000);
    await expect(reactor.getByText('The reactor blew')).toHaveCount(0);
});

// KNOWN BUG: Remote Sabotage cards are dealt while a reactor is in the room. If the reactor
// leaves, the card still works, but codes can only be typed in at the reactor, so the
// meltdown can't be stopped and every crewmate dies. Remove test.fail() once the card is
// refused (or the meltdown can be stopped another way) when no reactor is connected.
test('Remote Sabotage does nothing once the reactor has left', async ({ browser }) => {
    test.fail();
    const phones = await h.openPhones(browser, ['Sam', 'Alex', 'Jules', 'Riley']);
    const reactor = await h.openReactor(browser);
    await h.gatherRoom({
        host: phones[0], phones, reactor,
        settings: { meltdownTime: 30, startingCards: 1, cardDrawChance: 0, deck: { 'Remote Sabotage': 1 } },
    });
    await phones[0].getByText('Start Game').click();
    const intruder = await h.revealRoles(phones);

    await reactor.getByRole('button', { name: 'Leave Room' }).first().click();
    await h.sleep(1500);
    await h.openVent(intruder);
    await h.playCard(intruder, 'Remote Sabotage');
    const crew = phones.find(phone => phone !== intruder);
    await expect(crew.getByTestId('meltdown-code')).toHaveCount(0, { timeout: 5000 });
    await h.sleep(3000);
    await expect(crew.getByTestId('meltdown-code')).toHaveCount(0);
});
