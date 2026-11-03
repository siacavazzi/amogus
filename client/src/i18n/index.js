// Game-screen translations. The English text is the key: t('Waiting for players') returns the
// phone's language when a translation exists and the English otherwise, so a missing string
// never breaks a screen. Server messages pass through t() too and translate when they match.
//
// Language is chosen once per page load (picker choice, then ?lang=, then the browser), and
// the picker reloads the page, so screens never need to re-render on a switch.

import fr from './locales/fr.json';
import es from './locales/es.json';
import de from './locales/de.json';
import ro from './locales/ro.json';

export const LANGUAGES = [
    { code: 'en', name: 'English' },
    { code: 'fr', name: 'Français' },
    { code: 'es', name: 'Español' },
    { code: 'de', name: 'Deutsch' },
    { code: 'ro', name: 'Română' },
];

const CATALOGS = { en: {}, fr, es, de, ro };
const STORAGE_KEY = 'sus_language';

function supported(code) {
    const base = typeof code === 'string' ? code.toLowerCase().split(/[-_]/)[0] : '';
    return Object.prototype.hasOwnProperty.call(CATALOGS, base) ? base : null;
}

function readStorage() {
    try { return localStorage.getItem(STORAGE_KEY); } catch (_) { return null; }
}

export function detectLanguage({
    search = typeof window !== 'undefined' ? window.location.search : '',
    stored = readStorage(),
    browser = typeof navigator !== 'undefined' ? (navigator.languages?.length ? navigator.languages : [navigator.language]) : [],
    headless = typeof navigator !== 'undefined' && /HeadlessChrome/.test(navigator.userAgent || ''),
} = {}) {
    const fromUrl = supported(new URLSearchParams(search).get('lang'));
    if (fromUrl) return fromUrl;
    const fromStorage = supported(stored);
    if (fromStorage) return fromStorage;
    // The build's prerender snapshots run in headless Chrome: they must always be English.
    if (headless) return 'en';
    // First browser language we have; an English-first browser stays English even if French is second.
    for (const code of browser || []) {
        const base = typeof code === 'string' ? code.toLowerCase().split(/[-_]/)[0] : '';
        if (supported(base)) return base;
        if (base === 'en') return 'en';
    }
    return 'en';
}

let current = null;

export function getLanguage() {
    if (!current) current = detectLanguage();
    return current;
}

/** For tests and the prerender: force a language without touching storage. */
export function setLanguageForTesting(code) {
    current = supported(code) || 'en';
}

/** The picker: remember the choice and reload so every screen redraws in it. */
export function chooseLanguage(code, { reload = true } = {}) {
    const lang = supported(code) || 'en';
    try { localStorage.setItem(STORAGE_KEY, lang); } catch (_) { /* private mode: this load only */ }
    current = lang;
    if (reload && typeof window !== 'undefined') {
        const url = new URL(window.location.href);
        url.searchParams.delete('lang');
        window.location.replace(url.toString());
    }
}

/** Mark <html> with the game's language so screen readers and browser translators see it. */
export function applyDocumentLanguage(doc = typeof document !== 'undefined' ? document : null) {
    const html = doc?.documentElement;
    if (!html) return;
    const lang = getLanguage();
    html.setAttribute('lang', lang);
    html.setAttribute('data-original-lang', lang);
}

function fill(text, vars) {
    if (!vars || typeof text !== 'string') return text;
    return text.replace(/\{(\w+)\}/g, (match, name) => (vars[name] === undefined || vars[name] === null ? match : String(vars[name])));
}

/** Marks English text for the catalogs without translating it yet (lookup tables, defaults). Pass it to t() when shown. */
export const tk = text => text;

/** Translate `text`, filling {placeholders} from `vars`. */
export function t(text, vars) {
    const entry = CATALOGS[getLanguage()]?.[text];
    return fill(typeof entry === 'string' && entry ? entry : text, vars);
}

const pluralRules = {};
function pluralCategory(lang, count) {
    try {
        pluralRules[lang] = pluralRules[lang] || new Intl.PluralRules(lang);
        return pluralRules[lang].select(count);
    } catch (_) {
        return count === 1 ? 'one' : 'other';
    }
}

/**
 * Plural: tn(3, '{count} task', '{count} tasks'). Catalogs store the singular English as the key
 * and one entry per plural category of that language (Romanian also has "few").
 */
export function tn(count, one, other, vars) {
    const lang = getLanguage();
    const values = { count, ...vars };
    const entry = CATALOGS[lang]?.[one];
    if (entry && typeof entry === 'object') {
        const form = entry[pluralCategory(lang, count)] || entry.other;
        if (form) return fill(form, values);
    }
    return fill(count === 1 ? one : other, values);
}

export const __catalogs = CATALOGS;
