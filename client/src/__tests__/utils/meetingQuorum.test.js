import { readyNeeded } from '../../utils/meetingQuorum';

describe('readyNeeded', () => {
    const quorum = { ready_quorum: 0.8, ready_quorum_min_players: 11 };

    it('waits for everyone up to 10 players', () => {
        expect(readyNeeded(quorum, 10)).toBe(10);
        expect(readyNeeded(quorum, 4)).toBe(4);
    });

    it('opens at 80% rounded up from 11 players', () => {
        expect(readyNeeded(quorum, 11)).toBe(9);
        expect(readyNeeded(quorum, 40)).toBe(32);
    });

    it('waits for everyone when the host turned the quorum off', () => {
        expect(readyNeeded({ ready_quorum: null, ready_quorum_min_players: 11 }, 40)).toBe(40);
        expect(readyNeeded(undefined, 40)).toBe(40);
    });
});
