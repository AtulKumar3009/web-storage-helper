import Local from '../utils/local'
import Session from '../utils/session'
import { adapterContract } from './adapterContract'

adapterContract('Session', Session)

describe('Session storage isolation', () => {
    afterEach(() => {
        Local.clear()
        Session.clear()
    })

    test('Should not share entries with local storage', () => {
        Session.set('scoped', 'session')
        Local.set('scoped', 'local')
        expect(Session.get('scoped')).toBe('session')
        expect(Local.get('scoped')).toBe('local')
        expect(sessionStorage.getItem('scoped')).toBe('session')
        expect(localStorage.getItem('scoped')).toBe('local')
    })

    test('Should clear only its own entries', () => {
        Session.set('scoped', 'session')
        Local.set('scoped', 'local')
        Session.clear()
        expect(Session.get('scoped')).toBeNull()
        expect(Local.get('scoped')).toBe('local')
    })
})
