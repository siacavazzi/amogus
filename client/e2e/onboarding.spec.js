// Getting people into a room: the home page's room-code box, invite links (early ones too),
// the host's Invite button, a selfie, a task pack from the generator, and the tutorial offer.
const { test, expect } = require('@playwright/test');
const h = require('./helpers');

test.afterEach(h.closeAll);

const nameField = page => page.getByPlaceholder(/name/i).first();

test('a visitor types a room code on the home page and lands in that room', async ({ browser }) => {
    const [host, visitor, lost] = await h.openPhones(browser, ['Sam', 'Alex', 'Jules']);
    const code = await h.createRoomOnPhone(host);
    await h.enterName(host);

    // Lower case is fine; the box upper-cases it.
    await visitor.goto('/');
    await visitor.locator('#sl-code').fill(code.toLowerCase());
    await visitor.getByRole('button', { name: 'Join', exact: true }).click();
    await expect(visitor.getByText(`Room ${code}`)).toBeVisible();
    await h.enterName(visitor);
    await expect(host.getByText('Alex', { exact: true })).toBeVisible();

    // A code that isn't a room says so and offers to change it.
    await lost.goto('/');
    await lost.locator('#sl-code').fill('ZZZZ');
    await lost.getByRole('button', { name: 'Join', exact: true }).click();
    await expect(lost.getByText('Room code not found')).toBeVisible();
    await expect(lost.getByText(/Room codes only use the letters A E H M R T W X Y/)).toBeVisible();
    await expect(lost.getByRole('button', { name: 'Change code' })).toBeVisible();

    h.expectNoPageErrors([host, visitor, lost]);
});

test('a room code typed with look-alike characters still finds the room', async ({ browser }) => {
    const [host, visitor] = await h.openPhones(browser, ['Sam', 'Alex']);
    const code = await h.createRoomOnPhone(host);
    await h.enterName(host);
    expect(code).toMatch(/^[AEHMRTWXY]{4}$/);

    // What someone squinting at the big screen might type: 4 for A, 3 for E, p for R, 7 for T, v for Y.
    const twins = { A: '4', E: '3', R: 'p', T: '7', Y: 'v' };
    const typed = [...code].map(ch => twins[ch] || ch.toLowerCase()).join('');
    await visitor.goto('/play');
    await h.skipTutorialPrompt(visitor);
    await visitor.locator('#game-entry-code').fill(typed);
    await expect(visitor.locator('#game-entry-code')).toHaveValue(typed.toUpperCase());
    await visitor.getByRole('button', { name: /Join Game/ }).click();
    await h.enterName(visitor);
    await expect(host.getByText('Alex', { exact: true })).toBeVisible();

    h.expectNoPageErrors([host, visitor]);
});

test('an invite link opened before the room is open gets in once the host opens it', async ({ browser }) => {
    const [host, early] = await h.openPhones(browser, ['Sam', 'Alex']);
    await host.goto('/play');
    await host.getByRole('button', { name: 'Skip for now' }).click({ timeout: 5000 }).catch(() => {});
    await host.getByText('Create New Game').click();
    await host.getByText('Add Example List').click();
    const code = await host.evaluate(() => localStorage.getItem('room_code'));

    await early.goto(`/play?room=${code}`);
    await expect(early.getByText('Ask the host to open the room')).toBeVisible();

    await host.getByText('Use This Task List').click();
    await host.getByText('Open Room').click();
    await h.enterName(host);

    await early.getByRole('button', { name: 'Try again' }).click();
    await h.enterName(early);
    await expect(host.getByText('Alex', { exact: true })).toBeVisible();

    h.expectNoPageErrors([host, early]);
});

test("the host's Invite button shares a link that brings a friend straight in", async ({ browser }) => {
    const [host, friend] = await h.openPhones(browser, ['Sam', 'Alex']);
    // Catch what the phone's share sheet would have been handed.
    await host.addInitScript(() => {
        navigator.share = async data => { window.sharedInvite = data; };
    });
    const code = await h.createRoomOnPhone(host);
    await h.enterName(host);

    await host.getByRole('button', { name: 'Invite players to room' }).click();
    const shared = await host.waitForFunction(() => window.sharedInvite).then(handle => handle.jsonValue());
    expect(shared.url).toContain(`room=${code}`);
    expect(shared.text).toContain(code);

    await friend.goto(shared.url);
    await h.enterName(friend);
    await expect(host.getByText('Alex', { exact: true })).toBeVisible();

    h.expectNoPageErrors([host, friend]);
});

