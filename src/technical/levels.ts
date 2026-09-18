import { calculateWilderAtr, type ChartCandle } from './indicators.ts';

export type PivotMethod = 'CLASSIC' | 'FIBONACCI' | 'CAMARILLA';

export interface PivotLevels {
  method: PivotMethod;
  pp: number;
  r1: number;
  r2: number;
  r3: number;
  s1: number;
  s2: number;
  s3: number;
}

export interface Range52Week {
  high52w: number;
  low52w: number;
  currentPrice: number;
  positionPct: number; // 0% at 52w low, 100% at 52w high
}

export type TrendStatus = 'BULLISH' | 'BEARISH' | 'NEUTRAL' | 'NA';

export interface TimeframeTrend {
  timeframe: 'SHORT_TERM' | 'MEDIUM_TERM' | 'LONG_TERM';
  label: string;
  status: TrendStatus;
  detail: string;
  benchmark: string;
}

export interface CandlestickPattern {
  id: string;
  name: string;
  sentiment: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
  description: string;
  reliability: 'HIGH' | 'MEDIUM' | 'LOW';
  volumeConfirmed: boolean;
}

export interface TradingPlan {
  currentPrice: number;
  atr14: number;
  entryZone: [number, number]; // [support, currentPrice]
  stopLoss: number;
  riskAmount: number;
  riskPct: number;
  targetPrice1: number;
  targetPrice2: number;
  rewardPct1: number;
  rewardPct2: number;
  riskRewardRatio: string; // e.g. "1 : 2.5"
  bias: 'BULLISH_SETUP' | 'BEARISH_SETUP' | 'RANGE_BOUND';
}

export interface TechnicalSuiteResult {
  currentPrice: number;
  pivots: Record<PivotMethod, PivotLevels>;
  range52w: Range52Week | null;
  trends: TimeframeTrend[];
  patterns: CandlestickPattern[];
  tradingPlan: TradingPlan | null;
  dataQuality: {
    latestObservationPartial: boolean;
    latestOpenEstimated: boolean;
    patternAsOf: string | null;
    atrAsOf: string | null;
  };
}

/**
 * Calculate Pivot Points for Classic, Fibonacci, and Camarilla methods.
 * Retains 2 decimal places to avoid identical rounded integers on low-priced tickers.
 */
export function calculatePivotPoints(high: number, low: number, close: number): Record<PivotMethod, PivotLevels> {
  const diff = high - low;
  const pp = (high + low + close) / 3;
  const round2 = (val: number) => Math.round(val * 100) / 100;

  const classic: PivotLevels = {
    method: 'CLASSIC',
    pp: round2(pp),
    r1: round2(2 * pp - low),
    r2: round2(pp + diff),
    r3: round2(high + 2 * (pp - low)),
    s1: round2(2 * pp - high),
    s2: round2(pp - diff),
    s3: round2(low - 2 * (high - pp)),
  };

  const fibonacci: PivotLevels = {
    method: 'FIBONACCI',
    pp: round2(pp),
    r1: round2(pp + 0.382 * diff),
    r2: round2(pp + 0.618 * diff),
    r3: round2(pp + 1.0 * diff),
    s1: round2(pp - 0.382 * diff),
    s2: round2(pp - 0.618 * diff),
    s3: round2(pp - 1.0 * diff),
  };

  const camarilla: PivotLevels = {
    method: 'CAMARILLA',
    pp: round2(pp),
    r1: round2(close + diff * (1.1 / 12)),
    r2: round2(close + diff * (1.1 / 6)),
    r3: round2(close + diff * (1.1 / 4)),
    s1: round2(close - diff * (1.1 / 12)),
    s2: round2(close - diff * (1.1 / 6)),
    s3: round2(close - diff * (1.1 / 4)),
  };

  return {
    CLASSIC: classic,
    FIBONACCI: fibonacci,
    CAMARILLA: camarilla,
  };
}

export function calculate52WeekRange(candles: ChartCandle[]): Range52Week | null {
  if (!candles || candles.length === 0) return null;
  const windowCandles = candles.slice(-250);
  if (windowCandles.length === 0) return null;

  let high52w = -Infinity;
  let low52w = Infinity;

  for (const c of windowCandles) {
    if (c.high > high52w) high52w = c.high;
    if (c.low < low52w) low52w = c.low;
  }

  const currentPrice = windowCandles[windowCandles.length - 1].close;
  const spread = high52w - low52w;
  const positionPct = spread > 0 ? Math.round(((currentPrice - low52w) / spread) * 100) : 50;

  return {
    high52w,
    low52w,
    currentPrice,
    positionPct: Math.min(100, Math.max(0, positionPct)),
  };
}

