import React, { useContext, useEffect } from "react";
import { DataContext } from "../GameContext";
import LeaveGameButton from "../components/LeaveGameButton";
import { vibrate } from "../signal";
import { t } from '../i18n';
import { Radiation } from "../signal/icons";
import { HeatBar } from "../signal/Burst";
import { useCountdownProgress } from "../signal/Emp";

// Meltdown: hazard stripes slam down on every phone, with this phone's code and the clock.
function MeltdownInfo() {
    const { meltdownTimer, meltdownCode } = useContext(DataContext);
    const heat = useCountdownProgress(meltdownTimer);
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
                    <span className="sg-radspin" style={{ color: 'var(--sg-hazard)' }}><Radiation size={56} strokeWidth={2.5} /></span>
                    <h1 className="sg-big sg-h2 sg-a sg-slam" style={{ color: 'var(--sg-hazard)', animationDelay: '600ms' }}>{t('MELTDOWN')}</h1>
                    <p className="sg-lede">{t('Get to the reactor')}</p>
                    <p
                        key={critical ? meltdownTimer : 'steady'}
                        className={`sg-big sg-num ${critical ? 'sg-tick' : ''}`}
                        style={{ fontSize: 'clamp(88px, 30vw, 136px)', color: critical ? 'var(--sg-hazard)' : '#fff' }}
                    >
                        {meltdownTimer}
                    </p>
                    <p className="sg-small">{critical ? t('Seconds left. Hurry.') : t('seconds until meltdown')}</p>
                    <HeatBar progress={heat} style={{ marginTop: 8, maxWidth: 300 }} />
                    <p className="sg-lede" style={{ marginTop: 14, opacity: 0.75 }}>{t('Your code')}</p>
                    <p className="sg-big sg-num" data-testid="meltdown-code" style={{ fontSize: 'clamp(48px, 15vw, 64px)', letterSpacing: '0.14em', color: 'var(--sg-meet)' }}>
                        {meltdownCode}
                    </p>
                    <p className="sg-small">{t('Type it in at the reactor')}</p>
                </div>
            </div>
        </div>
    );
}

export default MeltdownInfo;
