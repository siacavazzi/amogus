import { detectLanguage, setLanguageForTesting, t, tn, registerTemplates, __catalogs } from '../../i18n';
import { localizeDeathMessage } from '../../i18n/deathMessages';
import '../../i18n/serverMessages';

const { audit, LANGS } = require('../../../scripts/i18n-keys');

afterEach(() => setLanguageForTesting('en'));

describe('detectLanguage', () => {
    it('defaults to English', () => {
        expect(detectLanguage({ search: '', stored: null, browser: [], headless: false })).toBe('en');
    });

    it('uses the first supported browser language', () => {
        expect(detectLanguage({ search: '', stored: null, browser: ['fr-CA', 'en'], headless: false })).toBe('fr');
        expect(detectLanguage({ search: '', stored: null, browser: ['ja', 'ro-RO'], headless: false })).toBe('ro');
        expect(detectLanguage({ search: '', stored: null, browser: ['pt-BR'], headless: false })).toBe('pt');
    });

    it('keeps English-first browsers in English', () => {
        expect(detectLanguage({ search: '', stored: null, browser: ['en-US', 'de'], headless: false })).toBe('en');
    });

    it('prefers ?lang= then the saved choice', () => {
        expect(detectLanguage({ search: '?lang=es', stored: 'de', browser: ['fr'], headless: false })).toBe('es');
        expect(detectLanguage({ search: '', stored: 'de', browser: ['fr'], headless: false })).toBe('de');
        expect(detectLanguage({ search: '?lang=xx', stored: 'zz', browser: ['es'], headless: false })).toBe('es');
    });

    it('keeps the prerender in English', () => {
        expect(detectLanguage({ search: '', stored: null, browser: ['fr'], headless: true })).toBe('en');
    });

    it('uses the language of a translated page, even in the prerender', () => {
        expect(detectLanguage({ pathname: '/fr', search: '?lang=de', stored: 'es', browser: ['en'], headless: true })).toBe('fr');
        expect(detectLanguage({ pathname: '/pt/among-us-irl', stored: null, browser: [], headless: true })).toBe('pt');
        expect(detectLanguage({ pathname: '/faq', stored: null, browser: ['de'], headless: false })).toBe('de');
        expect(detectLanguage({ pathname: '/en', stored: null, browser: ['de'], headless: false })).toBe('de');
    });
});

describe('t and tn', () => {
    it('returns English when there is no translation', () => {
        setLanguageForTesting('fr');
        expect(t('A string nobody translated, {name}', { name: 'Ana' })).toBe('A string nobody translated, Ana');
    });

    it('translates and fills placeholders', () => {
        setLanguageForTesting('es');
        expect(t('{name} called it', { name: 'Ana' })).toBe('La convocó Ana');
        setLanguageForTesting('en');
        expect(t('{name} called it', { name: 'Ana' })).toBe('Ana called it');
    });

    it('uses each language\'s plural forms, including Romanian "few"', () => {
        setLanguageForTesting('en');
        expect(tn(1, '{count} task', '{count} tasks')).toBe('1 task');
        expect(tn(3, '{count} task', '{count} tasks')).toBe('3 tasks');
        setLanguageForTesting('ro');
        expect(tn(1, '{count} task', '{count} tasks')).toBe('1 sarcină');
        expect(tn(3, '{count} task', '{count} tasks')).toBe('3 sarcini');
        expect(tn(20, '{count} task', '{count} tasks')).toBe('20 de sarcini');
        setLanguageForTesting('fr');
        expect(tn(0, '{count} task', '{count} tasks')).toBe('0 tâche');
        setLanguageForTesting('pt');
        expect(tn(0, '{count} task', '{count} tasks')).toBe('0 tarefas');
        expect(tn(1, '{count} task', '{count} tasks')).toBe('1 tarefa');
    });

    it('translates server messages that carry values', () => {
        setLanguageForTesting('de');
        expect(t('Task list not found: ABC123')).toBe('Aufgabenliste nicht gefunden: ABC123');
        expect(localizeDeathMessage("was brutally murdered while trying to 'Water the plants'")).toContain('Water the plants');
        expect(localizeDeathMessage('went AFK')).not.toBe('went AFK');
    });

    it('matches only whole templates', () => {
        registerTemplates(['Only {thing} here']);
        setLanguageForTesting('fr');
        expect(t('Not only cats here at all')).toBe('Not only cats here at all');
    });
});

describe('catalogs', () => {
    it.each(LANGS)('%s has every game string with the same placeholders', lang => {
        const { missing, broken, unused } = audit(lang);
        expect(missing).toEqual([]);
        expect(broken).toEqual([]);
        expect(unused).toEqual([]);
    });

    it('gives Romanian plurals a "few" form', () => {
        const plurals = Object.entries(__catalogs.ro).filter(([, value]) => typeof value === 'object');
        expect(plurals.length).toBeGreaterThan(0);
        for (const [key, forms] of plurals) expect([key, Object.keys(forms).sort()]).toEqual([key, ['few', 'one', 'other']]);
    });
});
