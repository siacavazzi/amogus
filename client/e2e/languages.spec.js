// One room, one phone per language: each phone plays the round in its own language while the
// host plays in English, and the server's English never leaks onto a translated screen.
const fs = require('fs');
const path = require('path');
const { test, expect } = require('@playwright/test');
const h = require('./helpers');

const LANGS = ['fr', 'es', 'de', 'ro', 'pt', 'no', 'sv'];
// Norwegian phones report Bokmål as nb-NO; the game maps it to its one Norwegian, "no".
const LOCALES = { fr: 'fr-FR', es: 'es-ES', de: 'de-DE', ro: 'ro-RO', pt: 'pt-BR', no: 'nb-NO', sv: 'sv-SE' };
const catalogs = Object.fromEntries(LANGS.map(lang => [lang,
    JSON.parse(fs.readFileSync(path.join(__dirname, '../src/i18n/locales', `${lang}.json`), 'utf8'))]));
// The phone's text for an English string (English for the host).
const say = (page, english) => (page.lang ? catalogs[page.lang][english] : english);
const shots = process.env.E2E_LANGUAGE_SHOTS;
const snap = async (page, step) => {
    if (shots) await page.screenshot({ path: path.join(shots, `${page.lang || 'en'}-${step}.png`) });
};

async function joinInLanguage(page, code) {
    await page.goto(`/play?room=${code}`);
    const skip = page.getByRole('button', { name: say(page, 'Skip for now') });
    if (await skip.waitFor({ state: 'visible', timeout: 4000 }).then(() => true, () => false)) await skip.click().catch(() => {});
    const name = page.getByPlaceholder(say(page, 'Enter your name'));
    if (!(await name.waitFor({ state: 'visible', timeout: 5000 }).then(() => true, () => false))) {
        await page.getByRole('button', { name: say(page, 'Join Game') }).click();
    }
    await snap(page, '1-name');
    await name.fill(page.person);
    await page.getByText(say(page, 'Next: Choose Avatar')).click();
    await page.getByRole('button', { name: say(page, 'Join Game'), exact: true }).click();
    await expect(page.getByText(say(page, 'You'), { exact: true })).toBeVisible();
}

test.afterEach(h.closeAll);

test('phones in seven languages play a round with an English host', async ({ browser }) => {
    test.setTimeout(240 * 1000);
    const host = await h.openPhone(browser, 'Sam');
    const phones = [host];
    for (const lang of LANGS) {
        const phone = await h.openPhone(browser, `P-${lang}`, { locale: LOCALES[lang] });
        phone.lang = lang;
        phones.push(phone);
    }

    const code = await h.createRoomOnPhone(host, { intruders: 1 });
    await h.enterName(host);
    for (const phone of phones.slice(1)) await joinInLanguage(phone, code);

    for (const phone of phones.slice(1)) {
        await expect(phone.locator('html')).toHaveAttribute('lang', phone.lang);
        await expect(phone.getByText(say(phone, 'Waiting for host to start the game...'))).toBeVisible();
        await expect(phone.getByText('Waiting for host to start the game...')).toHaveCount(0);
        await snap(phone, '2-lobby');
    }

    await host.getByText('Start Game').click();
    let intruder;
    for (const phone of phones) {
        const release = await h.hold(phone, phone.getByText(say(phone, 'Hold to see it')).first(), 500);
        await snap(phone, '3-role');
        await release();
        await phone.getByText(say(phone, 'Got it')).click();
        const vent = phone.getByText(say(phone, 'ENTER VENT'), { exact: true });
        const meeting = phone.getByText(say(phone, 'CALL MEETING'), { exact: true });
        await expect(vent.or(meeting)).toBeVisible();
        if (await vent.isVisible()) intruder = phone;
        await snap(phone, '4-round');
    }
    expect(intruder, 'one phone is the intruder').toBeTruthy();

    // A crewmate calls a meeting; every phone sees the meeting in its own language and slides ready.
    const caller = phones.find(phone => phone !== intruder);
    await caller.getByText(say(caller, 'CALL MEETING'), { exact: true }).click();
    await Promise.all(phones.map(async (phone) => {
        await expect(phone.getByText(say(phone, 'Go to the meeting spot, then slide ready'), { exact: false })).toBeVisible();
        await snap(phone, '5-meeting');
        await h.slideUntilGone(phone);
    }));

    // Everyone votes the intruder out (the intruder votes for the caller).
    for (const phone of phones) {
        const target = phone === intruder ? caller : intruder;
        await expect(phone.getByText(say(phone, 'Tap who you think it is'))).toBeVisible({ timeout: 20000 });
        await snap(phone, '6-vote');
        await phone.getByText(target.person, { exact: true }).first().click();
        const voteFor = say(phone, 'Vote for {name}').replace('{name}', target.person);
        await phone.getByRole('button', { name: voteFor }).click();
    }
    for (const phone of phones) {
        await expect(phone.getByText(say(phone, 'They were an intruder.'))).toBeVisible({ timeout: 30000 });
        await snap(phone, '7-result');
        await phone.getByText(say(phone, 'Continue')).click({ timeout: 20000 }).catch(() => {});
    }
    for (const phone of phones) {
        await expect(phone.getByText(say(phone, 'Crewmates Win!'))).toBeVisible({ timeout: 30000 });
        await snap(phone, '8-win');
    }
    h.expectNoPageErrors(phones);
});
