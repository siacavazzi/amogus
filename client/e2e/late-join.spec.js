// Someone arrives while a round is on. They used to be turned away; now they join a waiting
// list, see "You're in!", and are dealt in when the room goes back to the lobby. The round
// they missed never counts them: not for meetings, not for the Play Again tally.
const { test, expect } = require('@playwright/test');
const h = require('./helpers');

test.afterEach(h.closeAll);

test('a latecomer waits out the round, then plays the next one', async ({ browser }) => {
    const phones = await h.openPhones(browser, ['Sam', 'Alex', 'Jules', 'Riley', 'Kai']);
    const [host] = phones;
    const reactor = await h.openReactor(browser);
    const code = await h.gatherRoom({ host, phones, reactor });
    await expect(reactor.getByText('Kai')).toBeVisible();

    await host.getByText('Start Game').click();
    const intruder = await h.revealRoles(phones);
    const crew = phones.filter(phone => phone !== intruder);

    // The reactor invites latecomers during the round, in a corner clear of the sabotage button.
    await expect(reactor.getByText('Late? Scan to join the next round')).toBeVisible();

    // Morgan scans in mid-round: told up front that they play from the next round.
    const late = await h.openPhone(browser, 'Morgan');
    await late.goto(`/play?room=${code}`);
    await expect(late.getByTestId('round-on-notice')).toBeVisible();
    await late.getByPlaceholder(/name/i).first().fill('Morgan');
    await late.getByText('Next: Choose Avatar').click();
    await late.getByRole('button', { name: 'Join Game', exact: true }).click();
    await expect(late.getByTestId('waiting-next-round')).toBeVisible();
    await expect(late.getByText("You're in!")).toBeVisible();
    await expect(late.getByText('Morgan')).toBeVisible();
    await expect(reactor.getByText('+1 joining next round')).toBeVisible();

    // A reload keeps them on the list.
    await late.reload();
    await expect(late.getByTestId('waiting-next-round')).toBeVisible();

    // The meeting only waits for the five in the round, and the latecomer just watches it go by.
    await h.callMeeting(crew[0], phones);
    await expect(late.getByTestId('waiting-round-status')).toHaveText(/A meeting is on/);
    const someoneElse = phones.find(phone => phone !== intruder);
    await h.vote(phones.map(phone => [phone, phone === intruder ? someoneElse : intruder]));
    await h.continueAfterResults(phones);
    for (const phone of phones) await expect(phone.getByText('Crewmates Win!')).toBeVisible({ timeout: 30000 });
    await expect(late.getByTestId('waiting-round-status')).toHaveText(/This round is over/);
    await expect(late.getByText('Crewmates Win!')).toHaveCount(0);

    // Play Again needs only the five who played.
    for (const phone of phones) await phone.getByRole('button', { name: /Play Again/ }).click();
    for (const phone of phones) await h.expectLobby(phone);
    await h.expectLobby(late);
    await expect(late.getByText('You', { exact: true })).toBeVisible();
    await expect(host.getByText('Morgan')).toBeVisible();
    await expect(reactor.getByText('Morgan')).toBeVisible();

    // Round two deals Morgan in like anyone else.
    await host.getByText('Start Game').click();
    await h.revealAllRoles([...phones, late]);
    await expect(h.roundButton(late)).toBeVisible();

    h.expectNoPageErrors([...phones, late, reactor]);
});

test('a latecomer who leaves the waiting list is gone from the next round', async ({ browser }) => {
    const phones = await h.openPhones(browser, ['Sam', 'Alex', 'Jules']);
    const [host] = phones;
    const code = await h.gatherRoom({ host, phones });
    await host.getByText('Start Game').click();
    await h.revealRoles(phones);

    const late = await h.openPhone(browser, 'Morgan');
    await late.goto(`/play?room=${code}`);
    await late.getByPlaceholder(/name/i).first().fill('Morgan');
    await late.getByText('Next: Choose Avatar').click();
    await late.getByRole('button', { name: 'Join Game', exact: true }).click();
    await expect(late.getByTestId('waiting-next-round')).toBeVisible();

    await late.getByRole('button', { name: 'Leave game' }).click();
    await expect(late.getByText("You'll leave this room.")).toBeVisible();
    await late.getByRole('button', { name: /^Leave/ }).last().click();
    await expect(late.getByTestId('waiting-next-round')).toHaveCount(0);

    h.expectNoPageErrors([...phones, late]);
});
