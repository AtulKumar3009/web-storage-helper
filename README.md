# web-storage-helper

[![npm version](https://img.shields.io/npm/v/web-storage-helper.svg)](https://www.npmjs.com/package/web-storage-helper)
[![npm downloads](https://img.shields.io/npm/dm/web-storage-helper.svg)](https://www.npmjs.com/package/web-storage-helper)
[![license](https://img.shields.io/npm/l/web-storage-helper.svg)](https://github.com/AtulKumar3009/web-storage-helper/blob/master/LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-ready-blue.svg)](https://www.typescriptlang.org/)

**Web Storage Helper** is a small TypeScript library that gives you one API for every kind of browser storage: `localStorage`, `sessionStorage`, cookies, IndexedDB, and an in-memory temp store. Values are serialised for you, and both keys and values can be encrypted with a single configured secret, so sensitive data such as auth tokens and user preferences is not stored in plain text.

- npm: <https://www.npmjs.com/package/web-storage-helper>
- Source and issues: <https://github.com/AtulKumar3009/web-storage-helper>

## Features

- **Multiple Storage Types**: Supports `localStorage`, `sessionStorage`, `cookies`, `indexedDB`, and `temp` storage.
- **Encryption**: Optional encryption of values, and of keys, using one globally configured secret.
- **Unified API**: The same `set`, `get`, and `clear` methods for every storage type.
- **Safe to import anywhere**: Importing the library never touches the browser. Storage is accessed lazily, so it can be imported in server-rendered code and degrades to `false` / `null` where a storage area is unavailable.
- **TypeScript Support**: Strong typing with auto-completion in editors, including a typed `get<T>()`.

## Installation

```bash
npm install web-storage-helper
```

```bash
yarn add web-storage-helper
```

```bash
pnpm add web-storage-helper
```

The package ships its own TypeScript declarations, so no separate `@types` package is needed.

## Project Setup

If you plan to use encryption, configure the secret once before the first encrypted call. Only the first call to `configureStorage` takes effect; later calls are ignored.

```ts
import { configureStorage } from 'web-storage-helper';

// Configure encryption key globally
configureStorage({ encryptionKey: 'your-secret-key', encodeKey: true });
```

Any call that passes `encryption = true` before a key has been configured throws `Error('Encryption configuration is missing.')`.

### Importing Storage Methods

The storage API is exposed via the default `storage` export, which has one entry per storage type: `storage.local`, `storage.session`, `storage.cookie`, `storage.indexedDB`, and `storage.temp`.

```ts
import storage from 'web-storage-helper';
```

Each entry provides `set`, `get`, `getAll`, and `clear`. The `local`, `session`, `cookie`, and `temp` methods are synchronous; the `indexedDB` methods return promises.

---

## Usage

### Storing Data (`set`)

To store data in a specific storage type, you can use the `set` method. Data can be stored with or without encryption.

```ts
// Store data in localStorage without encryption
const saved = storage.local.set('username', 'Atul', false);
console.log(saved); //true | false

// Store data in sessionStorage with encryption
const saved = storage.session.set('username', 'Atul', true);
console.log(saved); //true | false

// Store data in temp storage (will be cleared on page refresh)
const saved = storage.temp.set('tempData', { key: 'value' }, false);
console.log(saved); //true | false

// Store data in indexedDB
const saved = await storage.indexedDB.set('userData', { name: 'Atul', age: 30 }, false);
console.log(saved); //true | false

// Store data in cookies with encryption
const saved = storage.cookie.set('authToken', 'your-auth-token', true);
console.log(saved); //true | false
```

### Retrieving Data (`get`)

To retrieve data from any storage type, use the `get` method. If encryption was used during storage, you can pass `true` to decrypt the data when retrieving it.

```ts
// Get data from localStorage (without encryption)
const username = storage.local.get('username', false);

// Get data from sessionStorage (with encryption)
const encryptedUsername = storage.session.get('username', true);

// Get data from temp storage (non-persistent across page refreshes)
const tempData = storage.temp.get('tempData', false);

// Get data from cookies (with encryption)
const authToken = storage.cookie.get('authToken', true);

// Get data from indexedDB
const userData = await storage.indexedDB.get('userData', false);

// Type the result instead of receiving `any`
const preference = storage.local.get<'light' | 'dark'>('theme'); // 'light' | 'dark' | null
```

A missing key returns `null`.

### Retrieving Everything (`getAll`)

To read every entry of a storage type at once, use `getAll`. It returns an object of key → value and applies the same rules as `get` to each entry: with `encryption = true`, encoded keys are decoded and values are decrypted with the configured secret.

```ts
// Every entry in localStorage, as stored
const everything = storage.local.getAll();
// { theme: 'dark', 'VsOIw4bDlsKlw6LCqsODw5Fk': 'U2FsdGVkX1…' }  ← encrypted entries stay raw

// Every entry, with encrypted keys and values decoded
const decrypted = storage.local.getAll(true);
// { theme: 'dark', username: 'Atul' }

// Type the values
const prefs = storage.session.getAll<string>();

// IndexedDB is asynchronous
const records = await storage.indexedDB.getAll(true);
```

An empty storage returns `{}`. Entries that were not written with encryption pass through unchanged when `encryption = true`, just as `get(key, true)` would return them.

### Clearing Data (`clear`)

To clear data from a storage type, use the `clear` method. You can clear a specific key or clear all data from that storage.

```ts
// Clear a specific key from localStorage (without encryption)
const cleared = storage.local.clear('username', false);
console.log(cleared); //true | false

// Clear all data from sessionStorage
const cleared = storage.session.clear();
console.log(cleared); //true | false

// Clear a specific encrypted key from cookies
const cleared = storage.cookie.clear('authToken', true);
console.log(cleared); //true | false

// Clear all data from indexedDB
const cleared = await storage.indexedDB.clear();
console.log(cleared); //true | false

// Clear every cookie set for the current path
const cleared = storage.cookie.clear();
console.log(cleared); //true | false
```

To clear an entry that was written with `encryption = true` while `encodeKey` is enabled, pass `true` as the second argument so the same encoded key is removed.

---

## API Reference

### `configureStorage({ encryptionKey?: string, encodeKey?: boolean })`

Configures encryption for the library. Only the first call takes effect.

- **encryptionKey**: The secret used to encrypt and decrypt values (and keys when `encodeKey` is `true`).
- **encodeKey**: If `true`, keys of encrypted entries are stored in an encoded form as well.

### `set(key: string, value: any, encryption = false)`

Stores data in a specified storage type. Returns `true` on success and `false` when the storage area is unavailable or rejects the write (for example when the quota is exceeded). For `indexedDB` the result is a `Promise<boolean>`.

- **key**: The key under which the data will be stored (string).
- **value**: The data to be stored (any JSON-serialisable value).
- **encryption**: If `true`, encrypts the value, and the key when `encodeKey` is enabled, before storing.

### `get<T = any>(key: string, encryption = false)`

Retrieves data from the specified storage type. Returns `T | null`, or `Promise<T | null>` for `indexedDB`. A missing key, or an unavailable storage area, yields `null`.

- **key**: The key under which the data is stored (string).
- **encryption**: If `true`, decrypts the value before returning it. Must match the flag used in `set`.

### `getAll<T = any>(encryption = false)`

Retrieves every entry of the specified storage type as `Record<string, T>`, or `Promise<Record<string, T>>` for `indexedDB`. An empty or unavailable storage area yields `{}`.

- **encryption**: If `true`, decodes each key (when `encodeKey` is enabled) and decrypts each value before returning them. Requires a configured key.

### `clear(key?: string, encryption = false)`

Clears data from the specified storage type. Returns `true` on success and `false` when the storage area is unavailable. For `indexedDB` the result is a `Promise<boolean>`.

- **key**: Optional. If provided, only the specific key will be removed. Otherwise, clears all data from the storage type.
- **encryption**: If `true`, encodes the key before clearing. Must match the flag used in `set`.

---

## Example: Full Usage Example

```ts
import storage, { configureStorage } from 'web-storage-helper';

// Configure encryption key globally
configureStorage({ encryptionKey: 'secret-key', encodeKey: true });

// Set encrypted data in localStorage
storage.local.set('username', 'Atul', true);

// Get encrypted data from localStorage
const username = storage.local.get<string>('username', true);
console.log(username); // 'Atul'

// Read every encrypted entry in localStorage, decoded
const everything = storage.local.getAll<string>(true);
console.log(everything); // { username: 'Atul' }

// Clear encrypted data from localStorage
storage.local.clear('username', true);

// Set data in indexedDB
const saved = await storage.indexedDB.set('username', 'Atul');

// Get data from indexedDB
const stored = await storage.indexedDB.get<string>('username');
console.log(stored); // 'Atul'

// Clear data from indexedDB
const cleared = await storage.indexedDB.clear('username');
```

---

## Upgrading from 2.x

Version 3 changed how encrypted entries are stored: values are serialised once instead of twice, and encoded keys no longer carry JSON quotes. Plain (unencrypted) entries are unaffected. Entries written with `encryption = true` by 2.x are still readable, but they appear differently:

- With `encodeKey: true`, `get('username', true)` returns `null` because the stored key differs. `getAll(true)` lists them under a JSON-quoted key such as `'"username"'`.
- Their values come back as a JSON string, for example `'"Atul"'` or `'{"age":30}'`, rather than the parsed value.

Run this once per storage type after upgrading to rewrite them in the new format:

```ts
const legacy = storage.local.getAll<string>(true);
Object.keys(legacy)
    .filter(key => key.startsWith('"'))
    .forEach(key => {
        storage.local.set(JSON.parse(key), JSON.parse(legacy[key]), true);
        storage.local.clear(key, true);
    });
```

If you used `encodeKey: false`, keys are unchanged; only the values need `JSON.parse` once.

---

## Contributing

We welcome contributions to improve the library! Please fork the repository, create a new branch, and submit a pull request with your changes. Don't forget to add tests for new features or bug fixes.