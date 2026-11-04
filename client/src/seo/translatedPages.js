// The pages that exist in every language, and the hreflang links that tie each set together.
// Paths: English at the root (/, /among-us-irl), other languages under /fr, /es, /de, /ro, /pt.

export const ORIGIN = 'https://susparty.com';
export const PAGE_LANGUAGES = ['fr', 'es', 'de', 'ro', 'pt'];
export const HREFLANG = { en: 'en', fr: 'fr', es: 'es', de: 'de', ro: 'ro', pt: 'pt-BR' };
export const LANGUAGE_NAMES = { en: 'English', fr: 'Français', es: 'Español', de: 'Deutsch', ro: 'Română', pt: 'Português (Brasil)' };
export const PAGES = { home: '', irl: '/among-us-irl' };

export function pagePath(lang, page) {
    const suffix = PAGES[page];
    if (lang === 'en') return suffix || '/';
    return `/${lang}${suffix}`;
}

export function pageUrl(lang, page) {
    const path = pagePath(lang, page);
    return path === '/' ? `${ORIGIN}/` : `${ORIGIN}${path}`;
}

/** Every language of one page, plus x-default pointing at the English. */
export function alternatesFor(page) {
    const langs = ['en', ...PAGE_LANGUAGES];
    return [
        ...langs.map(lang => ({ hreflang: HREFLANG[lang], href: pageUrl(lang, page) })),
        { hreflang: 'x-default', href: pageUrl('en', page) },
    ];
}

/** Which translated page a path is, or null: { lang, page }. */
export function matchTranslatedPath(pathname) {
    const clean = (pathname || '').replace(/\/+$/, '');
    for (const lang of PAGE_LANGUAGES) {
        for (const page of Object.keys(PAGES)) {
            if (clean === pagePath(lang, page)) return { lang, page };
        }
    }
    return null;
}
