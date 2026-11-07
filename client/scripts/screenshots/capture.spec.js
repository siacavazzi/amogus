// One evening with eight fictional players and a reactor, stopping to photograph each screen.
// Writes PNGs to /tmp/sus-screens; to-webp.py turns them into public/images/gameplay/*.webp.
const fs = require('node:fs');
const path = require('node:path');
const { test, expect } = require('@playwright/test');
const h = require('../../e2e/helpers');

const OUT = process.env.SHOTS_DIR || '/tmp/sus-screens';
// 430 x 932 at 2x makes the 860 x 1864 phone images the pages already size for.
const PHONE = { ...h.PHONE, viewport: { width: 430, height: 932 } };
const REACTOR = { viewport: { width: 1024, height: 768 }, deviceScaleFactor: 2 };

// "Dismiss" in every language, for the sound reminder's close button.
const DISMISS = new RegExp(`^(${['Dismiss', ...['fr', 'es', 'de', 'ro', 'pt', 'no', 'sv'].map(code => require(`../../src/i18n/locales/${code}.json`).Dismiss)].filter(Boolean).join('|')})$`);

const shot = async (page, name) => {
    // The "Turn off silent mode" reminder covers the top of the screen; a player closes it once.
    const dismiss = page.getByRole('button', { name: DISMISS }).first();
    if (await dismiss.isVisible().catch(() => false)) await dismiss.click().catch(() => {});
    // Show the address players really type, not the dev server's.
    await page.evaluate(() => {
        const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
        while (walker.nextNode()) walker.currentNode.nodeValue = walker.currentNode.nodeValue.replace(/localhost:3000/g, 'susparty.com');
    });
    await h.sleep(700);
    await page.screenshot({ path: path.join(OUT, `${name}.png`) });
    console.log('shot', name);
};

// The five tour screens are also shot in each site language, for the /fr, /es, ... pages.
// The phone switches language the way the picker does (stored choice, then a reload).
const LANGS = (process.env.SHOT_LANGS || 'fr,es,de,ro,pt,no,sv').split(',').filter(Boolean);
const setLanguage = async (page, lang) => {
    await page.evaluate(code => localStorage.setItem('sus_language', code), lang);
    await page.reload();
    await h.sleep(2500);
};
const localized = async (page, name, before = async () => {}) => {
    for (const lang of LANGS) {
        await setLanguage(page, lang);
        await before();
        await shot(page, `${name}.${lang}`);
    }
    await setLanguage(page, 'en');
};

test.afterEach(h.closeAll);

