// "I've Been Killed" on the meeting screen, on phones as short as a real iPhone with Safari's bars.
// On prod (2026-11-02) the ready slider sat on top of it, so a killed player couldn't say so and
// the game broke. Earlier tests missed it: their phones were 844 px tall, and Playwright's click
// scrolls the page first, which nobody standing in a meeting does.
const { test, expect } = require('@playwright/test');
const h = require('./helpers');

test.afterEach(h.closeAll);

// An iPhone SE / mini with Safari's address and tab bars showing.
const SHORT_PHONE = { ...h.PHONE, viewport: { width: 375, height: 560 } };

test("a killed crewmate can reach I've Been Killed in a meeting, host included, without scrolling; intruders never see it", async ({ browser }) => {
    const names = ['Sam', 'Alex', 'Jules', 'Riley', 'Kai', 'Noor', 'Theo', 'Ivy'];
    const phones = await Promise.all(names.map(name => h.openPage(browser, name, SHORT_PHONE)));
    const [host] = phones;
    await h.gatherRoom({ host, phones, settings: { intruders: 1 } });
    await host.getByText('Start Game').click();
    const intruder = await h.revealRoles(phones);
    const crew = phones.filter(phone => phone !== intruder);
    const [caller] = crew;

    await caller.getByText('CALL MEETING').click();
    for (const phone of phones) {
        await expect(phone.getByText('Go to the meeting spot', { exact: false })).toBeVisible();
    }
    // Let the entrance animation and the host's "Start voting now" panel settle.
    await h.sleep(1500);
    for (const phone of crew) {
        await h.expectTappable(phone.getByRole('button', { name: "I've Been Killed" }), `${phone.person}'s death button`);
    }
    // Intruders can't be killed, so they never get it: in prod room TREM (2026-11-03) the
    // intruder tapped it by mistake and handed the crew the round.
    await expect(intruder.getByRole('button', { name: "I've Been Killed" })).toHaveCount(0);

    // It stays reachable after sliding ready, too.
    const [, sliding, victim] = crew;
    await h.readyUp([sliding]);
    await h.expectTappable(sliding.getByRole('button', { name: "I've Been Killed" }), `${sliding.person}'s death button after ready`);

    // And tapping it works, from the very spot a person sees it.
    await h.tapAndConfirm(victim.getByRole('button', { name: "I've Been Killed" }));
    await expect(victim.getByText("You're out")).toBeVisible();
    h.expectNoPageErrors(phones);
});
