import { dealRoles, parseNames, suggestedIntruders } from './roleDeal';

test('parseNames keeps typed names and falls back to numbered players', () => {
    expect(parseNames(' Ana \n\nBen\n', 6)).toEqual(['Ana', 'Ben']);
    expect(parseNames('', 3)).toEqual(['Player 1', 'Player 2', 'Player 3']);
});

test('dealRoles gives each player one role with the requested counts', () => {
    let seed = 1;
    const random = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    const names = parseNames('', 9);
    const dealt = dealRoles(names, 2, ['Sheriff'], random);
    expect(dealt.map(entry => entry.name)).toEqual(names);
    expect(dealt.filter(entry => entry.role === 'Intruder')).toHaveLength(2);
    expect(dealt.filter(entry => entry.role === 'Sheriff')).toHaveLength(1);
    expect(dealt.filter(entry => entry.role === 'Crew')).toHaveLength(6);
});

test('dealRoles always leaves at least one non-intruder', () => {
    const dealt = dealRoles(['A', 'B', 'C'], 5, [], Math.random);
    expect(dealt.filter(entry => entry.role === 'Intruder')).toHaveLength(2);
});

test('suggestedIntruders scales with group size', () => {
    expect(suggestedIntruders(7)).toBe(1);
    expect(suggestedIntruders(8)).toBe(2);
    expect(suggestedIntruders(12)).toBe(2);
    expect(suggestedIntruders(15)).toBe(3);
    expect(suggestedIntruders(20)).toBe(4);
});