// Joins with the camera: open it, take one, retake, use the second. Returns the guest's page.
async function joinWithSelfie(guest, code) {
    await guest.goto(`/play?room=${code}`);
    await nameField(guest).fill(guest.person);
    await guest.getByText('Next: Choose Avatar').click();
    await guest.getByText('Take a selfie instead').click();
    const ready = () => guest.waitForFunction(() => document.querySelector('video')?.videoWidth > 0);
    await ready();
    await guest.getByTitle('Take Photo').click();
    await guest.getByRole('button', { name: /Retake/ }).click();
    await ready();
    await guest.getByTitle('Take Photo').click();
    await guest.getByRole('button', { name: /Use Photo/ }).click();
    await expect(guest.getByText('You', { exact: true })).toBeVisible();
}

test('a player joins with a selfie and everyone sees it', async ({ browser, browserName }) => {
    test.skip(browserName === 'webkit', "Playwright's WebKit has no fake camera; the camera tests run in Chromium");
    const [host, guest] = await h.openPhones(browser, ['Sam', 'Alex']);
    const code = await h.createRoomOnPhone(host);
    await h.enterName(host);
    await joinWithSelfie(guest, code);

    // The host's phone loads Alex's photo in the player list.
    const photo = host.locator('img[src*="/selfies/"]').first();
    await expect(photo).toBeVisible();
    await expect.poll(() => photo.evaluate(img => img.complete && img.naturalWidth)).toBeGreaterThan(0);

    h.expectNoPageErrors([host, guest]);
});

test('the camera turns off once the selfie is taken', async ({ browser, browserName }) => {
    test.skip(browserName === 'webkit', "Playwright's WebKit has no fake camera; the camera tests run in Chromium");
    // The camera screen used to open the camera twice (and again on Retake) but stop only the
    // last stream, so the camera light stayed on for the rest of the game.
    const [host, guest] = await h.openPhones(browser, ['Sam', 'Alex']);
    await guest.addInitScript(() => {
        window.cameraStreams = [];
        const open = navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices);
        navigator.mediaDevices.getUserMedia = async constraints => {
            const stream = await open(constraints);
            window.cameraStreams.push(stream);
            return stream;
        };
    });
    const code = await h.createRoomOnPhone(host);
    await h.enterName(host);
    await joinWithSelfie(guest, code);

    const live = () => guest.evaluate(() => window.cameraStreams.flatMap(stream => stream.getTracks()).filter(track => track.readyState === 'live').length);
    await expect.poll(live, { timeout: 3000 }).toBe(0);
});

test("a task pack from the generator becomes the room's tasks", async ({ browser }) => {
    const phones = await h.openPhones(browser, ['Sam', 'Alex', 'Jules']);
    const [host] = phones;

    // A first-time visitor builds a pack and rewrites one task.
    await host.goto('/among-us-irl-task-generator');
    await host.getByRole('button', { name: /^Edit task 1 in/ }).first().click();
    const edited = 'Find the blue mug and set it upside down';
    await host.getByRole('textbox', { name: /Edit task/ }).fill(edited);
    await host.getByRole('textbox', { name: /Edit task/ }).press('Enter');
    const pack = await host.getByTestId('task-text').allTextContents();
    expect(pack.length).toBeGreaterThan(10);
    expect(pack).toContain(edited);

    // "Use this pack" goes straight to host setup with the pack loaded: no tutorial prompt,
    // no Create New Game, no Import button.
    await host.getByRole('link', { name: /Use this pack/ }).click();
    await expect(host.getByRole('heading', { name: 'Task list' })).toBeVisible();
    await expect(host.getByText(`${pack.length} tasks`).first()).toBeVisible();
    await expect(host.getByText(edited)).toBeVisible();
    await expect(host.getByRole('heading', { name: 'Try the tutorial first' })).toHaveCount(0);
    await expect(host.getByRole('button', { name: /Import generated tasks/ })).toHaveCount(0);
    await host.getByText('Use This Task List').click();

    // The generator's suggested settings come along: 90-second meetings.
    await expect(host.getByRole('heading', { name: 'Game settings' })).toBeVisible();
    await host.getByRole('button', { name: /Advanced Settings/ }).click();
    await expect(host.locator('#setting-voting-time')).toHaveValue('90');
    await host.getByText('Open Room').click();
    await h.enterName(host);
    const code = await host.evaluate(() => localStorage.getItem('room_code'));
    for (const phone of phones.slice(1)) await h.joinRoom(phone, code);

    await host.getByText('Start Game').click();
    const intruder = await h.revealRoles(phones);
    const crewmate = phones.find(phone => phone !== intruder);
    const shown = await crewmate.getByTestId('task-location').locator('..').textContent();
    expect(pack.some(task => shown.includes(task)), `"${shown}" is a task from the pack`).toBe(true);

    h.expectNoPageErrors(phones);
});

