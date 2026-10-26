// A big group on a laptop-sized big screen: twenty phones join a room the reactor made, and
// the line naming the host still has to be on screen, since that is who has Start.
const { test, expect } = require('@playwright/test');
const h = require('./helpers');

test.afterEach(h.closeAll);

test('twenty phones join and the big screen still says who the host is', async ({ browser }) => {
    test.setTimeout(6 * 60 * 1000);
    const reactor = await h.openPage(browser, 'Reactor', { viewport: { width: 1366, height: 768 } });
    const code = await h.createRoom(reactor);

    const names = Array.from({ length: 20 }, (_, i) => `Guest ${i + 1}`);
    for (const name of names) await h.joinRoom(await h.openPhone(browser, name), code);
    await expect(reactor.getByText('20 players connected')).toBeAttached();

    const hint = reactor.getByTestId('reactor-host-hint');
    for (const viewport of [{ width: 1366, height: 768 }, { width: 1280, height: 720 }, { width: 1920, height: 1080 }]) {
        await reactor.setViewportSize(viewport);
        await expect(hint).toHaveText('Guest 1 is the host. Start the game from their phone.');
        await expect(hint).toBeInViewport({ ratio: 1 });
        await expect(reactor.getByTestId('room-code')).toBeInViewport({ ratio: 1 });
        if (process.env.E2E_SHOT) await reactor.screenshot({ path: `${process.env.E2E_SHOT}-${viewport.width}.png` });
    }
});
