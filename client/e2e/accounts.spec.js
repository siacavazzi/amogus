// Host accounts: a host signs in from the setup screen and their lists follow them to another phone.
// Beta (and any build the server serves itself) hands back the code for example.com addresses
// instead of emailing it. The local dev server runs on another port, where sign-in is off, so
// these tests skip there.
const { test, expect } = require('@playwright/test');
const h = require('./helpers');

test.afterEach(h.closeAll);

async function startSetup(page) {
    await page.goto('/play');
    await page.getByRole('button', { name: 'Skip for now' }).click({ timeout: 5000 }).catch(() => {});
    await page.getByText('Create New Game').click();
    await expect(page.getByRole('heading', { name: 'Task list' })).toBeVisible();
}

async function signInWithCode(page, scope, email) {
    await scope.getByRole('button', { name: 'Email me a code' }).click();
    await page.locator('#sp-acct-email').fill(email);
    await page.locator('#sp-acct-email').press('Enter');
    const code = (await page.getByTestId('dev-code').textContent()).replace(/\D/g, '');
    await page.locator('#sp-acct-code').fill(code);
}

test('a host who signs in after making a list finds it on another phone', async ({ browser }) => {
    const [first, second] = await h.openPhones(browser, ['Sam', 'Alex']);
    await startSetup(first);
    await h.addExampleList(first);
    const prompt = first.getByTestId('save-lists-prompt');
    const shown = await prompt.waitFor({ timeout: 8000 }).then(() => true, () => false);
    test.skip(!shown, 'Sign-in is off on this server');

    const email = `e2e-${Date.now()}@example.com`;
    await signInWithCode(first, prompt, email);
    await expect(first.getByTestId('save-lists-done')).toBeVisible();
    await expect(first.getByRole('button', { name: 'Account' })).toBeVisible();
    const listCode = await h.savedListCode(first, 'Example List');

    // Another phone: no lists, no prompt (nothing picked yet), then the same account.
    await startSetup(second);
    await expect(second.locator('.hs-listrow__meta', { hasText: listCode })).toHaveCount(0);
    await second.waitForTimeout(31 * 1000); // one new code per email every 30 s
    await second.getByRole('button', { name: 'Sign in' }).first().click();
    const sheet = second.getByRole('dialog');
    await signInWithCode(second, sheet, email);
    await expect(second.locator('.hs-listrow__meta', { hasText: listCode })).toBeVisible();

    h.expectNoPageErrors([first, second]);
});

test('players joining a room never see sign-in', async ({ browser }) => {
    const [host, player] = await h.openPhones(browser, ['Sam', 'Alex']);
    const code = await h.createRoomOnPhone(host);
    await h.joinRoom(player, code);
    await expect(player.getByTestId('save-lists-prompt')).toHaveCount(0);
    await expect(player.getByRole('button', { name: 'Sign in' })).toHaveCount(0);
    h.expectNoPageErrors([host, player]);
});
