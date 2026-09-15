import "core-js/stable/structured-clone";
import "fake-indexeddb/auto";
import IndexedDB from '../utils/indexedDB';
import { adapterContract } from './adapterContract'

adapterContract('IndexedDB', IndexedDB)

describe('IndexedDB storage specifics', () => {
    afterEach(() => {
        jest.restoreAllMocks()
    })

    test('Should report false when clearing fails', async () => {
        jest.spyOn(IndexedDB as any, 'db').mockRejectedValueOnce(new Error('open failed'))
        expect(await IndexedDB.clear('key')).toBe(false)
    })

    test('Should reject instead of hanging when reading fails', async () => {
        jest.spyOn(IndexedDB as any, 'db').mockRejectedValueOnce(new Error('open failed'))
        await expect(IndexedDB.get('key')).rejects.toThrow('open failed')
    })

    test('Should recover after a failed call', async () => {
        jest.spyOn(IndexedDB as any, 'db').mockRejectedValueOnce(new Error('open failed'))
        await expect(IndexedDB.get('key')).rejects.toThrow()
        jest.restoreAllMocks()
        expect(await IndexedDB.set('key', 'value')).toBe(true)
        expect(await IndexedDB.get('key')).toBe('value')
        await IndexedDB.clear()
    })
})
