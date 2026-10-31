// The public site and the tutorial: every page in the sitemap opens cleanly on a phone and a
// laptop, and the tutorial can be played through to the end.
const fs = require('node:fs');
const path = require('node:path');
const { test, expect } = require('@playwright/test');
const h = require('./helpers');

test.afterEach(h.closeAll);

const sitemap = fs.readFileSync(path.join(__dirname, '../public/sitemap.xml'), 'utf8');
const pages = [...sitemap.matchAll(/<loc>https?:\/\/[^/<]+(\/[^<]*)?<\/loc>/g)].map(match => match[1] || '/');

test('every page in the sitemap opens cleanly on a phone and a laptop', async ({ browser }) => {
    test.setTimeout(6 * 60 * 1000);
    expect(pages.length).toBeGreaterThan(10);
    const phone = await h.openPhone(browser, 'Phone');
    const laptop = await h.openPage(browser, 'Laptop', { viewport: { width: 1280, height: 800 } });
    for (const url of pages.filter(url => url !== '/play')) {
        for (const page of [phone, laptop]) {
            const response = await page.goto(url);
            expect(response.status(), `${url} on the ${page.person}`).toBeLessThan(400);
            await expect(page.locator('h1').first(), `${url} has a heading on the ${page.person}`).toBeVisible();
            await expect(page.getByText("This page isn't here"), `${url} is a real page`).toHaveCount(0);
            const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
            expect(overflow, `${url} doesn't scroll sideways on the ${page.person}`).toBeLessThanOrEqual(1);
        }
    }
    h.expectNoPageErrors([phone, laptop]);
});

test('an address the site does not have says so, with a way back', async ({ browser }) => {
    const phone = await h.openPhone(browser, 'Phone');
    await phone.goto('/no-such-page');
    await expect(phone.getByRole('heading', { name: "This page isn't here" })).toBeVisible();
    await expect(phone.locator('meta[name="robots"]')).toHaveAttribute('content', 'noindex');
    await phone.getByRole('link', { name: 'Host or join a game' }).click();
    await expect(phone).toHaveURL(/\/play$/);
    h.expectNoPageErrors([phone]);
});

test('the home page gets a visitor into a room', async ({ browser }) => {
    const phone = await h.openPhone(browser, 'Visitor');
    await phone.goto('/');
    await phone.getByRole('link', { name: /Host|Start|Play/i }).first().click();
    await expect(phone).toHaveURL(/\/play/);
    await expect(phone.getByText('Create New Game')).toBeVisible();
    h.expectNoPageErrors([phone]);
});

test('the tutorial plays through both roles to the end', async ({ browser }) => {
    test.setTimeout(4 * 60 * 1000);
    const phone = await h.openPhone(browser, 'Learner');
    await phone.goto('/tutorial');

    // Each coach step moves on once the gesture lands; repeat it if an animation ate it.
    const step = async (doIt, next) => {
        for (let attempt = 0; attempt < 3; attempt++) {
            await doIt();
            if (await next.first().waitFor({ state: 'visible', timeout: 6000 }).then(() => true, () => false)) return;
        }
        throw new Error(`The tutorial did not move on to ${next}`);
    };
    const coach = text => phone.getByText(text, { exact: false });

    await phone.getByRole('button', { name: /Start crew training/ }).click();
    await expect(coach('Crewmate · 1 of 4')).toBeVisible();
    await step(() => h.swipe(phone), coach('Crewmate · 2 of 4'));
    await step(() => phone.getByRole('button', { name: /CALL MEETING/ }).click(), coach('Crewmate · 3 of 4'));
    await step(() => h.swipe(phone), coach('Crewmate · 4 of 4'));
    await phone.getByText('Mira', { exact: true }).first().click();
    await step(() => phone.getByRole('button', { name: /^Vote for/ }).click(), coach('Meeting result'));
    await step(() => phone.getByRole('button', { name: /^Continue/ }).click({ timeout: 30000 }), phone.getByRole('button', { name: /Start intruder training/ }));

    await phone.getByRole('button', { name: /Start intruder training/ }).click();
    await expect(coach('Intruder · 1 of 3').first()).toBeVisible();
    await step(() => h.swipe(phone), coach('cooldown'));
    // The kill cooldown runs down on its own before the vent step.
    await expect(coach('Intruder · 2 of 3')).toBeVisible({ timeout: 60000 });
    await step(() => phone.getByRole('button', { name: /ENTER VENT/ }).click(), coach('Intruder · 3 of 3'));
    const deck = phone.getByTestId('card-deck');
    const box = await deck.boundingBox();
    await phone.mouse.move(box.x + box.width * 0.8, box.y + box.height / 2);
    await phone.mouse.down();
    await phone.mouse.move(box.x + box.width * 0.2, box.y + box.height / 2, { steps: 10 });
    await phone.mouse.up();
    await h.sleep(600);
    await expect(deck).toContainText('Area Denial');
    await phone.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await phone.mouse.down();
    await h.sleep(1000);
    await phone.mouse.up();

    await expect(phone.getByText("You're ready to play!")).toBeVisible({ timeout: 20000 });
    h.expectNoPageErrors([phone]);
});

test("How to Play's card section is readable", async ({ browser }) => {
    // "How intruders use cards" used to draw near-black text on a near-black panel.
    const phone = await h.openPhone(browser, 'Reader');
    await phone.goto('/how-to-play');
    const contrasts = await phone.locator('.htp-card h3').evaluateAll(headings => {
        const rgb = value => (value.match(/[\d.]+/g) || []).map(Number);
        const luminance = ([r, g, b]) => {
            const channel = c => { c /= 255; return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; };
            return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
        };
        return headings.map(heading => {
            let panel = heading;
            while (panel && rgb(getComputedStyle(panel).backgroundColor)[3] === 0) panel = panel.parentElement;
            const [a, b] = [luminance(rgb(getComputedStyle(heading).color)), luminance(rgb(getComputedStyle(panel || document.body).backgroundColor))];
            return { text: heading.textContent, contrast: (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05) };
        });
    });
    expect(contrasts.length).toBeGreaterThan(0);
    for (const { text, contrast } of contrasts) expect(contrast, text).toBeGreaterThanOrEqual(3);
});
