/**
 * @jest-environment node
 */

/**
 * Runs without a DOM, like a Next.js server render. Importing the library must not
 * throw, synchronous adapters must degrade to `false` / `null`, and the IndexedDB
 * adapter must reject (not hang) because there is no database to open.
 */
describe('Import without a DOM', () => {
    test('importing the library does not throw', () => {
        expect(() => require('../')).not.toThrow()
    })

    test('synchronous adapters degrade gracefully', () => {
        const storage = require('../').default
        for (const type of ['local', 'session', 'cookie'] as const) {
            expect(storage[type].set('key', 'value')).toBe(false)
            expect(storage[type].get('key')).toBeNull()
            expect(storage[type].getAll()).toEqual({})
            expect(storage[type].clear('key')).toBe(false)
        }
        expect(storage.temp.set('key', 'value')).toBe(true)
        expect(storage.temp.get('key')).toBe('value')
    })

    test('IndexedDB rejects instead of hanging', async () => {
        const storage = require('../').default
        await expect(storage.indexedDB.get('key')).rejects.toThrow()
        await expect(storage.indexedDB.getAll()).rejects.toThrow()
        expect(await storage.indexedDB.clear('key')).toBe(false)
    })
})
