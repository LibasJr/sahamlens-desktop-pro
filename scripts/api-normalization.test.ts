import assert from 'node:assert/strict';
import { normalizeMarketPulse } from '../src/api.ts';
import { displayText, marketRegimeText, numericValue } from '../src/normalize.ts';

assert.equal(
  marketRegimeText({ marketRegime: { regime: { code: 'BULL_EXPANSION', label: 'Bull Expansion' } } }, 'Unknown'),
  'Bull Expansion',
  'nested market regime objects must become text before reaching JSX',
);
assert.equal(displayText({ message: 'Login ditolak' }, 'Unknown'), 'Login ditolak');
assert.equal(displayText(['VOL SPIKE', 'FLOW CONFIRM'], 'Unknown'), 'VOL SPIKE, FLOW CONFIRM');
assert.equal(numericValue('34.8%', 0), 34.8);
assert.equal(numericValue({ value: '6.02%' }, 0), 6.02);

const pulse = normalizeMarketPulse({
  marketRegime: {
    score: 76,
    fearGreed: { code: 'GREED', label: 'Greed' },
    regime: { code: 'BULL_EXPANSION', label: 'Bull Expansion' },
  },
  indices: [{ symbol: '^JKSE', name: 'IHSG', price: 6462.56, changePct: 0.4 }],
  breadth: { advancing: 62, declining: 20, unchanged: 18 },
});
assert.equal(pulse.marketRegime, 'Bull Expansion');
assert.equal(pulse.indices[0]?.finalPrice, 6462.56);
assert.equal(pulse.advances, 62);
assert.equal(pulse.fearGreed.label, 'Greed');

console.log('API display normalization checks passed.');
