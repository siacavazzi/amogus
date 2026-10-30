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
const openContexts = new Set();

async function openPage(browser, name, options) {
    const context = await browser.newContext(options);
    openContexts.add(context);
    await context.addInitScript(() => localStorage.setItem('sus_e2e', '1'));
    if (BETA) {
        const { hostname } = new URL(process.env.E2E_BASE_URL);
        await context.addCookies([{ name: 'sus_channel', value: 'beta', domain: hostname, path: '/' }]);
    }
    const page = await context.newPage();
    page.person = name;
    page.errors = [];
    page.on('pageerror', error => {
        page.errors.push(error.message);
        // The stack says where it broke, which the message alone doesn't (Safari's especially).
        console.log(`[${name}] page error: ${error.stack || error.message}`);
    });
    // Confirm prompts ("Did the intruder get you?") get a yes, as the person meant to tap it.
    page.on('dialog', dialog => dialog.accept());
    return page;
}

const openPhone = (browser, name) => openPage(browser, name, PHONE);
const openReactor = browser => openPage(browser, 'Reactor', DESKTOP);
const openPhones = (browser, names) => Promise.all(names.map(name => openPhone(browser, name)));

async function skipTutorialPrompt(page) {
    const skip = page.getByRole('button', { name: 'Skip for now' });
    // It can close by itself (an invite link joins straight away), so a missed tap is fine.
    if (await appears(skip, 4000)) await skip.click({ timeout: 2000 }).catch(() => {});
}

// Pick the example task list, apply any settings, and open the room.
//   settings: { intruders, meltdownTime, tasksPerPlayer, startingCards, cardDrawChance,
//               deck: { 'EMP': 1, 'Fake Task': 1, ... } (a custom deck; unnamed cards are set to 0),
//               groupTasks: true (no list; the room writes its tasks together in the lobby) }
async function setUpRoom(page, settings = {}) {
    await page.goto('/play');
    await skipTutorialPrompt(page);
    await page.getByText('Create New Game').first().click();
    if (settings.groupTasks) {
        await page.getByRole('button', { name: /Create Tasks with Group/ }).click();
    } else {
        await page.getByText('Add Example List').first().click();
        await page.getByText('Use This Task List').first().click();
    }
    await expect(page.getByRole('heading', { name: 'Game settings' })).toBeVisible();
    if (settings.intruders) {
        await page.getByRole('group', { name: 'Number of Intruders' }).getByRole('button', { name: String(settings.intruders), exact: true }).click();
    }
    const sliders = {
        meltdownTime: 'setting-meltdown-time',
        tasksPerPlayer: 'setting-tasks-per-player',
        startingCards: 'setting-starting-cards',
        cardDrawChance: 'setting-card-draw-chance',
    };
    const wanted = Object.keys(sliders).filter(key => settings[key] !== undefined);
    if (wanted.length || settings.deck) {
        await page.getByRole('button', { name: /Advanced Settings/ }).click();
        for (const key of wanted) await page.locator(`#${sliders[key]}`).fill(String(settings[key]));
    }
    if (settings.deck) {
        await page.getByRole('button', { name: /^Custom/ }).click();
        for (const stepper of await page.locator('.hs-stepper').all()) {
            const label = (await stepper.locator('b').textContent()).trim();
            const target = settings.deck[label] || 0;
            const value = stepper.locator('.hs-stepper__val');
            for (let i = 0; i < 40 && Number(await value.textContent()) !== target; i++) {
                const step = Number(await value.textContent()) > target ? 'Decrease' : 'Increase';
                await stepper.getByRole('button', { name: `${step} ${label}` }).click();
            }
            await expect(value).toHaveText(String(target));
        }
    }
    await page.getByText('Open Room').first().click();
}

// The reactor creates the room; returns the room code.
async function createRoom(page, settings) {
    await setUpRoom(page, settings);
    const code = page.getByTestId('room-code');
    await expect(code).toHaveText(/^[A-Z]{4}$/);
    return (await code.textContent()).trim();
}