test('capture gameplay screens', async ({ browser }) => {
    fs.mkdirSync(OUT, { recursive: true });
    const names = ['Maya', 'Alex', 'Jules', 'Riley', 'Kai', 'Theo', 'Nora', 'Leo'];
    const phones = [];
    for (const name of names) phones.push(await h.openPhone(browser, name, PHONE));
    const [host, joiner] = phones;
    const reactor = await h.openReactor(browser, REACTOR);

    // Host: example list, settings, open room.
    await host.goto('/play');
    await h.skipTutorialPrompt(host);
    await host.getByText('Create New Game').first().click();
    await h.addExampleList(host);
    await host.getByText('Use This Task List').first().click();
    await expect(host.getByRole('heading', { name: 'Game settings' })).toBeVisible();
    await host.getByRole('group', { name: 'Number of Intruders' }).getByRole('button', { name: '1', exact: true }).click();
    await shot(host, 'host-setup');
    await host.getByText('Open Room').first().click();
    await expect(host.getByPlaceholder(/name/i).first()).toBeVisible();
    const code = await host.evaluate(() => localStorage.getItem('room_code'));
    await host.getByPlaceholder(/name/i).first().fill('Maya');
    await shot(host, 'name-screen');
    await host.getByText('Next: Choose Avatar').click();
    await shot(host, 'avatar-screen');
    await host.getByRole('button', { name: 'Join Game', exact: true }).click();
    await expect(host.getByText('You', { exact: true })).toBeVisible();

    await h.connectReactor(reactor, code);

    // A friend types the code on the front page.
    await joiner.goto('/play');
    await h.skipTutorialPrompt(joiner);
    await joiner.getByRole('textbox', { name: 'Room code' }).fill(code);
    await shot(joiner, 'join-room');
    for (const phone of phones.slice(1)) await h.joinRoom(phone, code);
    await expect(reactor.getByText('Leo')).toBeVisible();

    await shot(host, 'party-lobby');
    await shot(reactor, 'reactor-lobby');
    await host.getByRole('button', { name: /^Tasks \(/ }).click();
    await shot(host, 'task-list');
    await host.getByRole('button', { name: /^Players \(/ }).click();

    // Roles: photograph one crewmate and the intruder mid-peek.
    // Some phones play in another language, so their role screen can be shot in it.
    const langPhone = new Map(LANGS.map((lang, i) => [phones[i + 1], lang]));
    for (const [phone, lang] of langPhone) await setLanguage(phone, lang);
    await host.getByText('Start Game').click();
    let intruder; let crewShot = false; let holdBox; let gotItBox;
    const roleText = async phone => phone.locator('body').innerText();
    for (const phone of phones) {
        const lang = langPhone.get(phone);
        if (!lang) {
            holdBox = holdBox || await phone.getByText('Hold to see it').first().boundingBox();
            const release = await h.hold(phone, phone.getByText('Hold to see it').first(), 600);
            gotItBox = gotItBox || await phone.getByText('Got it').boundingBox();
            if (/Intruder/.test(await roleText(phone))) { intruder = phone; await shot(phone, 'role-intruder'); }
            else if (!crewShot) { crewShot = true; await shot(phone, 'role-crew'); }
            await release();
            await phone.getByText('Got it').click();
            continue;
        }
        // Same layout in every language: hold where the host's phone held, tap where it tapped.
        await h.sleep(800);
        await phone.mouse.move(holdBox.x + holdBox.width / 2, holdBox.y + holdBox.height / 2);
        await phone.mouse.down();
        await h.sleep(700);
        await shot(phone, `role.${lang}`);
        await phone.mouse.up();
        await phone.mouse.click(gotItBox.x + gotItBox.width / 2, gotItBox.y + gotItBox.height / 2);
        await h.sleep(500);
    }
    for (const phone of langPhone.keys()) await setLanguage(phone, 'en');
    if (!intruder) {
        for (const phone of langPhone.keys()) if (await phone.getByText('ENTER VENT').isVisible()) intruder = phone;
    }
    const crew = phones.filter(phone => phone !== intruder);
    const [caller, worker, victim] = crew;

    await shot(worker, 'crew-task');
    await localized(worker, 'crew-task');
    await shot(intruder, 'intruder-objective');
    await h.swipe(worker);
    await h.sleep(1500);
    await shot(worker, 'next-task');
    for (const phone of [...crew.slice(3), ...crew.slice(3)]) { await h.swipe(phone); await h.sleep(900); }
    await shot(reactor, 'reactor');

    await h.openVent(intruder);
    await shot(intruder, 'intruder-cards');
    await intruder.getByText('Close vent', { exact: false }).click();
    await localized(intruder, 'intruder-cards', async () => {
        // The vent closes on a reload; the top button opens it again (its label is translated).
        const lang = await intruder.evaluate(() => localStorage.getItem('sus_language'));
        const label = require(`../../src/i18n/locales/${lang}.json`)['ENTER VENT'] || 'ENTER VENT';
        const deck = intruder.getByTestId('card-deck');
        for (let i = 0; i < 4 && !(await deck.isVisible()); i++) {
            await intruder.getByText(label, { exact: true }).click().catch(() => {});
            await deck.waitFor({ state: 'visible', timeout: 3000 }).catch(() => {});
        }
        await expect(deck).toBeVisible();
    });
    // Back in English after the reload, with the vent closed.

    // Meltdown from the reactor, then the crew types its codes back in.
    await reactor.getByRole('button', { name: /SABOTAGE CORE/ }).click();
    await expect(reactor.getByText('CORE MELTDOWN')).toBeVisible();
    for (const phone of phones) await expect(phone.getByTestId('meltdown-code')).toHaveText(/^\d{4}$/);
    await shot(worker, 'phone-meltdown');
    const codes = [];
    for (const phone of phones) codes.push((await phone.getByTestId('meltdown-code').textContent()).trim());
    await reactor.getByLabel('Code digit 1').click();
    await reactor.keyboard.type(codes[0], { delay: 60 });
    await h.sleep(1200);
    await shot(reactor, 'reactor-meltdown');
    for (const pin of codes.slice(1)) {
        if (!(await reactor.getByText('CORE MELTDOWN').isVisible())) break;
        await reactor.getByLabel('Code digit 1').click();
        await reactor.keyboard.type(pin, { delay: 60 });
        await h.sleep(900);
    }
    await expect(reactor.getByText('CORE MELTDOWN')).toBeHidden();
    for (const phone of phones) {
        await phone.getByRole('button', { name: 'Got it' }).click().catch(() => {});
    }

    // A body is found: meeting, the victim is out, the room votes.
    await caller.getByText('CALL MEETING').click();
    await expect(worker.getByText('Go to the meeting spot', { exact: false })).toBeVisible();
    await h.tapAndConfirm(victim.getByRole('button', { name: "I've Been Killed" }));
    await expect(victim.getByText("You're out")).toBeVisible();
    await shot(victim, 'eliminated-player');
    const living = phones.filter(phone => phone !== victim);
    // Half the room ready, for a meeting screen that shows who is still on the way.
    for (const phone of living.slice(0, 3)) await h.slideUntilGone(phone);
    await shot(living[4], 'meeting-ready');
    await localized(living[4], 'meeting-ready');
    await shot(reactor, 'reactor-meeting');
    await h.readyUp(living.slice(3));
    await expect(worker.getByRole('button', { name: /^Vote for/ }).or(worker.getByText(intruder.person, { exact: true }).first())).toBeVisible();
    await shot(worker, 'vote');
    await localized(worker, 'vote');
    await worker.getByText(intruder.person, { exact: true }).first().click();
    await shot(worker, 'vote-selected');
    await worker.getByRole('button', { name: /^Vote for/ }).click();
    await h.vote(living.filter(p => p !== worker).map(phone => [phone, phone === intruder ? worker : intruder]));
    await h.sleep(2500);
    await shot(worker, 'vote-result');
    await shot(reactor, 'reactor-vote-result');
    await h.continueAfterResults(phones);
    await expect(worker.getByText('Crewmates Win!')).toBeVisible({ timeout: 30000 });
    await shot(worker, 'crew-victory');
    await shot(intruder, 'intruder-caught');
    await shot(reactor, 'reactor-victory');
    await worker.evaluate(() => {
        const scroller = [...document.querySelectorAll('*')].filter(el => el.scrollHeight > el.clientHeight + 40 && getComputedStyle(el).overflowY !== 'visible').sort((a, b) => b.scrollHeight - a.scrollHeight)[0] || document.scrollingElement;
        scroller.scrollTop = scroller.scrollHeight;
    });
    await shot(worker, 'round-stats');
});

// The intruder's role screen, in English: three phones, so whoever is the intruder is English.
test('capture the intruder role screen', async ({ browser }) => {
    fs.mkdirSync(OUT, { recursive: true });
    const phones = [];
    for (const name of ['Maya', 'Alex', 'Theo']) phones.push(await h.openPhone(browser, name, PHONE));
    await h.gatherRoom({ host: phones[0], phones, settings: { intruders: 1 } });
    await phones[0].getByText('Start Game').click();
    for (const phone of phones) {
        const release = await h.hold(phone, phone.getByText('Hold to see it').first(), 600);
        if (/Intruder/.test(await phone.locator('body').innerText())) {
            await shot(phone, 'role-intruder');
            await release();
            return;
        }
        await release();
        await phone.getByText('Got it').click();
    }
});

// A family cleanup game: four phones, chores written in the lobby.
const CHORES = [
    'Fold a blanket and put it back on the couch', 'Put three cups in the dishwasher', 'Match five pairs of socks',
    'Put every shoe by the door in pairs', 'Wipe the kitchen table', 'Put ten toys back in their bin',
    'Make your bed', 'Water one plant', 'Stack the books on the coffee table', 'Empty one small trash can',
    'Put the remote controls in one place', 'Hang up one coat or towel',
];
test('capture a family cleanup game', async ({ browser }) => {
    fs.mkdirSync(OUT, { recursive: true });
    const phones = [];
    for (const name of ['Mom', 'Ella', 'Max', 'Dad']) phones.push(await h.openPhone(browser, name, PHONE));
    const [host] = phones;
    await h.gatherRoom({ host, phones, settings: { groupTasks: true, intruders: 1 } });
    await host.getByRole('button', { name: /^Tasks \(/ }).click();
    for (const text of CHORES) {
        await host.locator('#new-task-text').fill(text);
        const form = host.locator('#new-task-text').locator('xpath=ancestor::*[.//button[@title="Add task"]][1]');
        await form.getByTitle('Add task').click();
        await expect(host.getByText(text)).toBeVisible();
    }
    await host.getByRole('button', { name: /^Players \(/ }).click();
    await shot(host, 'family-lobby');
    await host.getByText('Start Game').click();
    const intruder = await h.revealRoles(phones);
    const crewmate = phones.find(phone => phone !== intruder);
    await shot(crewmate, 'cleanup-task');
    await h.swipe(crewmate);
    await h.sleep(1500);
    await shot(crewmate, 'cleanup-next-task');
});
