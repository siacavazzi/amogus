// Host setup on a phone, before anyone joins: task lists shared by code, the settings
// sliders, avatars, and a host whose connection drops or page reloads mid-setup.
// Tests marked test.fail are known bugs: they pass while the bug is there, and Playwright
// flags them once it's fixed so the marker can come off.
const { test, expect } = require('@playwright/test');
const h = require('./helpers');

test.afterEach(h.closeAll);

async function startSetup(page) {
    await page.goto('/play');
    await page.getByRole('button', { name: 'Skip for now' }).click({ timeout: 5000 }).catch(() => {});
    await page.getByText('Create New Game').click();
    await expect(page.getByRole('heading', { name: 'Task list' })).toBeVisible();
}

test('a saved task list loads on another phone from its code', async ({ browser }) => {
    const [first, second] = await h.openPhones(browser, ['Sam', 'Alex']);
    await startSetup(first);
    await first.getByText('Add Example List').click();
    const meta = await first.locator('.hs-listrow__meta').first().textContent();
    const listCode = meta.split('·').pop().trim();
    expect(listCode).toMatch(/^[A-Z0-9]{6}$/);

    // A different phone has none of Sam's lists until it types the code.
    await startSetup(second);
    await second.locator('#task-list-code').fill(listCode.toLowerCase());
    await second.getByRole('button', { name: 'Load task list' }).click();
    await expect(second.getByRole('heading', { name: 'Example List' })).toBeVisible();
    await expect(second.locator('.hs-listrow__meta', { hasText: listCode })).toBeVisible();
    await second.getByText('Use This Task List').click();
    await expect(second.getByRole('heading', { name: 'Game settings' })).toBeVisible();
    await expect(second.getByText('Using: Example List')).toBeVisible();

    h.expectNoPageErrors([first, second]);
});

test('an avatar someone has is locked for the next player', async ({ browser }) => {
    const [host, guest] = await h.openPhones(browser, ['Sam', 'Alex']);
    const code = await h.createRoomOnPhone(host);
    await host.getByPlaceholder(/name/i).first().fill('Sam');
    await host.getByText('Next: Choose Avatar').click();
    const picked = host.getByRole('radio', { checked: true });
    const label = await picked.getAttribute('aria-label');
    await host.getByRole('button', { name: 'Join Game', exact: true }).click();

    await guest.goto(`/play?room=${code}`);
    await guest.getByPlaceholder(/name/i).first().fill('Alex');
    await guest.getByText('Next: Choose Avatar').click();
    const taken = guest.getByRole('radio', { name: `${label}, taken by Sam` });
    await expect(taken).toBeDisabled();
    await expect(taken).not.toBeChecked();

    h.expectNoPageErrors([host, guest]);
});

test.fail('a long name keeps the avatar screen on the phone', async ({ browser }) => {
    // Known bug: the name is drawn huge on one line, so a 15-letter name pushes the avatar
    // grid and the Join Game button off the right edge of every phone.
    const [host, guest] = await h.openPhones(browser, ['Sam', 'Christopher-Lee']);
    const code = await h.createRoomOnPhone(host);
    await guest.goto(`/play?room=${code}`);
    await guest.getByPlaceholder(/name/i).first().fill(guest.person);
    await guest.getByText('Next: Choose Avatar').click();
    const join = guest.getByRole('button', { name: 'Join Game', exact: true });
    const box = await join.boundingBox();
    expect(box.x + box.width).toBeLessThanOrEqual(390);
    const sideways = await guest.evaluate(() => {
        const screen = document.querySelector('.sg-join');
        return screen.scrollWidth - screen.clientWidth;
    });
    expect(sideways).toBeLessThanOrEqual(1);
});

test.fail('the settings sliders follow a finger', async ({ browser }) => {
    // Known bug: each slider is a component defined inside GameConfigPage, so every change
    // remounts it and the drag stops after one step. On a phone a full drag moves 15 seconds.
    const host = await h.openPhone(browser, 'Sam');
    await startSetup(host);
    await host.getByText('Add Example List').click();
    await host.getByText('Use This Task List').click();
    await host.getByRole('button', { name: /Advanced Settings/ }).click();
    const slider = host.locator('#setting-voting-time');
    await slider.scrollIntoViewIfNeeded();
    const box = await slider.boundingBox();
    const y = box.y + box.height / 2;
    // The thumb starts at 180 of 60–300: half way.
    const from = box.x + box.width / 2;
    const touch = await host.context().newCDPSession(host);
    await touch.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: from, y }] });
    for (let i = 1; i <= 20; i++) {
        await touch.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: from + i * (box.width / 2 - 4) / 20, y }] });
    }
    await touch.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    await expect(host.locator('#setting-voting-time')).toHaveValue('300');
});

// Opens the room and checks the host gets to their name.
async function expectRoomOpens(host) {
    const open = host.getByText('Open Room');
    if (!(await open.isVisible())) {
        await h.dismissMessage(host);
        await host.locator('.hs-listrow').first().click();
        await host.getByText('Use This Task List').click();
    }
    await host.getByText('Open Room').click();
    await h.enterName(host);
}

test.fail('a host whose connection drops during setup can still open the room', async ({ browser }) => {
    // Known bug: a phone host has no player yet, so after a reconnect the server no longer
    // knows the socket is the creator ("Join the room before you send this command"), and
    // the setup screen starts over. Locking the phone mid-setup does this.
    const host = await h.openPhone(browser, 'Sam');
    let connection;
    await host.routeWebSocket(/socket\.io/, ws => { ws.connectToServer(); connection = ws; });
    await startSetup(host);
    await host.getByText('Add Example List').click();
    await host.getByText('Use This Task List').click();
    await expect(host.getByRole('heading', { name: 'Game settings' })).toBeVisible();
    await connection.close();
    await expect(host.getByText('Reconnect to your room')).toBeVisible();
    await expect(host.getByText('Reconnect to your room')).toBeHidden({ timeout: 15000 });
    await expectRoomOpens(host);
});

test.fail('a host whose page reloads during setup can still open the room', async ({ browser }) => {
    // Known bug: after a reload the host lands on the name screen of their own unopened
    // room, and joining says "Ask the host to open the room". iPhones reload tabs left in
    // the background, e.g. while the host shares the code in Messages.
    const host = await h.openPhone(browser, 'Sam');
    await startSetup(host);
    await host.getByText('Add Example List').click();
    await host.getByText('Use This Task List').click();
    await host.reload();
    await expect(host.getByText('Create New Game').or(host.getByText('Open Room')).or(host.getByPlaceholder(/name/i)).first()).toBeVisible();
    await expectRoomOpens(host);
});
