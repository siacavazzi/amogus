import React from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import './signal/signal.css';
import App from './App';
import BetaBadge from './components/BetaBadge';
import { CLIENT_VERSION } from './version';
import { installTranslateGuard } from './utils/translateGuard';
import { homeScreenStartPath } from './utils/installPrompt';

// Before React touches the DOM: browser translators must not be able to crash the game.
installTranslateGuard();

console.info(`Sus Party ${CLIENT_VERSION.version}${CLIENT_VERSION.commit ? ` (${CLIENT_VERSION.commit})` : ''}`);

// The home screen icon opens the game, not the page that sells it.
const startPath = homeScreenStartPath();
if (startPath) window.history.replaceState(null, '', startPath);

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