function calculateSMA(data: number[], period: number): number | null {
  if (data.length < period) return null;
  const slice = data.slice(-period);
  const sum = slice.reduce((a, b) => a + b, 0);
  return sum / period;
}

function calculateEMA(data: number[], period: number): number | null {
  if (data.length < period) return null;
  const k = 2 / (period + 1);
  let ema = data.slice(0, period).reduce((a, b) => a + b, 0) / period;
  for (let i = period; i < data.length; i++) {
    ema = data[i] * k + ema * (1 - k);
  }
  return ema;
}

export function calculateMultiTimeframeTrends(candles: ChartCandle[]): TimeframeTrend[] {
  if (!candles || candles.length < 20) return [];
  const closes = candles.map((c) => c.close);
  const currentPrice = closes[closes.length - 1];

  const ema20 = calculateEMA(closes, 20);
  const ma50 = calculateSMA(closes, 50);
  const ma100 = calculateSMA(closes, 100);
  const ma200 = calculateSMA(closes, 200);

  const shortStatus: TrendStatus =
    ema20 != null
      ? currentPrice > ema20 * 1.005
        ? 'BULLISH'
        : currentPrice < ema20 * 0.995
        ? 'BEARISH'
        : 'NEUTRAL'
      : 'NA';

  const medStatus: TrendStatus =
    ma50 != null && ma100 != null
      ? ma50 > ma100
        ? 'BULLISH'
        : ma50 < ma100
        ? 'BEARISH'
        : 'NEUTRAL'
      : ma50 != null
      ? currentPrice > ma50
        ? 'BULLISH'
        : 'BEARISH'
      : 'NA';

  const longStatus: TrendStatus =
    ma200 != null
      ? currentPrice > ma200 * 1.01
        ? 'BULLISH'
        : currentPrice < ma200 * 0.99
        ? 'BEARISH'
        : 'NEUTRAL'
      : 'NA';

  return [
    {
      timeframe: 'SHORT_TERM',
      label: 'Jangka Pendek (Daily)',
      status: shortStatus,
      detail:
        ema20 != null
          ? `Harga Rp ${currentPrice.toLocaleString('id-ID')} ${currentPrice >= ema20 ? 'di atas' : 'di bawah'} EMA 20 (Rp ${Math.round(ema20).toLocaleString('id-ID')})`
          : 'Data belum cukup',
      benchmark: 'EMA 20 Momentum',
    },
    {
      timeframe: 'MEDIUM_TERM',
      label: 'Jangka Menengah (Swing)',
      status: medStatus,
      detail:
        ma50 != null && ma100 != null
          ? `MA 50 (Rp ${Math.round(ma50).toLocaleString('id-ID')}) ${ma50 >= ma100 ? 'Golden Cross di atas' : 'Death Cross di bawah'} MA 100`
          : ma50 != null
          ? `Harga vs MA 50 (Rp ${Math.round(ma50).toLocaleString('id-ID')})`
          : 'Data belum cukup',
      benchmark: 'MA 50 / MA 100 Cross',
    },
    {
      timeframe: 'LONG_TERM',
      label: 'Jangka Panjang (Struktural)',
      status: longStatus,
      detail:
        ma200 != null
          ? `Harga ${currentPrice >= ma200 ? 'berada di zona Bullish di atas' : 'berada di zona Bearish di bawah'} MA 200 (Rp ${Math.round(ma200).toLocaleString('id-ID')})`
          : 'Data < 200 hari bursa',
      benchmark: 'MA 200 Institutional Line',
    },
  ];
}

function isCompletedPatternCandle(candle: ChartCandle): boolean {
  return (
    candle.sessionStatus !== 'PARTIAL' &&
    candle.openEstimated !== true &&
    Number.isFinite(candle.open) &&
    Number.isFinite(candle.high) &&
    Number.isFinite(candle.low) &&
    Number.isFinite(candle.close) &&
    candle.open > 0 &&
    candle.high >= candle.low &&
    candle.close > 0
  );
}

