import { useEffect } from 'react';

function setMetaByName(name, content) {
    let el = document.querySelector(`meta[name="${name}"]`);
    if (!el) {
        el = document.createElement('meta');
        el.setAttribute('name', name);
        document.head.appendChild(el);
    }
    const prev = el.getAttribute('content') || '';
    el.setAttribute('content', content);
    return prev;
}

function setMetaByProp(property, content) {
    let el = document.querySelector(`meta[property="${property}"]`);
    if (!el) {
        el = document.createElement('meta');
        el.setAttribute('property', property);
        document.head.appendChild(el);
    }
    const prev = el.getAttribute('content') || '';
    el.setAttribute('content', content);
    return prev;
}

function setLinkCanonical(href) {
    let el = document.querySelector('link[rel="canonical"]');
    if (!el) {
        el = document.createElement('link');
        el.setAttribute('rel', 'canonical');
        document.head.appendChild(el);
    }
    const prev = el.getAttribute('href') || '';
    el.setAttribute('href', href);
    return prev;
}

/**
 * Sets all page-level SEO metadata before prerender capture.
 *
 * Updates title, description, canonical, OG tags, Twitter tags, theme-color,
 * and optionally injects a JSON-LD schema script. All changes are reverted on
 * unmount so navigating away restores the base values.
 *
 * @param {object} opts
 * @param {string} opts.title          - <title> and og:title
 * @param {string} opts.description    - meta description and og:description
 * @param {string} opts.canonical      - canonical URL and og:url
 * @param {string} [opts.ogImage]      - og:image and twitter:image (defaults to base value)
 * @param {object} [opts.schema]       - JSON-LD schema object, injected into <head>
 * @param {string} [opts.documentClass] - CSS class for the page theme
 */
export function usePageMeta({ title, description, canonical, ogImage, schema, documentClass = 'lp-document' }) {
    useEffect(() => {
        const prevTitle = document.title;
        const prevDesc = setMetaByName('description', description);
        const prevCanon = setLinkCanonical(canonical);
        const prevOgTitle = setMetaByProp('og:title', title);
        const prevOgDesc = setMetaByProp('og:description', description);
        const prevOgUrl = setMetaByProp('og:url', canonical);
        const prevOgImg = ogImage ? setMetaByProp('og:image', ogImage) : null;
        const prevTwTitle = setMetaByName('twitter:title', title);
        const prevTwDesc = setMetaByName('twitter:description', description);
        const prevTwImg = ogImage ? setMetaByName('twitter:image', ogImage) : null;
        const themeMeta = document.querySelector('meta[name="theme-color"]');
        const prevTheme = themeMeta ? themeMeta.getAttribute('content') : null;
        const html = document.documentElement;
        const body = document.body;

        document.title = title;
        if (themeMeta) themeMeta.setAttribute('content', '#030712');
        html.classList.add(documentClass);
        body.classList.add(documentClass);

        let schemaScript = null;
        if (schema) {
            schemaScript = document.createElement('script');
            schemaScript.type = 'application/ld+json';
            schemaScript.id = 'page-schema';
            schemaScript.textContent = JSON.stringify(schema);
            document.head.appendChild(schemaScript);
        }

        return () => {
            document.title = prevTitle;
            setMetaByName('description', prevDesc);
            setLinkCanonical(prevCanon);
            setMetaByProp('og:title', prevOgTitle);
            setMetaByProp('og:description', prevOgDesc);
            setMetaByProp('og:url', prevOgUrl);
            if (prevOgImg !== null) setMetaByProp('og:image', prevOgImg);
            setMetaByName('twitter:title', prevTwTitle);
            setMetaByName('twitter:description', prevTwDesc);
            if (prevTwImg !== null) setMetaByName('twitter:image', prevTwImg);
            if (themeMeta && prevTheme) themeMeta.setAttribute('content', prevTheme);
            html.classList.remove(documentClass);
            body.classList.remove(documentClass);
            if (schemaScript && document.head.contains(schemaScript)) {
                document.head.removeChild(schemaScript);
            }
        };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [title, description, canonical, ogImage, documentClass]);
}
