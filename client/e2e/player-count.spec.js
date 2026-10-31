// Any player count: rooms start on Auto (1 intruder per 5 players), the host can still pick a
// number, and a 40-player room can start, beat a meltdown on the one keypad and fit everyone
// on the big screen. A group of about 40 lost every game to fixed numbers on 2026-10-30.
const { test, expect } = require('@playwright/test');
const h = require('./helpers');

test.afterEach(h.closeAll);

const names = count => Array.from({ length: count }, (_, i) => `Guest ${i + 1}`);

test('setup starts on Auto and eight players get two intruders', async ({ browser }) => {
    const phones = await h.openPhones(browser, names(8));
    const [host] = phones;
    await host.goto('/play');
    await h.skipTutorialPrompt(host);
    await host.getByText('Create New Game').first().click();
    await h.addExampleList(host);
    await host.getByText('Use This Task List').first().click();
    await expect(host.getByRole('button', { name: 'Auto', exact: true })).toHaveAttribute('aria-pressed', 'true');
    await expect(host.getByTestId('intruder-advice')).toContainText('1 intruder per 5 players');
    await host.getByText('Open Room').first().click();
    const code = await host.evaluate(() => localStorage.getItem('room_code'));
    await h.enterName(host);
    for (const phone of phones.slice(1)) await h.joinRoom(phone, code);

    await expect(host.getByTestId('lobby-intruder-count')).toHaveText('2 intruders this round (Auto: 1 per 5 players)');
    await host.getByText('Start Game').click();
    expect((await h.revealAllRoles(phones)).length).toBe(2);
    h.expectNoPageErrors(phones);
});

test('a number the host picks sticks', async ({ browser }) => {
    const phones = await h.openPhones(browser, names(7));
    const [host] = phones;
    // Auto would give seven players one intruder.
    await h.gatherRoom({ host, phones, settings: { intruders: 2 } });
    await expect(host.getByTestId('lobby-intruder-count')).toHaveText('2 intruders this round');
    await host.getByText('Start Game').click();
    expect((await h.revealAllRoles(phones)).length).toBe(2);
    h.expectNoPageErrors(phones);
});

test('forty players: eight intruders, a meltdown the keypad can win, and a roll call that fits', async ({ browser }) => {
    test.setTimeout(15 * 60 * 1000);
    const reactor = await h.openPage(browser, 'Reactor', { viewport: { width: 1366, height: 768 } });
    const code = await h.createRoom(reactor);
    const phones = await h.openPhones(browser, names(40));
    const [host] = phones;
    await h.joinRoom(host, code);
    for (let i = 1; i < phones.length; i += 10) await Promise.all(phones.slice(i, i + 10).map(phone => h.joinRoom(phone, code)));
    await expect(reactor.getByText('40 players connected')).toBeVisible();

    // The example list has 92 tasks; forty players need 60, not 120.
    await expect(host.getByTestId('lobby-intruder-count')).toHaveText('8 intruders this round (Auto: 1 per 5 players)');
    await host.getByText('Start Game').click();
    const intruders = await h.revealAllRoles(phones);
    expect(intruders.length).toBe(8);
    const crew = phones.filter(phone => !intruders.includes(phone));

    // A meltdown asks for 8 codes, not 24, and 8 people can type theirs in time.
    await reactor.getByRole('button', { name: /SABOTAGE CORE/ }).click();
    await expect(reactor.getByText('CORE MELTDOWN')).toBeVisible();
    await expect(reactor.getByText('8 More Codes Needed!')).toBeVisible();
    for (const phone of crew.slice(0, 8)) {
        const shown = phone.getByTestId('meltdown-code');
        await expect(shown).toHaveText(/^\d{4}$/);
        await reactor.getByLabel('Code digit 1').click();
        await reactor.keyboard.type((await shown.textContent()).trim(), { delay: 60 });
        await h.sleep(700);
    }
    await expect(reactor.getByText('CORE MELTDOWN')).toBeHidden();
    for (const phone of phones) {
        await expect(phone.getByRole('dialog', { name: 'Meltdown averted' })).toBeVisible();
        await phone.getByRole('button', { name: 'Got it' }).click();
        await expect(h.roundButton(phone)).toBeVisible();
    }

    // The big screen's meeting roll call shows all forty faces on a 1366x768 screen.
    await crew[0].getByText('CALL MEETING').click();
    const roll = reactor.getByTestId('reactor-roll');
    await expect(reactor.getByTestId('reactor-ready-count')).toHaveText('0 of 40 ready');
    await expect(roll.locator('.sg-rx__face')).toHaveCount(40);
    await expect(roll).toBeInViewport({ ratio: 1 });
    await expect(reactor.getByTestId('reactor-ready-count')).toBeInViewport({ ratio: 1 });
    if (process.env.E2E_SHOT) await reactor.screenshot({ path: `${process.env.E2E_SHOT}-meeting-40.png` });

    h.expectNoPageErrors([...phones, reactor]);
});
