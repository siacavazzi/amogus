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
    await expect(lost.getByRole('button', { name: 'Change code' })).toBeVisible();

    h.expectNoPageErrors([host, visitor, lost]);
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

test.fail('the camera turns off once the selfie is taken', async ({ browser, browserName }) => {
    test.skip(browserName === 'webkit', "Playwright's WebKit has no fake camera; the camera tests run in Chromium");
    // Known bug: the camera screen opens the camera twice (and again on Retake) but only
    // stops the last stream, so the camera light stays on for the rest of the game.
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

    await host.goto('/among-us-irl-task-generator');
    const pack = await host.getByTestId('task-text').allTextContents();
    expect(pack.length).toBeGreaterThan(10);
    await host.getByRole('link', { name: /Use this pack/ }).click();
    await expect(host).toHaveURL(/setup=generated/);
    await host.getByRole('button', { name: 'Skip for now' }).click({ timeout: 5000 }).catch(() => {});
    await host.getByText('Create New Game').click();
    await expect(host.getByText('Your generated task pack')).toBeVisible();
    await host.getByRole('button', { name: 'Import generated tasks' }).click();
    await expect(host.getByText(`${pack.length} tasks`).first()).toBeVisible();
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

test('the app can be added to a home screen', async ({ request, baseURL }) => {
    const manifest = await (await request.get(`${baseURL}/manifest.json`)).json();
    expect(manifest.display).toBe('standalone');
    for (const icon of manifest.icons) {
        expect((await request.get(`${baseURL}/${icon.src}`)).status(), icon.src).toBe(200);
    }
    expect((await request.get(`${baseURL}/apple-touch-icon.png`)).status()).toBe(200);
});
