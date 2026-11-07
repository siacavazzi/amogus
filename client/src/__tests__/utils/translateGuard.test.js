import React from 'react';
import { createRoot } from 'react-dom/client';
import { act } from 'react';
import { installTranslateGuard, translateConflicts, translatedTo, watchForTranslation } from '../../utils/translateGuard';

// What Google Translate does: every text node becomes <font><font>translated</font></font>.
function translateLikeGoogle(root) {
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    const nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);
    nodes.forEach(node => {
        const outer = document.createElement('font');
        const inner = document.createElement('font');
        inner.textContent = `[fr] ${node.nodeValue}`;
        outer.appendChild(inner);
        node.parentNode.replaceChild(outer, node);
    });
}

function Screen({ ready, count }) {
    return (
        <div>
            {ready && 'Everyone is ready.'}
            <span>Waiting for players</span>
            {count} joined
        </div>
    );
}

describe('translateGuard', () => {
    beforeAll(() => {
        global.IS_REACT_ACT_ENVIRONMENT = true;
        installTranslateGuard();
    });

    it('keeps React rendering after a translator rewrites the text', () => {
        const container = document.createElement('div');
        document.body.appendChild(container);
        const root = createRoot(container);
        act(() => root.render(<Screen ready count={3} />));
        translateLikeGoogle(container);
        const before = translateConflicts();

        // Removing a translated text node and inserting before one both used to throw NotFoundError.
        expect(() => act(() => root.render(<Screen ready={false} count={4} />))).not.toThrow();
        expect(() => act(() => root.render(<Screen ready count={5} />))).not.toThrow();
        expect(translateConflicts()).toBeGreaterThan(before);
        expect(container.textContent).toContain('Waiting for players');
        act(() => root.unmount());
    });

    it('is installed once', () => {
        const removeChild = Node.prototype.removeChild;
        installTranslateGuard();
        expect(Node.prototype.removeChild).toBe(removeChild);
    });

    it('notices when the page is translated', async () => {
        const html = document.documentElement;
        html.setAttribute('lang', 'en');
        html.removeAttribute('data-original-lang');
        expect(translatedTo()).toBeNull();
        const seen = jest.fn();
        const stop = watchForTranslation(seen);
        html.setAttribute('lang', 'fr');
        html.classList.add('translated-ltr');
        await Promise.resolve();
        await new Promise(resolve => setTimeout(resolve, 0));
        expect(seen).toHaveBeenCalledTimes(1);
        expect(seen).toHaveBeenCalledWith('fr');
        expect(translatedTo()).toBe('fr');
        stop();
        html.classList.remove('translated-ltr');
        html.setAttribute('lang', 'en');
    });
});
