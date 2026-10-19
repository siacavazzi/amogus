// =============================================================
// CardCarousel
// Stack-style swipeable card carousel for the intruder hand.
//
// Design goals (per product spec):
//   - Smooth stack animation: the next card slides forward and
//     the active one falls back into the stack.
//   - Horizontal swipes must NOT trigger browser back-navigation.
//     The intruder page never scrolls, so the gesture surface uses
//     `touch-action: none`: the browser never claims the touch for
//     a pan (which would cancel our pointer stream mid-swipe) and we
//     handle all motion ourselves.
//   - The deck follows the finger 1:1, and a short swipe (~15% width)
//     or a quick flick is enough to change cards.
//   - Cards are coloured per action type (EMP=cyan, Fake Task=pink,
//     Remote Sabotage=red, etc.) so the player gets a quick read
//     on what's in their hand.
//   - Tapping NEVER plays the active card — that's only the big
//     "PLAY CARD" button. Tapping a peeked side card just brings
//     it forward. This avoids "I meant to swipe but I tapped".
//   - `compact` mode trims the deck height when the page also has
//     to show Active Effects above; otherwise the deck stretches
//     to feel like a real hand of cards.
// =============================================================
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
    Zap, Clock, MapPin, Hand,
    Radiation, ClipboardX, Megaphone, Volume2, Ban, RefreshCw, FastForward,
    Skull, MessageSquare,
} from '../signal/icons';

const SWIPE_THRESHOLD_RATIO = 0.15; // fraction of width before commit
const FLICK_VELOCITY = 0.3;          // px/ms over the last moments of the drag
const FLICK_MIN_PX = 24;             // a flick still has to travel this far
const FLICK_WINDOW_MS = 100;         // velocity is measured over this window
const LOCK_SLOP_PX = 8;              // movement before we decide swipe vs press
const CARD_WIDTH_RATIO = 0.76;       // matches w-[76%] max-w-[320px] below
const CARD_MAX_WIDTH = 320;
const SLOT_SHIFT_RATIO = 0.78;       // each slot is 78% of a card width apart
const TRANSITION_MS = 320;
const MAX_VISIBLE_PEEK = 2;          // cards visible on each side
const HOLD_MS = 650;                 // press duration to fire a play
const TAP_HINT_COUNT = 2;            // accidental taps before showing hint
const TAP_HINT_WINDOW_MS = 3500;     // taps inside this window count
const HINT_VISIBLE_MS = 2800;

