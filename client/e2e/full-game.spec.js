// A whole evening on five phones and the reactor: set up, play a round, play again.
const { test, expect } = require('@playwright/test');
const h = require('./helpers');

test.afterEach(h.closeAll);

test('five phones and a reactor play a round, then play again', async ({ browser }) => {
    const names = ['Sam', 'Alex', 'Jules', 'Riley', 'Kai'];
    const phones = [];
    for (const name of names) phones.push(await h.openPhone(browser, name));
    const [host] = phones;
    const reactor = await h.openReactor(browser);

    const code = await h.createRoomOnPhone(host);
    await h.enterName(host);
    await h.connectReactor(reactor, code);
    for (const phone of phones.slice(1)) await h.joinRoom(phone, code);
    await expect(reactor.getByText('Kai')).toBeVisible();

    // Round one
    await host.getByText('Start Game').click();
    const intruder = await h.revealRoles(phones);
    const crew = phones.filter(phone => phone !== intruder);

    // Crew and intruder phones look the same: same task screen, same button.
    for (const phone of [crew[0], intruder]) {
        await expect(phone.getByRole('slider').first()).toBeVisible();
        await expect(phone.getByText('CALL MEETING')).toBeVisible();
    }

    // A crewmate finishes a task and the reactor's progress moves.
    const before = await reactor.getByRole('progressbar').getAttribute('aria-label');
    await h.swipe(crew[0]);
    await expect(reactor.getByRole('progressbar')).not.toHaveAttribute('aria-label', before);

    // The intruder holds CALL MEETING to open the vent, then leaves it.
    const release = await h.hold(intruder, intruder.getByText('CALL MEETING'), 1400);
    await release();
    await expect(intruder.getByText('Exit to safety', { exact: false })).toBeVisible();
    await intruder.getByText('Exit to safety', { exact: false }).click();

    // A crewmate calls a meeting and the room votes the intruder out.
    await h.voteOutIntruder(crew[0], phones, intruder);
    await expect(reactor.getByText('Crewmates Win!')).toBeVisible();

    // Everyone taps Play Again and the room is back in the lobby.
    for (const phone of phones) await phone.getByRole('button', { name: /Play Again/ }).click();
    for (const phone of phones) await h.expectLobby(phone);
    await h.expectLobby(reactor);

    // Round two starts from the same room.
    await host.getByText('Start Game').click();
    await h.revealRoles(phones);
    await expect(crew[0].getByRole('slider').first()).toBeVisible();

    h.expectNoPageErrors([...phones, reactor]);
});
