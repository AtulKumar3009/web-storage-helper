import Cookie from '../utils/cookie'
import { adapterContract } from './adapterContract'

adapterContract('Cookie', Cookie)

describe('Cookie storage specifics', () => {
    afterEach(() => {
        Cookie.clear()
    })

    test('Should URI-encode values so separators survive', () => {
        Cookie.set('first', 'a=b; c=d')
        Cookie.set('second', '2')
        expect(document.cookie).toContain('first=a%3Db%3B%20c%3Dd')
        expect(Cookie.get('first')).toBe('a=b; c=d')
        expect(Cookie.get('second')).toBe('2')
    })

    test('Should not match a key that is only a prefix of another', () => {
        Cookie.set('keyName', 'long')
        expect(Cookie.get('key')).toBeNull()
        expect(Cookie.get('keyName')).toBe('long')
    })

    test('Should leave document.cookie empty after clearing everything', () => {
        Cookie.set('first', '1')
        Cookie.set('second', '2')
        expect(Cookie.clear()).toBe(true)
        expect(document.cookie).toBe('')
    })
})
