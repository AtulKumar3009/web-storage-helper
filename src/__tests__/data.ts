/**
 * Every value the library must round-trip through every storage type, plain and
 * encrypted. `type` doubles as the storage key in the suites, so keep it a slug that
 * is valid as a cookie name (no spaces, `;`, `=`, or `,`).
 */
export const testData: { type: string; data: any }[] = [
    { type: 'string', data: 'Hello, World!' },
    { type: 'empty-string', data: '' },
    { type: 'unicode', data: 'नमस्ते, Ünïcödé ✓' },
    { type: 'emoji', data: 'Hello 🌍🚀' },
    { type: 'special-chars', data: 'a=b; c&d %20 "quoted" \\slash\nnewline\ttab' },
    { type: 'json-looking-string', data: '{"not":"parsed"}' },
    { type: 'number', data: 12345 },
    { type: 'zero', data: 0 },
    { type: 'negative-float', data: -12.5 },
    { type: 'boolean', data: true },
    { type: 'false', data: false },
    { type: 'object', data: { name: 'John', age: 30 } },
    { type: 'nested-object', data: { user: { name: 'John', tags: ['a', 'b'], address: { city: 'Delhi', zip: null } } } },
    { type: 'empty-object', data: {} },
    { type: 'array', data: [1, 2, 3, 4, 5] },
    { type: 'mixed-array', data: [1, 'two', { three: 3 }, [4], null, true] },
    { type: 'empty-array', data: [] },
    { type: 'null', data: null },
];
