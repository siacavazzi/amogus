// Meetings that go nowhere, people who turn up late, and phones that drop off the network.
const { test, expect } = require('@playwright/test');
const h = require('./helpers');

test.afterEach(h.closeAll);

test('a split vote ejects no one and the round carries on', async ({ browser }) => {
    const phones = await h.openPhones(browser, ['Sam', 'Alex', 'Jules', 'Riley']);
    await h.gatherRoom({ host: phones[0], phones });
    await phones[0].getByText('Start Game').click();
    const intruder = await h.revealRoles(phones);
    const [a, b, c, d] = phones;

    await h.callMeeting(phones.find(phone => phone !== intruder), phones);
    await h.vote([[a, b], [b, a], [c, b], [d, a]]);
    for (const phone of phones) await expect(phone.getByText('No one was ejected'), phone.person).toBeVisible({ timeout: 30000 });
    await h.continueAfterResults(phones);
    for (const phone of phones) await expect(h.roundButton(phone), phone.person).toBeVisible();

    h.expectNoPageErrors(phones);
});

test('someone who opens the invite link mid-round is told to wait, then joins the next round', async ({ browser }) => {
    const phones = await h.openPhones(browser, ['Sam', 'Alex', 'Jules', 'Riley']);
    const [host] = phones;
    const code = await h.gatherRoom({ host, phones });
    await host.getByText('Start Game').click();
    const intruder = await h.revealRoles(phones);

    // The latecomer is no longer turned away: they join the waiting list for the next round.
    const late = await h.openPhone(browser, 'Kai');
    await late.goto(`/play?room=${code}`);
    await expect(late.getByTestId('round-on-notice')).toBeVisible();
    await late.getByPlaceholder(/name/i).first().fill('Kai');
    await late.getByText('Next: Choose Avatar').click();
    await late.getByRole('button', { name: 'Join Game', exact: true }).click();
    await expect(late.getByTestId('waiting-next-round')).toBeVisible();

    // After the round, the latecomer is in the lobby for the next one without doing anything.
    await h.voteOutIntruder(phones.find(phone => phone !== intruder), phones, intruder);
    for (const phone of phones) await phone.getByRole('button', { name: /Play Again/ }).click();
    await h.expectLobby(host);
    await h.expectLobby(late);
    await expect(host.getByText('Kai')).toBeVisible();

    h.expectNoPageErrors([...phones, late]);
});

test('a phone that loses its connection mid-round comes back to the same task', async ({ browser }) => {
    const phones = await h.openPhones(browser, ['Sam', 'Alex', 'Jules', 'Riley']);
    await h.gatherRoom({ host: phones[0], phones });
    await phones[0].getByText('Start Game').click();
    const intruder = await h.revealRoles(phones);
    const dropper = phones.find(phone => phone !== intruder);
    const task = (await dropper.getByTestId('current-task').textContent()).trim();

    await h.goOffline(dropper);
    // Chromium doesn't always close the socket when offline; then the drop shows after the ping timeout.
    await expect(dropper.getByText(/Reconnect|Connection lost/).first()).toBeVisible({ timeout: 60000 });
    await h.sleep(3000);
    await h.goOnline(dropper);
    await expect(dropper.getByText('CALL MEETING')).toBeVisible({ timeout: 30000 });
    await expect(dropper.getByTestId('current-task')).toHaveText(task);

    h.expectNoPageErrors(phones);
});
