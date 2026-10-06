import { generateTasks, VENUE_ROOMS } from './taskPools';

describe('task packs that can start a game', () => {
    test.each(Object.keys(VENUE_ROOMS))('%s supplies enough unique tasks for every supported group', (venue) => {
        for (const playerCount of [5, 8, 15]) {
            for (const movement of ['low', 'normal', 'active']) {
                const result = generateTasks({ venue, playerCount, movement, taskStyle: 'standard', selectedRooms: ['Area A', 'Area B'] });
                expect(result.tasks.length).toBeGreaterThanOrEqual(playerCount * 3);
                expect(new Set(result.tasks.map(task => `${task.location}:${task.task}`)).size).toBe(result.tasks.length);
                expect(result.tasks.every(task => ['Area A', 'Area B'].includes(task.location))).toBe(true);
                if (movement === 'low') expect(result.tasks.every(task => task.movement === 'low')).toBe(true);
            }
        }
    });

    it('keeps task counts balanced across selected rooms', () => {
        const result = generateTasks({ venue: 'house', playerCount: 15, movement: 'normal', taskStyle: 'mix', selectedRooms: ['Kitchen', 'Hallway', 'Living Room'] });
        const counts = ['Kitchen', 'Hallway', 'Living Room'].map(room => result.tasks.filter(task => task.location === room).length);
        expect(Math.max(...counts) - Math.min(...counts)).toBeLessThanOrEqual(1);
    });
});
