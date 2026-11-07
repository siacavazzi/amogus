import { ANON_DEVICE_STORAGE_KEY, createAnonDeviceId, isAnonDeviceId, randomUuid } from '../../utils/anonDeviceId';

function memoryStorage(initial = {}) {
    const values = { ...initial };
    return {
        getItem: key => (key in values ? values[key] : null),
        setItem: (key, value) => { values[key] = String(value); },
        values,
    };
}

const SAVED = '3f2b8c1e-9d4a-4b6f-8e2d-1a2b3c4d5e6f';

describe('anonymous device ID', () => {
    test('a new browser makes a random ID once and reports it as created only the first time', () => {
        const storage = memoryStorage();
        const read = createAnonDeviceId({ storage });
        const first = read();
        expect(isAnonDeviceId(first.id)).toBe(true);
        expect(first.status).toBe('created');
        expect(storage.values[ANON_DEVICE_STORAGE_KEY]).toBe(first.id);
        // A socket reconnect in the same page load is not a new device.
        expect(read()).toEqual({ id: first.id, status: 'stored' });
    });

    test('a returning browser reuses its stored ID', () => {
        const read = createAnonDeviceId({ storage: memoryStorage({ [ANON_DEVICE_STORAGE_KEY]: SAVED }) });
        expect(read()).toEqual({ id: SAVED, status: 'stored' });
    });

    test('a damaged stored value is replaced', () => {
        const storage = memoryStorage({ [ANON_DEVICE_STORAGE_KEY]: 'Sam' });
        const { id, status } = createAnonDeviceId({ storage })();
        expect(status).toBe('created');
        expect(id).not.toBe('Sam');
        expect(isAnonDeviceId(id)).toBe(true);
    });

    test('blocked storage still gives one ID for the page load, marked unsaved', () => {
        const storage = { getItem() { throw new Error('SecurityError'); }, setItem() { throw new Error('SecurityError'); } };
        const read = createAnonDeviceId({ storage });
        const first = read();
        expect(first.status).toBe('unsaved');
        expect(isAnonDeviceId(first.id)).toBe(true);
        expect(read()).toEqual(first);
    });

    test('storage that drops writes is marked unsaved', () => {
        const storage = { getItem: () => null, setItem: () => {} };
        expect(createAnonDeviceId({ storage })().status).toBe('unsaved');
    });

    test('the fallback generator makes version 4 UUIDs', () => {
        const fake = { getRandomValues: bytes => bytes.fill(255) };
        expect(isAnonDeviceId(randomUuid(fake))).toBe(true);
        expect(isAnonDeviceId(randomUuid({}))).toBe(true);
    });
});
