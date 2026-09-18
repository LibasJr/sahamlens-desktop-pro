import assert from 'node:assert/strict';
import {
  adxSeries,
  atrSeries,
  bollingerSeries,
  calculateWilderAtr,
  cmfSeries,
  emaSeries,
  heikinAshi,
  macdSeries,
  obvSeries,
  rsiSeries,
  smaSeries,
  stochasticSeries,
  williamsRSeries,
  type ChartCandle,
} from '../src/technical/indicators.ts';
import {
  buildTechnicalSuite,
  calculate52WeekRange,
  calculateMultiTimeframeTrends,
  calculatePivotPoints,
  calculateTradingPlan,
  detectCandlestickPatterns,
} from '../src/technical/levels.ts';

// Generate synthetic candles for test
function generateMockCandles(count: number, basePrice = 5000): ChartCandle[] {
  const candles: ChartCandle[] = [];
  let current = basePrice;
  for (let i = 0; i < count; i++) {
    const delta = Math.sin(i / 5) * 50 + (i % 2 === 0 ? 20 : -15);
    const open = Math.round(current);
    const close = Math.round(current + delta);
    const high = Math.round(Math.max(open, close) + 30);
    const low = Math.round(Math.min(open, close) - 25);
    const volume = 1_000_000 + (i % 10) * 100_000;
    const dateStr = new Date(2025, 0, 1 + i).toISOString().slice(0, 10);
    candles.push({
      time: dateStr,
      open,
      high,
      low,
      close,
      volume,
      sessionStatus: 'COMPLETE',
      openEstimated: false,
    });
    current = close;
  }
  return candles;
}

const candles = generateMockCandles(60, 5000);

// 1. SMA Series
const sma20 = smaSeries(candles, 20);
assert.equal(sma20.length, 60);
assert.equal(sma20[18], null, 'SMA before period must be null');
assert.ok(typeof sma20[19] === 'number', 'SMA at index period - 1 must be number');
assert.ok(sma20[59]! > 0, 'SMA at last index must be positive');

// 2. EMA Series
const ema20 = emaSeries(candles, 20);
assert.equal(ema20.length, 60);
assert.equal(ema20[18], null, 'EMA before period must be null');
assert.ok(typeof ema20[19] === 'number', 'EMA at index period - 1 must be number');
assert.ok(ema20[59]! > 0, 'EMA at last index must be positive');

// 3. Bollinger Bands
const bb = bollingerSeries(candles, 20, 2);
assert.equal(bb.upper.length, 60);
assert.equal(bb.lower.length, 60);
assert.equal(bb.middle.length, 60);
assert.ok(bb.upper[59]! >= bb.middle[59]!, 'BB Upper must be >= Middle');
assert.ok(bb.middle[59]! >= bb.lower[59]!, 'BB Middle must be >= Lower');

// 4. RSI (Wilder Smoothed)
const rsi = rsiSeries(candles, 14);
assert.equal(rsi.length, 60);
assert.equal(rsi[13], null, 'RSI before period must be null');
assert.ok(rsi[59]! >= 0 && rsi[59]! <= 100, 'RSI must be bounded between 0 and 100');

// 5. MACD (12, 26, 9)
const macd = macdSeries(candles, 12, 26, 9);
assert.equal(macd.macd.length, 60);
assert.equal(macd.signal.length, 60);
assert.equal(macd.histogram.length, 60);
assert.ok(macd.macd[59] != null, 'MACD line at last bar must exist');
assert.ok(macd.signal[59] != null, 'MACD signal line at last bar must exist');
assert.ok(macd.histogram[59] != null, 'MACD histogram at last bar must exist');
const expectedHist = Math.round((macd.macd[59]! - macd.signal[59]!) * 1000) / 1000;
const actualHist = Math.round(macd.histogram[59]! * 1000) / 1000;
assert.equal(actualHist, expectedHist, 'Histogram must equal MACD - Signal');

// 6. Stochastic Oscillator (%K, %D)
const stoch = stochasticSeries(candles, 14);
assert.equal(stoch.k.length, 60);
assert.equal(stoch.d.length, 60);
assert.ok(stoch.k[59]! >= 0 && stoch.k[59]! <= 100, 'Stochastic %K must be between 0 and 100');
assert.ok(stoch.d[59]! >= 0 && stoch.d[59]! <= 100, 'Stochastic %D must be between 0 and 100');

// 7. ATR (Wilder 14)
const atr = atrSeries(candles, 14);
assert.equal(atr.length, 60);
assert.ok(atr[59]! > 0, 'ATR must be positive');
const singleAtr = calculateWilderAtr(candles, 14);
assert.ok(singleAtr != null && singleAtr > 0, 'Single Wilder ATR calculation must be positive');

