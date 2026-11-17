// "Welcome back, here's what's new": the short list a returning phone sees once after a big update.
//
// To announce a release:
//   1. Change `id` to something new (the release date works well). A phone that already saw this id
//      won't see the list again; every phone that visited before sees the new one once.
//   2. Rewrite `items`: three to five short lines, plain words, written for kids too.
//      Wrap each line in tk(), like the ones below, so the translation test asks for it in every language.
//   3. Add each line to the 7 files in src/i18n/locales/ (and drop the old lines from them).
// Small fixes don't need this: leave the id alone and nobody sees anything.
// Set WHATS_NEW to null to switch the pop-up off.
//
// None of this is sent to the server: the phone only remembers which id it has seen.
import { tk } from './i18n';

// DRAFT for Sam to edit: what reached susparty.com on 2026-11-14.
export const WHATS_NEW = {
    id: '2026-11-14',
    items: [
        tk('Play your last game again with the same tasks, in one tap.'),
        tk('Share your game link with your group. Next time, everyone lands in the same game.'),
        tk('Hosts can star their favorite task lists and keep them safe with an account.'),
        tk('Sus Party now speaks Norwegian and Swedish.'),
        tk('Voting is smoother, with fewer glitches.'),
    ],
};
