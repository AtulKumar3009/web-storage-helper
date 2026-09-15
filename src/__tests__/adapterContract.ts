import { StorageAdapter } from '../types';
import { testData } from './data';

/**
 * The behaviour every adapter under `utils/` must share. Adapters store raw strings,
 * so each value is stored as its JSON text, which is exactly what the facade hands them.
 * Everything is awaited so the same contract covers the asynchronous IndexedDB adapter.
 */
export const adapterContract = (name: string, adapter: StorageAdapter) => {
    describe(`${name} adapter contract`, () => {
        beforeEach(async () => {
            await adapter.clear();
        });

        afterAll(async () => {
            await adapter.clear();
        });

        testData.forEach(({ type, data }) => {
            it(`stores, reads, lists and removes ${type}`, async () => {
                const value = JSON.stringify(data);
                expect(await adapter.set(type, value)).toBe(true);
                expect(await adapter.get(type)).toBe(value);
                expect(await adapter.getAll()).toEqual({ [type]: value });
                expect(await adapter.clear(type)).toBe(true);
                expect(await adapter.get(type)).toBeNull();
                expect(await adapter.getAll()).toEqual({});
            });
        });

        it('returns null for a missing key', async () => {
            expect(await adapter.get('does-not-exist')).toBeNull();
        });

        it('overwrites an existing key', async () => {
            await adapter.set('key', 'first');
            await adapter.set('key', 'second');
            expect(await adapter.get('key')).toBe('second');
        });

        it('lists every entry and clears them all at once', async () => {
            const expected: Record<string, string> = {};
            for (const { type, data } of testData) {
                expected[type] = JSON.stringify(data);
                await adapter.set(type, expected[type]);
            }
            expect(await adapter.getAll()).toEqual(expected);
            expect(await adapter.clear()).toBe(true);
            expect(await adapter.getAll()).toEqual({});
            for (const { type } of testData) {
                expect(await adapter.get(type)).toBeNull();
            }
        });
    });
};
