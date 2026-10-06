import { generateTasks } from './taskPools';
import { saveGameDraft, readGameDraft, clearGameDraft } from './gameDraft';

beforeEach(() => {
    const items = new Map();
    sessionStorage.getItem.mockImplementation(key => items.get(key) || null);
    sessionStorage.setItem.mockImplementation((key, value) => items.set(key, value));
    sessionStorage.removeItem.mockImplementation(key => items.delete(key));
});

it('transfers the exact displayed tasks and locations into host setup', () => {
    const result = generateTasks({ venue: 'house', playerCount: 8, movement: 'normal', selectedRooms: ['Kitchen', 'Hallway'] });
    expect(saveGameDraft({ name: 'House tasks', tasks: result.tasks, locations: result.rooms, playerCount: 8, recommendations: result.recommendations })).toBe(true);
    const draft = readGameDraft();
    expect(draft.tasks.map(({ task, location }) => ({ task, location }))).toEqual(result.tasks.map(({ task, location }) => ({ task, location })));
    expect(draft.locations).toEqual(['Kitchen', 'Hallway']);
    clearGameDraft();
    expect(readGameDraft()).toBeNull();
});

it('rejects a malformed draft instead of passing it to the server', () => {
    sessionStorage.getItem.mockReturnValue('{"version":1,"tasks":"wrong"}');
    expect(readGameDraft()).toBeNull();
});

it('reports blocked storage without throwing', () => {
    sessionStorage.setItem.mockImplementation(() => { throw new Error('blocked'); });
    const result = generateTasks({ venue: 'house', playerCount: 8, movement: 'normal', selectedRooms: ['Kitchen', 'Hallway'] });
    expect(saveGameDraft({ name: 'House tasks', playerCount: 8, tasks: result.tasks, locations: result.rooms, recommendations: result.recommendations })).toBe(false);
});
