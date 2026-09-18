export type ChartCandle = {
  time: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  adjClose?: number | null;
  sessionStatus?: 'COMPLETE' | 'PARTIAL';
  openEstimated?: boolean;
};

export type ChartType = 'candlestick' | 'bar' | 'line' | 'area' | 'baseline' | 'heikin-ashi';

export type IndicatorKind =
  | 'SMA'
  | 'EMA'
  | 'BB'
  | 'VOLUME'
  | 'RSI'
  | 'MACD'
  | 'ATR'
  | 'CMF'
  | 'STOCH'
  | 'WILLIAMS_R'
  | 'ADX'
  | 'OBV';

export type IndicatorConfig = {
  id: string;
  kind: IndicatorKind;
  period?: number;
  stdDev?: number;
  fast?: number;
  slow?: number;
  signal?: number;
  visible?: boolean;
  color?: string;
};

export type IndicatorMeta = {
  kind: IndicatorKind;
  name: string;
  category: 'Trend' | 'Momentum' | 'Volatility' | 'Volume / Flow';
  pane: 'overlay' | 'oscillator';
  description: string;
};

export const INDICATOR_LIBRARY: IndicatorMeta[] = [
  { kind: 'SMA', name: 'Simple Moving Average', category: 'Trend', pane: 'overlay', description: 'Rata-rata harga penutupan sederhana.' },
  { kind: 'EMA', name: 'Exponential Moving Average', category: 'Trend', pane: 'overlay', description: 'Rata-rata bergerak dengan bobot lebih besar pada harga terbaru.' },
  { kind: 'BB', name: 'Bollinger Bands', category: 'Volatility', pane: 'overlay', description: 'Band volatilitas berbasis SMA dan standar deviasi.' },
  { kind: 'VOLUME', name: 'Volume', category: 'Volume / Flow', pane: 'oscillator', description: 'Volume transaksi dari OHLCV server.' },
  { kind: 'RSI', name: 'Relative Strength Index', category: 'Momentum', pane: 'oscillator', description: 'Momentum 0-100 dengan Wilder smoothing.' },
  { kind: 'MACD', name: 'MACD', category: 'Momentum', pane: 'oscillator', description: 'EMA cepat vs lambat beserta signal line dan histogram.' },
  { kind: 'ATR', name: 'Average True Range', category: 'Volatility', pane: 'oscillator', description: 'Volatilitas berbasis true range dengan Wilder smoothing.' },
  { kind: 'CMF', name: 'Chaikin Money Flow', category: 'Volume / Flow', pane: 'oscillator', description: 'Proxy tekanan akumulasi/distribusi dari harga dan volume.' },
  { kind: 'STOCH', name: 'Stochastic Oscillator', category: 'Momentum', pane: 'oscillator', description: '%K/%D dari posisi harga dalam range High-Low, Slow Stochastic baku (14,3,3).' },
  { kind: 'WILLIAMS_R', name: 'Williams %R', category: 'Momentum', pane: 'oscillator', description: 'Posisi harga dalam range, skala 0 s/d -100 (kebalikan Stochastic).' },
  { kind: 'ADX', name: 'ADX / DMI', category: 'Trend', pane: 'oscillator', description: 'Kekuatan tren (ADX) beserta arah +DI/-DI, Wilder smoothing.' },
  { kind: 'OBV', name: 'On-Balance Volume', category: 'Volume / Flow', pane: 'oscillator', description: 'Volume kumulatif terarah - naik saat harga naik, turun saat harga turun.' },
];

export const DEFAULT_INDICATORS: IndicatorConfig[] = [
  { id: 'sma-20', kind: 'SMA', period: 20, visible: true, color: '#10b981' },
  { id: 'sma-50', kind: 'SMA', period: 50, visible: true, color: '#38bdf8' },
  { id: 'sma-200', kind: 'SMA', period: 200, visible: true, color: '#f59e0b' },
  { id: 'volume', kind: 'VOLUME', visible: true, color: '#6366f1' },
];

export function isOscillatorKind(kind: IndicatorKind): boolean {
  return INDICATOR_LIBRARY.find((item) => item.kind === kind)?.pane === 'oscillator';
}

