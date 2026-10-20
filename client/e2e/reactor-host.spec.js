// The big screen creates the room. A phone has to become host, and the reactor's Play Again
// has to bring everyone back to the lobby.
const { test, expect } = require('@playwright/test');
const h = require('./helpers');

test.afterEach(h.closeAll);

test('a room created on the reactor gets a phone host and plays again from the reactor', async ({ browser }) => {
    const reactor = await h.openReactor(browser);
    const code = await h.createRoom(reactor);

    const phones = [];
    for (const name of ['Sam', 'Alex', 'Jules']) {
        const phone = await h.openPhone(browser, name);
        await h.joinRoom(phone, code);
        phones.push(phone);
    }
    const [host, ...guests] = phones;
    await expect(reactor.getByText('3 players connected')).toBeVisible();

    // The first phone in hosts; the others wait for it.
    await expect(host.getByText('Start Game')).toBeVisible();
    for (const guest of guests) await expect(guest.getByText('Waiting for host to start the game...')).toBeVisible();

    await host.getByText('Start Game').click();
    const intruder = await h.revealRoles(phones);
    const caller = phones.find(phone => phone !== intruder);
    await h.voteOutIntruder(caller, phones, intruder);
    await expect(reactor.getByText('Crewmates Win!')).toBeVisible();

    // One tap on the reactor brings the whole room back.
    await reactor.getByRole('button', { name: /Play Again/ }).click();
    await h.expectLobby(reactor);
    for (const phone of phones) await h.expectLobby(phone);
    await expect(host.getByText('Start Game')).toBeVisible();

    h.expectNoPageErrors([...phones, reactor]);
});
