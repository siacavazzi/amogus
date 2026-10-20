// The reactor sabotages the core, the room types in their codes, then a meeting and a rejoin
// must not bring the code screen back.
const { test, expect } = require('@playwright/test');
const h = require('./helpers');

test.afterEach(h.closeAll);

test('a rescued meltdown stays over through a meeting and a rejoin', async ({ browser }) => {
    const phones = [];
    for (const name of ['Sam', 'Alex', 'Jules', 'Riley', 'Kai']) phones.push(await h.openPhone(browser, name));
    const [host] = phones;
    const reactor = await h.openReactor(browser);

    const code = await h.createRoomOnPhone(host);
    await h.enterName(host);
    await h.connectReactor(reactor, code);
    for (const phone of phones.slice(1)) await h.joinRoom(phone, code);

    await host.getByText('Start Game').click();
    const intruder = await h.revealRoles(phones);
    const crew = phones.filter(phone => phone !== intruder);

    // Sabotage from the reactor: every living phone gets a code.
    await reactor.getByRole('button', { name: /SABOTAGE CORE/ }).click();
    await expect(reactor.getByText('CORE MELTDOWN')).toBeVisible();
    const codes = [];
    for (const phone of phones) {
        const shown = phone.getByTestId('meltdown-code');
        await expect(shown).toHaveText(/^\d{4}$/);
        codes.push((await shown.textContent()).trim());
    }

    // People type their codes in at the reactor until it's safe.
    for (const pin of codes) {
        if (!(await reactor.getByText('CORE MELTDOWN').isVisible())) break;
        await reactor.getByLabel('Code digit 1').click();
        await reactor.keyboard.type(pin, { delay: 60 });
        await h.sleep(900);
    }
    await expect(reactor.getByText('CORE MELTDOWN')).toBeHidden();
    for (const phone of phones) {
        await expect(phone.getByRole('dialog', { name: 'Meltdown averted' })).toBeVisible();
        await phone.getByRole('button', { name: 'Got it' }).click();
        await expect(h.roundButton(phone)).toBeVisible();
    }

    // A meeting where an innocent goes out, so the round carries on.
    const innocent = crew[1];
    await h.callMeeting(crew[0], phones);
    await h.vote(phones.map(phone => [phone, phone === innocent ? crew[2] : innocent]));
    await h.continueAfterResults(phones);
    const living = phones.filter(phone => phone !== innocent);
    for (const phone of living) {
        await expect(h.roundButton(phone)).toBeVisible({ timeout: 20000 });
        await expect(phone.getByTestId('meltdown-code')).toHaveCount(0);
    }

    // A phone that reloads mid-round comes back to its tasks, not to an old code.
    const rejoiner = living[1];
    await rejoiner.reload();
    await expect(h.roundButton(rejoiner)).toBeVisible({ timeout: 20000 });
    await expect(rejoiner.getByTestId('meltdown-code')).toHaveCount(0);

    h.expectNoPageErrors([...phones, reactor]);
});
