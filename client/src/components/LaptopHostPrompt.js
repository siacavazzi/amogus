import React, { useEffect, useState } from 'react';
import { ArrowLeft, Monitor, Smartphone, X } from '../signal/icons';
import RoomQrCode from './RoomQrCode';
import { isBetaChannel } from './BetaBadge';
import { t } from '../i18n';

// Set once a phone has joined a room this laptop showed, so a laptop that has hosted before
// goes straight to setup next time.
export const LAPTOP_HOSTED_KEY = 'sus_party_laptop_hosted_v1';

export function laptopHasHosted() {
    try { return localStorage.getItem(LAPTOP_HOSTED_KEY) === '1'; } catch (_) { return false; }
}

export function rememberLaptopHosted() {
    try { localStorage.setItem(LAPTOP_HOSTED_KEY, '1'); } catch (_) { /* Storage can be unavailable. */ }
}

export function phoneStartUrl({ origin = window.location.origin, beta = isBetaChannel() } = {}) {
    const url = new URL('/play', origin);
    url.searchParams.set('from', 'laptop');
    if (beta) url.searchParams.set('beta', '1');
    return url.toString();
}

// Shown when someone taps Create New Game on a laptop: they can set the room up here, but
// they still play on a phone, or they can start the whole thing from their phone instead.
function LaptopHostPrompt({ onSetUpHere, onClose }) {
    const [onPhone, setOnPhone] = useState(false);

    useEffect(() => {
        const onKey = (event) => { if (event.key === 'Escape') onClose(); };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [onClose]);

    const address = `${window.location.host}/play`;

    return (
        <div className="sg-rx-prompt" role="dialog" aria-modal="true" aria-labelledby="laptop-host-title" onClick={onClose}>
            <div className="sg-rx-prompt__card sg-a sg-rise" onClick={(event) => event.stopPropagation()}>
                <button type="button" className="sg-rx-prompt__close" onClick={onClose} aria-label={t('Close')}>
                    <X size={22} />
                </button>
                {!onPhone ? (
                    <>
                        <h2 id="laptop-host-title" className="sg-big sg-h2">{t('Everyone plays on a phone, you too')}</h2>
                        <p>
                            {t('This laptop becomes the shared screen for the room. After you set up the game here, scan the code it shows with your phone. The first phone in is the host and starts the game.')}
                        </p>
                        <div className="sg-rx-prompt__actions">
                            <button type="button" className="sg-btn sg-btn-ink" onClick={onSetUpHere} autoFocus>
                                <Monitor size={22} /> {t('Set up on this laptop')}
                            </button>
                            <button type="button" className="sg-btn sg-btn-flat" onClick={() => setOnPhone(true)}>
                                <Smartphone size={22} /> {t('Host from my phone instead')}
                            </button>
                        </div>
                    </>
                ) : (
                    <>
                        <h2 id="laptop-host-title" className="sg-big sg-h2">{t('Scan this with your phone')}</h2>
                        <div className="sg-rx-prompt__phone">
                            <RoomQrCode value={phoneStartUrl()} title={t('QR code to open Sus Party on your phone')} className="sg-rx-prompt__qr" data-testid="laptop-phone-qr" />
                            <div>
                                <p>{t('Then tap Create New Game on your phone.')}</p>
                                <p className="sg-small">{t('Or type {address} on your phone.', { address })}</p>
                                <p className="sg-small">{t('Want this laptop as the shared screen too? Type the room code here once your phone has opened the room.')}</p>
                            </div>
                        </div>
                        <div className="sg-rx-prompt__actions">
                            <button type="button" className="sg-btn sg-btn-flat" onClick={() => setOnPhone(false)}>
                                <ArrowLeft size={22} /> {t('Back')}
                            </button>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}

export default LaptopHostPrompt;
