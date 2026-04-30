import React from 'react';
import GameContext from './GameContext';
import PageController from './PageController';
import HowToPlayPage from './pages/howToPlay/HowToPlayPage';
import LandingPage from './pages/landing/LandingPage';
import AdminDashboard from './pages/admin/AdminDashboard';
import FaqPage from './pages/info/FaqPage';
import AboutPage from './pages/info/AboutPage';

function getRoute() {
  const urlParams = new URLSearchParams(window.location.search);
  const roomCode = urlParams.get('room');
  const normalizedPath = window.location.pathname.replace(/\/+$/, '') || '/';

  if (
    normalizedPath === '/play' ||
    normalizedPath.startsWith('/play/') ||
    Boolean(roomCode)
  ) {
    return 'game';
  }

  if (normalizedPath === '/how-to-play' || normalizedPath.startsWith('/how-to-play/')) {
    return 'how-to-play';
  }

  if (normalizedPath === '/faq' || normalizedPath.startsWith('/faq/')) {
    return 'faq';
  }

  if (normalizedPath === '/about' || normalizedPath.startsWith('/about/')) {
    return 'about';
  }

  if (normalizedPath === '/dashboard' || normalizedPath.startsWith('/dashboard/')) {
    return 'dashboard';
  }

  return 'landing';
}

function App() {
  const route = getRoute();

  if (route === 'game') {
    return (
      <GameContext>
        <PageController />
      </GameContext>
    );
  }

  if (route === 'how-to-play') {
    return <HowToPlayPage />;
  }

  if (route === 'faq') {
    return <FaqPage />;
  }

  if (route === 'about') {
    return <AboutPage />;
  }

  if (route === 'dashboard') {
    return <AdminDashboard />;
  }

  return <LandingPage />;
}

export default App;

