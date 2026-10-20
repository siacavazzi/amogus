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

    const late = await h.openPhone(browser, 'Kai');
    await late.goto(`/play?room=${code}`);
    await expect(late.getByText('New players can join when the host returns to the lobby.', { exact: false })).toBeVisible();

    // After the round, the latecomer gets in for the next one.
    await h.voteOutIntruder(phones.find(phone => phone !== intruder), phones, intruder);
    for (const phone of phones) await phone.getByRole('button', { name: /Play Again/ }).click();
    await h.expectLobby(host);
    await h.joinRoom(late, code);
    await expect(host.getByText('Kai')).toBeVisible();

    h.expectNoPageErrors([...phones, late]);
});

test('a phone that loses its connection mid-round comes back to the same task', async ({ browser }) => {
    const phones = await h.openPhones(browser, ['Sam', 'Alex', 'Jules', 'Riley']);
    await h.gatherRoom({ host: phones[0], phones });
    await phones[0].getByText('Start Game').click();
    const intruder = await h.revealRoles(phones);
    const dropper = phones.find(phone => phone !== intruder);
    const task = (await dropper.getByTestId('task-location').locator('..').textContent()).trim();

    await dropper.context().setOffline(true);
    await expect(dropper.getByText(/Reconnect|Connection lost/).first()).toBeVisible({ timeout: 30000 });
    await h.sleep(3000);
    await dropper.context().setOffline(false);
    await expect(dropper.getByText('CALL MEETING')).toBeVisible({ timeout: 30000 });
    await expect(dropper.getByTestId('task-location').locator('..')).toHaveText(task);

    h.expectNoPageErrors(phones);
});
