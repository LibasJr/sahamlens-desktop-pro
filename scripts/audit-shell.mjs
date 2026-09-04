import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';

const config = JSON.parse(readFileSync('src-tauri/tauri.conf.json', 'utf8'));
const capability = JSON.parse(readFileSync('src-tauri/capabilities/default.json', 'utf8'));
const expectedOrigin = 'https://sahamlens.id';

assert.equal(config.build.devUrl, expectedOrigin, 'Development must load the canonical web app');
assert.equal(config.build.frontendDist, expectedOrigin, 'Release builds must load the canonical web app');
assert.equal(config.app.windows[0]?.decorations, true, 'Remote content needs native OS window controls');

assert.equal(capability.remote, undefined, 'Remote web content must never receive Tauri IPC permissions');
assert.deepEqual(capability.permissions, ['core:default'], 'Keep the local capability surface minimal');

assert.equal(existsSync('src/main.tsx'), false, 'Do not reintroduce a second, drifting desktop frontend');
assert.equal(existsSync('index.html'), false, 'The shell must not bundle a duplicate HTML entry point');

console.log('Desktop shell parity and IPC isolation checks passed.');
