// After the round: the next round starts clean for everyone, including the dead. Plus Play
// Again with a phone that has gone quiet (a known gap), and what a phone is told about other
// people's roles.
const { test, expect } = require('@playwright/test');
const h = require('./helpers');

test.afterEach(h.closeAll);

test('after Play Again the ghosts are back, roles are dealt again and progress starts at zero', async ({ browser }) => {
    const phones = await h.openPhones(browser, ['Sam', 'Alex', 'Jules', 'Riley', 'Kai']);
    const reactor = await h.openReactor(browser);
    await h.gatherRoom({ host: phones[0], phones, reactor });
    await phones[0].getByText('Start Game').click();
    const intruder = await h.revealRoles(phones);
    const [caller, innocent, ...rest] = phones.filter(phone => phone !== intruder);

    // Some progress, then an innocent is voted out.
    const progress = reactor.getByRole('progressbar');
    await h.swipe(caller);
    await expect(progress).not.toHaveAttribute('aria-label', 'Progress: 0%');
    await h.callMeeting(caller, phones);
    await h.vote(phones.map(phone => [phone, phone === innocent ? caller : innocent]));
    await h.continueAfterResults(phones);
    await expect(innocent.getByText("You're out")).toBeVisible({ timeout: 20000 });

    // The room votes the intruder out, then everyone taps Play Again.
    const living = phones.filter(phone => phone !== innocent);
    await h.callMeeting(caller, living);
    await h.vote(living.map(phone => [phone, phone === intruder ? caller : intruder]));
    await h.continueAfterResults(phones);
    for (const phone of phones) await expect(phone.getByText('Crewmates Win!'), phone.person).toBeVisible({ timeout: 30000 });
    for (const phone of phones) await phone.getByRole('button', { name: /Play Again/ }).click();
    for (const phone of phones) await h.expectLobby(phone);

    // Round two: everyone, the ghost included, gets a role and a live round screen.
    await phones[0].getByText('Start Game').click();
    await h.revealRoles(phones);
    for (const phone of phones) {
        await expect(h.roundButton(phone), phone.person).toBeVisible();
        await expect(phone.getByText("You're out")).toHaveCount(0);
    }
    await expect(progress).toHaveAttribute('aria-label', 'Progress: 0%');

    h.expectNoPageErrors([...phones, reactor]);
});

// Play Again needs a tap from every connected phone; a phone dropping off re-checks the count.
test('Play Again goes through when the only phone left to tap goes offline', async ({ browser }) => {
    const phones = await h.openPhones(browser, ['Sam', 'Alex', 'Jules', 'Riley']);
    await h.gatherRoom({ host: phones[0], phones });
    await phones[0].getByText('Start Game').click();
    const intruder = await h.revealRoles(phones);
    await h.voteOutIntruder(phones.find(phone => phone !== intruder), phones, intruder);

    const holdout = phones[3];
    const tappers = phones.slice(0, 3);
    for (const phone of tappers) await phone.getByRole('button', { name: /Play Again/ }).click();
    await expect(tappers[0].getByText('3 / 4 players ready')).toBeVisible();
    await holdout.context().close();
    for (const phone of tappers) await h.expectLobby(phone);
});

// Nothing a crewmate's phone receives names the intruder, even in the browser's network tools.
test("a crewmate's phone is never told who the intruder is", async ({ browser }) => {
    const phones = await h.openPhones(browser, ['Sam', 'Alex', 'Jules', 'Riley']);
    for (const phone of phones) {
        phone.frames = [];
        phone.on('websocket', socket => socket.on('framereceived', frame => phone.frames.push(String(frame.payload))));
    }
    await h.gatherRoom({ host: phones[0], phones });
    await phones[0].getByText('Start Game').click();
    const intruder = await h.revealRoles(phones);
    const crewmate = phones.find(phone => phone !== intruder);

    const leaks = crewmate.frames.filter(frame => /\\*"sus\\*":\s*true/.test(frame));
    expect(leaks, `${crewmate.person}'s phone was sent the intruder's role`).toEqual([]);
});
