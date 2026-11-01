import { autoIntruderCount, playersForIntruders } from '../../utils/intruders';

test('Auto picks one intruder per five players with no upper limit', () => {
    expect([3, 9, 10, 14, 15, 20, 40, 100].map(autoIntruderCount)).toEqual([1, 1, 2, 2, 3, 4, 8, 20]);
});

test('each intruder count names the headcounts Auto gives it', () => {
    expect(playersForIntruders(1)).toEqual([3, 9]);
    expect(playersForIntruders(2)).toEqual([10, 14]);
    expect(playersForIntruders(8)).toEqual([40, 44]);
    for (let n = 3; n <= 100; n++) {
        const [low, high] = playersForIntruders(autoIntruderCount(n));
        expect(n >= low && n <= high).toBe(true);
    }
});
