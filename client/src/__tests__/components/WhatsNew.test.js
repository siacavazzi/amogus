import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import WhatsNew from '../../components/WhatsNew';
import { markWhatsNewSeen, noteWhatsNewVisit, pendingWhatsNew } from '../../utils/whatsNew';
import { WHATS_NEW } from '../../whatsNew';

const NEWS = { id: 'release-2', items: ['Play your last game again with the same tasks, in one tap.', 'Voting is smoother, with fewer glitches.'] };
const OLDER = { id: 'release-1', items: ['Something from before'] };

describe("What's new", () => {
    let store;
    beforeEach(() => {
        store = {};
        localStorage.getItem.mockImplementation(key => (key in store ? store[key] : null));
        localStorage.setItem.mockImplementation((key, value) => { store[key] = String(value); });
        jest.useFakeTimers();
    });
    afterEach(() => { jest.useRealTimers(); });

    const show = (props = {}) => {
        const view = render(<WhatsNew news={NEWS} {...props} />);
        act(() => { jest.advanceTimersByTime(2000); });
        return view;
    };

    it('is never shown to a first-time visitor', () => {
        noteWhatsNewVisit(NEWS);
        expect(pendingWhatsNew(NEWS)).toBeNull();
        show();
        expect(screen.queryByTestId('whats-new')).not.toBeInTheDocument();
    });

    it('is shown once to a phone that came back after a new release', () => {
        noteWhatsNewVisit(OLDER); // first visit, an earlier release
        show();
        expect(screen.getByRole('dialog')).toHaveTextContent("Here's what's new");
        expect(screen.getByText('Voting is smoother, with fewer glitches.')).toBeInTheDocument();
        fireEvent.click(screen.getByRole('button', { name: 'Got it' }));
        expect(screen.queryByTestId('whats-new')).not.toBeInTheDocument();
        expect(pendingWhatsNew(NEWS)).toBeNull();
    });

    it('treats a phone that played before this existed as returning', () => {
        store.sus_last_game_v1 = JSON.stringify({ code: 'ZN5QF2', playedAt: 1 });
        noteWhatsNewVisit(NEWS);
        expect(pendingWhatsNew(NEWS)).toBe(NEWS);
    });

    it('keeps only a release id on the phone, nothing that identifies it', () => {
        noteWhatsNewVisit(OLDER);
        markWhatsNewSeen(NEWS);
        expect(JSON.parse(store.sus_whats_new_v1)).toEqual({ seen: 'release-2' });
    });

    it('waits while another pop-up is up', () => {
        noteWhatsNewVisit(OLDER);
        const { rerender } = show({ paused: true });
        expect(screen.queryByTestId('whats-new')).not.toBeInTheDocument();
        rerender(<WhatsNew news={NEWS} paused={false} />);
        act(() => { jest.advanceTimersByTime(2000); });
        expect(screen.getByTestId('whats-new')).toBeInTheDocument();
    });

    it('closed by leaving the screen, it comes back at most three times', () => {
        noteWhatsNewVisit(OLDER);
        for (let i = 0; i < 3; i += 1) {
            const { unmount } = show();
            expect(screen.getByTestId('whats-new')).toBeInTheDocument();
            unmount();
        }
        expect(pendingWhatsNew(NEWS)).toBeNull();
    });

    it('needs a release id and lines to show anything', () => {
        noteWhatsNewVisit(OLDER);
        expect(pendingWhatsNew(null)).toBeNull();
        expect(pendingWhatsNew({ id: 'x', items: [] })).toBeNull();
        expect(WHATS_NEW.items.length).toBeGreaterThan(0);
    });
});