// 8. Chaikin Money Flow (CMF 20)
const cmf = cmfSeries(candles, 20);
assert.equal(cmf.length, 60);
assert.ok(cmf[59]! >= -1 && cmf[59]! <= 1, 'CMF must be bounded between -1 and 1');

// 9. Williams %R (-100 to 0)
const wr = williamsRSeries(candles, 14);
assert.equal(wr.length, 60);
assert.ok(wr[59]! >= -100 && wr[59]! <= 0, 'Williams %R must be bounded between -100 and 0');

// 10. ADX & Directional Movement
const adx = adxSeries(candles, 14);
assert.equal(adx.adx.length, 60);
assert.equal(adx.plusDi.length, 60);
assert.equal(adx.minusDi.length, 60);
assert.ok(adx.adx[59]! >= 0 && adx.adx[59]! <= 100, 'ADX must be between 0 and 100');
assert.ok(adx.plusDi[59]! >= 0 && adx.plusDi[59]! <= 100, '+DI must be between 0 and 100');
assert.ok(adx.minusDi[59]! >= 0 && adx.minusDi[59]! <= 100, '-DI must be between 0 and 100');

// 11. OBV
const obv = obvSeries(candles);
assert.equal(obv.length, 60);
assert.ok(Number.isFinite(obv[59]), 'OBV at last index must be a finite number');

// 12. Heikin-Ashi
const ha = heikinAshi(candles);
assert.equal(ha.length, 60);
for (let i = 1; i < ha.length; i++) {
  assert.equal(ha[i].open, (ha[i - 1].open + ha[i - 1].close) / 2, 'HA open must be average of prior HA open and close');
}

// 13. Pivot Points
const pivots = calculatePivotPoints(5500, 5200, 5400);
assert.ok(pivots.CLASSIC.r1 > pivots.CLASSIC.pp, 'Classic R1 must be greater than PP');
assert.ok(pivots.CLASSIC.pp > pivots.CLASSIC.s1, 'Classic PP must be greater than S1');
assert.ok(pivots.FIBONACCI.r1 > pivots.FIBONACCI.pp, 'Fibonacci R1 must be greater than PP');
assert.ok(pivots.CAMARILLA.r3 > pivots.CAMARILLA.s3, 'Camarilla R3 must be greater than S3');

// 14. 52-Week Range
const range52w = calculate52WeekRange(candles);
assert.ok(range52w != null, '52-week range should be calculated');
assert.ok(range52w.positionPct >= 0 && range52w.positionPct <= 100, 'Position % must be between 0 and 100');

// 15. Multi-Timeframe Trends
const trends = calculateMultiTimeframeTrends(candles);
assert.equal(trends.length, 3, 'Must return 3 timeframes (Short, Medium, Long)');
assert.equal(trends[0].timeframe, 'SHORT_TERM');
assert.equal(trends[1].timeframe, 'MEDIUM_TERM');
assert.equal(trends[2].timeframe, 'LONG_TERM');

// 16. Candlestick Patterns
const patternCandles: ChartCandle[] = [
  { time: '2025-01-01', open: 5000, high: 5050, low: 4900, close: 4920, volume: 1000000, sessionStatus: 'FINAL' },
  { time: '2025-01-02', open: 4900, high: 5100, low: 4880, close: 5080, volume: 2500000, sessionStatus: 'FINAL' }, // Engulfing
];
// Add prior 20 bars for volume baseline
const fullPatternCandles = generateMockCandles(20, 5000).concat(patternCandles);
const detected = detectCandlestickPatterns(fullPatternCandles);
assert.ok(detected.some((p) => p.id === 'BULLISH_ENGULFING'), 'Must detect Bullish Engulfing');

// 17. Trading Plan (Prinsip Libas)
const plan = calculateTradingPlan(candles, pivots, 5400);
assert.ok(plan != null, 'Trading plan should be generated');
assert.ok(plan.stopLoss < plan.currentPrice, 'Stop loss must be lower than current price');
assert.ok(plan.targetPrice1 > plan.currentPrice, 'TP1 must be higher than current price');
assert.ok(plan.targetPrice2 > plan.targetPrice1, 'TP2 must be higher than TP1');
assert.ok(plan.riskRewardRatio.startsWith('1 :'), 'RR ratio must follow 1 : X format');

// 18. Technical Suite Integration
const suite = buildTechnicalSuite(candles);
assert.ok(suite != null, 'Full technical suite must return valid object');
assert.equal(suite.currentPrice, candles[candles.length - 1].close);
assert.ok(suite.pivots.CLASSIC != null);
assert.ok(suite.trends.length === 3);

console.log('All technical suite unit tests passed successfully!');
