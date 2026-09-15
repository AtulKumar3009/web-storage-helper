import crypto from 'crypto-js';

/**
 * Stored-format warning: consumers hold data written by the current scheme.
 * Everything below that affects output bytes (the key padding, the SHA-512 + HMAC
 * shuffle, the char-shift, the OpenSSL-style AES envelope) must stay byte-for-byte
 * identical within a major version. `encryption.test.ts` pins fixtures.
 *
 * This module works on plain strings only. JSON serialisation belongs to the facade.
 */

/** Base64 of the `Salted__` header crypto-js writes in front of every AES envelope. */
const AES_ENVELOPE_PREFIX = 'U2FsdGVkX1';

const pad = (start: number) =>
    Array.from({ length: 32 }, (_, i) => String.fromCharCode(((i + i + 7) ** 2) + start)).join('');

const KEY_PREFIX = pad(100);
const KEY_SUFFIX = pad(200);

const paddedKey = (key: string) => `${KEY_PREFIX}${key}${KEY_SUFFIX}`;

/** Deterministic permutation of the hash characters, keyed by the hash itself. */
const shuffle = (str: string) =>
    Array.from(str)
        .map((char, index) => ({ char, hash: crypto.HmacSHA256(char + index, str).toString(crypto.enc.Hex) }))
        .sort((a, b) => a.hash.localeCompare(b.hash))
        .map(item => item.char)
        .join('');

/**
 * Keystream for the static (deterministic) mode. Deriving it costs a SHA-512 plus one
 * HMAC per character, and every encoded key lookup needs it, so it is memoised per key.
 */
const keystreamCache = new Map<string, string>();
const keystream = (key: string) => {
    let stream = keystreamCache.get(key);
    if (stream === undefined) {
        stream = shuffle(crypto.SHA512(key).toString(crypto.enc.Base64url));
        keystreamCache.set(key, stream);
    }
    return stream;
};

/** Shifts each UTF-16 code unit by the matching keystream unit; `-1` reverses. */
const shiftChars = (text: string, stream: string, direction: 1 | -1) =>
    text
        .split('')
        .map((char, index) => String.fromCharCode(char.charCodeAt(0) + direction * stream.charCodeAt(index % stream.length)))
        .join('');

const toBase64Url = (data: string) =>
    crypto.enc.Base64.stringify(crypto.enc.Utf8.parse(data))
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');

const fromBase64Url = (data: string) => {
    const base64 = data.replace(/-/g, '+').replace(/_/g, '/');
    const padded = base64.padEnd(base64.length + (4 - base64.length % 4) % 4, '=');
    return crypto.enc.Utf8.stringify(crypto.enc.Base64.parse(padded));
};

const encodeStatic = (text: string, secret: string) => toBase64Url(shiftChars(text, keystream(secret), 1));

/**
 * crypto-js strips PKCS7 padding without checking it, so a wrong key can produce
 * short garbage instead of an error. Decrypting with no padding and validating the
 * padding bytes here turns a wrong key into `null` almost always; the facade's JSON
 * check covers the rare remainder.
 */
const decryptAes = (cipher: string, secret: string): string | null => {
    const hex = crypto.AES.decrypt(cipher, secret, { padding: crypto.pad.NoPadding }).toString(crypto.enc.Hex);
    const padByte = hex.slice(-2);
    const padLength = parseInt(padByte, 16);
    if (!(padLength >= 1 && padLength <= 16) || hex.length < padLength * 2) return null;
    if (hex.slice(-padLength * 2) !== padByte.repeat(padLength)) return null;
    return crypto.enc.Utf8.stringify(crypto.enc.Hex.parse(hex.slice(0, -padLength * 2)));
};

/** Whether `value` carries the AES envelope this library writes in dynamic mode. */
export const isEncrypted = (value: string) => value.startsWith(AES_ENVELOPE_PREFIX);

/**
 * `dynamic` (default) uses salted AES, so the same input yields a different cipher
 * each time. `dynamic = false` is deterministic and is used for encoded keys, which
 * must be reproducible to be looked up again.
 */
export const encrypt = (text: string, key: string, dynamic = true): string => {
    const secret = paddedKey(key);
    if (dynamic) return crypto.AES.encrypt(text, secret).toString();
    return encodeStatic(text, secret);
};

/**
 * Returns the original text, or `null` when `cipher` was not produced by `encrypt`.
 * Dynamic mode also returns `null` for a wrong key (the padding no longer validates).
 * Static mode is an unauthenticated shift and cannot tell a wrong key apart; it only
 * rejects input that is not canonical base64url of valid UTF-8, which is how plain
 * keys are recognised. Callers decide what `null` means; the facade passes such
 * entries through unchanged, so plain entries survive an encrypted read.
 */
export const decrypt = (cipher: string, key: string, dynamic = true): string | null => {
    const secret = paddedKey(key);
    try {
        if (dynamic) {
            return isEncrypted(cipher) ? decryptAes(cipher, secret) : null;
        }
        const text = shiftChars(fromBase64Url(cipher), keystream(secret), -1);
        // Static mode is deterministic, so a genuine cipher round-trips exactly.
        return encodeStatic(text, secret) === cipher ? text : null;
    } catch (error) {
        return null;
    }
};
