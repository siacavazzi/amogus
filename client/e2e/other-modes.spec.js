// Small rooms and big ones: a test game, last stand at three players, and two intruders.
const { test, expect } = require('@playwright/test');
const h = require('./helpers');

test.afterEach(h.closeAll);

test('one phone can run a test game and switch roles', async ({ browser }) => {
    const [solo] = await h.openPhones(browser, ['Sam']);
    await h.gatherRoom({ host: solo, phones: [solo] });
    await solo.getByText('Start Game').click();
    await solo.getByRole('button', { name: /Start test game/ }).click();
    await h.revealRoles([solo]).catch(() => {});
    await expect(solo.getByText(/Test game · (Crewmate|Intruder)/)).toBeVisible();
    const before = await solo.getByText(/Test game · /).textContent();
    // Each switch shows the new role on the same hold-to-see card as the start of a round.
    const switchRole = async () => {
        await solo.getByRole('button', { name: /Switch to/ }).click();
        await h.revealRoles([solo]).catch(() => {});
        await h.dismissMessage(solo);
    };
    await switchRole();
    await expect(solo.getByText(/Test game · /)).not.toHaveText(before);

    // As the intruder: ENTER VENT opens the vent with a hand of cards. As crew: CALL MEETING.
    if (!/Intruder/.test(await solo.getByText(/Test game · /).textContent())) await switchRole();
    await expect(solo.getByText('Test game · Intruder')).toBeVisible();
    await expect(solo.getByText('CALL MEETING')).toHaveCount(0);
    await h.openVent(solo);
    await expect(solo.getByTestId('card-deck')).toBeVisible();
    await solo.getByText('Exit to safety', { exact: false }).click();
    await switchRole();
    await expect(solo.getByText('CALL MEETING')).toBeVisible();

    h.expectNoPageErrors([solo]);
});

for (const crewWins of [true, false]) {
    test(`three players: last stand, ${crewWins ? 'the crewmate finishes three tasks' : 'the intruder gets the last crewmate'}`, async ({ browser }) => {
        const phones = await h.openPhones(browser, ['Sam', 'Alex', 'Jules']);
        await h.gatherRoom({ host: phones[0], phones });
        await phones[0].getByText('Start Game').click();
        const intruder = await h.revealRoles(phones);
        const [victim, last] = phones.filter(phone => phone !== intruder);

        // A body: the victim reports from the meeting screen, leaving one against one.
        await last.getByText('CALL MEETING').click();
        await h.tapAndConfirm(victim.getByRole('button', { name: "I've Been Killed" }));
        await h.dismissMessage(last);
        await expect(last.getByTestId('last-stand-tasks-left')).toHaveText('Last stand: 3 tasks to win', { timeout: 20000 });
        await expect(last.getByText('I WAS ELIMINATED')).toBeVisible();

        if (crewWins) {
            for (let done = 0; done < 3; done++) {
                await h.swipe(last);
                await h.sleep(2000);
            }
            for (const phone of phones) await expect(phone.getByText('Crewmates Win!'), phone.person).toBeVisible({ timeout: 20000 });
        } else {
            await last.getByText('I WAS ELIMINATED').click();
            for (const phone of phones) await expect(phone.getByText('Intruders Win!'), phone.person).toBeVisible({ timeout: 20000 });
        }
        h.expectNoPageErrors(phones);
    });
}

test('two intruders see each other, and the crew needs both out', async ({ browser }) => {
    const names = ['Sam', 'Alex', 'Jules', 'Riley', 'Kai', 'Noor'];
    const phones = await h.openPhones(browser, names);
    await h.gatherRoom({ host: phones[0], phones, settings: { intruders: 2 } });
    await phones[0].getByText('Start Game').click();

    // Each intruder's role card names the other one.
    const intruders = [];
    for (const phone of phones) {
        const release = await h.hold(phone, phone.getByText('Hold to see it').first(), 500);
        const text = await phone.locator('body').innerText();
        if (/Intruder/.test(text)) intruders.push({ phone, text });
        await release();
        await phone.getByText('Got it').click();
    }
    expect(intruders).toHaveLength(2);
    expect(intruders[0].text).toContain(`With ${intruders[1].phone.person}`);
    expect(intruders[1].text).toContain(`With ${intruders[0].phone.person}`);

    // Voting one out isn't enough; the second one ends it.
    const [first, second] = intruders.map(entry => entry.phone);
    const crew = phones.filter(phone => phone !== first && phone !== second);
    await h.callMeeting(crew[0], phones);
    await h.vote(phones.map(phone => [phone, phone === first ? crew[0] : first]));
    await h.continueAfterResults(phones);
    const living = phones.filter(phone => phone !== first);
    for (const phone of living) await expect(h.roundButton(phone), phone.person).toBeVisible({ timeout: 20000 });
    await h.voteOutIntruder(crew[0], living, second);
    await h.continueAfterResults([first]);
    await expect(first.getByText('Crewmates Win!')).toBeVisible({ timeout: 20000 });

    h.expectNoPageErrors(phones);
});
