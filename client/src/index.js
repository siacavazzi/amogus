import React from 'react';
import { createRoot, hydrateRoot } from 'react-dom/client';
import './index.css';
import App from './App';

const rootElement = document.getElementById('root');
const tree = (
    <React.StrictMode>
        <App />
    </React.StrictMode>
);

if (rootElement.hasChildNodes()) {
    // Pre-rendered HTML present (e.g. produced by react-snap) — hydrate.
    hydrateRoot(rootElement, tree);
} else {
    createRoot(rootElement).render(tree);
}