export function detectCandlestickPatterns(candles: ChartCandle[]): CandlestickPattern[] {
  const completed = candles.filter(isCompletedPatternCandle);
  if (completed.length < 3) return [];
  const patterns: CandlestickPattern[] = [];

  const c0 = completed[completed.length - 1]!;
  const c1 = completed[completed.length - 2]!;
  const c2 = completed[completed.length - 3]!;

  const recentVolumes = completed.slice(-21, -1).map((c) => c.volume);
  const hasVolumeBaseline = recentVolumes.length === 20 && recentVolumes.every((v) => Number.isFinite(v) && v >= 0);
  const avgVol = hasVolumeBaseline ? recentVolumes.reduce((a, b) => a + b, 0) / 20 : null;
  const isHighVolume = avgVol != null && avgVol > 0 && Number.isFinite(c0.volume) && c0.volume > avgVol * 1.15;

  const body0 = Math.abs(c0.close - c0.open);
  const range0 = c0.high - c0.low;
  if (!Number.isFinite(range0) || range0 <= 0) return [];
  const isBullish0 = c0.close > c0.open;
  const isBearish0 = c0.close < c0.open;

  const body1 = Math.abs(c1.close - c1.open);
  const range1 = c1.high - c1.low;
  const isBullish1 = c1.close > c1.open;
  const isBearish1 = c1.close < c1.open;

  const upperWick0 = c0.high - Math.max(c0.open, c0.close);
  const lowerWick0 = Math.min(c0.open, c0.close) - c0.low;

  // 1. Bullish Engulfing
  if (isBearish1 && isBullish0 && c0.open <= c1.close && c0.close >= c1.open && body0 > body1 * 1.05) {
    patterns.push({
      id: 'BULLISH_ENGULFING',
      name: 'Bullish Engulfing',
      sentiment: 'BULLISH',
      description: 'Candle hijau membungkus candle merah sebelumnya; tekanan beli mulai mendominasi.',
      reliability: 'HIGH',
      volumeConfirmed: isHighVolume,
    });
  }

  // 2. Bearish Engulfing
  if (isBullish1 && isBearish0 && c0.open >= c1.close && c0.close <= c1.open && body0 > body1 * 1.05) {
    patterns.push({
      id: 'BEARISH_ENGULFING',
      name: 'Bearish Engulfing',
      sentiment: 'BEARISH',
      description: 'Candle merah membungkus candle hijau sebelumnya; tekanan jual mulai mendominasi.',
      reliability: 'HIGH',
      volumeConfirmed: isHighVolume,
    });
  }

  // 3. Hammer (Bullish Pinbar)
  if (lowerWick0 >= body0 * 2.0 && upperWick0 <= range0 * 0.15 && body0 / range0 >= 0.15) {
    patterns.push({
      id: 'HAMMER',
      name: 'Hammer / Pinbar Bullish',
      sentiment: 'BULLISH',
      description: 'Ekor bawah panjang konsisten dengan rejection area bawah.',
      reliability: 'MEDIUM',
      volumeConfirmed: isHighVolume,
    });
  }

  // 4. Shooting Star (Bearish Pinbar)
  if (upperWick0 >= body0 * 2.0 && lowerWick0 <= range0 * 0.15 && body0 / range0 >= 0.15) {
    patterns.push({
      id: 'SHOOTING_STAR',
      name: 'Shooting Star / Bearish Rejection',
      sentiment: 'BEARISH',
      description: 'Ekor atas panjang konsisten dengan rejection area atas.',
      reliability: 'MEDIUM',
      volumeConfirmed: isHighVolume,
    });
  }

  // 5. Morning Star
  if (isBearish1 && isBullish0 && body1 > range1 * 0.4 && c0.close >= c1.open * 0.98) {
    if (c2.close < c2.open) {
      patterns.push({
        id: 'MORNING_STAR',
        name: 'Morning Star Pattern',
        sentiment: 'BULLISH',
        description: 'Formasi 3 candle konsisten dengan skenario bullish reversal.',
        reliability: 'HIGH',
        volumeConfirmed: isHighVolume,
      });
    }
  }

  // 6. Doji
  if (body0 / range0 <= 0.08) {
    patterns.push({
      id: 'DOJI',
      name: 'Doji (Konsolidasi / Ragu)',
      sentiment: 'NEUTRAL',
      description: 'Badan sangat tipis menunjukkan keraguan / konsolidasi pada sesi.',
      reliability: 'LOW',
      volumeConfirmed: isHighVolume,
    });
  }

  // 7. Bullish Marubozu
  if (isBullish0 && body0 / range0 >= 0.85 && body0 > 0) {
    patterns.push({
      id: 'BULLISH_MARUBOZU',
      name: 'Bullish Marubozu (Full Body)',
      sentiment: 'BULLISH',
      description: 'Badan hijau penuh dengan ekor minimal mencerminkan dorongan beli agresif.',
      reliability: 'HIGH',
      volumeConfirmed: isHighVolume,
    });
  }

  return patterns;
}

