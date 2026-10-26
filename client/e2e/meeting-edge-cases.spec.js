// Meetings that don't go to plan: the room vetoes, a body turns up mid-vote, a phone drops
// before voting opens, and the big screen reloads in the middle of it all.
const { test, expect } = require('@playwright/test');
const h = require('./helpers');

test.afterEach(h.closeAll);

test('a vetoed meeting ejects no one, and the reactor follows it through', async ({ browser }) => {
    const phones = await h.openPhones(browser, ['Sam', 'Alex', 'Jules', 'Riley']);
    const reactor = await h.openReactor(browser);
    await h.gatherRoom({ host: phones[0], phones, reactor });
    await phones[0].getByText('Start Game').click();
    const intruder = await h.revealRoles(phones);
    const caller = phones.find(phone => phone !== intruder);

    // The big screen counts people in as they arrive.
    await caller.getByText('CALL MEETING').click();
    await expect(reactor.getByText(`${caller.person} called it`)).toBeVisible();
    await expect(reactor.getByTestId('reactor-ready-count')).toHaveText('0 of 4 ready');
    await h.readyUp(phones.slice(0, 1));
    await expect(reactor.getByTestId('reactor-ready-count')).toHaveText('1 of 4 ready');
    await h.readyUp(phones.slice(1));
    await expect(reactor.getByText('VOTE ON YOUR PHONES')).toBeVisible();

    // The big screen reloads mid-vote and comes straight back to the meeting.
    await reactor.reload();
    await expect(reactor.getByText('VOTE ON YOUR PHONES')).toBeVisible({ timeout: 20000 });

    // Three of four skip: more than half, so the meeting ends early with no one out.
    for (const phone of phones.slice(0, 3)) await phone.getByRole('button', { name: /Veto Meeting/ }).click();
    for (const phone of phones) await expect(phone.getByText('Meeting Vetoed'), phone.person).toBeVisible({ timeout: 20000 });
    await expect(reactor.getByRole('button', { name: /SABOTAGE CORE/ })).toBeVisible();
    await h.continueAfterResults(phones);
    for (const phone of phones) await expect(h.roundButton(phone), phone.person).toBeVisible();

    h.expectNoPageErrors([...phones, reactor]);
});

test('someone killed mid-vote reports it, and votes cast for them come back', async ({ browser }) => {
    const phones = await h.openPhones(browser, ['Sam', 'Alex', 'Jules', 'Riley', 'Kai']);
    await h.gatherRoom({ host: phones[0], phones });
    await phones[0].getByText('Start Game').click();
    const intruder = await h.revealRoles(phones);
    const [caller, victim, ...rest] = phones.filter(phone => phone !== intruder);

    await h.callMeeting(caller, phones);
    // One vote lands on the victim before they speak up.
    await h.vote([[caller, victim]]);
    await expect(caller.getByText(`Voted for ${victim.person}`)).toBeVisible();

    await victim.getByRole('button', { name: "I've Been Killed" }).click();
    await expect(victim.getByText("You're out")).toBeVisible();
    // That vote no longer counts, so the caller is asked again.
    await expect(caller.getByText('Tap who you think it is')).toBeVisible();
    for (const phone of phones.filter(p => p !== victim)) await expect(phone.getByText('4 players voting'), phone.person).toBeVisible();

    // The living four vote the intruder out.
    const living = [caller, intruder, ...rest];
    await h.vote(living.map(phone => [phone, phone === intruder ? caller : intruder]));
    // The ghost reads the result too.
    await h.continueAfterResults(phones);
    for (const phone of phones) await expect(phone.getByText('Crewmates Win!'), phone.person).toBeVisible({ timeout: 30000 });

    h.expectNoPageErrors(phones);
});

test('a phone that drops before voting opens holds the meeting until it is back and ready', async ({ browser }) => {
    const phones = await h.openPhones(browser, ['Sam', 'Alex', 'Jules', 'Riley']);
    await h.gatherRoom({ host: phones[0], phones });
    await phones[0].getByText('Start Game').click();
    const intruder = await h.revealRoles(phones);
    const caller = phones.find(phone => phone !== intruder);
    const dropper = phones.find(phone => phone !== intruder && phone !== caller);
    const others = phones.filter(phone => phone !== dropper);

    await caller.getByText('CALL MEETING').click();
    await h.readyUp(others);
    await dropper.context().setOffline(true);
    await expect(caller.getByText('Offline')).toBeVisible({ timeout: 60000 });
    await expect(caller.getByTestId('ready-count')).toHaveText('3 of 4 ready');

    await dropper.context().setOffline(false);
    await h.readyUp([dropper]);
    for (const phone of phones) await expect(phone.getByText('VOTE', { exact: true }), phone.person).toBeVisible({ timeout: 20000 });

    h.expectNoPageErrors(phones);
});

// KNOWN BUG: a meeting only opens voting once every living player has slid ready, and an
// offline player can't. If one phone dies or its owner goes home without tapping Leave,
// every meeting from then on waits forever: there's no timeout and no host override.
// Remove test.fail() once the meeting can go on without them.
test('a phone that never comes back does not hold the meeting forever', async ({ browser }) => {
    test.fail();
    const phones = await h.openPhones(browser, ['Sam', 'Alex', 'Jules', 'Riley', 'Kai']);
    await h.gatherRoom({ host: phones[0], phones });
    await phones[0].getByText('Start Game').click();
    const intruder = await h.revealRoles(phones);
    const crew = phones.filter(phone => phone !== intruder);
    const gone = crew[1];

    await gone.context().close();
    await crew[0].getByText('CALL MEETING').click();
    const here = phones.filter(phone => phone !== gone);
    await h.readyUp(here);
    await expect(here[0].getByText('VOTE', { exact: true })).toBeVisible({ timeout: 90000 });
});
