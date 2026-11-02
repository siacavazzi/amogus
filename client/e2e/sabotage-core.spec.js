// SABOTAGE CORE on the big screen must start a meltdown. On prod (2026-11-02, a test game) a
// second big screen opened on the room and closed again; the server forgot the first one, and its
// sabotage counted down and did nothing. Earlier tests only ever had one big screen, in its own
// browser, so this was never tried. (A screen whose browser also played as a phone is covered in
// server/tests/test_reactor_sabotage.py and ReactorPage.test.js.)
const { test, expect } = require('@playwright/test');
const h = require('./helpers');

test.afterEach(h.closeAll);

async function sabotageReachesPhones(reactor, phones) {
    await reactor.getByRole('button', { name: /SABOTAGE CORE/ }).click();
    await expect(reactor.getByText('CORE MELTDOWN')).toBeVisible({ timeout: 10000 });
    for (const phone of phones) await expect(phone.getByTestId('meltdown-code'), phone.person).toHaveText(/^\d{4}$/);
}

test('the big screen still sabotages after a second screen opens on the room and leaves', async ({ browser }) => {
    const phones = await h.openPhones(browser, ['Sam', 'Alex', 'Jules', 'Riley']);
    const reactor = await h.openReactor(browser);
    const code = await h.gatherRoom({ host: phones[0], phones, reactor });
    await phones[0].getByText('Start Game').click();
    await h.revealRoles(phones);

    const second = await h.openPage(browser, 'Second screen', { viewport: { width: 1280, height: 800 } });
    // Mid-round, the invite link puts a desktop straight onto the room's big screen.
    await second.goto(`/play?room=${code}`);
    await expect(second.getByRole('button', { name: /SABOTAGE CORE/ })).toBeVisible();
    await second.getByRole('button', { name: /Leave Room/ }).click();
    await h.sleep(500);

    await sabotageReachesPhones(reactor, phones);
    h.expectNoPageErrors([...phones, reactor]);
});
