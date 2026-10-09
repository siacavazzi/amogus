import { generateTasks, VENUE_ROOMS } from './taskPools';

describe('task packs that can start a game', () => {
    test.each(Object.keys(VENUE_ROOMS))('%s supplies enough unique tasks for every supported group', (venue) => {
        for (const playerCount of [5, 8, 15]) {
            for (const taskStyle of [0, 50, 100]) {
                const result = generateTasks({ venue, playerCount, taskStyle, selectedRooms: ['Area A', 'Area B'] });
                expect(result.tasks.length).toBeGreaterThanOrEqual(playerCount * 3);
                expect(new Set(result.tasks.map(task => `${task.location}:${task.task}`)).size).toBe(result.tasks.length);
                expect(result.tasks.every(task => ['Area A', 'Area B'].includes(task.location))).toBe(true);
                expect(result.tasks.every(task => !/from your seat|from where you|while seated|on your paper|alphabet backward/i.test(task.task))).toBe(true);
            }
        }
    });

    it('makes the style slider control the actual share of playful tasks', () => {
        const options = { playerCount: 8, selectedRooms: ['Kitchen', 'Living Room', 'Hallway'], random: () => 0.42 };
        const practical = generateTasks({ ...options, taskStyle: 0 });
        const mixed = generateTasks({ ...options, taskStyle: 50 });
        const playful = generateTasks({ ...options, taskStyle: 100 });
        expect(practical.tasks.filter(task => task.funny)).toHaveLength(0);
        expect(mixed.tasks.filter(task => task.funny)).toHaveLength(12);
        expect(playful.tasks.filter(task => task.funny)).toHaveLength(24);
    });

    it('ignores an old movement parameter instead of producing seated task stations', () => {
        const options = { playerCount: 8, selectedRooms: ['Kitchen', 'Hallway'], random: () => 0.42 };
        expect(generateTasks({ ...options, movement: 'low' }).tasks).toEqual(generateTasks(options).tasks);
    });

    it('uses distinct suggestions across the default rooms when enough suggestions exist', () => {
        const pack = generateTasks({ playerCount: 8, taskStyle: 50, selectedRooms: ['Kitchen', 'Living Room', 'Hallway'], random: () => 0.42 });
        expect(new Set(pack.tasks.map(task => task.task)).size).toBe(24);
    });

    it('supplies a large cleanup group at two custom locations', () => {
        const result = generateTasks({ preset: 'cleanup', playerCount: 15, selectedRooms: ['Upstairs', 'Downstairs'] });
        expect(result.tasks).toHaveLength(45);
        expect(new Set(result.tasks.map(task => `${task.location}:${task.task}`)).size).toBe(45);
    });

    it('keeps task counts balanced across selected rooms', () => {
        const result = generateTasks({ venue: 'house', playerCount: 15, movement: 'normal', taskStyle: 'mix', selectedRooms: ['Kitchen', 'Hallway', 'Living Room'] });
        const counts = ['Kitchen', 'Hallway', 'Living Room'].map(room => result.tasks.filter(task => task.location === room).length);
        expect(Math.max(...counts) - Math.min(...counts)).toBeLessThanOrEqual(1);
    });
});
