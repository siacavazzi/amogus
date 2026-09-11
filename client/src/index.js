import React from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App';

const rootElement = document.getElementById('root');
const tree = (
    <React.StrictMode>
        <App />
    </React.StrictMode>
);

// Prerender captures browser DOM after effects, not React server markup.
// Mount afresh: snapshots can contain elapsed timers or a different route.
createRoot(rootElement).render(tree);
