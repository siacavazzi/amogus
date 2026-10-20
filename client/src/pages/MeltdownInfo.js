import React, { useContext, useEffect } from "react";
import { DataContext } from "../GameContext";
import LeaveGameButton from "../components/LeaveGameButton";
import { vibrate } from "../signal";

// Meltdown: hazard stripes slam down on every phone, with this phone's code and the clock.
function MeltdownInfo() {
    const { meltdownTimer, meltdownCode } = useContext(DataContext);
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
                    <h1 className="sg-big sg-h2" style={{ color: 'var(--sg-hazard)' }}>MELTDOWN</h1>
                    <p className="sg-lede">Get to the reactor</p>
                    <p
                        key={critical ? meltdownTimer : 'steady'}
                        className={`sg-big sg-num ${critical ? 'sg-tick' : ''}`}
                        style={{ fontSize: 'clamp(88px, 30vw, 136px)', color: critical ? 'var(--sg-hazard)' : '#fff' }}
                    >
                        {meltdownTimer}
                    </p>
                    <p className="sg-small">{critical ? 'Seconds left. Hurry.' : 'seconds until meltdown'}</p>
                    <p className="sg-lede" style={{ marginTop: 14, opacity: 0.75 }}>Your code</p>
                    <p className="sg-big sg-num" data-testid="meltdown-code" style={{ fontSize: 'clamp(48px, 15vw, 64px)', letterSpacing: '0.14em', color: 'var(--sg-meet)' }}>
                        {meltdownCode}
                    </p>
                    <p className="sg-small">Type it in at the reactor</p>
                </div>
            </div>
        </div>
    );
}

export default MeltdownInfo;
