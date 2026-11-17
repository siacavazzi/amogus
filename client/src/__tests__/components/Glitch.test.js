import React from 'react';
import { act, render, screen } from '@testing-library/react';
import { GlitchHost, glitch } from '../../signal/Glitch';

describe('glitch overlay', () => {
    beforeEach(() => jest.useFakeTimers());
    afterEach(() => {
        jest.useRealTimers();
        document.documentElement.classList.remove('sg-glitching');
    });

    it('plays when any screen asks for it, then cleans up', () => {
        render(<GlitchHost />);
        expect(screen.queryByTestId('glitch')).not.toBeInTheDocument();
        act(() => { glitch(); });
        expect(screen.getByTestId('glitch')).toBeInTheDocument();
        expect(document.documentElement).toHaveClass('sg-glitching');
        act(() => { jest.advanceTimersByTime(700); });
        expect(screen.queryByTestId('glitch')).not.toBeInTheDocument();
        expect(document.documentElement).not.toHaveClass('sg-glitching');
    });

    it('stays still for phones that ask for less motion', () => {
        const original = window.matchMedia;
        window.matchMedia = (q) => ({ matches: q.includes('reduce'), addListener() {}, removeListener() {} });
        try {
            render(<GlitchHost />);
            act(() => { glitch({ strength: 'heavy' }); });
            expect(screen.queryByTestId('glitch')).not.toBeInTheDocument();
        } finally {
            window.matchMedia = original;
        }
    });
});
