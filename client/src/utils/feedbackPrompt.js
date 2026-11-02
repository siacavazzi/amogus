const SNOOZE_KEY = 'sus_party_feedback_snoozed_until';
const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

export function isFeedbackSnoozed(now = Date.now()) {
    try {
        const until = Number(localStorage.getItem(SNOOZE_KEY));
        return Number.isFinite(until) && until > now;
    } catch {
        // Skip automatic prompts when the browser cannot remember a snooze.
        return true;
    }
}

export function snoozeFeedback(now = Date.now()) {
    try {
        localStorage.setItem(SNOOZE_KEY, String(now + WEEK_MS));
    } catch {
        // A storage error must not block the game.
    }
}
