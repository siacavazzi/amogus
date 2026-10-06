import React, { Suspense, lazy, useEffect } from 'react';
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
import SocialDeductionPage from './pages/seo/SocialDeductionPage';
import BirthdayPartyPage from './pages/seo/BirthdayPartyPage';
import GroupGamesPage from './pages/seo/GroupGamesPage';
import AdultPartyPage from './pages/seo/AdultPartyPage';
import MurderMysteryPage from './pages/seo/MurderMysteryPage';
import AdultBirthdayPage from './pages/seo/AdultBirthdayPage';
import GameNightPage from './pages/seo/GameNightPage';
import { getRoomCodeFromSearch } from './utils/inviteLinks';
import { captureAcquisition } from './seo/discovery';

const StylePreview = lazy(() => import('./preview/StylePreview'));

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

  if (normalizedPath === '/social-deduction-games' || normalizedPath.startsWith('/social-deduction-games/')) {
    return 'social-deduction-games';
  }

  if (normalizedPath === '/among-us-birthday-party' || normalizedPath.startsWith('/among-us-birthday-party/')) {
    return 'birthday-party';
  }

  if (normalizedPath === '/party-games-for-10-people' || normalizedPath.startsWith('/party-games-for-10-people/')) {
    return 'group-games';
  }

  if (normalizedPath === '/party-games-for-adults' || normalizedPath.startsWith('/party-games-for-adults/')) {
    return 'adult-party';
  }

  if (normalizedPath === '/murder-mystery-party-game' || normalizedPath.startsWith('/murder-mystery-party-game/')) {
    return 'murder-mystery';
  }

  if (normalizedPath === '/birthday-party-games-for-adults' || normalizedPath.startsWith('/birthday-party-games-for-adults/')) {
    return 'adult-birthday';
  }

  if (normalizedPath === '/game-night-ideas' || normalizedPath.startsWith('/game-night-ideas/')) {
    return 'game-night';
  }

  return 'landing';
}

function App() {
    const route = getRoute();
    useEffect(() => { captureAcquisition(); }, []);

  if (process.env.NODE_ENV === 'development' && window.location.pathname === '/style-preview') {
    return <Suspense fallback={<div>Loading preview…</div>}><StylePreview /></Suspense>;
  }

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

  if (route === 'social-deduction-games') return <SocialDeductionPage />;
  if (route === 'birthday-party') return <BirthdayPartyPage />;
  if (route === 'group-games') return <GroupGamesPage />;
  if (route === 'adult-party') return <AdultPartyPage />;
  if (route === 'murder-mystery') return <MurderMysteryPage />;
  if (route === 'adult-birthday') return <AdultBirthdayPage />;
  if (route === 'game-night') return <GameNightPage />;

  return <LandingPage />;
}

export default App;
