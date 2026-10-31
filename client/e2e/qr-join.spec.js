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
