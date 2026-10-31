// The reactor shows a QR code beside the room code. Scanning it opens the join page with the
// code already in, so nobody types (or mistypes) it. Here the QR is decoded from the pixels the
// big screen actually draws, and a phone opens what it decodes, the way a camera would.
const { test, expect } = require('@playwright/test');
const h = require('./helpers');

test.afterEach(h.closeAll);

// Reads the QR code on the page the way a phone camera would: from its pixels, not its markup.
async function scanQr(page) {
    const qr = page.getByTestId('room-qr');
    await expect(qr).toBeVisible();
    await page.addScriptTag({ path: require.resolve('jsqr/dist/jsQR.js') });
    return page.evaluate(async () => {
        const svg = document.querySelector('[data-testid="room-qr"]');
        const markup = new XMLSerializer().serializeToString(svg);
        const image = new Image();
        image.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(markup)}`;
        await image.decode();
        const size = 600;
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');
        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(image, 0, 0, size, size);
        const found = window.jsQR(ctx.getImageData(0, 0, size, size).data, size, size);
        return found ? found.data : null;
    });
}

test("scanning the reactor's QR code joins the room without typing the code", async ({ browser }) => {
    const reactor = await h.openReactor(browser);
    const code = await h.createRoom(reactor);

    // The code and the address stay up for anyone without a camera.
    await expect(reactor.getByTestId('room-code')).toHaveText(code);
    await expect(reactor.getByText(/join on your phone at .+\/play/i)).toBeVisible();

    const scanned = await scanQr(reactor);
    expect(scanned, 'the QR code should decode').toBeTruthy();
    const link = new URL(scanned);
    expect(link.origin).toBe(new URL(reactor.url()).origin);
    expect(link.pathname).toBe('/play');
    expect(link.searchParams.get('room')).toBe(code);
    // Marks the join as a scan, so the join log can tell it from a link pasted in a chat.
    expect(link.searchParams.get('via')).toBe('qr');
    // A beta reactor keeps scanned phones on beta; prod links carry no beta switch.
    expect(link.searchParams.get('beta')).toBe(process.env.E2E_BETA === '1' ? '1' : null);

    // The QR sits beside the code, clear of the faces of whoever joins.
    const phone = await h.openPhone(browser, 'Alex');
    await phone.goto(scanned);
    await h.enterName(phone);
    await expect(reactor.getByText('1 player connected')).toBeVisible();
    await expect(reactor.getByTestId('reactor-host-hint')).toHaveText('Alex is the host. Start the game from their phone.');
    const qrBox = await reactor.getByTestId('room-qr').boundingBox();
    const facesBox = await reactor.locator('.sg-rx__faces').boundingBox();
    expect(qrBox.y + qrBox.height).toBeLessThanOrEqual(facesBox.y);

    h.expectNoPageErrors([reactor, phone]);
});

// Room codes are random, and a code of wide letters (W, M) once pushed the QR under the code,
// which pushed the host line half off a 720p screen. Every code has to fit beside the QR.
test('the widest room code still fits beside the QR code on a laptop screen', async ({ browser }) => {
    const reactor = await h.openReactor(browser);
    await h.createRoom(reactor);
    // Shows the widest possible code in place of the one the room drew.
    await reactor.getByTestId('room-code').evaluate(node => { node.textContent = 'WWWW'; });
    for (const viewport of [{ width: 1280, height: 720 }, { width: 1366, height: 768 }, { width: 1920, height: 1080 }]) {
        await reactor.setViewportSize(viewport);
        // The code slams in and the QR pops in, scaled while they move, so measure once they land.
        await reactor.evaluate(() => Promise.all(['.sg-rx__code', '.sg-rx__qr']
            .flatMap(selector => document.querySelector(selector).getAnimations().map(animation => animation.finished))));
        const code = await reactor.getByTestId('room-code').boundingBox();
        const qr = await reactor.getByTestId('room-qr').boundingBox();
        expect(qr.x, `QR beside the code at ${viewport.width}`).toBeGreaterThan(code.x + code.width);
        expect(qr.y, `QR level with the code at ${viewport.width}`).toBeLessThan(code.y + code.height);
        await expect(reactor.getByTestId('reactor-host-hint')).toBeInViewport({ ratio: 1 });
    }
});
