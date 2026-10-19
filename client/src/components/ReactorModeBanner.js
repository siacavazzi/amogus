import React from 'react';
import { isMobile as isMobileDevice } from 'react-device-detect';
import { Monitor, Speaker, Smartphone, ChevronRight } from '../signal/icons';
import '../signal/reactor.css';

/**
 * Resolve whether the current device is acting as a mobile player or as the reactor.
 * Mirrors the logic used in GameContext.js and PageController.js so the override stays
 * consistent across the app.
 */
export function useIsReactorDevice() {
    const mobileOverride = new URLSearchParams(window.location.search).get('mobile');
    const isMobile = mobileOverride !== null ? mobileOverride === 'true' : isMobileDevice;
    return !isMobile;
}

export function getSwitchToMobileHref() {
    const params = new URLSearchParams(window.location.search);
    params.set('mobile', 'true');
    return `${window.location.pathname}?${params.toString()}`;
}

/**
 * What the reactor is, and the optional Sonos setup, as plain text for the big screen.
 *
 * variant="full"    -> the reactor and Sonos notes stacked (with a "how it works" fold).
 * variant="compact" -> one line, suitable for in-progress setup pages.
 */
export function ReactorModeBanner({ variant = 'full', className = '', showSwitchLink = true }) {
    if (variant === 'compact') {
        return (
            <div className={`sg-rx-strip ${className}`} style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', fontFamily: 'var(--sg-font)', fontWeight: 700, fontSize: 14 }}>
                <Monitor size={18} />
                <p style={{ margin: 0 }}>
                    <b style={{ fontWeight: 900 }}>This device is the Reactor</b>
                    <span style={{ opacity: 0.75 }}> (shared display for meltdown and meetings, not a player).</span>
                </p>
                {showSwitchLink && (
                    <a href={getSwitchToMobileHref()} style={{ marginLeft: 'auto', color: 'inherit', fontWeight: 800, display: 'inline-flex', alignItems: 'center', gap: 6, whiteSpace: 'nowrap' }}>
                        <Smartphone size={14} />
                        Switch to player
                    </a>
                )}
            </div>
        );
    }

    return (
        <div className={`sg-rx-lobby__info ${className}`}>
            <div>
                <h2><Monitor size={22} /> This device = Reactor</h2>
                <p>
                    Larger screens act as the <b>Reactor</b>: a shared display for the meltdown code-entry mini-game and meeting status. It is not a player.
                </p>
                <p style={{ marginTop: 6 }}>
                    Set it down somewhere central. Players use their phones. <a href="/how-to-play#meltdown">More about the reactor</a>.
                </p>
            </div>

            <div>
                <h2><Speaker size={22} /> Sonos integration</h2>
                <p>
                    Optional. Pipe meeting calls, meltdown alarms, and round audio through a Sonos speaker for in-room ambience.
                    Configure it on the Reactor screen after creating a game.
                </p>
                <details>
                    <summary><ChevronRight size={14} /> How does it work?</summary>
                    <div>
                        <p>
                            Sus Party can connect to a Sonos speaker on your local network and play sound effects through it instead of (or in addition to) the Reactor's own speakers.
                        </p>
                        <ul>
                            <li>Meeting calls and meltdown alarms become room-filling.</li>
                            <li>Players hear cues even when their phone is silent.</li>
                            <li>Setup happens on the Reactor screen. Pick a speaker from the dropdown.</li>
                        </ul>
                        <p>
                            Requires the Reactor device and the Sonos speaker on the same Wi-Fi network. Skip it if you don't have one. The game runs fine without it.
                        </p>
                        <p>
                            <a href="https://github.com/siacavazzi/amogus-sonos-connector" target="_blank" rel="noopener noreferrer">
                                Sonos connector source on GitHub
                            </a>
                        </p>
                    </div>
                </details>
            </div>

            {showSwitchLink && <SwitchToMobileLink />}
        </div>
    );
}

export function SwitchToMobileLink({ className = '' }) {
    return (
        <a href={getSwitchToMobileHref()} className={`sg-rx-lobby__switch ${className}`}>
            <b><Smartphone size={18} /> Use this device as a player instead</b>
            <span>
                Not recommended. Players need a phone they can carry around the house: the game involves walking between rooms to do tasks, find bodies, and reach the meeting area. A laptop or desktop won&rsquo;t work mid-game.
            </span>
        </a>
    );
}

export default ReactorModeBanner;