export function indicatorLabel(indicator: IndicatorConfig): string {
  switch (indicator.kind) {
    case 'SMA': return `SMA ${indicator.period ?? 20}`;
    case 'EMA': return `EMA ${indicator.period ?? 20}`;
    case 'BB': return `BB ${indicator.period ?? 20} (${indicator.stdDev ?? 2}σ)`;
    case 'RSI': return `RSI ${indicator.period ?? 14}`;
    case 'MACD': return `MACD (${indicator.fast ?? 12},${indicator.slow ?? 26},${indicator.signal ?? 9})`;
    case 'ATR': return `ATR ${indicator.period ?? 14}`;
    case 'CMF': return `CMF ${indicator.period ?? 20}`;
    case 'STOCH': return `Stoch (${indicator.period ?? 14},3,3)`;
    case 'WILLIAMS_R': return `Williams %R ${indicator.period ?? 14}`;
    case 'ADX': return `ADX ${indicator.period ?? 14}`;
    case 'OBV': return 'OBV';
    case 'VOLUME': return 'Volume';
  }
}

export function finiteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function mean(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function stdDev(values: number[]): number {
  if (values.length === 0) return 0;
  const avg = mean(values);
  return Math.sqrt(values.reduce((sum, value) => sum + (value - avg) ** 2, 0) / values.length);
}

// ---------------------------------------------------------------------------
// Heikin-Ashi Transform
// ---------------------------------------------------------------------------
export function heikinAshi(candles: ChartCandle[]): ChartCandle[] {
  if (candles.length === 0) return [];
  const out: ChartCandle[] = [];
  for (let i = 0; i < candles.length; i += 1) {
    const candle = candles[i];
    const close = (candle.open + candle.high + candle.low + candle.close) / 4;
    const open = i === 0
      ? (candle.open + candle.close) / 2
      : (out[i - 1].open + out[i - 1].close) / 2;
    out.push({
      ...candle,
      open,
      close,
      high: Math.max(candle.high, open, close),
      low: Math.min(candle.low, open, close),
    });
  }
  return out;
}

// ---------------------------------------------------------------------------
// Moving Averages (SMA / EMA)
// ---------------------------------------------------------------------------
export function smaSeries(candles: ChartCandle[], period: number): Array<number | null> {
  const safePeriod = Math.max(1, Math.floor(period));
  const out: Array<number | null> = Array(candles.length).fill(null);
  let sum = 0;
  for (let i = 0; i < candles.length; i += 1) {
    sum += candles[i].close;
    if (i >= safePeriod) sum -= candles[i - safePeriod].close;
    if (i >= safePeriod - 1) out[i] = sum / safePeriod;
  }
  return out;
}

export function emaValues(values: number[], period: number): Array<number | null> {
  const safePeriod = Math.max(1, Math.floor(period));
  const out: Array<number | null> = Array(values.length).fill(null);
  if (values.length < safePeriod) return out;
  const seed = mean(values.slice(0, safePeriod));
  out[safePeriod - 1] = seed;
  const multiplier = 2 / (safePeriod + 1);
  let previous = seed;
  for (let i = safePeriod; i < values.length; i += 1) {
    previous = values[i] * multiplier + previous * (1 - multiplier);
    out[i] = previous;
  }
  return out;
}

export function emaSeries(candles: ChartCandle[], period: number): Array<number | null> {
  return emaValues(candles.map((candle) => candle.close), period);
}

// ---------------------------------------------------------------------------
// Bollinger Bands
// ---------------------------------------------------------------------------
export function bollingerSeries(candles: ChartCandle[], period: number, deviation: number) {
  const safePeriod = Math.max(2, Math.floor(period));
  const safeDeviation = Math.max(0.1, deviation);
  const middle = smaSeries(candles, safePeriod);
  const upper: Array<number | null> = Array(candles.length).fill(null);
  const lower: Array<number | null> = Array(candles.length).fill(null);
  for (let i = safePeriod - 1; i < candles.length; i += 1) {
    const window = candles.slice(i - safePeriod + 1, i + 1).map((candle) => candle.close);
    const sd = stdDev(window);
    const mid = middle[i];
    if (mid != null) {
      upper[i] = mid + safeDeviation * sd;
      lower[i] = mid - safeDeviation * sd;
    }
  }
  return { middle, upper, lower };
}

// ---------------------------------------------------------------------------
// Wilder RSI
// ---------------------------------------------------------------------------
export function rsiSeries(candles: ChartCandle[], period = 14): Array<number | null> {
  const safePeriod = Math.max(2, Math.floor(period));
  const out: Array<number | null> = Array(candles.length).fill(null);
  if (candles.length <= safePeriod) return out;

  let gains = 0;
  let losses = 0;
  for (let i = 1; i <= safePeriod; i += 1) {
    const diff = candles[i].close - candles[i - 1].close;
    if (diff >= 0) gains += diff;
    else losses -= diff;
  }
  let avgGain = gains / safePeriod;
  let avgLoss = losses / safePeriod;

  const toRsi = () => {
    if (avgLoss === 0) return 100;
    const rs = avgGain / avgLoss;
    return 100 - 100 / (1 + rs);
  };

  out[safePeriod] = toRsi();
  for (let i = safePeriod + 1; i < candles.length; i += 1) {
    const diff = candles[i].close - candles[i - 1].close;
    const gain = Math.max(diff, 0);
    const loss = Math.max(-diff, 0);
    avgGain = (avgGain * (safePeriod - 1) + gain) / safePeriod;
    avgLoss = (avgLoss * (safePeriod - 1) + loss) / safePeriod;
    out[i] = toRsi();
  }
  return out;
}

// ---------------------------------------------------------------------------
// MACD
// ---------------------------------------------------------------------------
export function macdSeries(candles: ChartCandle[], fast = 12, slow = 26, signal = 9) {
  const closes = candles.map((candle) => candle.close);
  const fastValues = emaValues(closes, Math.max(2, fast));
  const slowValues = emaValues(closes, Math.max(fast + 1, slow));
  const macd: Array<number | null> = closes.map((_, index) => {
    const f = fastValues[index];
    const s = slowValues[index];
    return f != null && s != null ? f - s : null;
  });

  const macdIndexes: number[] = [];
  const denseMacd: number[] = [];
  macd.forEach((value, index) => {
    if (value != null && finiteNumber(value)) {
      macdIndexes.push(index);
      denseMacd.push(value);
    }
  });

  const denseSignal = emaValues(denseMacd, Math.max(2, signal));
  const signalLine: Array<number | null> = Array(candles.length).fill(null);
  denseSignal.forEach((value, denseIndex) => {
    if (value != null) signalLine[macdIndexes[denseIndex]] = value;
  });

  const histogram = macd.map((value, index) =>
    value != null && signalLine[index] != null ? value - (signalLine[index] as number) : null
  );

  return { macd, signal: signalLine, histogram };
}

// ---------------------------------------------------------------------------
// True Range & Wilder ATR
// ---------------------------------------------------------------------------
export function trueRangeAt(bars: { high: number; low: number; close: number }[], i: number): number | null {
  const curr = bars[i];
  const prev = bars[i - 1];
  if (!curr || !prev) return null;
  const tr = Math.max(
    curr.high - curr.low,
    Math.abs(curr.high - prev.close),
    Math.abs(curr.low - prev.close)
  );
  return Number.isFinite(tr) && tr >= 0 ? tr : null;
}

export function calculateWilderAtr(
  bars: { high: number; low: number; close: number }[],
  period = 14
): number | null {
  if (!Array.isArray(bars) || bars.length < period + 1) return null;

  const trueRanges: number[] = [];
  for (let i = 1; i < bars.length; i++) {
    const tr = trueRangeAt(bars, i);
    if (tr != null) trueRanges.push(tr);
  }
  if (trueRanges.length < period) return null;

  let atr = trueRanges.slice(0, period).reduce((sum, tr) => sum + tr, 0) / period;
  for (let i = period; i < trueRanges.length; i++) {
    atr = (atr * (period - 1) + trueRanges[i]!) / period;
  }
  return Number.isFinite(atr) && atr > 0 ? atr : null;
}

export function atrSeries(candles: ChartCandle[], period = 14): Array<number | null> {
  const safePeriod = Math.max(2, Math.floor(period));
  const out: Array<number | null> = Array(candles.length).fill(null);
  if (candles.length < safePeriod + 1) return out;

  const trueRanges: number[] = [];
  for (let i = 1; i < candles.length; i += 1) {
    const previousClose = candles[i - 1].close;
    trueRanges.push(
      Math.max(
        candles[i].high - candles[i].low,
        Math.abs(candles[i].high - previousClose),
        Math.abs(candles[i].low - previousClose)
      )
    );
  }

  let atr = mean(trueRanges.slice(0, safePeriod));
  out[safePeriod] = atr;
  for (let i = safePeriod; i < trueRanges.length; i += 1) {
    atr = (atr * (safePeriod - 1) + trueRanges[i]) / safePeriod;
    out[i + 1] = atr;
  }
  return out;
}

// ---------------------------------------------------------------------------
// Stochastic Slow (14, 3, 3)
// ---------------------------------------------------------------------------
export function calculateStochastic(
  bars: { high: number; low: number; close: number }[],
  period = 14,
  smoothK = 3,
  periodD = 3
): { k: number; d: number } | null {
  if (!Array.isArray(bars) || bars.length < period + smoothK + periodD - 2) return null;

  const rawK: Array<number | null> = [];
  for (let i = period - 1; i < bars.length; i++) {
    const window = bars.slice(i - period + 1, i + 1);
    const highest = Math.max(...window.map((b) => b.high));
    const lowest = Math.min(...window.map((b) => b.low));
    const range = highest - lowest;
    rawK.push(range > 0 ? ((bars[i]!.close - lowest) / range) * 100 : null);
  }
  if (rawK.length < smoothK + periodD - 1) return null;

  const slowK: Array<number | null> = [];
  for (let i = smoothK - 1; i < rawK.length; i++) {
    const window = rawK.slice(i - smoothK + 1, i + 1);
    slowK.push(window.every((v): v is number => v != null) ? mean(window as number[]) : null);
  }
  if (slowK.length < periodD) return null;

  const k = slowK[slowK.length - 1];
  const dWindow = slowK.slice(-periodD);
  if (k == null || !dWindow.every((v): v is number => v != null)) return null;
  const d = mean(dWindow as number[]);
  if (!Number.isFinite(k) || !Number.isFinite(d)) return null;
  return { k, d };
}

export function stochasticSeries(candles: ChartCandle[], period = 14): { k: Array<number | null>; d: Array<number | null> } {
  const safePeriod = Math.max(2, Math.floor(period));
  const k: Array<number | null> = Array(candles.length).fill(null);
  const d: Array<number | null> = Array(candles.length).fill(null);
  const bars = candles.map((c) => ({ high: c.high, low: c.low, close: c.close }));
  for (let i = 0; i < candles.length; i += 1) {
    const result = calculateStochastic(bars.slice(0, i + 1), safePeriod);
    if (result) {
      k[i] = result.k;
      d[i] = result.d;
    }
  }
  return { k, d };
}

// ---------------------------------------------------------------------------
// Williams %R (14)
// ---------------------------------------------------------------------------
export function calculateWilliamsR(
  bars: { high: number; low: number; close: number }[],
  period = 14
): number | null {
  if (!Array.isArray(bars) || bars.length < period) return null;
  const window = bars.slice(-period);
  const highest = Math.max(...window.map((b) => b.high));
  const lowest = Math.min(...window.map((b) => b.low));
  const range = highest - lowest;
  const close = bars[bars.length - 1]!.close;

  if (!Number.isFinite(highest) || !Number.isFinite(lowest) || !Number.isFinite(close)) return null;
  if (range <= 0) return null;

  const value = ((highest - close) / range) * -100;
  return Number.isFinite(value) ? value : null;
}

export function williamsRSeries(candles: ChartCandle[], period = 14): Array<number | null> {
  const safePeriod = Math.max(2, Math.floor(period));
  const bars = candles.map((c) => ({ high: c.high, low: c.low, close: c.close }));
  const out: Array<number | null> = Array(candles.length).fill(null);
  for (let i = safePeriod - 1; i < candles.length; i += 1) {
    out[i] = calculateWilliamsR(bars.slice(0, i + 1), safePeriod);
  }
  return out;
}

// ---------------------------------------------------------------------------
// ADX / DMI
// ---------------------------------------------------------------------------
export function calculateAdx(
  bars: { high: number; low: number; close: number }[],
  period = 14
): { adx: number; plusDi: number; minusDi: number } | null {
  if (!Array.isArray(bars) || bars.length < 2 * period) return null;

  const plusDmArr: number[] = [];
  const minusDmArr: number[] = [];
  const trArr: number[] = [];
  for (let i = 1; i < bars.length; i++) {
    const upMove = bars[i]!.high - bars[i - 1]!.high;
    const downMove = bars[i - 1]!.low - bars[i]!.low;
    const tr = trueRangeAt(bars, i);
    if (tr == null || !Number.isFinite(upMove) || !Number.isFinite(downMove)) return null;
    plusDmArr.push(upMove > downMove && upMove > 0 ? upMove : 0);
    minusDmArr.push(downMove > upMove && downMove > 0 ? downMove : 0);
    trArr.push(tr);
  }
  if (trArr.length < period) return null;

  let smoothedTR = trArr.slice(0, period).reduce((sum, v) => sum + v, 0);
  let smoothedPlusDM = plusDmArr.slice(0, period).reduce((sum, v) => sum + v, 0);
  let smoothedMinusDM = minusDmArr.slice(0, period).reduce((sum, v) => sum + v, 0);

  function diAt(trSum: number, plusDmSum: number, minusDmSum: number): { plusDi: number; minusDi: number; dx: number } | null {
    if (!(trSum > 0)) return null;
    const plusDi = (100 * plusDmSum) / trSum;
    const minusDi = (100 * minusDmSum) / trSum;
    const total = plusDi + minusDi;
    if (!(total > 0)) return null;
    const dx = (100 * Math.abs(plusDi - minusDi)) / total;
    return { plusDi, minusDi, dx };
  }

  const dxSeries: number[] = [];
  let lastDi = diAt(smoothedTR, smoothedPlusDM, smoothedMinusDM);
  if (lastDi == null) return null;
  dxSeries.push(lastDi.dx);

  for (let j = period; j < trArr.length; j++) {
    smoothedTR = smoothedTR - smoothedTR / period + trArr[j]!;
    smoothedPlusDM = smoothedPlusDM - smoothedPlusDM / period + plusDmArr[j]!;
    smoothedMinusDM = smoothedMinusDM - smoothedMinusDM / period + minusDmArr[j]!;
    const di = diAt(smoothedTR, smoothedPlusDM, smoothedMinusDM);
    if (di == null) return null;
    lastDi = di;
    dxSeries.push(di.dx);
  }

  if (dxSeries.length < period) return null;

  let adx = dxSeries.slice(0, period).reduce((sum, v) => sum + v, 0) / period;
  for (let j = period; j < dxSeries.length; j++) {
    adx = (adx * (period - 1) + dxSeries[j]!) / period;
  }

  if (!Number.isFinite(adx) || !Number.isFinite(lastDi.plusDi) || !Number.isFinite(lastDi.minusDi)) return null;
  return { adx, plusDi: lastDi.plusDi, minusDi: lastDi.minusDi };
}

export function adxSeries(candles: ChartCandle[], period = 14): { adx: Array<number | null>; plusDi: Array<number | null>; minusDi: Array<number | null> } {
  const safePeriod = Math.max(2, Math.floor(period));
  const bars = candles.map((c) => ({ high: c.high, low: c.low, close: c.close }));
  const adx: Array<number | null> = Array(candles.length).fill(null);
  const plusDi: Array<number | null> = Array(candles.length).fill(null);
  const minusDi: Array<number | null> = Array(candles.length).fill(null);
  for (let i = 2 * safePeriod - 1; i < candles.length; i += 1) {
    const result = calculateAdx(bars.slice(0, i + 1), safePeriod);
    if (result) {
      adx[i] = result.adx;
      plusDi[i] = result.plusDi;
      minusDi[i] = result.minusDi;
    }
  }
  return { adx, plusDi, minusDi };
}

// ---------------------------------------------------------------------------
// Chaikin Money Flow (CMF)
// ---------------------------------------------------------------------------
export function cmfSeries(candles: ChartCandle[], period = 20): Array<number | null> {
  const safePeriod = Math.max(2, Math.floor(period));
  const out: Array<number | null> = Array(candles.length).fill(null);
  const mfv = candles.map((candle) => {
    const range = candle.high - candle.low;
    if (range === 0 || candle.volume <= 0) return 0;
    const multiplier = (candle.close - candle.low - (candle.high - candle.close)) / range;
    return multiplier * candle.volume;
  });
  let flowSum = 0;
  let volumeSum = 0;
  for (let i = 0; i < candles.length; i += 1) {
    flowSum += mfv[i];
    volumeSum += candles[i].volume;
    if (i >= safePeriod) {
      flowSum -= mfv[i - safePeriod];
      volumeSum -= candles[i - safePeriod].volume;
    }
    if (i >= safePeriod - 1) out[i] = volumeSum > 0 ? flowSum / volumeSum : null;
  }
  return out;
}

// ---------------------------------------------------------------------------
// On-Balance Volume (OBV)
// ---------------------------------------------------------------------------
export function calculateObvSeries(bars: { close: number; volume: number }[]): number[] | null {
  if (!Array.isArray(bars) || bars.length === 0) return null;
  if (bars.some((b) => !Number.isFinite(b?.close) || !Number.isFinite(b?.volume))) return null;
  const out: number[] = [0];
  for (let i = 1; i < bars.length; i++) {
    const prev = out[i - 1]!;
    const curr = bars[i]!;
    const prior = bars[i - 1]!;
    if (curr.close > prior.close) out.push(prev + curr.volume);
    else if (curr.close < prior.close) out.push(prev - curr.volume);
    else out.push(prev);
  }
  return out;
}

export function obvSeries(candles: ChartCandle[]): Array<number | null> {
  const bars = candles.map((c) => ({ close: c.close, volume: c.volume }));
  const obv = calculateObvSeries(bars);
  if (!obv) return Array(candles.length).fill(null);
  return obv;
}

export function latestFinite(values: Array<number | null>): number | null {
  for (let i = values.length - 1; i >= 0; i -= 1) {
    if (values[i] != null && finiteNumber(values[i])) return values[i] as number;
  }
  return null;
}