// ----- Action -> theme map -----
// Keys match the `action` strings used in server/assets/card.py.
// All cards share a muted dark-steel base; the action color is used
// only as an accent (border, icon halo, dot, button gradient) so the
// hand reads as a cohesive set rather than a clown bag of skittles.
const CARD_THEMES = {
    'EMP': {
        active: 'from-slate-800 via-slate-900 to-slate-950 border-cyan-400/70 shadow-cyan-900/40',
        peek:   'from-slate-800 via-slate-900 to-slate-950 border-cyan-500/25',
        icon:   'bg-cyan-400/15 ring-1 ring-cyan-300/30',
        dot:    'bg-cyan-400',
        button: 'from-cyan-700 to-cyan-900 border-cyan-400/60 shadow-cyan-900/40',
    },
    'Fake Task': {
        active: 'from-slate-800 via-slate-900 to-slate-950 border-pink-400/70 shadow-pink-900/40',
        peek:   'from-slate-800 via-slate-900 to-slate-950 border-pink-500/25',
        icon:   'bg-pink-400/15 ring-1 ring-pink-300/30',
        dot:    'bg-pink-400',
        button: 'from-pink-700 to-pink-900 border-pink-400/60 shadow-pink-900/40',
    },
    'Remote Sabotage': {
        active: 'from-slate-800 via-slate-900 to-slate-950 border-rose-400/70 shadow-rose-900/40',
        peek:   'from-slate-800 via-slate-900 to-slate-950 border-rose-500/25',
        icon:   'bg-rose-400/15 ring-1 ring-rose-300/30',
        dot:    'bg-rose-400',
        button: 'from-rose-700 to-rose-900 border-rose-400/60 shadow-rose-900/40',
    },
    'Self Report': {
        active: 'from-slate-800 via-slate-900 to-slate-950 border-amber-400/70 shadow-amber-900/40',
        peek:   'from-slate-800 via-slate-900 to-slate-950 border-amber-500/25',
        icon:   'bg-amber-400/15 ring-1 ring-amber-300/30',
        dot:    'bg-amber-400',
        button: 'from-amber-700 to-amber-900 border-amber-400/60 shadow-amber-900/40',
    },
    'Taunt': {
        active: 'from-slate-800 via-slate-900 to-slate-950 border-orange-400/70 shadow-orange-900/40',
        peek:   'from-slate-800 via-slate-900 to-slate-950 border-orange-500/25',
        icon:   'bg-orange-400/15 ring-1 ring-orange-300/30',
        dot:    'bg-orange-400',
        button: 'from-orange-700 to-orange-900 border-orange-400/60 shadow-orange-900/40',
    },
    'Taunt Message': {
        active: 'from-slate-800 via-slate-900 to-slate-950 border-fuchsia-400/70 shadow-fuchsia-900/40',
        peek:   'from-slate-800 via-slate-900 to-slate-950 border-fuchsia-500/25',
        icon:   'bg-fuchsia-400/15 ring-1 ring-fuchsia-300/30',
        dot:    'bg-fuchsia-400',
        button: 'from-fuchsia-700 to-fuchsia-900 border-fuchsia-400/60 shadow-fuchsia-900/40',
    },
    'Area Denial': {
        active: 'from-slate-800 via-slate-900 to-slate-950 border-violet-400/70 shadow-violet-900/40',
        peek:   'from-slate-800 via-slate-900 to-slate-950 border-violet-500/25',
        icon:   'bg-violet-400/15 ring-1 ring-violet-300/30',
        dot:    'bg-violet-400',
        button: 'from-violet-700 to-violet-900 border-violet-400/60 shadow-violet-900/40',
    },
    'Discard and Draw': {
        active: 'from-slate-800 via-slate-900 to-slate-950 border-emerald-400/70 shadow-emerald-900/40',
        peek:   'from-slate-800 via-slate-900 to-slate-950 border-emerald-500/25',
        icon:   'bg-emerald-400/15 ring-1 ring-emerald-300/30',
        dot:    'bg-emerald-400',
        button: 'from-emerald-700 to-emerald-900 border-emerald-400/60 shadow-emerald-900/40',
    },
    'Shorten Meltdown': {
        active: 'from-slate-800 via-slate-900 to-slate-950 border-indigo-400/70 shadow-indigo-900/40',
        peek:   'from-slate-800 via-slate-900 to-slate-950 border-indigo-500/25',
        icon:   'bg-indigo-400/15 ring-1 ring-indigo-300/30',
        dot:    'bg-indigo-400',
        button: 'from-indigo-700 to-indigo-900 border-indigo-400/60 shadow-indigo-900/40',
    },
};
const DEFAULT_THEME = {
    active: 'from-slate-800 via-slate-900 to-slate-950 border-red-400/70 shadow-red-900/40',
    peek:   'from-slate-800 via-slate-900 to-slate-950 border-red-500/25',
    icon:   'bg-red-400/15 ring-1 ring-red-300/30',
    dot:    'bg-red-400',
    button: 'from-red-700 to-red-900 border-red-400/60 shadow-red-900/40',
};

function themeFor(action) {
    return CARD_THEMES[action] || DEFAULT_THEME;
}

// Per-action large illustration shown in the empty area below the
// description. Helps players recognize a card at a glance and gives
// the body of the card visual weight on smaller screens where there
// would otherwise be a lot of dead space.
const ACTION_ICONS = {
    'EMP': Zap,
    'Fake Task': ClipboardX,
    'Remote Sabotage': Radiation,
    'Self Report': Megaphone,
    'Taunt': Volume2,
    'Taunt Message': MessageSquare,
    'Area Denial': Ban,
    'Discard and Draw': RefreshCw,
    'Shorten Meltdown': FastForward,
};
function iconFor(action) {
    return ACTION_ICONS[action] || Skull;
}

