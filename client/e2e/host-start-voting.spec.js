// A big room never gets every phone to slide ready (a ~40-player game froze twice in its first
// meeting on 2026-10-30). After a short wait the host, and only the host, can start the vote.
const { test, expect } = require('@playwright/test');
const h = require('./helpers');

test.afterEach(h.closeAll);

// A crewmate other than the host, from the round screen's button.
async function crewCaller(phones, host) {
    for (const phone of phones) {
        if (phone !== host && await phone.getByText('CALL MEETING').isVisible()) return phone;
    }
    throw new Error('no crewmate besides the host');
}

test('the host starts the vote while two people never slide ready', async ({ browser }) => {
    const phones = await h.openPhones(browser, ['Sam', 'Alex', 'Jules', 'Riley', 'Kai']);
    const reactor = await h.openReactor(browser);
    const host = phones[0];
    await h.gatherRoom({ host, phones, reactor });
    await host.getByText('Start Game').click();
    await h.revealRoles(phones);
    const caller = await crewCaller(phones, host);
    const sliders = phones.filter(phone => phone !== host && phone !== caller).slice(0, 1);
    const stragglers = phones.filter(phone => phone !== host && phone !== caller && !sliders.includes(phone));

    await caller.getByText('CALL MEETING').click();
    await h.readyUp([host, caller, ...sliders]);
    await expect(host.getByTestId('ready-count')).toHaveText('3 of 5 ready');

    // Only the host has the button, and it waits so people can get to the meeting spot first.
    const button = host.getByTestId('host-start-voting');
    await expect(button).toBeDisabled();
    await expect(button).toHaveText(/Start voting in \d+s/);
    for (const phone of phones.slice(1)) await expect(phone.getByTestId('host-start-voting'), phone.person).toHaveCount(0);
    await expect(reactor.getByTestId('reactor-host-can-start')).toContainText('Sam is the host');

    // Once it opens, everyone else is told who can do it.
    await expect(button).toBeEnabled({ timeout: 25000 });
    await expect(stragglers[0].getByTestId('host-can-start-voting')).toHaveText('Stuck? Sam is the host and can start the vote.');

    // One tap only arms it; the second starts the vote.
    await button.click();
    await expect(button).toHaveText('Tap again to vote without 2');
    await expect(host.getByTestId('ready-count')).toHaveText('3 of 5 ready');
    await button.click();

    for (const phone of phones) await expect(phone.getByText('Sam started it early'), phone.person).toBeVisible();
    await expect(reactor.getByText('VOTE ON YOUR PHONES')).toBeVisible();

    // The two who never slid ready still get a vote, and the meeting ends as normal.
    for (const phone of phones.slice(0, 3)) await phone.getByRole('button', { name: /Veto Meeting/ }).click();
    for (const phone of phones) await expect(phone.getByText('Meeting Vetoed'), phone.person).toBeVisible({ timeout: 20000 });

    h.expectNoPageErrors([...phones, reactor]);
});

test('a host who is killed can still start the vote from the dead screen', async ({ browser }) => {
    const phones = await h.openPhones(browser, ['Sam', 'Alex', 'Jules', 'Riley', 'Kai', 'Max']);
    const host = phones[0];
    // Two intruders, so the round goes on whichever side the host was on.
    await h.gatherRoom({ host, phones, settings: { intruders: 2 } });
    await host.getByText('Start Game').click();
    for (const phone of phones) {
        const release = await h.hold(phone, phone.getByText('Hold to see it').first(), 500);
        await release();
        await phone.getByText('Got it').click();
    }
    const caller = await crewCaller(phones, host);

    await caller.getByText('CALL MEETING').click();
    await expect(host.getByText('Go to the meeting spot', { exact: false })).toBeVisible();
    await host.getByRole('button', { name: "I've Been Killed" }).click();
    await expect(host.getByText("You're out")).toBeVisible();
    await h.readyUp([caller]);

    const button = host.getByTestId('host-start-voting');
    await expect(button).toBeEnabled({ timeout: 25000 });
    await button.click();
    await button.click();
    for (const phone of phones.slice(1)) await expect(phone.getByText('Sam started it early'), phone.person).toBeVisible();

    h.expectNoPageErrors(phones);
});
