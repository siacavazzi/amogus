import { t, tn } from '../i18n';

// The secret roles (server/assets/roles.py). `role` on a player is 'crew', 'intruder', 'hacker'
// or 'detective' when this phone may know it, else null.

export function roleName(role, sus) {
    if (role === 'hacker') return t('Hacker');
    if (role === 'detective') return t('Detective');
    return sus || role === 'intruder' ? t('Intruder') : t('Crewmate');
}

// "Among you: 2 intruders, 1 hacker, 1 detective". Null in a round without the new roles, so
// those rounds look exactly as they always have.
export function amongYouText(amongYou) {
    if (!amongYou || !(amongYou.hackers || amongYou.detectives)) return null;
    const parts = [tn(amongYou.intruders || 0, '{count} intruder', '{count} intruders')];
    if (amongYou.hackers) parts.push(tn(amongYou.hackers, '{count} hacker', '{count} hackers'));
    if (amongYou.detectives) parts.push(tn(amongYou.detectives, '{count} detective', '{count} detectives'));
    return t('Among you: {list}', { list: parts.join(', ') });
}

// What a Detective's check found.
export function checkResultText(result) {
    if (result === 'intruder') return t('Intruder');
    if (result === 'hacker') return t('Hacker');
    return t('Not an intruder');
}
