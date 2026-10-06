import { captureAcquisition, getAcquisition } from './discovery';

beforeEach(() => {
    const items = new Map();
    sessionStorage.getItem.mockImplementation(key => items.get(key) || null);
    sessionStorage.setItem.mockImplementation((key, value) => items.set(key, value));
});

it('keeps the Google entry page through an internal visit to the generator', () => {
    captureAcquisition({ pathname: '/among-us-irl', search: '', referrer: 'https://www.google.com/search?q=party', origin: 'https://susparty.com' });
    captureAcquisition({ pathname: '/among-us-irl-task-generator', search: '', referrer: 'https://susparty.com/among-us-irl', origin: 'https://susparty.com' });
    expect(getAcquisition()).toEqual({ source: 'google', landing_page: '/among-us-irl' });
});

it('recognizes a tagged demo link without storing the full URL', () => {
    captureAcquisition({ pathname: '/', search: '?utm_source=instagram&private=SECRET', referrer: '', origin: 'https://susparty.com' });
    expect(getAcquisition()).toEqual({ source: 'instagram', landing_page: '/' });
    expect(JSON.stringify(getAcquisition())).not.toContain('SECRET');
});

it('does not confuse a lookalike domain with Google', () => {
    captureAcquisition({ pathname: '/', search: '', referrer: 'https://google.com.example.org/', origin: 'https://susparty.com' });
    expect(getAcquisition().source).toBe('other');
});
