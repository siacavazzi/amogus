import React from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App';
import BetaBadge from './components/BetaBadge';
import { CLIENT_VERSION } from './version';

console.info(`Sus Party ${CLIENT_VERSION.version}${CLIENT_VERSION.commit ? ` (${CLIENT_VERSION.commit})` : ''}`);

const rootElement = document.getElementById('root');
const tree = (
    <React.StrictMode>
        <App />
        <BetaBadge />
    </React.StrictMode>
);

// Prerender captures browser DOM after effects, not React server markup.
// Mount afresh: snapshots can contain elapsed timers or a different route.
createRoot(rootElement).render(tree);
