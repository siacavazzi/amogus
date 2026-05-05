const TUTORIAL_COMPLETED_KEY = 'sus_party_tutorial_completed';
const TUTORIAL_PROMPT_DISMISSED_KEY = 'sus_party_tutorial_prompt_dismissed';
const HAS_PLAYED_GAME_KEY = 'sus_party_has_played_game';

function safeGet(key) {
  if (typeof window === 'undefined') return null;
  try {
    return window.localStorage.getItem(key);
  } catch (error) {
    return null;
  }
}

function safeSet(key, value) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(key, value);
  } catch (error) {
    // Ignore storage failures so the game still works in restricted browsers.
  }
}

function safeRemove(key) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(key);
  } catch (error) {
    // Ignore storage failures so the game still works in restricted browsers.
  }
}

export function hasCompletedTutorial() {
  return safeGet(TUTORIAL_COMPLETED_KEY) === 'true';
}

export function hasDismissedTutorialPrompt() {
  return safeGet(TUTORIAL_PROMPT_DISMISSED_KEY) === 'true';
}

export function hasPlayedGame() {
  return safeGet(HAS_PLAYED_GAME_KEY) === 'true';
}

export function shouldRecommendTutorial() {
  return !hasCompletedTutorial() && !hasDismissedTutorialPrompt() && !hasPlayedGame();
}

export function dismissTutorialPrompt() {
  safeSet(TUTORIAL_PROMPT_DISMISSED_KEY, 'true');
}

export function clearTutorialPromptDismissed() {
  safeRemove(TUTORIAL_PROMPT_DISMISSED_KEY);
}

export function markTutorialCompleted() {
  safeSet(TUTORIAL_COMPLETED_KEY, 'true');
  clearTutorialPromptDismissed();
}

export function markHasPlayedGame() {
  safeSet(HAS_PLAYED_GAME_KEY, 'true');
  clearTutorialPromptDismissed();
}