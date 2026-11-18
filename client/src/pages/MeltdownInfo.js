import React, { useContext, useEffect } from "react";
import { DataContext } from "../GameContext";
import LeaveGameButton from "../components/LeaveGameButton";
import { vibrate } from "../signal";
import { t } from '../i18n';

// Meltdown: hazard stripes slam down on every phone, with this phone's code and the clock.
function MeltdownInfo() {
    const { meltdownTimer, meltdownCode, hackerCode } = useContext(DataContext);
    const critical = meltdownTimer <= 10;

    useEffect(() => {
        vibrate([300, 150, 300]);
    }, []);

    return (
        <div className="sg-screen sg-ink sg-slide-down" style={{ overflow: 'hidden' }}>
            <div className="sg-hazard" />
            <LeaveGameButton className="sg-corner" />

            <div className="sg-center">
                <div style={{ background: 'var(--sg-ink)', borderRadius: 26, padding: '26px 20px', width: '100%', maxWidth: 420, display: 'grid', gap: 6, justifyItems: 'center' }}>
                    <h1 className="sg-big sg-h2" style={{ color: 'var(--sg-hazard)' }}>{t('MELTDOWN')}</h1>
                    <p className="sg-lede">{t('Get to the reactor')}</p>
                    <p
                        key={critical ? meltdownTimer : 'steady'}
                        className={`sg-big sg-num ${critical ? 'sg-tick' : ''}`}
                        style={{ fontSize: 'clamp(88px, 30vw, 136px)', color: critical ? 'var(--sg-hazard)' : '#fff' }}
                    >
                        {meltdownTimer}
                    </p>
                    <p className="sg-small">{critical ? t('Seconds left. Hurry.') : t('seconds until meltdown')}</p>
                    <p className="sg-lede" style={{ marginTop: 14, opacity: 0.75 }}>{t('Your code')}</p>
                    <p className="sg-big sg-num" data-testid="meltdown-code" style={{ fontSize: 'clamp(48px, 15vw, 64px)', letterSpacing: '0.14em', color: 'var(--sg-meet)' }}>
                        {meltdownCode}
                    </p>
                    <p className="sg-small">{t('Type it in at the reactor')}</p>
                    {hackerCode && (
                        // Only the Hacker gets a second code. Typed at the reactor, it undoes a code.
                        <div data-testid="hacker-code" style={{ marginTop: 14, display: 'grid', justifyItems: 'center', gap: 4 }}>
                            <p className="sg-lede" style={{ opacity: 0.75, color: 'var(--sg-out)' }}>{t('Hacker code')}</p>
                            <p className="sg-big sg-num" style={{ fontSize: 'clamp(40px, 12vw, 54px)', letterSpacing: '0.14em', color: 'var(--sg-out)' }}>
                                {hackerCode}
                            </p>
                            <p className="sg-small" style={{ maxWidth: '28ch', textAlign: 'center' }}>{t('If anyone types this at the reactor, one code is undone and 10 seconds are lost. Get someone else to type it.')}</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

export default MeltdownInfo;
