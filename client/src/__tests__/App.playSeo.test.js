import React from 'react';
import { render } from '@testing-library/react';
import App from '../App';

jest.mock('../GameContext', () => {
    const React = require('react');
    return { __esModule: true, default: ({ children }) => children, DataContext: React.createContext({}) };
});
jest.mock('../PageController', () => () => <h1>Host or join a game</h1>);

it('gives the game entry its own canonical URL, including room invite variants', () => {
    for (const path of ['/play', '/play/?room=ABCD', '/?room_code=ABCD']) {
        window.history.replaceState({}, '', path);
        const view = render(<App />);
        expect(document.title).toBe('Sus Party | Host or Join a Game');
        expect(document.querySelector('link[rel="canonical"]')).toHaveAttribute('href', 'https://susparty.com/play');
        expect(document.querySelector('meta[name="description"]')).toHaveAttribute('content', expect.stringContaining('room code'));
        view.unmount();
    }
});
