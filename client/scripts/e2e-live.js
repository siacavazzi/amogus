// Play full games against a running server over its WebSocket, like a room of phones would:
// one standard game, then two 3-player last stand games (the crew wins one, the intruder the other).
//   node scripts/e2e-live.js https://susparty.com --beta     the beta copy (sends the beta cookie)
//   node scripts/e2e-live.js http://127.0.0.1:5001           a local server
// Options: --players N (default 5), --expect-commit SHA (fail unless the server runs that build),
// --browser (also load the game page in Chromium and check its socket connects; --page sets
// the path, default /play, since a local Flask server only serves it as /play/index.html).
// The sockets connect with auth.synthetic, so the server keeps these rooms out of usage stats.
const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');
const { io } = require('socket.io-client');

const args = process.argv.slice(2);
const option = name => {
    const index = args.indexOf(name);
    return index === -1 ? undefined : args[index + 1];
};
const BASE_URL = (args.find(arg => /^https?:\/\//.test(arg)) || 'http://127.0.0.1:5001').replace(/\/$/, '');
const BETA = args.includes('--beta');
const PLAYER_COUNT = Number(option('--players') || 5);
const EXPECT_COMMIT = option('--expect-commit');
const PAGE = option('--page') || '/play';
const COOKIE = BETA ? 'sus_channel=beta' : undefined;
const STEP_TIMEOUT_MS = 15000;

const started = Date.now();
const log = message => console.log(`[${((Date.now() - started) / 1000).toFixed(1)}s] ${message}`);
const parse = value => (typeof value === 'string' ? JSON.parse(value) : value);

class Phone {
    constructor(name) {
        this.name = name;
        this.events = [];
        this.waiters = [];
        this.socket = io(BASE_URL, {
            transports: ['websocket'],
            reconnection: false,
            auth: { synthetic: true, utc_offset_minutes: 0 },
            extraHeaders: COOKIE ? { Cookie: COOKIE } : {},
        });
        this.socket.onAny((event, ...payload) => {
            const entry = { event, data: payload[0] };
            this.events.push(entry);
            if (event === 'error') log(`${this.name} got error: ${JSON.stringify(entry.data)}`);
            this.waiters = this.waiters.filter(waiter => !waiter.check(entry));
        });
    }

    connected() {
        if (this.socket.connected) return Promise.resolve();
        return new Promise((resolve, reject) => {
            this.socket.once('connect', resolve);
            this.socket.once('connect_error', error => reject(new Error(`${this.name} could not connect: ${error.message}`)));
        });
    }

    // Resolve with the first matching event from now on, or one already received since `since`.
    waitFor(event, match = () => true, { since = this.events.length, timeout = STEP_TIMEOUT_MS } = {}) {
        const seen = this.events.slice(since).find(entry => entry.event === event && match(entry.data));
        if (seen) return Promise.resolve(seen.data);
        return new Promise((resolve, reject) => {
            const timer = setTimeout(() => {
                this.waiters = this.waiters.filter(waiter => waiter !== entry);
                reject(new Error(`${this.name} did not receive "${event}" within ${timeout / 1000}s`));
            }, timeout);
            const entry = {
                check: received => {
                    if (received.event !== event || !match(received.data)) return false;
                    clearTimeout(timer);
                    resolve(received.data);
                    return true;
                },
            };
            this.waiters.push(entry);
        });
    }

    // Emit and wait for the server's acknowledgement, failing on { ok: false }.
    async command(event, data) {
        const reply = await this.socket.timeout(STEP_TIMEOUT_MS).emitWithAck(event, data);
        if (reply && reply.ok === false) throw new Error(`${this.name} ${event} was rejected: ${reply.error}`);
        return reply;
    }

    mark() {
        return this.events.length;
    }

    latest(event) {
        const found = [...this.events].reverse().find(entry => entry.event === event);
        return found && found.data;
    }

    close() {
        this.socket.disconnect();
    }
}

const roster = phone => (phone.latest('game_data')?.list || []).map(parse);

async function checkVersion() {
    const response = await fetch(`${BASE_URL}/api/version`, { headers: COOKIE ? { Cookie: COOKIE } : {} });
    assert.equal(response.status, 200, '/api/version');
    const version = await response.json();
    log(`Server ${BASE_URL}${BETA ? ' (beta)' : ''} runs ${version.version} at ${version.commit}`);
    if (EXPECT_COMMIT) {
        assert.ok(version.commit && EXPECT_COMMIT.startsWith(version.commit),
            `Expected build ${EXPECT_COMMIT}, server runs ${version.commit}`);
    }
}

const NO_CARDS = {
    self_report: 0, emp: 0, fake_task: 0, taunt_message: 0,
    remote_sabotage: 0, shorten_meltdown: 0, area_denial_per_location: 0,
};

// Host sets up a room with a small, known deck, everyone joins, and the round starts.
async function openRound(phones, cardCounts = {}) {
    const [host] = phones;
    host.socket.emit('create_game', {});
    const { room_code: roomCode } = await host.waitFor('game_created');
    host.socket.emit('update_game_config', {
        room_code: roomCode,
        config: {
            num_intruders: 1, starting_cards: Object.values(cardCounts).reduce((sum, count) => sum + count, 0), task_ratio: 3, vote_time: 30, vote_threshold: 0.5,
            card_draw_probability: 0, card_deck_preset: 'custom',
            card_deck_counts: { ...NO_CARDS, ...cardCounts },
        },
    });
    await host.waitFor('game_config', config => config.card_deck_preset === 'custom');
    host.socket.emit('open_room', { room_code: roomCode });
    await host.waitFor('room_opened');
    log(`Room ${roomCode} open`);

    // Everyone joins, the host first
    const ids = new Map();
    for (const phone of phones) {
        if (phone !== host) {
            phone.socket.emit('join_game', { room_code: roomCode });
            await phone.waitFor('game_joined');
        }
        phone.socket.emit('join', { room_code: roomCode, username: `E2E ${phone.name}` });
        const { player_id: playerId } = await phone.waitFor('player_id');
        ids.set(phone, playerId);
    }
    // since 0: the last join's roster can arrive before this wait starts
    await host.waitFor('game_data', data => data.list?.length === phones.length, { since: 0 });
    log(`${phones.length} players in the lobby`);

    const locations = ['Kitchen', 'Living Room', 'Garage'];
    const taskCount = phones.length * 3 + 3;
    for (let index = 0; index < taskCount; index++) {
        host.socket.emit('add_collaborative_task', {
            room_code: roomCode,
            task: { task: `E2E task ${index + 1}`, location: locations[index % locations.length] },
        });
    }
    await host.waitFor('collaborative_task_added', data => data.task?.task === `E2E task ${taskCount}`);

    // Start the round
    const startMarks = new Map(phones.map(phone => [phone, phone.mark()]));
    await host.command('start_game', { player_id: ids.get(host) });
    await Promise.all(phones.map(phone => phone.waitFor('game_start', undefined, { since: startMarks.get(phone) })));
    // Each phone is told only its own role and cards, so ask every phone about itself.
    const self = new Map(await Promise.all(phones.map(async phone => {
        const list = (await phone.waitFor('game_data', data => data.action === 'start_game', { since: startMarks.get(phone) })).list.map(parse);
        return [phone, list.find(player => player.player_id === ids.get(phone))];
    })));
    const intruder = phones.find(phone => self.get(phone).sus);
    const crew = phones.filter(phone => !self.get(phone).sus);
    assert.equal(crew.length, phones.length - 1, 'One intruder');
    const roundId = (await crew[0].waitFor('task', undefined, { since: startMarks.get(crew[0]) })).round_id;
    log(`Round started: ${intruder.name} is the intruder`);

    const currentTask = async phone => (await phone.waitFor('task', data => data.task?.round_id === roundId, { since: 0 })) && phone.latest('task').task;
    const completeTask = async phone => {
        const task = await currentTask(phone);
        const mark = phone.mark();
        await phone.command('complete_task', {
            player_id: ids.get(phone), round_id: roundId, assignment_id: task.assignment_id, request_id: randomUUID(),
        });
        await phone.waitFor('task', data => data.task?.assignment_id !== task.assignment_id, { since: mark });
        return task;
    };

    return { host, roomCode, ids, self, intruder, crew, roundId, currentTask, completeTask };
}

async function closeRoom({ host, ids, roomCode }, phones) {
    // Host closes the room
    const closed = phones.filter(phone => phone !== host).map(phone => phone.waitFor('room_disbanded'));
    host.socket.emit('disband_room', { player_id: ids.get(host) });
    await Promise.all(closed);
    log(`Room ${roomCode} closed`);
}

async function playGame() {
    const phones = Array.from({ length: PLAYER_COUNT }, (_, index) => new Phone(index === 0 ? 'Host' : `Player ${index}`));
    try {
        await Promise.all(phones.map(phone => phone.connected()));
        log(`${phones.length} phones connected`);
        // One taunt and one fake task for the intruder
        const round = await openRound(phones, { fake_task: 1, taunt_message: 1 });
        const { host, ids, self, intruder, crew, roundId, currentTask, completeTask } = round;

        // Every crewmate does a task, and the score reaches everyone
        for (const phone of crew) await completeTask(phone);
        await Promise.all(phones.map(phone => phone.waitFor('crew_score', data => data.score === crew.length, { since: 0 })));
        log(`${crew.length} tasks completed, crew score ${crew.length}`);

        // The intruder plays both cards
        const cards = self.get(intruder).cards.map(parse);
        const card = action => cards.find(item => item.action === action);
        assert.ok(card('Taunt Message') && card('Fake Task'), `Intruder hand: ${cards.map(item => item.action).join(', ')}`);
        const [tauntTarget, fakeTarget] = crew;
        let mark = tauntTarget.mark();
        intruder.socket.emit('play_card', {
            player_id: ids.get(intruder), card_id: card('Taunt Message').id,
            extra_data: { target_player_id: ids.get(tauntTarget), message: 'E2E taunt' },
        });
        await tauntTarget.waitFor('taunt_received', data => data.message === 'E2E taunt', { since: mark });
        intruder.socket.emit('play_card', {
            player_id: ids.get(intruder), card_id: card('Fake Task').id,
            extra_data: { target_player_id: ids.get(fakeTarget), task_text: 'E2E fake task', task_location: 'Garage' },
        });
        const handOf = (data, phone) => (data.list || []).map(parse).find(player => player.player_id === ids.get(phone))?.cards;
        await intruder.waitFor('game_data', data => handOf(data, intruder)?.length === 0);
        await completeTask(fakeTarget);
        const fakeTask = await currentTask(fakeTarget);
        assert.equal(fakeTask.is_fake, true, 'Fake task arrives after the current task');
        mark = fakeTarget.mark();
        await completeTask(fakeTarget);
        await fakeTarget.waitFor('fake_task_completed', undefined, { since: mark });
        log('Intruder played a taunt and a fake task; both reached their targets');

        // A crewmate loses their connection and comes back mid-round
        const dropped = crew[crew.length - 1];
        const taskBefore = await currentTask(dropped);
        dropped.close();
        const returned = new Phone(`${dropped.name} (rejoined)`);
        await returned.connected();
        returned.socket.emit('rejoin', { player_id: ids.get(dropped) });
        await returned.waitFor('game_start');
        const restored = await returned.waitFor('task');
        assert.equal(restored.task.assignment_id, taskBefore.assignment_id, 'Rejoin restores the current task');
        phones[phones.indexOf(dropped)] = returned;
        crew[crew.indexOf(dropped)] = returned;
        ids.set(returned, ids.get(dropped));
        log(`${dropped.name} reconnected and got the same task back`);

        // Emergency meeting: everyone readies up, then votes the intruder out
        const meetingMarks = new Map(phones.map(phone => [phone, phone.mark()]));
        await crew[0].command('meeting', { player_id: ids.get(crew[0]), round_id: roundId });
        const meeting = parse(await host.waitFor('meeting', data => parse(data).stage === 'waiting', { since: meetingMarks.get(host) }));
        // Phones slide ready one after another. In rooms over 10 players voting opens at 80% ready,
        // and a phone that slides just as it opens is told the ready phase is over, which is fine.
        const votingOpen = phone => phone.events.slice(meetingMarks.get(phone)).some(entry => entry.event === 'meeting' && parse(entry.data).stage === 'voting');
        let readied = 0;
        for (const phone of phones) {
            if (votingOpen(phone)) continue;
            try {
                await phone.command('ready', { player_id: ids.get(phone), round_id: roundId, meeting_id: meeting.id });
                readied++;
            } catch (error) {
                if (!(phones.length > 10 && /no longer in the ready phase/.test(error.message))) throw error;
            }
        }
        await Promise.all(phones.map(phone => phone.waitFor('meeting', data => parse(data).stage === 'voting', { since: meetingMarks.get(phone) })));
        if (phones.length <= 10) assert.equal(readied, phones.length, 'Small rooms wait for everyone');
        log(`Meeting called, ${readied} of ${phones.length} slid ready, voting open`);
        const endMarks = new Map(phones.map(phone => [phone, phone.mark()]));
        await Promise.all(phones.map(phone => phone.command('vote', {
            player_id: ids.get(phone), round_id: roundId, meeting_id: meeting.id,
            votedFor: phone === intruder ? ids.get(crew[0]) : ids.get(intruder),
        })));
        const results = await Promise.all(phones.map(phone => phone.waitFor('end_game', undefined, { since: endMarks.get(phone) })));
        results.forEach(result => assert.equal(result.result, 'victory', 'Crew wins once the intruder is voted out'));
        const finalRoster = roster(host);
        assert.equal(finalRoster.find(player => player.player_id === ids.get(intruder)).alive, false, 'Intruder is out');
        log('Intruder voted out, every phone shows the crew victory');

        await closeRoom(round, phones);
    } finally {
        phones.forEach(phone => phone.close());
    }
}

// 3 players: once it's 1 intruder vs 1 crewmate the round goes on as a last stand.
// The last crewmate wins with 3 more tasks; with elimination the intruder wins.
async function playLastStand(crewWins) {
    const phones = ['Host', 'Player 1', 'Player 2'].map(name => new Phone(`${name} (last stand)`));
    try {
        await Promise.all(phones.map(phone => phone.connected()));
        const round = await openRound(phones);
        const { ids, intruder, crew, roundId, completeTask } = round;
        const [first, last] = crew;

        await completeTask(last);
        const marks = new Map(phones.map(phone => [phone, phone.mark()]));
        await first.command('player_dead', { player_id: ids.get(first), round_id: roundId });
        const notices = await Promise.all(phones.map(phone => phone.waitFor('last_stand', undefined, { since: marks.get(phone) })));
        notices.forEach(notice => assert.equal(notice.tasks_left, 3, 'Last stand needs 3 more tasks'));
        await Promise.all(phones.map(phone => phone.waitFor('task_goal', goal => goal === 4, { since: marks.get(phone) })));
        log(`${first.name} eliminated: last stand, ${last.name} needs 3 more tasks`);

        const meeting = await last.socket.timeout(STEP_TIMEOUT_MS).emitWithAck('meeting', { player_id: ids.get(last), round_id: roundId });
        assert.equal(meeting?.ok, false, 'No meetings during a last stand');

        const endMarks = new Map(phones.map(phone => [phone, phone.mark()]));
        if (crewWins) {
            for (let done = 0; done < 3; done++) await completeTask(last);
        } else {
            await completeTask(last);
            await last.command('player_dead', { player_id: ids.get(last), round_id: roundId });
        }
        const expected = crewWins ? 'victory' : 'sus_victory';
        const results = await Promise.all(phones.map(phone => phone.waitFor('end_game', undefined, { since: endMarks.get(phone) })));
        results.forEach(result => assert.equal(result.result, expected, `Last stand ends in ${expected}`));
        log(crewWins
            ? `${last.name} finished 3 tasks and the crew won the last stand`
            : `${intruder.name} eliminated ${last.name} and won the last stand`);

        await closeRoom(round, phones);
    } finally {
        phones.forEach(phone => phone.close());
    }
}

async function checkBrowser() {
    const puppeteer = require('puppeteer');
    const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] });
    try {
        const page = await browser.newPage();
        const errors = [];
        page.on('pageerror', error => errors.push(error.message));
        const cdp = await page.createCDPSession();
        await cdp.send('Network.enable');
        const socketOpened = new Promise((resolve, reject) => {
            const timer = setTimeout(() => reject(new Error('The page did not open a game socket')), STEP_TIMEOUT_MS);
            cdp.on('Network.webSocketFrameReceived', ({ response }) => {
                if (response.payloadData.includes('selfie_access')) {
                    clearTimeout(timer);
                    resolve();
                }
            });
        });
        await page.goto(`${BASE_URL}${PAGE}${BETA ? '?beta=1' : ''}`, { waitUntil: 'domcontentloaded' });
        await socketOpened;
        await page.waitForFunction(() => document.querySelector('#root').textContent.trim().length > 0);
        assert.deepEqual(errors, [], `Page errors on ${PAGE}`);
        log(`Browser loaded ${PAGE} and its game socket connected`);
    } finally {
        await browser.close();
    }
}

(async () => {
    await checkVersion();
    await playGame();
    await playLastStand(true);
    await playLastStand(false);
    if (args.includes('--browser')) await checkBrowser();
    log('PASS: full game and both last stand endings played end to end');
})().catch(error => {
    console.error(`FAIL: ${error.message}`);
    process.exitCode = 1;
}).finally(() => setTimeout(() => process.exit(), 100));
