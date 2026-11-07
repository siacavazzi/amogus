// Browser translators (Chrome's Google Translate, Edge, Safari) swap the page's text nodes for their own
// <font> wrappers. React still holds the original nodes, so its next removeChild or insertBefore can throw
// NotFoundError and blank the whole game. These guards let React's DOM calls land somewhere sensible instead.

let conflicts = 0;

/** How many DOM calls the guard had to rescue since load. */
export function translateConflicts() {
    return conflicts;
}

// The ancestor of `node` that sits directly under `parent`, or null when `node` is not inside it.
function directChildOf(parent, node) {
    let current = node;
    while (current && current.parentNode !== parent) current = current.parentNode;
    return current;
}

export function installTranslateGuard(NodeClass = typeof Node === 'function' ? Node : null) {
    const proto = NodeClass?.prototype;
    if (!proto || proto.__susTranslateGuard) return;
    proto.__susTranslateGuard = true;

    const removeChild = proto.removeChild;
    proto.removeChild = function guardedRemoveChild(child) {
        if (child && child.parentNode !== this) {
            conflicts += 1;
            // Moved under a translator wrapper: take it out of wherever it is now.
            if (child.parentNode && directChildOf(this, child.parentNode)) {
                return removeChild.call(child.parentNode, child);
            }
            // Already replaced by the translator: nothing left to remove.
            return child;
        }
        return removeChild.call(this, child);
    };

    const insertBefore = proto.insertBefore;
    proto.insertBefore = function guardedInsertBefore(newNode, referenceNode) {
        if (referenceNode && referenceNode.parentNode !== this) {
            conflicts += 1;
            // Insert before the wrapper that now holds the reference, or at the end if it is gone.
            return insertBefore.call(this, newNode, directChildOf(this, referenceNode));
        }
        return insertBefore.call(this, newNode, referenceNode);
    };
}

function label(value) {
    return typeof value === 'string' ? value.replace(/[^A-Za-z-]/g, '').slice(0, 12) : '';
}

/**
 * The language a browser translator switched the page to, or null while it shows our own text.
 * Google Translate marks <html> with translated-ltr/rtl and sets lang to the target language.
 */
export function translatedTo(doc = typeof document !== 'undefined' ? document : null) {
    const html = doc?.documentElement;
    if (!html) return null;
    const lang = label(html.getAttribute('lang'));
    const marked = html.classList.contains('translated-ltr') || html.classList.contains('translated-rtl');
    const original = html.getAttribute('data-original-lang') || 'en';
    if (marked) return lang || 'unknown';
    if (lang && lang.toLowerCase().split('-')[0] !== original.toLowerCase().split('-')[0]) return lang;
    return null;
}

/** Calls `callback(lang)` once, the first time the page is seen translated. Returns a stop function. */
export function watchForTranslation(callback, doc = typeof document !== 'undefined' ? document : null) {
    const html = doc?.documentElement;
    if (!html || typeof MutationObserver !== 'function') return () => {};
    if (!html.hasAttribute('data-original-lang')) html.setAttribute('data-original-lang', html.getAttribute('lang') || 'en');
    let done = false;
    const check = () => {
        const lang = translatedTo(doc);
        if (!done && lang) {
            done = true;
            observer.disconnect();
            callback(lang);
        }
    };
    const observer = new MutationObserver(check);
    observer.observe(html, { attributes: true, attributeFilter: ['class', 'lang'] });
    check();
    return () => observer.disconnect();
}