function CarouselCard({
    card,
    offset,
    isActive,
    isAnimating,
    compact,
    holdProgress,
    onTap,
}) {
    const absOffset = Math.abs(offset);

    const translatePct = offset * SLOT_SHIFT_RATIO * 100;
    const scale = Math.max(0.82, 1 - absOffset * 0.08);
    const rotate = offset * 4;
    const opacity = Math.max(0, 1 - absOffset * 0.35);
    const zIndex = 10 - Math.round(absOffset * 2);

    const style = {
        transform: `translate(-50%, -50%) translateX(${translatePct}%) scale(${scale}) rotate(${rotate}deg)`,
        opacity,
        zIndex,
        transition: isAnimating ? `transform ${TRANSITION_MS}ms cubic-bezier(.22,.9,.32,1.2), opacity ${TRANSITION_MS}ms ease` : 'none',
        pointerEvents: absOffset > MAX_VISIBLE_PEEK ? 'none' : 'auto',
    };

    const { action, text, location, duration } = card;
    const formattedAction = (action || '').replace('_', ' ');
    const theme = themeFor(action);
    const ActionIcon = iconFor(action);

    return (
        <div
            className={`absolute top-1/2 left-1/2 w-[76%] max-w-[320px] h-[94%] max-h-[560px] select-none cursor-pointer
                rounded-2xl border-2 shadow-2xl bg-gradient-to-br flex flex-col
                ${compact ? 'p-3' : 'p-5'}
                ${isActive ? theme.active : theme.peek}
            `}
            style={style}
            onClick={(e) => { e.stopPropagation(); onTap && onTap(); }}
            aria-hidden={!isActive}
        >
            <div className={`flex items-center gap-2 ${compact ? 'mb-2' : 'mb-3'}`}>
                <div className={`p-1.5 rounded-xl ${theme.icon}`}>
                    <Zap size={compact ? 16 : 20} className="text-white" />
                </div>
                <h3 className={`font-extrabold capitalize tracking-tight text-white ${compact ? 'text-base' : 'text-xl'}`}>
                    {formattedAction}
                </h3>
            </div>

            <p className={`leading-relaxed text-white/90 overflow-hidden ${compact ? 'text-xs mb-2' : 'text-sm mb-4'}`}>
                {text}
            </p>

            {/* Big action illustration filling the dead space between
                the body text and the metadata chips. Sized via flex-1
                so it scales naturally with whatever room is left. */}
            <div className="flex-1 min-h-0 flex items-center justify-center my-1">
                <ActionIcon
                    className="text-white/35"
                    strokeWidth={1.5}
                    style={{ width: '60%', height: '100%', maxHeight: compact ? 96 : 180, maxWidth: 180 }}
                    aria-hidden="true"
                />
            </div>

            <div className="flex flex-wrap gap-2">
                {location && (
                    <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-black/30 text-xs">
                        <MapPin size={12} className="text-white/80" />
                        <span className="text-white/90">{location}</span>
                    </div>
                )}
                {duration && (
                    <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-black/30 text-xs">
                        <Clock size={12} className="text-white/80" />
                        <span className="text-white/90">{duration}s</span>
                    </div>
                )}
            </div>

            {/* Hold-to-play progress bar. Sweeps left→right while the
                user presses on the active card; releasing before it
                completes cancels. */}
            {isActive && holdProgress > 0 && (
                <div className="absolute left-3 right-3 bottom-2 h-1.5 rounded-full bg-white/15 overflow-hidden">
                    <div
                        className="h-full bg-white/90 rounded-full"
                        style={{ width: `${Math.min(100, holdProgress * 100)}%`, transition: 'width 60ms linear' }}
                    />
                </div>
            )}
        </div>
    );
}