test('a pack built on a laptop opens one room, even in a new tab or after leaving', async ({ browser }) => {
    const laptop = await h.openReactor(browser);
    await laptop.goto('/among-us-irl-task-generator');
    const count = (await laptop.getByTestId('task-text').allTextContents()).length;

    // Opened in a new tab, the pack still arrives (it is kept for the whole browser).
    const [tab] = await Promise.all([
        laptop.context().waitForEvent('page'),
        laptop.getByRole('link', { name: /Use this pack/ }).click({ modifiers: ['ControlOrMeta'] }),
    ]);
    tab.person = 'Laptop tab';
    tab.errors = [];
    tab.on('pageerror', error => tab.errors.push(error.message));
    tab.on('dialog', dialog => dialog.accept());
    await expect(tab.getByText(`${count} tasks`).first()).toBeVisible();
    const code = await tab.evaluate(() => localStorage.getItem('room_code'));
    expect(code).toMatch(/^[A-Z]{4}$/);

    // Leaving the room goes back to the home screen; it does not open a second room.
    await tab.getByRole('button', { name: 'Leave room' }).click();
    await expect(tab.getByText('Create New Game')).toBeVisible();
    await h.sleep(1500);
    await expect(tab.getByText('Create New Game')).toBeVisible();
    await expect(tab.getByRole('heading', { name: 'Task list' })).toHaveCount(0);

    h.expectNoPageErrors([laptop, tab]);
});

test('a first-time phone is offered the tutorial, and can skip it for good', async ({ browser }) => {
    const phone = await h.openPhone(browser, 'Newbie');
    await phone.goto('/play');
    await expect(phone.getByRole('heading', { name: 'Try the tutorial first' })).toBeVisible();

    // The tutorial's Exit comes back to the game.
    await phone.getByRole('link', { name: 'Start tutorial' }).click();
    await expect(phone).toHaveURL(/\/tutorial\?returnTo=play/);
    await phone.getByRole('button', { name: /Start crew training/ }).click();
    await phone.getByRole('link', { name: /Exit/ }).first().click();
    await expect(phone).toHaveURL(/\/play$/);

    // Skipping is remembered.
    await phone.getByRole('button', { name: 'Skip for now' }).click();
    await phone.reload();
    await expect(phone.getByText('Create New Game')).toBeVisible();
    await expect(phone.getByRole('heading', { name: 'Try the tutorial first' })).toHaveCount(0);

    // An invite link never stops for it.
    const guest = await h.openPhone(browser, 'Guest');
    const host = await h.openPhone(browser, 'Sam');
    const code = await h.createRoomOnPhone(host);
    await guest.goto(`/play?room=${code}`);
    await expect(nameField(guest)).toBeVisible();
    await expect(guest.getByRole('heading', { name: 'Try the tutorial first' })).toHaveCount(0);

    h.expectNoPageErrors([phone, guest, host]);
});

test('a phone keeps its screen awake while a game runs', async ({ browser }) => {
    const phones = await h.openPhones(browser, ['Sam', 'Alex', 'Jules']);
    for (const phone of phones) {
        await phone.addInitScript(() => {
            window.wakeLocks = [];
            Object.defineProperty(navigator, 'wakeLock', {
                configurable: true,
                value: { request: async type => { const lock = { type, released: false, release: async () => { lock.released = true; } }; window.wakeLocks.push(lock); return lock; } },
            });
        });
    }
    await h.gatherRoom({ host: phones[0], phones });
    const held = page => page.evaluate(() => window.wakeLocks.filter(lock => lock.type === 'screen' && !lock.released).length);
    expect(await held(phones[1])).toBe(0);
    await phones[0].getByText('Start Game').click();
    for (const phone of phones) await expect.poll(() => held(phone), { message: phone.person }).toBe(1);
    h.expectNoPageErrors(phones);
});

test('the app can be added to a home screen', async ({ request, baseURL }) => {
    const manifest = await (await request.get(`${baseURL}/manifest.json`)).json();
    expect(manifest.display).toBe('standalone');
    for (const icon of manifest.icons) {
        expect((await request.get(`${baseURL}/${icon.src}`)).status(), icon.src).toBe(200);
    }
    expect((await request.get(`${baseURL}/apple-touch-icon.png`)).status()).toBe(200);
});
