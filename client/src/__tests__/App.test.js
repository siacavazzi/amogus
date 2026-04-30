/**
 * Tests for App - Root component of Sus Party
 * 
 * App wraps everything with GameContext and renders PageController
 */
import React from 'react';
import { render } from '@testing-library/react';

// Mock the entire GameContext to avoid socket connection issues
jest.mock('../GameContext', () => {
    const React = require('react');
    return {
        __esModule: true,
        default: ({ children }) => <div data-testid="game-context">{children}</div>,
        DataContext: React.createContext({}),
    };
});

// Mock PageController
jest.mock('../PageController', () => () => <div data-testid="page-controller">PageController</div>);

// Mock HowToPlayPage
jest.mock('../pages/howToPlay/HowToPlayPage', () => () => (
    <div data-testid="how-to-play-page">HowToPlayPage</div>
));

// Mock LandingPage
jest.mock('../pages/landing/LandingPage', () => () => (
    <div data-testid="landing-page">LandingPage</div>
));

describe('App', () => {
    beforeEach(() => {
        window.history.pushState({}, '', '/play');
    });

    it('renders without crashing', () => {
        const App = require('../App').default;
        const { container } = render(<App />);
        expect(container).toBeInTheDocument();
    });

    it('renders GameContext provider', () => {
        const App = require('../App').default;
        const { getByTestId } = render(<App />);
        expect(getByTestId('game-context')).toBeInTheDocument();
    });

    it('renders PageController', () => {
        const App = require('../App').default;
        const { getByTestId } = render(<App />);
        expect(getByTestId('page-controller')).toBeInTheDocument();
    });

    it('renders the landing page on the root route', () => {
        window.history.pushState({}, '', '/');

        const App = require('../App').default;
        const { getByTestId, queryByTestId } = render(<App />);

        expect(getByTestId('landing-page')).toBeInTheDocument();
        expect(queryByTestId('game-context')).not.toBeInTheDocument();
        expect(queryByTestId('page-controller')).not.toBeInTheDocument();
        expect(queryByTestId('how-to-play-page')).not.toBeInTheDocument();
    });

    it('renders the how-to-play page on /how-to-play', () => {
        window.history.pushState({}, '', '/how-to-play');

        const App = require('../App').default;
        const { getByTestId, queryByTestId } = render(<App />);

        expect(getByTestId('how-to-play-page')).toBeInTheDocument();
        expect(queryByTestId('game-context')).not.toBeInTheDocument();
        expect(queryByTestId('landing-page')).not.toBeInTheDocument();
    });
});
