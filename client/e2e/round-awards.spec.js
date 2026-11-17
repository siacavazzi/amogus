// Round awards: the crew's work and the meeting that caught the intruder earn medals, shown on
// every phone and on the laptop once the round is over, and the winner's own phone shows theirs first.
const path = require('node:path');
const { test, expect } = require('@playwright/test');
const h = require('./helpers');

test.afterEach(h.closeAll);

// E2E_SHOTS=<folder> saves screenshots of the medal screens for a look by eye.
async function shot(page, name) {
    if (!process.env.E2E_SHOTS) return;
    await page.bringToFront();
    await page.waitForTimeout(2500);
    await page.screenshot({ path: path.join(process.env.E2E_SHOTS, `${name}.png`) });
}

test('medals for the busiest crewmate and the one who called the meeting', async ({ browser }) => {
    const phones = await h.openPhones(browser, ['Sam', 'Alex', 'Jules', 'Riley']);
    const reactor = await h.openReactor(browser);
    await h.gatherRoom({ host: phones[0], phones, reactor, settings: { startingCards: 0, cardDrawChance: 0 } });
    await phones[0].getByText('Start Game').click();
    const intruder = await h.revealRoles(phones);
    const [caller, worker] = phones.filter(phone => phone !== intruder);

    // One crewmate gets two tasks done; nobody else does any.
    for (let i = 0; i < 2; i++) {
        await h.swipe(worker);
        await h.sleep(2200);
    }

    await h.voteOutIntruder(caller, phones, intruder);

    // Every phone lists the round's awards with the player and the story.
    for (const phone of phones) {
        const awards = phone.getByTestId('round-awards');
        await expect(awards, phone.person).toContainText(`Called it · ${caller.person}`);
        await expect(awards).toContainText(`Caught ${intruder.person}`);
        await expect(awards).toContainText(`Task machine · ${worker.person}`);
        await expect(awards).toContainText('2 tasks done');
    }

    // The two winners see their own medal first; everyone else goes straight to the results.
    await expect(caller.getByTestId('my-medal')).toContainText('Called it');
    await expect(worker.getByTestId('my-medal')).toContainText('Task machine');
    await expect(intruder.getByTestId('my-medal')).toHaveCount(0);
    await shot(worker, 'phone-my-medal');
    await worker.getByRole('button', { name: 'See the round' }).click();
    await expect(worker.getByTestId('my-medal')).toHaveCount(0);
    await worker.getByTestId('round-awards').scrollIntoViewIfNeeded();
    await shot(worker, 'phone-awards');

    // The laptop shows them big, and never a personal medal screen.
    await expect(reactor.getByTestId('round-awards')).toContainText(`Called it · ${caller.person}`);
    await expect(reactor.getByTestId('my-medal')).toHaveCount(0);
    await shot(reactor, 'reactor-awards');

    h.expectNoPageErrors([...phones, reactor]);
});
