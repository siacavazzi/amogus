import { detectInAppBrowser, openInBrowserUrl } from '../../utils/inAppBrowser';

const IOS = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko)';
const ANDROID = 'Mozilla/5.0 (Linux; Android 14; Pixel 8 Build/AP1A.240305.019; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/122.0.6261.105 Mobile Safari/537.36';

const IN_APP = {
    facebook_ios: [`${IOS} Mobile/15E148 [FBAN/FBIOS;FBAV/455.0.0.44.110;FBBV/599361563;FBDV/iPhone15,2;FBMD/iPhone;FBSN/iOS;FBSV/17.4;FBSS/3;FBID/phone;FBLC/en_US;FBOP/5]`, 'facebook', 'ios'],
    facebook_android: [`${ANDROID} [FB_IAB/FB4A;FBAV/455.0.0.48.110;]`, 'facebook', 'android'],
    instagram_ios: [`${IOS} Mobile/15E148 Instagram 323.0.3.23.54 (iPhone15,2; iOS 17_4; en_US; en; scale=3.00; 1179x2556; 581553542)`, 'instagram', 'ios'],
    instagram_android: [`${ANDROID} Instagram 323.0.0.35.65 Android (34/14; 420dpi; 1080x2400; Google; Pixel 8; shiba; shiba; en_US; 580115924)`, 'instagram', 'android'],
    messenger_ios: [`${IOS} Mobile/15E148 LightSpeed [FBAN/MessengerLiteForiOS;FBAV/455.0.0.29.107;FBBV/599111239;FBDV/iPhone15,2;FBMD/iPhone;FBSN/iOS;FBSV/17.4;FBSS/3;FBCR/;FBID/phone;FBLC/en_US;FBOP/0]`, 'messenger', 'ios'],
    messenger_android: [`${ANDROID} [FB_IAB/Orca-Android;FBAV/450.0.0.40.109;]`, 'messenger', 'android'],
    reddit_ios: [`${IOS} Mobile/15E148 Reddit/Version 2024.12.0/Build 1543101/iOS Version 17.4`, 'reddit', 'ios'],
    reddit_android: [`${ANDROID} RedditAndroid 2024.12.0/Build 1543104`, 'reddit', 'android'],
    twitter_ios: [`${IOS} Mobile/15E148 Twitter for iPhone/10.34`, 'twitter', 'ios'],
    tiktok_ios: [`${IOS} Mobile/15E148 musical_ly_33.8.0 JsSdk/2.0 NetType/WIFI Channel/App Store ByteLocale/en Region/US`, 'tiktok', 'ios'],
    tiktok_android: [`${ANDROID} trill_2023408020 JsSdk/1.0 NetType/WIFI Channel/googleplay AppName/musical_ly app_version/34.8.2 ByteLocale/en BytedanceWebview/d8a21c6`, 'tiktok', 'android'],
    snapchat_ios: [`${IOS} Mobile/15E148 Snapchat/12.81.0.45 (like Safari/8617.2.4.10.8, panda)`, 'snapchat', 'ios'],
    linkedin_ios: [`${IOS} Mobile/15E148 [LinkedInApp]/9.29.6286`, 'linkedin', 'ios'],
    wechat_ios: [`${IOS} Mobile/15E148 MicroMessenger/8.0.47(0x18002f2c) NetType/WIFI Language/en`, 'wechat', 'ios'],
    google_app_ios: [`${IOS} GSA/309.0.621209080 Mobile/15E148 Safari/604.1`, 'google_app', 'ios'],
    unnamed_android_webview: [ANDROID, 'webview', 'android'],
    unnamed_ios_webview: [`${IOS} Mobile/15E148`, 'webview', 'ios'],
};

const REAL_BROWSERS = {
    safari_iphone: `${IOS} Version/17.4 Mobile/15E148 Safari/604.1`,
    chrome_iphone: `${IOS} CriOS/122.0.6261.89 Mobile/15E148 Safari/604.1`,
    firefox_iphone: `${IOS} FxiOS/124.0 Mobile/15E148 Safari/605.1.15`,
    edge_iphone: `${IOS} Version/17.0 EdgiOS/122.2365.86 Mobile/15E148 Safari/605.1.15`,
    chrome_android: 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Mobile Safari/537.36',
    samsung_android: 'Mozilla/5.0 (Linux; Android 14; SAMSUNG SM-S918B) AppleWebKit/537.36 (KHTML, like Gecko) SamsungBrowser/24.0 Chrome/117.0.0.0 Mobile Safari/537.36',
    firefox_android: 'Mozilla/5.0 (Android 14; Mobile; rv:124.0) Gecko/124.0 Firefox/124.0',
    safari_ipad_desktop_mode: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Safari/605.1.15',
    chrome_mac: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
    chrome_windows: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
    headless_prerender: 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/122.0.0.0 Safari/537.36',
};

describe('detectInAppBrowser', () => {
    it.each(Object.entries(IN_APP))('spots %s', (_, [ua, app, os]) => {
        expect(detectInAppBrowser(ua)).toEqual({ app, os });
    });

    it.each(Object.entries(REAL_BROWSERS))('leaves %s alone', (_, ua) => {
        expect(detectInAppBrowser(ua)).toBeNull();
    });

    it('leaves an iPhone home-screen web app alone', () => {
        expect(detectInAppBrowser(`${IOS} Mobile/15E148`, { standalone: true })).toBeNull();
    });

    it('handles a missing user agent', () => {
        expect(detectInAppBrowser('')).toBeNull();
        expect(detectInAppBrowser(undefined)).toBeNull();
    });
});

describe('openInBrowserUrl', () => {
    const url = 'https://susparty.com/play?room=ABCD';

    it('opens Chrome on Android and Safari on iPhone', () => {
        expect(openInBrowserUrl(url, 'android')).toBe('intent://susparty.com/play?room=ABCD#Intent;scheme=https;package=com.android.chrome;end');
        expect(openInBrowserUrl(url, 'ios')).toBe('x-safari-https://susparty.com/play?room=ABCD');
    });

    it('has no link elsewhere or for odd URLs', () => {
        expect(openInBrowserUrl(url, 'other')).toBeNull();
        expect(openInBrowserUrl('javascript:alert(1)', 'ios')).toBeNull();
        expect(openInBrowserUrl('not a url', 'android')).toBeNull();
    });
});
