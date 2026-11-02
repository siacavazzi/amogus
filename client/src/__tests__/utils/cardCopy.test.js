import { cardCopy, cardName, listCardNames, parseCards } from '../../utils/cardCopy';

describe('cardCopy', () => {
    it('names Self Report as an emergency meeting', () => {
        expect(cardName('Self Report')).toBe('Emergency Meeting');
    });

    it('fills in the card numbers', () => {
        expect(cardCopy({ action: 'EMP', duration: 60 }).does).toMatch(/60s/);
        expect(cardCopy({ action: 'Area Denial', location: 'Kitchen', duration: 120 }).does).toBe('No tasks go to Kitchen for 2 min.');
        expect(cardCopy({ action: 'Shorten Meltdown', duration: 12 }).does).toMatch(/12s less/);
    });

    it("falls back to the server's text for a card it doesn't know", () => {
        expect(cardCopy({ action: 'Discard and Draw', text: 'Swap a card' })).toEqual({ name: 'Discard and Draw', does: 'Swap a card', when: '' });
    });

    it('lists a hand in words', () => {
        expect(listCardNames([{ action: 'Fake Task' }])).toBe('Fake Task');
        expect(listCardNames([{ action: 'Fake Task' }, { action: 'EMP' }, { action: 'Self Report' }])).toBe('Fake Task, EMP and Emergency Meeting');
    });

    it('reads cards sent as JSON and skips broken ones', () => {
        expect(parseCards(['{"action":"EMP"}', 'nope', { action: 'Fake Task' }])).toEqual([{ action: 'EMP' }, { action: 'Fake Task' }]);
    });
});