export default function CardCarousel({ cards, onPlayCard, compact = false, onActiveIndexChange }) {
    const [activeIndex, setActiveIndex] = useState(0);
    const [dragX, setDragX] = useState(0);
    const [isAnimating, setIsAnimating] = useState(false);
    const [holdProgress, setHoldProgress] = useState(0);
    const [hintVisible, setHintVisible] = useState(false);
    const containerRef = useRef(null);
    const widthRef = useRef(0);
    const dragState = useRef(null);
    const holdRafRef = useRef(null);
    const holdStartRef = useRef(0);
    const tapTimesRef = useRef([]);
    const hintTimerRef = useRef(null);
    const activeCardRef = useRef(null);
    // The latest drag distance, kept outside React state so pointerup
    // never decides on a value from a render that hasn't happened yet.
    const dragXRef = useRef(0);
    const animTimerRef = useRef(null);
    const suppressClickRef = useRef(false);

    useEffect(() => () => {
        if (holdRafRef.current) cancelAnimationFrame(holdRafRef.current);
        if (hintTimerRef.current) clearTimeout(hintTimerRef.current);
        if (animTimerRef.current) clearTimeout(animTimerRef.current);
    }, []);

    useEffect(() => {
        if (!containerRef.current) return;
        const measure = () => {
            widthRef.current = containerRef.current?.offsetWidth || 0;
        };
        measure();
        const ro = new ResizeObserver(measure);
        ro.observe(containerRef.current);
        return () => ro.disconnect();
    }, []);

    useEffect(() => {
        if (activeIndex >= cards.length && cards.length > 0) {
            setActiveIndex(cards.length - 1);
        }
    }, [cards.length, activeIndex]);

    useEffect(() => {
        if (!onActiveIndexChange || cards.length === 0) return;
        onActiveIndexChange(activeIndex, cards[activeIndex]);
    }, [activeIndex, cards, onActiveIndexChange]);

    const updateDragX = useCallback((x) => {
        dragXRef.current = x;
        setDragX(x);
    }, []);

    // Ease the deck to `newIndex` (or back to where it was).
    const settleTo = useCallback((newIndex) => {
        setIsAnimating(true);
        updateDragX(0);
        if (newIndex !== undefined) setActiveIndex(newIndex);
        if (animTimerRef.current) clearTimeout(animTimerRef.current);
        animTimerRef.current = setTimeout(() => setIsAnimating(false), TRANSITION_MS + 20);
    }, [updateDragX]);

    const cancelHold = useCallback(() => {
        if (holdRafRef.current) cancelAnimationFrame(holdRafRef.current);
        holdRafRef.current = null;
        setHoldProgress(0);
    }, []);

    const showHint = useCallback(() => {
        setHintVisible(true);
        if (hintTimerRef.current) clearTimeout(hintTimerRef.current);
        hintTimerRef.current = setTimeout(() => setHintVisible(false), HINT_VISIBLE_MS);
    }, []);

    const registerTap = useCallback(() => {
        const now = performance.now();
        tapTimesRef.current = [
            ...tapTimesRef.current.filter((t) => now - t < TAP_HINT_WINDOW_MS),
            now,
        ];
        if (tapTimesRef.current.length >= TAP_HINT_COUNT) {
            tapTimesRef.current = [];
            showHint();
        }
    }, [showHint]);

    const isOnActiveCard = useCallback((clientX) => {
        const c = containerRef.current;
        if (!c) return false;
        const rect = c.getBoundingClientRect();
        const cx = rect.left + rect.width / 2;
        const cardW = Math.min(rect.width * CARD_WIDTH_RATIO, CARD_MAX_WIDTH);
        return Math.abs(clientX - cx) <= cardW / 2;
    }, []);

    const startHold = useCallback(() => {
        cancelHold();
        holdStartRef.current = performance.now();
        const tick = () => {
            const p = Math.min(1, (performance.now() - holdStartRef.current) / HOLD_MS);
            setHoldProgress(p);
            if (p >= 1) {
                holdRafRef.current = null;
                setHoldProgress(0);
                tapTimesRef.current = [];
                if (hintTimerRef.current) clearTimeout(hintTimerRef.current);
                setHintVisible(false);
                if (activeCardRef.current) onPlayCard(activeCardRef.current);
                return;
            }
            holdRafRef.current = requestAnimationFrame(tick);
        };
        holdRafRef.current = requestAnimationFrame(tick);
    }, [cancelHold, onPlayCard]);

    const handlePointerDown = useCallback((e) => {
        if (e.button !== undefined && e.button !== 0) return;
        const onActive = isOnActiveCard(e.clientX);
        const now = performance.now();
        suppressClickRef.current = false;
        dragState.current = {
            startX: e.clientX,
            startY: e.clientY,
            locked: false,
            pointerId: e.pointerId,
            onActive,
            samples: [{ x: e.clientX, t: now }],
        };
        // Grabbing the deck mid-animation snaps it into place so the
        // drag tracks the finger right away.
        if (animTimerRef.current) clearTimeout(animTimerRef.current);
        setIsAnimating(false);
        if (onActive) startHold();
    }, [isOnActiveCard, startHold]);

    const handlePointerMove = useCallback((e) => {
        const s = dragState.current;
        if (!s) return;
        const dx = e.clientX - s.startX;
        const dy = e.clientY - s.startY;
        const now = performance.now();
        s.samples.push({ x: e.clientX, t: now });
        while (s.samples.length > 2 && now - s.samples[0].t > FLICK_WINDOW_MS) s.samples.shift();
        if (!s.locked) {
            if (Math.abs(dx) < LOCK_SLOP_PX && Math.abs(dy) < LOCK_SLOP_PX) return;
            // Any meaningful movement cancels the hold-to-play press.
            cancelHold();
            // Thumbs swipe in an arc, so only a clearly vertical drag
            // is ignored.
            if (Math.abs(dy) > Math.abs(dx) * 1.5 || cards.length <= 1) {
                dragState.current = null;
                return;
            }
            s.locked = true;
            suppressClickRef.current = true;
            try { e.currentTarget.setPointerCapture(s.pointerId); } catch (_) {}
        }
        let effective = dx;
        if ((activeIndex === 0 && dx > 0) || (activeIndex === cards.length - 1 && dx < 0)) {
            effective = dx * 0.35;
        }
        updateDragX(effective);
        if (e.cancelable) e.preventDefault();
    }, [activeIndex, cards.length, cancelHold, updateDragX]);

    const endDrag = useCallback((e) => {
        const s = dragState.current;
        dragState.current = null;
        const wasHolding = holdRafRef.current !== null;
        cancelHold();
        if (!s) return;
        if (s.locked) {
            try { e.currentTarget.releasePointerCapture(s.pointerId); } catch (_) {}

            const w = widthRef.current || 1;
            const x = dragXRef.current;
            const first = s.samples[0];
            const last = s.samples[s.samples.length - 1];
            const velocity = (last.x - first.x) / Math.max(1, last.t - first.t);

            const passedDistance = Math.abs(x) > w * SWIPE_THRESHOLD_RATIO;
            // A flick counts only when it is still moving the same way
            // it was dragged, so pulling back and letting go cancels.
            const flicked = Math.abs(velocity) > FLICK_VELOCITY
                && Math.abs(x) > FLICK_MIN_PX
                && Math.sign(velocity) === Math.sign(x);

            if ((passedDistance || flicked) && cards.length > 1) {
                const direction = x < 0 ? 1 : -1;
                const next = Math.min(cards.length - 1, Math.max(0, activeIndex + direction));
                if (next !== activeIndex) {
                    settleTo(next);
                    return;
                }
            }
            settleTo();
            return;
        }

        // Pointer released without locking into a swipe — it was a tap.
        // If the tap was on the active card and the hold timer didn't
        // complete, register it as an accidental tap so we can show the
        // hold-to-play hint after a couple of repeats.
        if (s.onActive && wasHolding) {
            registerTap();
        }
    }, [activeIndex, cards.length, settleTo, cancelHold, registerTap]);

    if (cards.length === 0) return null;

    // Tap on a side card brings it forward. Tap on the active card no
    // longer plays it — playing requires a press-and-hold gesture
    // handled at the deck level. The card-level onTap is only used to
    // navigate from peeked cards.
    const handleCardTap = (i) => {
        // A mouse drag ends with a click on whatever card is under the
        // pointer; that was a swipe, not a tap.
        if (suppressClickRef.current) {
            suppressClickRef.current = false;
            return;
        }
        if (i === activeIndex) return;
        settleTo(i);
    };

    const activeCard = cards[activeIndex];
    activeCardRef.current = activeCard;
    const activeTheme = themeFor(activeCard?.action);

    // Move the whole stack with the finger: dragging one slot's width
    // brings the neighbouring card exactly into the middle.
    const slotWidth = Math.min(widthRef.current * CARD_WIDTH_RATIO, CARD_MAX_WIDTH) * SLOT_SHIFT_RATIO;
    const dragOffset = slotWidth > 0 ? dragX / slotWidth : 0;

    // Deck height: in non-compact mode the deck fills the flex column
    // it's nested in (page must give it a flex-1 + min-h-0 parent), so
    // it adapts to whatever screen real estate is actually free without
    // forcing the page to scroll. The min-h floor is intentionally low
    // so the card stays visible (not collapsed) on short screens like
    // the iPhone SE; max-h keeps it from getting comically tall on
    // big tablets. Compact mode is also flex-1 (with a tighter floor
    // and ceiling) so on short screens the deck still fits below the
    // active effects panel instead of being pushed off-screen.
    const deckHeight = compact
        ? 'flex-1 min-h-[180px] max-h-[420px]'
        : 'flex-1 min-h-[200px] max-h-[640px]';

    return (
        <div className="w-full h-full flex flex-col min-h-0 relative">
            {/* Hint banner: shown after a couple of accidental taps on the
                active card to remind the player that play requires a
                hold gesture. Floats above the deck so it never reflows
                the layout. */}
            <div
                className={`pointer-events-none absolute left-1/2 -translate-x-1/2 -top-2 z-30
                    flex items-center gap-2 px-3 py-2 rounded-full
                    bg-black/85 border border-white/20 shadow-xl
                    text-white text-xs font-semibold whitespace-nowrap
                    transition-all duration-200
                    ${hintVisible ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-2'}`}
                role="status"
                aria-live="polite"
            >
                <Hand size={14} className="text-amber-300" />
                <span>Press and hold the card to play it</span>
            </div>

            {/* Hand counter — hidden in compact mode to reclaim vertical
                space on small screens. The dot pager already shows the
                same info. */}
            {!compact && (
                <div className="flex items-center justify-between mb-3 px-1">
                    <div className="flex items-center gap-2 text-red-300/80 text-xs uppercase tracking-wider font-bold">
                        <span className="inline-block w-2 h-2 bg-red-400 rounded-full animate-pulse" />
                        Hand
                    </div>
                    <div className="text-red-200 text-sm font-mono">
                        {activeIndex + 1} / {cards.length}
                    </div>
                </div>
            )}

            {/* Deck — gesture surface */}
            <div
                ref={containerRef}
                data-testid="card-deck"
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={endDrag}
                onPointerCancel={endDrag}
                className={`relative w-full ${deckHeight} overflow-hidden`}
                style={{
                    touchAction: 'none',
                    overscrollBehaviorX: 'contain',
                    WebkitUserSelect: 'none',
                    userSelect: 'none',
                }}
            >
                {cards.map((card, i) => (
                    <CarouselCard
                        key={card.id || i}
                        card={card}
                        offset={i - activeIndex + dragOffset}
                        isActive={i === activeIndex}
                        isAnimating={isAnimating}
                        compact={compact}
                        holdProgress={i === activeIndex ? holdProgress : 0}
                        onTap={() => handleCardTap(i)}
                    />
                ))}
            </div>

            {/* Dot indicators */}
            {cards.length > 1 && (
                <div className={`flex items-center justify-center gap-1.5 ${compact ? 'mt-2' : 'mt-3'}`}>
                    {cards.map((card, i) => (
                        <button
                            key={card.id || i}
                            type="button"
                            onClick={() => settleTo(i)}
                            aria-label={`Go to card ${i + 1}`}
                            className={`h-1.5 rounded-full transition-all ${
                                i === activeIndex
                                    ? `w-6 ${activeTheme.dot}`
                                    : 'w-1.5 bg-white/20 hover:bg-white/40'
                            }`}
                        />
                    ))}
                </div>
            )}

            {!compact && (
                <p className="text-center text-white/60 text-xs mt-3 flex items-center justify-center gap-1.5">
                    <Hand size={12} className="text-white/60" />
                    {cards.length > 1 ? 'Swipe to browse · Press & hold to play' : 'Press & hold to play'}
                </p>
            )}
        </div>
    );
}
