// Late Arrivals "Join the round" (the default): someone who arrives mid-round is dealt straight
// in, secretly crew or intruder, so arriving late never marks you as innocent. The meeting result
// then stops saying how many intruders are left, since a number that went up would name them.
const { test, expect } = require('@playwright/test');
const h = require('./helpers');

test.afterEach(h.closeAll);

const NAMES = ['Sam', 'Alex', 'Jules', 'Riley', 'Kai', 'Noor', 'Ines', 'Theo', 'Uma', 'Ravi'];

async function arriveLate(browser, code, name) {
    const late = await h.openPhone(browser, name);
    await late.goto(`/play?room=${code}`);
    await expect(late.getByTestId('round-on-notice')).toHaveText(/as crew or intruder/);
    await late.getByPlaceholder(/name/i).first().fill(name);
    await late.getByText('Next: Choose Avatar').click();
    await late.getByRole('button', { name: 'Join Game', exact: true }).click();
    return late;
}

test('a latecomer is dealt into the running round with a secret role', async ({ browser }) => {
    test.setTimeout(8 * 60 * 1000); // eleven browsers; Safari takes over four minutes
    const phones = await h.openPhones(browser, NAMES);
    const [host] = phones;
    const reactor = await h.openReactor(browser);
    const code = await h.gatherRoom({ host, phones, reactor, settings: { intruders: 2, startingCards: 0, meetingQuorum: false } });
    await expect(reactor.getByText('Ravi')).toBeVisible();

    await host.getByText('Start Game').click();
    const intruders = await h.revealAllRoles(phones);
    expect(intruders).toHaveLength(2);
    await expect(reactor.getByText('Late? Scan to join', { exact: true })).toBeVisible();

    // Morgan arrives: the role pop-up comes straight up, like everyone's at Start.
    const late = await arriveLate(browser, code, 'Morgan');
    await expect(late.getByText("You're in this round")).toBeVisible();
    const lateIsIntruder = (await h.revealAllRoles([late])).length === 1;
    await expect(h.roundButton(late)).toBeVisible();
    await expect(late.getByText(lateIsIntruder ? 'ENTER VENT' : 'CALL MEETING')).toBeVisible();

    // A late intruder's teammates hear who joined them; crew phones get no such message.
    if (lateIsIntruder) {
        for (const intruder of intruders) {
            await expect(intruder.getByText(/Morgan just joined the round as an intruder/)).toBeVisible();
            await h.dismissMessage(intruder);
        }
    }

    // Morgan is in the meeting like anyone else, and votes an original intruder out.
    const crew = phones.filter(phone => !intruders.includes(phone));
    const everyone = [...phones, late];
    await h.callMeeting(crew[0], everyone);
    const [target] = intruders;
    await h.vote(everyone.map(phone => [phone, phone === target ? crew[0] : target]));
    for (const phone of crew) {
        await expect(phone.getByText('Intruders are still among you')).toBeVisible({ timeout: 30000 });
        await expect(phone.getByText(/intruders? left/)).toHaveCount(0);
    }

    h.expectNoPageErrors([...everyone, reactor]);
});

test('a latecomer who arrives during a meeting is dealt in when it ends', async ({ browser }) => {
    const phones = await h.openPhones(browser, NAMES);
    const [host] = phones;
    const code = await h.gatherRoom({ host, phones, settings: { intruders: 2, startingCards: 0 } });
    await host.getByText('Start Game').click();
    const intruders = await h.revealAllRoles(phones);
    const crew = phones.filter(phone => !intruders.includes(phone));

    await crew[0].getByText('CALL MEETING').click();
    const late = await arriveLate(browser, code, 'Morgan');
    await expect(late.getByTestId('waiting-next-round')).toBeVisible();
    await expect(late.getByTestId('waiting-joins-when')).toHaveText(/when the meeting ends/);

    // The meeting waits for the ten in the round only. Six vetoes end it with nobody ejected.
    await h.readyUp(phones);
    for (const phone of phones.slice(0, 6)) await phone.getByRole('button', { name: /^Veto Meeting/ }).click();
    await expect(late.getByText("You're in this round")).toBeVisible({ timeout: 30000 });
    await h.revealAllRoles([late]);
    await expect(h.roundButton(late)).toBeVisible();

    h.expectNoPageErrors([...phones, late]);
});
