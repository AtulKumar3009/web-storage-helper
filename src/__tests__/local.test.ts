import Local from '../utils/local'
import { adapterContract } from './adapterContract'

adapterContract('Local', Local)

describe('Local storage failure handling', () => {
    afterEach(() => {
        jest.restoreAllMocks()
        Local.clear()
    })

    test('Should report false instead of throwing when the store rejects a write', () => {
        jest.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
            throw new DOMException('quota exceeded', 'QuotaExceededError')
        })
        expect(Local.set('key', 'value')).toBe(false)
    })

    test('Should report null instead of throwing when the store is inaccessible', () => {
        jest.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
            throw new DOMException('blocked', 'SecurityError')
        })
        expect(Local.get('key')).toBeNull()
    })

    test('Should return an empty object when the store cannot be enumerated', () => {
        Local.set('first', '1')
        jest.spyOn(Storage.prototype, 'key').mockImplementation(() => {
            throw new DOMException('blocked', 'SecurityError')
        })
        expect(Local.getAll()).toEqual({})
    })

    test('Should report false instead of throwing when the store cannot be cleared', () => {
        jest.spyOn(Storage.prototype, 'clear').mockImplementation(() => {
            throw new DOMException('blocked', 'SecurityError')
        })
        expect(Local.clear()).toBe(false)
    })
})
