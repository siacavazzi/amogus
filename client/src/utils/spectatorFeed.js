import { t } from '../i18n';
import { cardName } from './cardCopy';

// One line of the spectator feed (server/assets/spectator.py) as plain words for the phone.
// In the secret view the server leaves out who played a card or finished a task, so those
// lines read "Someone" / "An intruder"; once the server names them (full view, or after the
// intruders are revealed) the names show.
export function feedLineText(entry = {}) {
    const name = entry.name;
    const location = placeName(entry.location);
    switch (entry.kind) {
        case 'task':
            if (name) return location ? t('{name} finished a task in {location}', { name, location }) : t('{name} finished a task', { name });
            return location ? t('Someone finished a task in {location}', { location }) : t('Someone finished a task');
        case 'fake_done':
            return t('{name} fell for a fake task', { name });
        case 'card': {
            const card = cardName(entry.card);
            if (!name) return t('An intruder played {card}', { card });
            if (entry.target_name) return t('{name} played {card} on {target}', { name, card, target: entry.target_name });
            if (entry.card_location) return t('{name} played {card} on {location}', { name, card, location: entry.card_location });
            return t('{name} played {card}', { name, card });
        }
        case 'out':
            switch (entry.cause) {
                case 'voted_out_intruder':
                    return t('{name} was voted out. They were an intruder!', { name });
                case 'voted_out':
                case 'voted_out_innocent':
                    return t('{name} was voted out. They were crew.', { name });
                case 'murdered':
                case 'murdered_during_task':
                    return t('{name} was tagged out', { name });
                case 'meltdown':
                    return t('{name} was caught in the meltdown', { name });
                case 'left_game':
                    return t('{name} left the game', { name });
                default:
                    return t('{name} is out', { name });
            }
        case 'meeting':
            if (entry.trigger === 'tasks_complete' || !name) return t('Meeting time!');
            return t('{name} called a meeting', { name });
        case 'nobody_out':
            return t('Nobody was voted out');
        case 'vote_skipped':
            return t('The vote was skipped');
        case 'meltdown':
            return t('Meltdown! Everyone to the reactor');
        case 'meltdown_over':
            return t('Meltdown stopped');
        case 'revealed':
            return t('All tasks done! The intruders are revealed');
        default:
            return '';
    }
}

// A task's area, or nothing for the catch-all "Other" area that has no place to name.
export function placeName(location) {
    return location && String(location).toLowerCase() !== 'other' ? location : null;
}

// "1:05" into the round, for the feed's time column.
export function roundClock(seconds) {
    const total = Math.max(0, Math.round(Number(seconds) || 0));
    return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`;
}
