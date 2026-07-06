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

// Mock SEO pages
jest.mock('../pages/seo/AmongUsIrlPage', () => () => (
    <div data-testid="among-us-irl-page">AmongUsIrlPage</div>
));
jest.mock('../pages/seo/HowToPlayIrlPage', () => () => (
    <div data-testid="how-to-play-irl-page">HowToPlayIrlPage</div>
));
jest.mock('../pages/seo/TaskIdeasPage', () => () => (
    <div data-testid="task-ideas-page">TaskIdeasPage</div>
));
jest.mock('../pages/seo/TaskGeneratorPage', () => () => (
    <div data-testid="task-generator-page">TaskGeneratorPage</div>
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

    it('renders the game route for room_code invite links', () => {
        window.history.pushState({}, '', '/?room_code=ABCD');

        const App = require('../App').default;
        const { getByTestId, queryByTestId } = render(<App />);

        expect(getByTestId('game-context')).toBeInTheDocument();
        expect(getByTestId('page-controller')).toBeInTheDocument();
        expect(queryByTestId('landing-page')).not.toBeInTheDocument();
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

    it('renders AmongUsIrlPage on /among-us-irl', () => {
        window.history.pushState({}, '', '/among-us-irl');

        const App = require('../App').default;
        const { getByTestId, queryByTestId } = render(<App />);

        expect(getByTestId('among-us-irl-page')).toBeInTheDocument();
        expect(queryByTestId('game-context')).not.toBeInTheDocument();
        expect(queryByTestId('landing-page')).not.toBeInTheDocument();
    });

    it('renders HowToPlayIrlPage on /how-to-play-among-us-irl', () => {
        window.history.pushState({}, '', '/how-to-play-among-us-irl');

        const App = require('../App').default;
        const { getByTestId, queryByTestId } = render(<App />);

        expect(getByTestId('how-to-play-irl-page')).toBeInTheDocument();
        expect(queryByTestId('game-context')).not.toBeInTheDocument();
        expect(queryByTestId('landing-page')).not.toBeInTheDocument();
    });

    it('renders TaskIdeasPage on /among-us-irl-task-ideas', () => {
        window.history.pushState({}, '', '/among-us-irl-task-ideas');

        const App = require('../App').default;
        const { getByTestId, queryByTestId } = render(<App />);

        expect(getByTestId('task-ideas-page')).toBeInTheDocument();
        expect(queryByTestId('game-context')).not.toBeInTheDocument();
        expect(queryByTestId('landing-page')).not.toBeInTheDocument();
    });

    it('renders TaskGeneratorPage on /among-us-irl-task-generator', () => {
        window.history.pushState({}, '', '/among-us-irl-task-generator');

        const App = require('../App').default;
        const { getByTestId, queryByTestId } = render(<App />);

        expect(getByTestId('task-generator-page')).toBeInTheDocument();
        expect(queryByTestId('game-context')).not.toBeInTheDocument();
        expect(queryByTestId('landing-page')).not.toBeInTheDocument();
    });
});
