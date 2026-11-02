import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import CardCarousel from '../../components/CardCarousel';

// jsdom has no PointerEvent, so fireEvent would drop clientX/clientY.
class TestPointerEvent extends MouseEvent {
    constructor(type, props = {}) {
        super(type, props);
        this.pointerId = props.pointerId ?? 1;
    }
}

const cards = [
    { id: 'a', action: 'EMP', text: 'Disable all devices' },
    { id: 'b', action: 'Fake Task', text: 'Send a fake task' },
    { id: 'c', action: 'Self Report', text: 'Call a meeting' },
];

describe('CardCarousel swiping', () => {
    let now;
    let originalPointerEvent;
    let offsetWidth;

    beforeAll(() => {
        originalPointerEvent = window.PointerEvent;
        window.PointerEvent = TestPointerEvent;
        offsetWidth = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'offsetWidth');
        Object.defineProperty(HTMLElement.prototype, 'offsetWidth', { configurable: true, get: () => 400 });
    });

    afterAll(() => {
        window.PointerEvent = originalPointerEvent;
        Object.defineProperty(HTMLElement.prototype, 'offsetWidth', offsetWidth);
    });

    beforeEach(() => {
        now = 1000;
        jest.spyOn(performance, 'now').mockImplementation(() => now);
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    // Drag through `points` ([dx, dy, ms since the previous point]) and let go.
    const swipe = (points) => {
        const el = screen.getByTestId('card-deck');
        const start = { clientX: 200, clientY: 300 };
        fireEvent.pointerDown(el, { ...start, button: 0 });
        let x = start.clientX;
        let y = start.clientY;
        points.forEach(([dx, dy, ms]) => {
            now += ms;
            x = start.clientX + dx;
            y = start.clientY + dy;
            fireEvent.pointerMove(el, { clientX: x, clientY: y });
        });
        fireEvent.pointerUp(el, { clientX: x, clientY: y });
    };

    it('lets the browser do nothing with the touch', () => {
        render(<CardCarousel cards={cards} onPlayCard={jest.fn()} />);
        expect(screen.getByTestId('card-deck').style.touchAction).toBe('none');
    });

    it('moves to the next card on a short quick flick after a pause', () => {
        render(<CardCarousel cards={cards} onPlayCard={jest.fn()} />);
        swipe([[-4, 0, 120], [-20, 0, 25], [-35, 0, 25], [-50, 0, 25]]);
        expect(screen.getByText('2 / 3')).toBeInTheDocument();
    });

    it('stays put on a short slow drag', () => {
        render(<CardCarousel cards={cards} onPlayCard={jest.fn()} />);
        swipe([[-10, 0, 200], [-25, 0, 200], [-40, 0, 200]]);
        expect(screen.getByText('1 / 3')).toBeInTheDocument();
    });

    it('moves on a long slow drag', () => {
        render(<CardCarousel cards={cards} onPlayCard={jest.fn()} />);
        swipe([[-30, 0, 200], [-70, 0, 200], [-90, 0, 200]]);
        expect(screen.getByText('2 / 3')).toBeInTheDocument();
    });

    it('accepts a swipe that starts at an angle, like a thumb arc', () => {
        render(<CardCarousel cards={cards} onPlayCard={jest.fn()} />);
        swipe([[-10, 12, 30], [-60, 20, 60], [-110, 24, 60]]);
        expect(screen.getByText('2 / 3')).toBeInTheDocument();
    });

    it('ignores a clearly vertical drag', () => {
        render(<CardCarousel cards={cards} onPlayCard={jest.fn()} />);
        swipe([[-5, 20, 30], [-10, 80, 30], [-15, 140, 30]]);
        expect(screen.getByText('1 / 3')).toBeInTheDocument();
    });

    it('swipes back to the previous card', () => {
        render(<CardCarousel cards={cards} onPlayCard={jest.fn()} />);
        swipe([[-40, 0, 20], [-90, 0, 20]]);
        swipe([[40, 0, 20], [90, 0, 20]]);
        expect(screen.getByText('1 / 3')).toBeInTheDocument();
    });
});

describe('CardCarousel tapping to play', () => {
    let now;
    let frames;
    let originalPointerEvent;
    let offsetWidth;

    beforeAll(() => {
        originalPointerEvent = window.PointerEvent;
        window.PointerEvent = TestPointerEvent;
        offsetWidth = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'offsetWidth');
        Object.defineProperty(HTMLElement.prototype, 'offsetWidth', { configurable: true, get: () => 400 });
    });

    afterAll(() => {
        window.PointerEvent = originalPointerEvent;
        Object.defineProperty(HTMLElement.prototype, 'offsetWidth', offsetWidth);
    });

    beforeEach(() => {
        now = 1000;
        frames = [];
        jest.spyOn(performance, 'now').mockImplementation(() => now);
        jest.spyOn(window, 'requestAnimationFrame').mockImplementation((cb) => frames.push(cb));
        jest.spyOn(window, 'cancelAnimationFrame').mockImplementation(() => {});
        jest.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(() => ({
            left: 0, top: 0, width: 400, height: 500, right: 400, bottom: 500,
        }));
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    // Let `ms` pass and run the animation frames waiting on it.
    const advance = (ms) => {
        now += ms;
        act(() => {
            const waiting = frames;
            frames = [];
            waiting.forEach((cb) => cb(now));
        });
    };

    const tap = (clientX = 200) => {
        const el = screen.getByTestId('card-deck');
        fireEvent.pointerDown(el, { clientX, clientY: 300, button: 0 });
        fireEvent.pointerUp(el, { clientX, clientY: 300 });
    };

    it('plays a card two seconds after a tap', () => {
        const onPlayCard = jest.fn();
        render(<CardCarousel cards={cards} onPlayCard={onPlayCard} />);
        tap();
        expect(screen.getByText(/tap to cancel/i)).toBeInTheDocument();
        advance(1000);
        expect(onPlayCard).not.toHaveBeenCalled();
        advance(1100);
        expect(onPlayCard).toHaveBeenCalledTimes(1);
        expect(onPlayCard).toHaveBeenCalledWith(cards[0]);
    });

    it('takes a play back on a second tap', () => {
        const onPlayCard = jest.fn();
        render(<CardCarousel cards={cards} onPlayCard={onPlayCard} />);
        tap();
        advance(800);
        tap();
        advance(3000);
        expect(onPlayCard).not.toHaveBeenCalled();
        expect(screen.queryByText(/tap to cancel/i)).not.toBeInTheDocument();
    });

    it('opens a card that needs a target right away', () => {
        const onPlayCard = jest.fn();
        const sheetCard = { id: 'f', action: 'Fake Task', text: 'Send a fake task', requires_input: true };
        render(<CardCarousel cards={[sheetCard]} onPlayCard={onPlayCard} />);
        tap();
        expect(onPlayCard).toHaveBeenCalledWith(sheetCard);
    });

    it('does not play a card on a swipe', () => {
        const onPlayCard = jest.fn();
        render(<CardCarousel cards={cards} onPlayCard={onPlayCard} />);
        const el = screen.getByTestId('card-deck');
        fireEvent.pointerDown(el, { clientX: 200, clientY: 300, button: 0 });
        now += 30;
        fireEvent.pointerMove(el, { clientX: 100, clientY: 300 });
        fireEvent.pointerUp(el, { clientX: 100, clientY: 300 });
        advance(3000);
        expect(onPlayCard).not.toHaveBeenCalled();
    });

    it('does not play when a tap lands beside the middle card', () => {
        const onPlayCard = jest.fn();
        render(<CardCarousel cards={cards} onPlayCard={onPlayCard} />);
        tap(5);
        advance(3000);
        expect(onPlayCard).not.toHaveBeenCalled();
    });

    it('says what each card does and when to use it', () => {
        render(<CardCarousel cards={cards} onPlayCard={jest.fn()} />);
        expect(screen.getByText('Emergency Meeting')).toBeInTheDocument();
        expect(screen.getByText(/Play it just before you go for a kill/)).toBeInTheDocument();
        expect(screen.getByText(/Tap a card to play it/)).toBeInTheDocument();
    });
});
