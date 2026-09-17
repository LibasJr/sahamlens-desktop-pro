import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';

const config = JSON.parse(readFileSync('src-tauri/tauri.conf.json', 'utf8'));
const capability = JSON.parse(readFileSync('src-tauri/capabilities/default.json', 'utf8'));
const packageManifest = JSON.parse(readFileSync('package.json', 'utf8'));

assert.equal(config.build.devUrl, 'http://localhost:1420', 'Development must point to local Vite dev server');
assert.equal(config.build.frontendDist, '../dist', 'Release builds must bundle local compiled dist');
assert.equal(config.app.windows[0]?.decorations, true, 'Desktop window must provide native OS window controls');

assert.equal(capability.remote, undefined, 'Keep local capability surface minimal');
assert.deepEqual(capability.permissions, ['core:default'], 'Keep minimal default permissions');

assert.equal(existsSync('src/main.tsx'), true, 'Frontend entry point src/main.tsx must exist');
assert.equal(existsSync('src/App.tsx'), true, 'Cockpit v2 UI entry point src/App.tsx must exist');
assert.equal(existsSync('src/api.ts'), true, 'API service layer src/api.ts must exist');
assert.equal(existsSync('dist/index.html'), true, 'Compiled dist/index.html must exist before packaging');
assert.equal(packageManifest.scripts?.tauri, 'tauri', 'tauri-action requires the npm tauri script');

console.log('SahamLens Desktop Pro v2 shell checks passed.');
