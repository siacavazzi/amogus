import React from 'react';
import GameContext from './GameContext';
import PageController from './PageController';
import HowToPlayPage from './pages/howToPlay/HowToPlayPage';
import LandingPage from './pages/landing/LandingPage';
import TutorialPage from './pages/tutorial/TutorialPage';
import AdminDashboard from './pages/admin/AdminDashboard';
import FaqPage from './pages/info/FaqPage';
import AboutPage from './pages/info/AboutPage';
import AmongUsIrlPage from './pages/seo/AmongUsIrlPage';
import HowToPlayIrlPage from './pages/seo/HowToPlayIrlPage';
import TaskIdeasPage from './pages/seo/TaskIdeasPage';
import TaskGeneratorPage from './pages/seo/TaskGeneratorPage';
import { getRoomCodeFromSearch } from './utils/inviteLinks';

function getRoute() {
  const roomCode = getRoomCodeFromSearch();
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

  if (normalizedPath === '/tutorial' || normalizedPath.startsWith('/tutorial/')) {
    return 'tutorial';
  }

  if (normalizedPath === '/faq' || normalizedPath.startsWith('/faq/')) {
    return 'faq';
  }

  if (normalizedPath === '/about' || normalizedPath.startsWith('/about/')) {
    return 'about';
  }

  if (normalizedPath === '/among-us-irl' || normalizedPath.startsWith('/among-us-irl/')) {
    return 'among-us-irl';
  }

  if (normalizedPath === '/how-to-play-among-us-irl' || normalizedPath.startsWith('/how-to-play-among-us-irl/')) {
    return 'how-to-play-irl';
  }

  if (normalizedPath === '/among-us-irl-task-ideas' || normalizedPath.startsWith('/among-us-irl-task-ideas/')) {
    return 'task-ideas';
  }

  if (normalizedPath === '/among-us-irl-task-generator' || normalizedPath.startsWith('/among-us-irl-task-generator/')) {
    return 'task-generator';
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

  if (route === 'tutorial') {
    return <TutorialPage />;
  }

  if (route === 'faq') {
    return <FaqPage />;
  }

  if (route === 'about') {
    return <AboutPage />;
  }

  if (route === 'among-us-irl') {
    return <AmongUsIrlPage />;
  }

  if (route === 'how-to-play-irl') {
    return <HowToPlayIrlPage />;
  }

  if (route === 'task-ideas') {
    return <TaskIdeasPage />;
  }

  if (route === 'task-generator') {
    return <TaskGeneratorPage />;
  }

  if (route === 'dashboard') {
    return <AdminDashboard />;
  }

  return <LandingPage />;
}

export default App;

