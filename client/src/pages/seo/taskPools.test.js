import { CLEANUP_TASKS } from './cleanupTasks';
import { generateTasks, TASKS, VENUE_ROOMS } from './taskPools';

describe('task packs that can start a game', () => {
    test.each(Object.keys(VENUE_ROOMS))('%s supplies enough unique tasks for every supported group', (venue) => {
        for (const playerCount of [5, 8, 15, 30]) {
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

    it.each([15, 30])('supplies a cleanup group of %i at two custom locations', (playerCount) => {
        const result = generateTasks({ preset: 'cleanup', playerCount, selectedRooms: ['Upstairs', 'Downstairs'] });
        expect(result.tasks).toHaveLength(playerCount * 3);
        expect(new Set(result.tasks.map(task => `${task.location}:${task.task}`)).size).toBe(playerCount * 3);
    });

    it('caps the generator at thirty players and suggests more intruders for big groups', () => {
        const result = generateTasks({ playerCount: 45, selectedRooms: ['Kitchen', 'Hallway'] });
        expect(result.tasks).toHaveLength(90);
        // Auto: one intruder per five players.
        expect(result.recommendations.intruderCount).toBe(6);
        expect(generateTasks({ playerCount: 12, selectedRooms: ['Kitchen', 'Hallway'] }).recommendations.intruderCount).toBe(2);
    });

    it('fills a thirty-player pack from one style when the other style runs out', () => {
        const result = generateTasks({ playerCount: 30, taskStyle: 100, selectedRooms: ['Only Room', 'Other Room'] });
        expect(result.tasks).toHaveLength(90);
    });

    it('keeps task counts balanced across selected rooms', () => {
        const result = generateTasks({ venue: 'house', playerCount: 15, movement: 'normal', taskStyle: 'mix', selectedRooms: ['Kitchen', 'Hallway', 'Living Room'] });
        const counts = ['Kitchen', 'Hallway', 'Living Room'].map(room => result.tasks.filter(task => task.location === room).length);
        expect(Math.max(...counts) - Math.min(...counts)).toBeLessThanOrEqual(1);
    });

    it('every venue room has its own tasks', () => {
        const rooms = new Set(Object.values(VENUE_ROOMS).flat().filter(room => !/^Room [A-C]$/.test(room)));
        for (const room of rooms) {
            const result = generateTasks({ playerCount: 3, taskStyle: 0, selectedRooms: [room, 'Elsewhere'], random: () => 0 });
            expect(result.candidates[room].length).toBeGreaterThan(TASKS.any.length);
        }
    });
});

describe('task pools follow how hosts write their own tasks', () => {
    const allTasks = Object.values(TASKS).flat().map(task => task.task);

    it('drops make-believe jobs that real task lists never use', () => {
        expect(allTasks.filter(task => /spaceship|airlock|alien|laser|calibrat|invisible|gravity|command station|medal/i.test(task))).toEqual([]);
    });

    it('keeps pure counting tasks rare', () => {
        const counting = allTasks.filter(task => /^count /i.test(task));
        expect(counting.length / allTasks.length).toBeLessThan(0.05);
    });

    it('keeps tasks short and free of duplicates within each pool', () => {
        for (const pool of Object.values(TASKS)) expect(new Set(pool.map(task => task.task)).size).toBe(pool.length);
        expect(allTasks.every(task => task.split(' ').length <= 20)).toBe(true);
    });
});

describe('cleanup chores', () => {
    it('stay broad enough for any home', () => {
        const chores = Object.values(CLEANUP_TASKS).flat();
        expect(chores.filter(task => /pencil|envelope|coin|batter|placemat|cutlery|pajama|grocery|mail spot/i.test(task))).toEqual([]);
        expect(chores.every(task => task.split(' ').length <= 12)).toBe(true);
        for (const pool of Object.values(CLEANUP_TASKS)) expect(new Set(pool).size).toBe(pool.length);
    });
});
