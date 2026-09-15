import { decrypt, encrypt } from "../encryption";
import { testData } from './data'

/**
 * Fixtures produced by web-storage-helper 3.0.0. Consumers hold data written in this
 * format, so these must keep passing until a major version deliberately changes it.
 * The static fixtures are byte-identical to 2.1.0 (the primitives did not change);
 * 3.0.0 only stopped serialising twice and stopped JSON-quoting encoded keys.
 */
const STATIC_FIXTURES: Record<string, string> = {
    'string': 'VsKbwrjDncKfw6N1dsODwrHCtcK0w45ywok',
    'empty-string': 'VnU',
    'unicode': 'VuClu-CmgeCmqeCmgOCmmOCmkMKCwozEnsKxxLfDjcWHw4vFlMKY4p6HVg',
    'emoji': 'VsKbwrjDncKfw6Np8LStufCvu4Nq',
    'special-chars': 'VsK0wpDDk27ClMKsfMOQYmh6wppxw4PCjcOpw6nCo8OEwrPDiMKNV8KTw4zDjsOrwr_CosK1w4nDjsONwrHCmMKww5vCusOhwrLDjMOKwrXDgMOOwoU',
    'json-looking-string': 'VsOOwq_Ck8Khw6PCvcKywo58wp9qw5rCssOZw57DncOYwpByw4vChg',
    'number': 'ZcKFwobCpWg',
    'zero': 'ZA',
    'negative-float': 'YcKEwoXCn2g',
    'boolean': 'wqjDhcOIw5Y',
    'false': 'wprCtMK_w6TCmA',
    'object': 'wq91w4HDksKgw5lrwpDCjsKMwrLCsMOYc8KTwo3DmcObwplywojCl2HCsg',
    'nested-object': 'wq91w4jDpMKYw6ZrwpDDp2TCscKpw5fCtsKJwqXCmsK-wqPCuMK8woZdV8Onw5HDmcOrdXvCncKDw5PCgW9VwpvCkcKuwp9vw5HCusKlw5HDkcOWwrd3wq7Cs2rCuMKfw6PDpG5tT8Krw5rDi8OHwplkZHjDhMKqwqBkbMKyw4PCucKxw7HDksKz',
    'empty-object': 'wq_DkA',
    'array': 'wo_ChH_Co1_Cp3XCisKYd8Kg',
    'mixed-array': 'wo_ChH_Ck8Knw6vCuHjCmMK9ZcK8w5LDg8OMw5DCmsKuZ8ONesK_ZcKSwp_DnsOnw6TCv23CtsOTw6fDhMKg',
    'empty-array': 'wo_CsA',
    'null': 'wqLDiMK_w50',
};
const STATIC_KEY_FIXTURE = { text: 'username', cipher: 'wqnDhsK4w6PCocOVwrbCuw' };
const AES_FIXTURE = { text: '{"name":"John","age":30}', cipher: 'U2FsdGVkX1+y/27/urAllTul4WG2hk1MNskv31RWkx6EAlpW71DdqojlCiAU/TCZ' };

/**
 * Written by the 2.1.0 `encrypt` for the object `{ name: 'John', age: 30 }` and the key
 * `username`. 2.x JSON-serialised inside `encrypt`, so the AES envelope holds the JSON
 * text once (identical to what 3.0.0 stores) and the encoded key holds a JSON-quoted
 * string. The facade-level 2.x layout (values serialised twice) is covered in
 * `storage.test.ts`.
 */
const LEGACY = {
    aes: { cipher: 'U2FsdGVkX19YVQlED5pxMLd61hS+Xd0UP0TwCyJKL7aVw1Khy5nUrJ0FJpCe0EIn', text: '{"name":"John","age":30}' },
    key: { cipher: 'VsOIw4bDlsKlw6LCqsODw5Fk', text: '"username"' },
};

describe('Encryption', () => {
    const key = 'test-key';

    it('should have a fixture for every data type', () => {
        expect(Object.keys(STATIC_FIXTURES).sort()).toEqual(testData.map(({ type }) => type).sort());
    });

    testData.forEach(({ type, data }) => {
        const text = JSON.stringify(data);

        it(`should round-trip ${type} JSON text - static`, () => {
            expect(decrypt(encrypt(text, key, false), key, false)).toBe(text);
        });

        it(`should round-trip ${type} JSON text - dynamic`, () => {
            expect(decrypt(encrypt(text, key, true), key, true)).toBe(text);
        });

        it(`should keep the 3.0.0 static format for ${type} JSON text`, () => {
            expect(encrypt(text, key, false)).toBe(STATIC_FIXTURES[type]);
            expect(decrypt(STATIC_FIXTURES[type], key, false)).toBe(text);
        });
    })

    it('should keep the 3.0.0 encoded-key format', () => {
        expect(encrypt(STATIC_KEY_FIXTURE.text, key, false)).toBe(STATIC_KEY_FIXTURE.cipher);
        expect(decrypt(STATIC_KEY_FIXTURE.cipher, key, false)).toBe(STATIC_KEY_FIXTURE.text);
    });

    it('should decrypt a value written by 3.0.0 in dynamic mode', () => {
        expect(decrypt(AES_FIXTURE.cipher, key, true)).toBe(AES_FIXTURE.text);
    });

    it('should be deterministic in static mode and randomised in dynamic mode', () => {
        expect(encrypt('username', key, false)).toBe(encrypt('username', key, false));
        expect(encrypt('username', key, true)).not.toBe(encrypt('username', key, true));
    });

    it('should return null for input this library did not produce', () => {
        expect(decrypt('"Hello"', key, true)).toBeNull();              // plain JSON value
        expect(decrypt('local-string-plain', key, false)).toBeNull();  // plain key
        expect(decrypt('id', key, false)).toBeNull();                  // short plain key
        expect(decrypt('not-a-cipher', key, true)).toBeNull();
    });

    it('should return null for the wrong key in dynamic mode', () => {
        expect(decrypt(AES_FIXTURE.cipher, 'other-key', true)).toBeNull();
    });

    it('cannot detect a wrong key in static mode, only foreign input', () => {
        // Static mode is an unauthenticated shift: any key round-trips, so a wrong key
        // yields a different string rather than null. Lookups still miss, because the
        // encoded key computed with the wrong secret is a different stored key.
        const decoded = decrypt(STATIC_KEY_FIXTURE.cipher, 'other-key', false);
        expect(decoded).not.toBeNull();
        expect(decoded).not.toBe(STATIC_KEY_FIXTURE.text);
        expect(encrypt(STATIC_KEY_FIXTURE.text, 'other-key', false)).not.toBe(STATIC_KEY_FIXTURE.cipher);
    });

    it('should round-trip an empty string', () => {
        expect(decrypt(encrypt('', key, false), key, false)).toBe('');
    });

    it('should still decrypt 2.1.0 output, since the primitives did not change', () => {
        expect(decrypt(LEGACY.aes.cipher, key, true)).toBe(LEGACY.aes.text);
        expect(decrypt(LEGACY.key.cipher, key, false)).toBe(LEGACY.key.text);
    });
});
