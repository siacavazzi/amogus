const { expect, devices } = require('@playwright/test');

const BETA = process.env.E2E_BETA === '1';
const PHONE = {
    userAgent: devices['iPhone 13'].userAgent,
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
};
const DESKTOP = { viewport: { width: 1440, height: 900 } };
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
// Whether something shows up within a short wait (for screens that only some flows show).
const appears = (locator, timeout = 3000) => locator.first().waitFor({ state: 'visible', timeout }).then(() => true, () => false);

// A fresh browser per person, marked as test traffic (and on beta, when testing beta).
async function openPage(browser, name, options) {
    const context = await browser.newContext(options);
    await context.addInitScript(() => localStorage.setItem('sus_e2e', '1'));
    if (BETA) {
        const { hostname } = new URL(process.env.E2E_BASE_URL);
        await context.addCookies([{ name: 'sus_channel', value: 'beta', domain: hostname, path: '/' }]);
    }
    const page = await context.newPage();
    page.person = name;
    page.errors = [];
    page.on('pageerror', error => page.errors.push(error.message));
    return page;
}

const openPhone = (browser, name) => openPage(browser, name, PHONE);
const openReactor = browser => openPage(browser, 'Reactor', DESKTOP);

async function skipTutorialPrompt(page) {
    const skip = page.getByRole('button', { name: 'Skip for now' });
    // It can close by itself (an invite link joins straight away), so a missed tap is fine.
    if (await appears(skip, 4000)) await skip.click({ timeout: 2000 }).catch(() => {});
}

// Create a room with the example task list and open it; returns the room code.
async function createRoom(page) {
    await page.goto('/play');
    await skipTutorialPrompt(page);
    await page.getByText('Create New Game').first().click();
    await page.getByText('Add Example List').first().click();
    await page.getByText('Use This Task List').first().click();
    await page.getByText('Open Room').first().click();
    const code = page.getByTestId('room-code');
    await expect(code).toHaveText(/^[A-Z]{4}$/);
    return (await code.textContent()).trim();
}

// A phone that creates the room goes straight on to pick a name; returns the room code.
async function createRoomOnPhone(page) {
    await page.goto('/play');
    await skipTutorialPrompt(page);
    await page.getByText('Create New Game').first().click();
    await page.getByText('Add Example List').first().click();
    await page.getByText('Use This Task List').first().click();
    await page.getByText('Open Room').first().click();
    await expect(page.getByPlaceholder(/name/i).first()).toBeVisible();
    return page.evaluate(() => localStorage.getItem('room_code'));
}

// The reactor joins an existing room from its invite link.
async function connectReactor(page, code) {
    await page.goto(`/play?room=${code}`);
    // The link joins by itself; tap Join Game only if it is still waiting for one.
    if (!(await appears(page.getByTestId('room-code'), 5000))) await page.getByRole('button', { name: /Join Game/ }).click();
    await expect(page.getByTestId('room-code')).toHaveText(code);
}

async function joinRoom(page, code) {
    await page.goto(`/play?room=${code}`);
    await skipTutorialPrompt(page);
    // An invite link fills the code in; some builds still ask to confirm it.
    if (!(await appears(page.getByPlaceholder(/name/i), 5000))) await page.getByRole('button', { name: /Join Game/ }).click();
    await enterName(page);
}

async function enterName(page) {
    await page.getByPlaceholder(/name/i).first().fill(page.person);
    await page.getByText('Next: Choose Avatar').click();
    await page.getByRole('button', { name: 'Join Game', exact: true }).click();
    await expect(page.getByText('You', { exact: true })).toBeVisible();
}

// Press and hold an element for a while, as a finger would.
async function hold(page, locator, ms) {
    const box = await locator.boundingBox();
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();
    await sleep(ms);
    return async () => page.mouse.up();
}

// Every phone peeks at its role; returns the intruder's page.
async function revealRoles(phones) {
    let intruder;
    for (const phone of phones) {
        const release = await hold(phone, phone.getByText('Hold to see it').first(), 500);
        const role = await phone.locator('body').innerText();
        if (/Intruder/.test(role)) intruder = phone;
        await release();
        await phone.getByText('Got it').click();
    }
    expect(intruder, 'one phone is the intruder').toBeTruthy();
    return intruder;
}

// Swipe a slider all the way across (finishing a task, or readying up for a meeting).
async function swipe(page) {
    const handle = page.getByRole('slider').first();
    await expect(handle).toBeVisible();
    const box = await handle.boundingBox();
    const y = box.y + box.height / 2;
    await page.mouse.move(box.x + box.width / 2, y);
    await page.mouse.down();
    await page.mouse.move(box.x + box.width / 2 + 330, y, { steps: 15 });
    await page.mouse.up();
}

// Slide, and slide again if the screen was still animating in and missed it.
async function slideUntilGone(page) {
    for (let attempt = 0; attempt < 3; attempt++) {
        await swipe(page);
        if (await page.getByRole('slider').first().waitFor({ state: 'hidden', timeout: 4000 }).then(() => true, () => false)) return;
    }
    throw new Error(`${page.person}'s slide did not register`);
}

async function callMeeting(caller, phones) {
    await caller.getByText('CALL MEETING').click();
    for (const phone of phones) {
        await expect(phone.getByText('Go to the meeting spot', { exact: false })).toBeVisible();
        await slideUntilGone(phone);
    }
}

// Each voter taps a name and confirms.
async function vote(votes) {
    for (const [phone, target] of votes) {
        await phone.getByText(target.person, { exact: true }).first().click();
        await phone.getByRole('button', { name: /^Vote for/ }).click();
    }
}

async function continueAfterResults(phones) {
    for (const phone of phones) {
        const button = phone.getByText('Continue');
        await button.click({ timeout: 20000 }).catch(() => {});
    }
}

// Vote the intruder out in one meeting; every phone ends on the crew victory.
async function voteOutIntruder(caller, phones, intruder) {
    await callMeeting(caller, phones);
    const someoneElse = phones.find(phone => phone !== intruder);
    await vote(phones.map(phone => [phone, phone === intruder ? someoneElse : intruder]));
    await continueAfterResults(phones);
    for (const phone of phones) await expect(phone.getByText('Crewmates Win!')).toBeVisible({ timeout: 30000 });
}

async function expectLobby(page) {
    await expect(page.getByTestId('room-code')).toBeVisible({ timeout: 20000 });
}

function expectNoPageErrors(pages) {
    for (const page of pages) expect(page.errors, `page errors on ${page.person}`).toEqual([]);
}

module.exports = {
    openPhone, openReactor, createRoom, createRoomOnPhone, connectReactor, joinRoom, enterName, revealRoles, swipe, hold, callMeeting, vote,
    continueAfterResults, voteOutIntruder, expectLobby, expectNoPageErrors, sleep,
};
