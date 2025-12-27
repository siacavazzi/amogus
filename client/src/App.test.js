/**
 * Tests for App - Root component of Sus Party
 * 
 * App wraps everything with GameContext and renders PageController
 */
import React from 'react';
import { render } from '@testing-library/react';

// Mock the entire GameContext to avoid socket connection issues
jest.mock('./GameContext', () => {
    const React = require('react');
    return {
        __esModule: true,
        default: ({ children }) => <div data-testid="game-context">{children}</div>,
        DataContext: React.createContext({}),
    };
});

// Mock PageController
jest.mock('./PageController', () => () => <div data-testid="page-controller">PageController</div>);

describe('App', () => {
    it('renders without crashing', () => {
        const App = require('./App').default;
        const { container } = render(<App />);
        expect(container).toBeInTheDocument();
    });

    it('renders GameContext provider', () => {
        const App = require('./App').default;
        const { getByTestId } = render(<App />);
        expect(getByTestId('game-context')).toBeInTheDocument();
    });

    it('renders PageController', () => {
        const App = require('./App').default;
        const { getByTestId } = render(<App />);
        expect(getByTestId('page-controller')).toBeInTheDocument();
    });
});
