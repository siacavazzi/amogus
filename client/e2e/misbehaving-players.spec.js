// People at a party don't use the app the way a tutorial does: they mash buttons, open the game
// twice, reload it over and over, and walk off in the middle of a meeting. None of that should
// count twice, lose anyone's seat, or stop the room.
const { test, expect } = require('@playwright/test');
const h = require('./helpers');

test.afterEach(h.closeAll);

async function startRound(browser, names, { reactor: withReactor = false } = {}) {
    const phones = await h.openPhones(browser, names);
    const reactor = withReactor ? await h.openReactor(browser) : null;
    await h.gatherRoom({ host: phones[0], phones, reactor, settings: { startingCards: 0, cardDrawChance: 0 } });
    await phones[0].getByText('Start Game').click();
    const intruder = await h.revealRoles(phones);
    return { phones, reactor, intruder, crew: phones.filter(phone => phone !== intruder) };
}

// The voting card for a player, as another phone sees it (it shows their votes so far).
const voteCard = (phone, target) => phone.getByRole('button', { name: new RegExp(`^${target.person}`) });

test('mashing Call Meeting, the ready slide and Vote counts each person once', async ({ browser }) => {
    const { phones, reactor, crew, intruder } = await startRound(browser, ['Sam', 'Alex', 'Jules', 'Riley', 'Kai'], { reactor: true });
    const [caller, masher] = crew;

    // Three taps on Call Meeting make one meeting.
    await caller.getByText('CALL MEETING').click({ clickCount: 3 });
    for (const phone of phones) await expect(phone.getByText('Go to the meeting spot', { exact: false })).toBeVisible();
    await expect(caller.getByTestId('ready-count')).toHaveText('0 of 5 ready');

    // Sliding ready again (while the first slide is still landing) counts once.
    await h.swipe(masher);
    await h.swipe(masher).catch(() => {});
    await expect(caller.getByTestId('ready-count')).toHaveText('1 of 5 ready');
    await h.readyUp(phones.filter(phone => phone !== masher));
    for (const phone of phones) await expect(phone.getByText('Select a Player'), phone.person).toBeVisible({ timeout: 20000 });

    // A double tap on a name and on Vote is still one vote.
    await voteCard(masher, intruder).dblclick();
    const voteButton = masher.getByRole('button', { name: /^Vote for/ });
    await voteButton.dblclick().catch(() => {});
    await voteButton.click({ timeout: 2000 }).catch(() => {});
    await expect(voteCard(caller, intruder)).toContainText('1');
    await expect(voteCard(caller, intruder)).not.toContainText('2');

    // The rest vote and the intruder goes, with the right count.
    await h.vote(phones.filter(phone => phone !== masher).map(phone => [phone, phone === intruder ? caller : intruder]));
    await h.continueAfterResults(phones);
    for (const phone of phones) await expect(phone.getByText('Crewmates Win!'), phone.person).toBeVisible({ timeout: 30000 });

    // Play Again mashed by everyone takes the room back to the lobby once, and the next round starts.
    for (const phone of phones) await phone.getByRole('button', { name: /Play Again/ }).click({ clickCount: 2 }).catch(() => {});
    for (const phone of phones) await h.expectLobby(phone);
    await phones[0].getByText('Start Game').click();
    await h.revealRoles(phones);
    for (const phone of phones) await expect(h.roundButton(phone), phone.person).toBeVisible();

    h.expectNoPageErrors([...phones, reactor]);
});

test('the same phone opens the game in a second tab mid-round and keeps one seat', async ({ browser }) => {
    const { phones, crew } = await startRound(browser, ['Sam', 'Alex', 'Jules', 'Riley']);
    const twoTabs = crew[1];
    const task = (await twoTabs.getByTestId('task-location').locator('..').textContent()).trim();

    // A second tab in the same browser (same saved player) opens the game.
    const second = await twoTabs.context().newPage();
    second.person = `${twoTabs.person} (tab 2)`;
    second.errors = [];
    second.on('pageerror', error => second.errors.push(error.message));
    await second.goto('/play');
    await expect(second.getByText('CALL MEETING')).toBeVisible({ timeout: 30000 });
    await expect(second.getByTestId('task-location').locator('..')).toHaveText(task);

    // The room still counts four people, and the newest tab plays for them.
    await crew[0].getByText('CALL MEETING').click();
    await expect(crew[0].getByTestId('ready-count')).toHaveText('0 of 4 ready');
    await h.readyUp([second, ...phones.filter(phone => phone !== twoTabs)]);
    for (const phone of [second, ...phones.filter(phone => phone !== twoTabs)]) {
        await expect(phone.getByText('Select a Player'), phone.person).toBeVisible({ timeout: 20000 });
    }

    h.expectNoPageErrors([...phones.filter(phone => phone !== twoTabs), second]);
});

test('reloading over and over mid-round lands back in the same round', async ({ browser }) => {
    const { phones, crew } = await startRound(browser, ['Sam', 'Alex', 'Jules', 'Riley']);
    const fidget = crew[1];
    const task = (await fidget.getByTestId('task-location').locator('..').textContent()).trim();

    for (let i = 0; i < 4; i++) {
        await fidget.reload({ waitUntil: 'commit' });
        await h.sleep(300 + i * 200);
    }
    await expect(fidget.getByText('CALL MEETING')).toBeVisible({ timeout: 30000 });
    await expect(fidget.getByTestId('task-location').locator('..')).toHaveText(task);

    // The room still works with them in it.
    await h.callMeeting(crew[0], phones);
    for (const phone of phones) await expect(phone.getByText('Select a Player'), phone.person).toBeVisible({ timeout: 20000 });

    h.expectNoPageErrors(phones);
});

test('someone leaves in the middle of a meeting and the rest carry on', async ({ browser }) => {
    const { phones, crew, intruder } = await startRound(browser, ['Sam', 'Alex', 'Jules', 'Riley', 'Kai']);
    const leaver = crew[2];
    const stayers = phones.filter(phone => phone !== leaver);

    await crew[0].getByText('CALL MEETING').click();
    for (const phone of phones) await expect(phone.getByText('Go to the meeting spot', { exact: false })).toBeVisible();
    await h.readyUp(stayers.slice(0, 2));

    await leaver.getByRole('button', { name: 'Leave game' }).click();
    await leaver.getByRole('button', { name: 'Leave', exact: true }).click();
    await expect(leaver.getByText('Create New Game')).toBeVisible();

    await h.readyUp(stayers.slice(2));
    for (const phone of stayers) await expect(phone.getByText('Select a Player'), phone.person).toBeVisible({ timeout: 20000 });
    await h.vote(stayers.map(phone => [phone, phone === intruder ? crew[0] : intruder]));
    await h.continueAfterResults(stayers);
    for (const phone of stayers) await expect(phone.getByText('Crewmates Win!'), phone.person).toBeVisible({ timeout: 30000 });

    h.expectNoPageErrors(stayers);
});

test('a phone that joins with a name already taken gets its own seat', async ({ browser }) => {
    const [host, first, copycat] = await h.openPhones(browser, ['Sam', 'Alex', 'Alex']);
    const code = await h.createRoomOnPhone(host);
    await h.enterName(host);
    await h.joinRoom(first, code);
    await h.joinRoom(copycat, code);

    await expect(host.getByRole('button', { name: 'Players (3)' })).toBeVisible();
    await expect(copycat.getByText('You', { exact: true })).toBeVisible();
    await expect(first.getByText('You', { exact: true })).toBeVisible();

    h.expectNoPageErrors([host, first, copycat]);
});
