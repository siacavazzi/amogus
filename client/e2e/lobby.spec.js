// The lobby: writing tasks together, and people leaving before and during a round.
const { test, expect } = require('@playwright/test');
const h = require('./helpers');

test.afterEach(h.closeAll);

test('the room writes its own tasks together and plays them', async ({ browser }) => {
    const phones = await h.openPhones(browser, ['Sam', 'Alex', 'Jules']);
    const [host, alex] = phones;
    await h.gatherRoom({ host, phones, settings: { groupTasks: true } });

    // Two people add tasks; everyone sees them with who added them.
    const tasks = [];
    // A room needs at least 10 tasks to start.
    for (const [phone, n] of [[host, 5], [alex, 5]]) {
        await phone.getByRole('button', { name: /^Tasks \(/ }).click();
        for (let i = 0; i < n; i++) {
            const text = `${phone.person}'s task ${i + 1}`;
            await phone.locator('#new-task-text').fill(text);
            const form = phone.locator('#new-task-text').locator('xpath=ancestor::*[.//button[@title="Add task"]][1]');
            await form.getByTitle('Add task').click();
            await expect(phone.getByText(text)).toBeVisible();
            tasks.push(text);
        }
    }
    await phones[2].getByRole('button', { name: /^Tasks \(/ }).click();
    for (const text of tasks) await expect(phones[2].getByText(text)).toBeVisible();
    await expect(phones[2].getByText('Added by Alex').first()).toBeVisible();

    // The round hands out those tasks.
    await host.getByRole('button', { name: /^Players \(/ }).click();
    await host.getByText('Start Game').click();
    const intruder = await h.revealRoles(phones);
    const crewmate = phones.find(phone => phone !== intruder);
    const shown = await crewmate.getByTestId('task-location').locator('..').textContent();
    expect(tasks.some(text => shown.includes(text)), `"${shown}" is one of the room's tasks`).toBe(true);

    h.expectNoPageErrors(phones);
});

test('when the host leaves the lobby, someone else can start', async ({ browser }) => {
    const phones = await h.openPhones(browser, ['Sam', 'Alex', 'Jules', 'Riley']);
    const [host, ...rest] = phones;
    await h.gatherRoom({ host, phones });
    await host.getByRole('button', { name: 'Leave room' }).click();
    await expect(host.getByText('Create New Game')).toBeVisible();
    for (const phone of rest) await expect(phone.getByText('Sam', { exact: true })).toHaveCount(0);
    await expect(rest[0].getByText('Start Game')).toBeVisible();
    await rest[0].getByText('Start Game').click();
    await h.revealRoles(rest).catch(() => {});
    await expect(h.roundButton(rest[1])).toBeVisible();

    h.expectNoPageErrors(phones);
});

test('a crewmate who leaves mid-round is out, and the round goes on', async ({ browser }) => {
    const phones = await h.openPhones(browser, ['Sam', 'Alex', 'Jules', 'Riley', 'Kai']);
    await h.gatherRoom({ host: phones[0], phones });
    await phones[0].getByText('Start Game').click();
    const intruder = await h.revealRoles(phones);
    const leaver = phones.filter(phone => phone !== intruder)[1];

    await leaver.getByRole('button', { name: 'Leave game' }).click();
    await leaver.getByRole('button', { name: 'Leave', exact: true }).click();
    await expect(leaver.getByText('Create New Game')).toBeVisible();

    const others = phones.filter(phone => phone !== leaver);
    for (const phone of others) await expect(h.roundButton(phone), phone.person).toBeVisible();
    // The next meeting only waits for the people still here.
    await h.callMeeting(others.find(phone => phone !== intruder), others);
    for (const phone of others) await expect(phone.getByRole('button', { name: /^Vote for/ }).or(phone.getByText(leaver.person, { exact: true })).first()).toBeVisible();

    h.expectNoPageErrors(phones);
});
