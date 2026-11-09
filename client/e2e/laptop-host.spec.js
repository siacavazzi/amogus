// Someone on a laptop taps Create New Game: before setup, the laptop says everyone (the host
// too) plays on a phone, and offers to start from the phone instead. 29 laptop rooms in a week
// (2026-11) produced one played round; phone-hosted rooms played about a third of the time.
const { test, expect } = require('@playwright/test');
const h = require('./helpers');

test.afterEach(h.closeAll);

test('a laptop says you play on a phone before setup, and the room tells you to join', async ({ browser }) => {
    const laptop = await h.openReactor(browser);
    await laptop.goto('/play');
    await laptop.getByText('Create New Game').click();

    const prompt = laptop.getByRole('dialog', { name: 'Everyone plays on a phone, you too' });
    await expect(prompt).toBeVisible();
    // Hosting from the phone: a code that opens /play on the phone, and no room opened here.
    await prompt.getByRole('button', { name: /Host from my phone instead/ }).click();
    await expect(laptop.getByTestId('laptop-phone-qr')).toHaveAttribute('data-url', /\/play\?from=laptop/);
    if (process.env.E2E_SHOT) await laptop.screenshot({ path: `${process.env.E2E_SHOT}-phone.png` });
    await laptop.getByRole('button', { name: /Back/ }).click();
    if (process.env.E2E_SHOT) await laptop.screenshot({ path: `${process.env.E2E_SHOT}-prompt.png` });
    await laptop.getByRole('button', { name: /Set up on this laptop/ }).click();

    await h.addExampleList(laptop);
    await laptop.getByText('Use This Task List').first().click();
    await laptop.getByText('Open Room').click();
    const code = (await laptop.getByTestId('room-code').textContent()).trim();
    await expect(laptop.getByTestId('reactor-host-hint')).toHaveText('Now join on your phone. The first phone in is the host and starts the game.');
    if (process.env.E2E_SHOT) await laptop.screenshot({ path: `${process.env.E2E_SHOT}-reactor.png` });

    const phone = await h.openPhone(browser, 'Sam');
    await h.joinRoom(phone, code);
    await expect(laptop.getByTestId('reactor-host-hint')).toHaveText('Sam is the host. Start the game from their phone.');

    // Once a phone has joined one of its rooms, this laptop goes straight to setup next time.
    await laptop.getByRole('button', { name: /Leave Room/ }).click();
    await laptop.getByText('Create New Game').click();
    await expect(laptop.getByRole('heading', { name: 'Task list' })).toBeVisible();
    await expect(prompt).toHaveCount(0);

    h.expectNoPageErrors([laptop, phone]);
});
