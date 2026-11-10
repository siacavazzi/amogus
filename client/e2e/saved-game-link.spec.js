// "Save this game" links in a group chat: the first friend to open the link hosts a new room with
// that game's tasks, everyone who opens it after that joins the room, and once that room is over
// the same link opens a fresh one (the next week, say).
const { test, expect } = require('@playwright/test');
const h = require('./helpers');

test.afterEach(h.closeAll);

const shot = (page, name) => page.screenshot({ path: test.info().outputPath(name) });

test('a saved game link: the first tap hosts, the next taps join, and it works again later', async ({ browser }) => {
    const phones = await h.openPhones(browser, ['Sam', 'Alex', 'Jules']);
    await h.gatherRoom({ host: phones[0], phones });
    await phones[0].getByText('Start Game').click();
    const intruder = await h.revealRoles(phones);
    await h.voteOutIntruder(phones.find(phone => phone !== intruder), phones, intruder);

    // The link Save this game shares: the list code, and the group's token after the '#'.
    await expect.poll(() => phones[1].evaluate(() => JSON.parse(localStorage.getItem('sus_last_game_v1') || 'null')?.group))
        .toBeTruthy();
    const link = await phones[1].evaluate(() => {
        const game = JSON.parse(localStorage.getItem('sus_last_game_v1'));
        return `/play?list=${game.code}&utm_source=saved-game#group=${game.group}`;
    });
    // Everyone goes home, and the room is left behind.
    for (const phone of phones) await phone.goto('/among-us-irl');
    await h.closeAll();

    // Another night: Mia, on a phone that never played, opens the link first and is the host.
    const [mia, noah, ola] = await h.openPhones(browser, ['Mia', 'Noah', 'Ola']);
    await mia.goto(link);
    await expect(mia.getByText('Use This Task List').first()).toBeVisible({ timeout: 20000 });
    await expect(mia, 'the saved game leaves the address, so a reload does not open it twice').not.toHaveURL(/list=|group=/);
    await shot(mia, '1-first-tap-hosts.png');
    const room = await mia.evaluate(() => localStorage.getItem('room_code'));

    // Noah taps it while Mia is still setting up: he waits for her room, he doesn't start another.
    await noah.goto(link);
    await expect(noah.getByText('Waiting for the host to open the room')).toBeVisible();
    await expect(noah.getByText(`Room ${room}`)).toBeVisible();
    await shot(noah, '2-next-tap-waits-for-host.png');

    await mia.getByText('Use This Task List').first().click();
    await mia.getByText('Open Room').first().click();
    await h.enterName(mia);
    await expect(noah.getByPlaceholder(/name/i).first()).toBeVisible({ timeout: 20000 });
    await h.enterName(noah);

    // Ola taps it once the room is open: straight to her name, in the same room.
    await ola.goto(link);
    await expect(ola.getByPlaceholder(/name/i).first()).toBeVisible({ timeout: 20000 });
    await shot(ola, '3-later-tap-joins.png');
    await h.enterName(ola);
    await expect(mia.getByText('Ola')).toBeVisible();
    expect(await ola.evaluate(() => localStorage.getItem('room_code'))).toBe(room);
    h.expectNoPageErrors([mia, noah, ola]);

    // Everyone goes home again. Next time the link opens a new room.
    await h.closeAll();
    const [next] = await h.openPhones(browser, ['Kai']);
    await next.goto(link);
    await expect(next.getByText('Use This Task List').first()).toBeVisible({ timeout: 20000 });
    expect(await next.evaluate(() => localStorage.getItem('room_code'))).not.toBe(room);
});
