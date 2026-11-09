// My stats: a player (not the host) who is signed in on their phone plays a round, and the game
// shows up on their stats page. Phones that aren't signed in get nothing. Sign-in only works where
// the server serves the page itself (beta, or a local build on port 5001), so this skips on the
// React dev server like the other account tests.
const { test, expect } = require('@playwright/test');
const h = require('./helpers');

test.afterEach(h.closeAll);

async function signInOnStatsPage(page, email) {
    await page.goto('/account/stats');
    await expect(page.getByRole('heading', { name: 'Sign in to see your stats' })).toBeVisible();
    const form = page.getByRole('button', { name: 'Email me a code' });
    const available = await form.first().waitFor({ timeout: 8000 }).then(() => true, () => false);
    if (!available) return false;
    // With Google on, the email field opens from its button; without it, the field shows at once.
    if (!(await page.locator('#sp-acct-email').isVisible())) await form.first().click();
    await page.locator('#sp-acct-email').fill(email);
    await page.locator('#sp-acct-email').press('Enter');
    const code = (await page.getByTestId('dev-code').textContent()).replace(/\D/g, '');
    await page.locator('#sp-acct-code').fill(code);
    await expect(page.getByTestId('stats-empty')).toBeVisible();
    return true;
}

test('a signed-in player finds the round they played on My stats', async ({ browser }) => {
    const phones = await h.openPhones(browser, ['Sam', 'Kim', 'Alex', 'Jules']);
    const [host, kim, alex] = phones;
    const signedIn = await signInOnStatsPage(kim, `e2e-stats-${Date.now()}@example.com`);
    test.skip(!signedIn, 'Sign-in is off on this server');

    // Kim joins like any player: no sign-in prompt anywhere in the game.
    const reactor = await h.openReactor(browser);
    await h.gatherRoom({ host, phones, reactor });
    await expect(kim.getByTestId('save-lists-prompt')).toHaveCount(0);
    await host.getByText('Start Game').click();
    const intruder = await h.revealRoles(phones);
    const [caller, victim, suspect] = phones.filter(phone => phone !== intruder);

    // One crewmate is taken down, the room votes out the wrong person, and the intruder wins.
    await caller.getByText('CALL MEETING').click();
    await expect(victim.getByText('Go to the meeting spot', { exact: false })).toBeVisible();
    await h.tapAndConfirm(victim.getByRole('button', { name: "I've Been Killed" }));
    const living = phones.filter(phone => phone !== victim);
    await h.readyUp(living);
    await h.vote(living.map(phone => [phone, phone === suspect ? caller : suspect]));
    await h.continueAfterResults(phones);
    for (const phone of phones) await expect(phone.getByText('Intruders Win!')).toBeVisible({ timeout: 30000 });

    // Only Kim's end screen points at My stats.
    await expect(kim.getByTestId('end-stats-link')).toBeVisible();
    await expect(alex.getByTestId('end-stats-link')).toHaveCount(0);

    const kimWasIntruder = kim === intruder;
    await kim.goto('/account/stats');
    await expect(kim.getByTestId('stats-games')).toHaveText('1');
    await expect(kim.getByTestId(kimWasIntruder ? 'stats-intruder' : 'stats-crew')).toContainText(kimWasIntruder ? '100%' : '0%');
    await expect(kim.getByTestId(kimWasIntruder ? 'stats-crew' : 'stats-intruder')).toContainText('Not played yet');
    await expect(kim.getByTestId('stats-privacy')).toBeVisible();

    // A phone that never signed in has no stats to see.
    await alex.goto('/account/stats');
    await expect(alex.getByRole('heading', { name: 'Sign in to see your stats' })).toBeVisible();

    h.expectNoPageErrors([...phones, reactor]);
});
