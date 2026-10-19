import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
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