// A phone that creates the room goes straight on to pick a name; returns the room code.
async function createRoomOnPhone(page, settings) {
    await setUpRoom(page, settings);
    await expect(page.getByPlaceholder(/name/i).first()).toBeVisible();
    return page.evaluate(() => localStorage.getItem('room_code'));
}

// A phone hosts a room and everyone joins; the reactor too, when there is one.
async function gatherRoom({ host, phones, reactor, settings }) {
    const code = await createRoomOnPhone(host, settings);
    await enterName(host);
    if (reactor) await connectReactor(reactor, code);
    for (const phone of phones) if (phone !== host) await joinRoom(phone, code);
    return code;
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
    await readyUp(phones);
}

async function readyUp(phones) {
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

// The round screen's top button: CALL MEETING for crewmates, ENTER VENT for intruders.
function roundButton(page) {
    return page.getByText(/^(CALL MEETING|ENTER VENT)$/);
}

// The intruder taps ENTER VENT; playCard then picks a card by name, flicking through the
// hand and holding the card down the way a thumb would.
async function openVent(intruder) {
    await intruder.getByText('ENTER VENT').click();
    await expect(intruder.getByText('Vent network active')).toBeVisible();
}

// Tap "Got it" on a message dialog if one is up (card confirmations, taunts, notices).
async function dismissMessage(page) {
    const gotIt = page.getByRole('dialog').getByRole('button', { name: 'Got it' });
    if (await appears(gotIt, 2500)) await gotIt.click({ timeout: 3000 }).catch(() => {});
}

async function playCard(intruder, action) {
    const deck = intruder.getByTestId('card-deck');
    await expect(deck).toBeVisible();
    const dots = intruder.getByRole('button', { name: /^Go to card/ });
    const count = Math.max(1, await dots.count());
    for (let i = 0; i < count; i++) {
        if (count > 1) await dots.nth(i).click();
        await sleep(450);
        const box = await deck.boundingBox();
        const x = box.x + box.width / 2;
        const y = box.y + box.height / 2;
        const shown = await intruder.evaluate(([px, py]) => document.elementFromPoint(px, py)?.closest('[data-testid="card-deck"] > *')?.textContent || '', [x, y]);
        if (!shown.includes(action)) continue;
        await intruder.mouse.move(x, y);
        await intruder.mouse.down();
        await sleep(1000);
        await intruder.mouse.up();
        return;
    }
    throw new Error(`${intruder.person} has no ${action} card`);
}

// Write tasks from a phone's lobby Tasks tab (the host, or anyone once everyone can add tasks).
async function addTasks(page, count, prefix = `${page.person}'s task`) {
    await page.getByRole('button', { name: /^Tasks \(/ }).click();
    const added = [];
    for (let i = 0; i < count; i++) {
        const text = `${prefix} ${i + 1}`;
        await page.locator('#new-task-text').fill(text);
        const form = page.locator('#new-task-text').locator('xpath=ancestor::*[.//button[@title="Add task"]][1]');
        await form.getByTitle('Add task').click();
        await expect(page.getByText(text)).toBeVisible();
        added.push(text);
    }
    await page.getByRole('button', { name: /^Players \(/ }).click();
    return added;
}

async function expectLobby(page) {
    await expect(page.getByTestId('room-code')).toBeVisible({ timeout: 20000 });
}

// Close every page a test opened, so the next test starts with a quiet browser.
async function closeAll() {
    await Promise.all([...openContexts].map(context => context.close().catch(() => {})));
    openContexts.clear();
}

function expectNoPageErrors(pages) {
    for (const page of pages) expect(page.errors, `page errors on ${page.person}`).toEqual([]);
}

module.exports = {
    openPage, closeAll, openPhones, openPhone, openReactor, createRoom, createRoomOnPhone, gatherRoom, readyUp, connectReactor, joinRoom, enterName, revealRoles, swipe, hold, callMeeting, vote,
    continueAfterResults, voteOutIntruder, roundButton, addTasks, openVent, playCard, dismissMessage, expectLobby, expectNoPageErrors, sleep,
};
