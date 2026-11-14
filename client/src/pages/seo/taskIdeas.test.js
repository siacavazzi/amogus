import { TASK_SECTIONS, TASK_COUNT, FAQ, numberedSections } from './taskIdeas';

describe('task ideas page content', () => {
    it('lists exactly 100 tasks with no repeats', () => {
        const tasks = TASK_SECTIONS.flatMap(section => section.tasks);
        expect(TASK_COUNT).toBe(100);
        expect(new Set(tasks).size).toBe(tasks.length);
        tasks.forEach(task => expect(task.length).toBeLessThanOrEqual(120));
    });

    it('keeps the anchors other pages link to', () => {
        const ids = TASK_SECTIONS.map(section => section.id);
        expect(ids).toEqual(expect.arrayContaining(['classroom-tasks', 'living-room-tasks']));
        expect(new Set(ids).size).toBe(ids.length);
    });

    it('numbers tasks 1 to 100 across sections', () => {
        const sections = numberedSections();
        expect(sections[0].start).toBe(1);
        const last = sections[sections.length - 1];
        expect(last.start + last.tasks.length - 1).toBe(100);
    });

    it('links each section to the task generator', () => {
        TASK_SECTIONS.forEach(section => expect(section.generatorHref).toMatch(/^\/among-us-irl-task-generator\?/));
        expect(FAQ.length).toBeGreaterThan(2);
    });
});