export function calculateTradingPlan(
  candles: ChartCandle[],
  pivots: Record<PivotMethod, PivotLevels>,
  currentPriceOverride?: number
): TradingPlan | null {
  const completed = candles.filter((c) => c.sessionStatus !== 'PARTIAL');
  if (completed.length < 15) return null; // Wilder ATR requires at least 15 bars

  const currentPrice =
    Number.isFinite(currentPriceOverride) && (currentPriceOverride ?? 0) > 0
      ? currentPriceOverride!
      : completed[completed.length - 1].close;

  const atr = calculateWilderAtr(completed, 14);
  if (atr == null || !Number.isFinite(atr) || atr <= 0) return null;
  const atr14 = Math.round(atr);

  const classic = pivots.CLASSIC;
  const s1 = classic.s1;
  const r1 = classic.r1;
  const r2 = classic.r2;

  // Suggested stop loss below nearest support with 1.25x ATR buffer
  const stopLoss = Math.max(1, Math.round(Math.min(s1, currentPrice - 1.25 * atr14)));
  const riskAmount = Math.max(1, currentPrice - stopLoss);
  const riskPct = Math.round((riskAmount / currentPrice) * 1000) / 10;

  // Target 1 = Current + 2x Risk or R1
  const targetPrice1 = Math.round(Math.max(r1, currentPrice + 2 * riskAmount));
  const rewardPct1 = Math.round(((targetPrice1 - currentPrice) / currentPrice) * 1000) / 10;

  // Target 2 = Current + 3x Risk or R2
  const targetPrice2 = Math.round(Math.max(r2, currentPrice + 3 * riskAmount));
  const rewardPct2 = Math.round(((targetPrice2 - currentPrice) / currentPrice) * 1000) / 10;

  const actualRatio = riskAmount > 0 ? (rewardPct1 / riskPct).toFixed(1) : '2.0';

  let bias: TradingPlan['bias'] = 'BULLISH_SETUP';
  if (currentPrice < classic.pp && currentPrice < s1) {
    bias = 'BEARISH_SETUP';
  } else if (Math.abs(currentPrice - classic.pp) / currentPrice < 0.01) {
    bias = 'RANGE_BOUND';
  }

  return {
    currentPrice,
    atr14,
    entryZone: [s1, currentPrice],
    stopLoss,
    riskAmount,
    riskPct,
    targetPrice1,
    targetPrice2,
    rewardPct1,
    rewardPct2,
    riskRewardRatio: `1 : ${actualRatio}`,
    bias,
  };
}

export function buildTechnicalSuite(candles: ChartCandle[]): TechnicalSuiteResult | null {
  if (!candles || candles.length < 5) return null;
  const latest = candles[candles.length - 1]!;
  const completed = candles.filter((c) => c.sessionStatus !== 'PARTIAL');
  if (completed.length < 2) return null;

  const pivotBase = latest.sessionStatus === 'PARTIAL' ? completed[completed.length - 1]! : completed[completed.length - 2]!;
  const pivots = calculatePivotPoints(pivotBase.high, pivotBase.low, pivotBase.close);
  const range52w = calculate52WeekRange(candles);
  const trends = calculateMultiTimeframeTrends(candles);
  const patterns = detectCandlestickPatterns(candles);
  const tradingPlan = calculateTradingPlan(candles, pivots, latest.close);
  const completedPatternCandles = completed.filter(isCompletedPatternCandle);
  const patternBase = completedPatternCandles.length > 0 ? completedPatternCandles[completedPatternCandles.length - 1] : null;

  return {
    currentPrice: latest.close,
    pivots,
    range52w,
    trends,
    patterns,
    tradingPlan,
    dataQuality: {
      latestObservationPartial: latest.sessionStatus === 'PARTIAL',
      latestOpenEstimated: latest.openEstimated === true,
      patternAsOf: patternBase?.time ?? null,
      atrAsOf: completed.length > 0 ? completed[completed.length - 1]?.time ?? null : null,
    },
  };
}
