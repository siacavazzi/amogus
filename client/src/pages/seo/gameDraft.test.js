import { generateTasks } from './taskPools';
import { saveGameDraft, readGameDraft, clearGameDraft, readGeneratedSetup } from './gameDraft';

const KEY = 'sus_party_generated_tasks_v1';
let tab;
let browser;
const realLocalGet = localStorage.getItem.getMockImplementation();

function fakeStore(mock, items, fallback = () => null) {
    mock.getItem.mockImplementation(key => (items.has(key) ? items.get(key) : fallback(key)));
    mock.setItem.mockImplementation((key, value) => items.set(key, value));
    mock.removeItem.mockImplementation(key => items.delete(key));
}

beforeEach(() => {
    tab = new Map();
    browser = new Map();
    fakeStore(sessionStorage, tab);
    fakeStore(localStorage, browser, realLocalGet);
});

afterEach(() => {
    localStorage.getItem.mockImplementation(realLocalGet);
    localStorage.setItem.mockReset();
    localStorage.removeItem.mockReset();
});

const houseDraft = () => {
    const result = generateTasks({ venue: 'house', playerCount: 8, movement: 'normal', selectedRooms: ['Kitchen', 'Hallway'] });
    return { name: 'House tasks', tasks: result.tasks, locations: result.rooms, playerCount: 8, recommendations: result.recommendations };
};

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
    tab.set(KEY, '{"version":1,"tasks":"wrong"}');
    expect(readGameDraft()).toBeNull();
});

it('reports blocked storage without throwing', () => {
    sessionStorage.setItem.mockImplementation(() => { throw new Error('blocked'); });
    localStorage.setItem.mockImplementation(() => { throw new Error('blocked'); });
    const result = generateTasks({ venue: 'house', playerCount: 8, movement: 'normal', selectedRooms: ['Kitchen', 'Hallway'] });
    expect(saveGameDraft({ name: 'House tasks', playerCount: 8, tasks: result.tasks, locations: result.rooms, recommendations: result.recommendations })).toBe(false);
});

it('keeps the pack when the tab is closed before the room is created', () => {
    expect(saveGameDraft(houseDraft())).toBe(true);
    tab.clear();
    expect(readGameDraft().name).toBe('House tasks');
    clearGameDraft();
    expect(browser.has(KEY)).toBe(false);
});

it('only hands the pack to the page the generator links to', () => {
    saveGameDraft(houseDraft());
    expect(readGeneratedSetup('?setup=generated').name).toBe('House tasks');
    expect(readGeneratedSetup('')).toBeNull();
});
