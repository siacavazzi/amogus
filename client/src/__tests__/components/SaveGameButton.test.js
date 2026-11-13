import React from 'react';
import { renderWithContext, screen, fireEvent, waitFor } from '../../test-utils';
import EndGameButtons from '../../components/EndGameButtons';

describe('Save this game', () => {
    beforeEach(() => {
        localStorage.getItem.mockImplementation((key) => (key === 'player_id' ? 'p1' : null));
        navigator.share = jest.fn().mockResolvedValue();
    });
    afterEach(() => { delete navigator.share; });

    it('asks for the room\'s list code up front and shares a link that carries it', async () => {
        const { contextValue } = renderWithContext(<EndGameButtons />, { roomCode: 'ABCD', isMobile: true });
        const call = contextValue.socket.emit.mock.calls.find(([event]) => event === 'save_game_link');
        expect(call[1]).toEqual({ room_code: 'ABCD', player_id: 'p1' });
        const button = screen.getByRole('button', { name: /Save this game/ });
        expect(button).toBeDisabled();
        call[2]({ ok: true, code: 'ZN5QF2' });
        await waitFor(() => expect(button).toBeEnabled());
        fireEvent.click(button);
        await waitFor(() => expect(navigator.share).toHaveBeenCalled());
        expect(navigator.share.mock.calls[0][0].url).toContain('/play?list=ZN5QF2&utm_source=saved-game');
        await waitFor(() => expect(contextValue.socket.emit).toHaveBeenCalledWith('client_metric', { kind: 'end_screen_action', action: 'save_game_shared' }));
    });

    it('remembers the game for the home page welcome back card', async () => {
        const { contextValue } = renderWithContext(<EndGameButtons />, { roomCode: 'ABCD', isMobile: true });
        const call = contextValue.socket.emit.mock.calls.find(([event]) => event === 'save_game_link');
        call[2]({ ok: true, code: 'ZN5QF2', task_count: 33 });
        await waitFor(() => expect(localStorage.setItem).toHaveBeenCalledWith('sus_last_game_v1', expect.stringContaining('"code":"ZN5QF2"')));
    });

    it('is not on the reactor screen', () => {
        renderWithContext(<EndGameButtons />, { roomCode: 'ABCD', isMobile: false });
        expect(screen.queryByRole('button', { name: /Save this game/ })).toBeNull();
    });

    it('offers Add to Home Screen to the host only', () => {
        const ios = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) Safari/604.1';
        const spy = jest.spyOn(window.navigator, 'userAgent', 'get').mockReturnValue(ios);
        const { unmount } = renderWithContext(<EndGameButtons />, { roomCode: 'ABCD', isMobile: true, isRoomCreator: false });
        expect(screen.queryByText(/home screen/i)).toBeNull();
        unmount();
        renderWithContext(<EndGameButtons />, { roomCode: 'ABCD', isMobile: true, isRoomCreator: true });
        expect(screen.getByText('Keep Sus Party on your home screen')).toBeInTheDocument();
        spy.mockRestore();
    });

    it('points Chrome on iPhone at Chrome\'s own Share button, not Save this game', () => {
        const chrome = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/142.0 Mobile/15E148 Safari/604.1';
        const spy = jest.spyOn(window.navigator, 'userAgent', 'get').mockReturnValue(chrome);
        renderWithContext(<EndGameButtons />, { roomCode: 'ABCD', isMobile: true, isRoomCreator: true });
        expect(screen.getByText(/in Chrome's address bar/)).toBeInTheDocument();
        expect(screen.getByText(/Tap "View More" if you see it, then "Add to Home Screen"/)).toBeInTheDocument();
        expect(screen.getByText(/not "Save this game"/)).toBeInTheDocument();
        spy.mockRestore();
    });
});
