import React from 'react';
import { isMobile as isMobileDevice } from 'react-device-detect';
import { Monitor, Speaker, Radio, Smartphone, AlertTriangle } from 'lucide-react';

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
 * Side-by-side reactor + Sonos info, for desktop/reactor-mode setup screens.
 *
 * variant="full"    -> two big info cards + switch-to-mobile link below.
 * variant="compact" -> single slim strip, suitable for in-progress setup pages.
 */
export function ReactorModeBanner({ variant = 'full', className = '', showSwitchLink = true }) {
    if (variant === 'compact') {
        return (
            <div className={`flex items-center gap-3 px-4 py-2.5 bg-indigo-500/10 border border-indigo-500/25 rounded-xl ${className}`}>
                <Monitor size={16} className="text-indigo-300 shrink-0" />
                <p className="text-gray-300 text-sm leading-snug">
                    <span className="text-white font-semibold">This device is the Reactor</span>
                    <span className="text-gray-500"> (shared display for meltdown and meetings, not a player).</span>
                </p>
                {showSwitchLink && (
                    <a
                        href={getSwitchToMobileHref()}
                        className="ml-auto text-amber-300 hover:text-amber-200 text-xs font-medium whitespace-nowrap inline-flex items-center gap-1.5"
                    >
                        <Smartphone size={12} />
                        Switch to player
                    </a>
                )}
            </div>
        );
    }

    return (
        <div className={`grid grid-cols-1 md:grid-cols-2 gap-4 ${className}`}>
            <div className="p-5 bg-gradient-to-br from-indigo-500/10 via-gray-900/70 to-cyan-500/10 border border-indigo-500/25 rounded-xl">
                <div className="flex items-start gap-3">
                    <div className="p-2 bg-indigo-500/15 rounded-lg border border-indigo-500/20 shrink-0">
                        <Monitor size={18} className="text-indigo-300" />
                    </div>
                    <div className="min-w-0">
                        <p className="text-indigo-300/80 text-[11px] font-semibold uppercase tracking-[0.22em] mb-1">This device = Reactor</p>
                        <p className="text-gray-300 text-sm leading-snug">
                            Larger screens act as the <span className="text-white font-semibold">Reactor</span>: a shared display for the meltdown code-entry mini-game and meeting status. It is not a player.
                        </p>
                        <p className="text-gray-500 text-xs mt-2">
                            Set it down somewhere central. Players use their phones. <a href="/how-to-play#meltdown" className="text-indigo-400 hover:text-indigo-300 underline underline-offset-2">More about the reactor</a>.
                        </p>
                    </div>
                </div>
            </div>

            <div className="p-5 bg-gray-900/60 border border-gray-800/80 rounded-xl">
                <div className="flex items-start gap-3">
                    <div className="p-2 bg-purple-500/15 rounded-lg border border-purple-500/20 shrink-0">
                        <Speaker size={18} className="text-purple-300" />
                    </div>
                    <div className="min-w-0">
                        <p className="text-purple-300/80 text-[11px] font-semibold uppercase tracking-[0.22em] mb-1">Sonos integration</p>
                        <p className="text-gray-300 text-sm leading-snug">
                            Optional. Pipe meeting calls, meltdown alarms, and round audio through a Sonos speaker for in-room ambience.
                        </p>
                        <p className="text-gray-500 text-xs mt-2 flex items-center gap-1.5">
                            <Radio size={12} className="text-purple-400" />
                            Configure it on the Reactor screen after creating a game.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}

export function SwitchToMobileLink({ className = '' }) {
    return (
        <a
            href={getSwitchToMobileHref()}
            className={`flex items-start gap-3 p-3 bg-gray-900/40 border border-gray-800/60 hover:border-amber-500/40 rounded-xl transition-colors group ${className}`}
        >
            <div className="p-1.5 bg-amber-500/10 rounded-lg border border-amber-500/20 shrink-0">
                <Smartphone size={14} className="text-amber-300" />
            </div>
            <div className="min-w-0 flex-1">
                <p className="text-gray-300 text-sm font-medium group-hover:text-white transition-colors">
                    Use this device as a player instead
                </p>
                <p className="text-gray-500 text-xs mt-0.5 flex items-start gap-1.5">
                    <AlertTriangle size={11} className="text-amber-400/80 mt-0.5 shrink-0" />
                    Not recommended &mdash; the game involves moving around the house.
                </p>
            </div>
        </a>
    );
}

export default ReactorModeBanner;
