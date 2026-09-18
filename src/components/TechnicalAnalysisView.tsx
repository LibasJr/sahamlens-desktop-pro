import React, { useEffect, useMemo, useState } from 'react';
import {
  Activity,
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  Bot,
  Compass,
  Layers,
  Percent,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  Target,
  TrendingDown,
  TrendingUp,
  Sliders,
} from 'lucide-react';
import { InteractiveChart } from './InteractiveChart';
import {
  buildTechnicalSuite,
  type PivotMethod,
  type TechnicalSuiteResult,
} from '../technical/levels';
import {
  DEFAULT_INDICATORS,
  INDICATOR_LIBRARY,
  type ChartCandle,
  type ChartType,
  type IndicatorConfig,
} from '../technical/indicators';
import { safeFetch } from '../api';
import { displayText, numericValue } from '../normalize';

interface TechnicalAnalysisViewProps {
  symbol: string;
  onSelectStock: (symbol: string) => void;
  onOpenAiChat: (prompt: string) => void;
}

const TIMEFRAMES = ['1D', '3D', '7D', '1M', '3M', '1Y', '10Y', 'ALL'];

export const TechnicalAnalysisView: React.FC<TechnicalAnalysisViewProps> = ({
  symbol,
  onSelectStock,
  onOpenAiChat,
}) => {
  const cleanTicker = symbol.replace(/\.JK$/i, '').toUpperCase();
  const [timeframe, setTimeframe] = useState('1Y');
  const [chartType, setChartType] = useState<ChartType>('candlestick');
  const [indicators, setIndicators] = useState<IndicatorConfig[]>(DEFAULT_INDICATORS);
  const [selectedPivotMethod, setSelectedPivotMethod] = useState<PivotMethod>('CLASSIC');
  const [isIndicatorMenuOpen, setIsIndicatorMenuOpen] = useState(false);

  // Data fetching state
  const [candles, setCandles] = useState<ChartCandle[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [companyName, setCompanyName] = useState<string>('');
  const [sector, setSector] = useState<string>('Ekuitas BEI');

  // Fetch chart data with AbortController and timeframe parameter
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError(null);

    const url = `/api/public-chart/${encodeURIComponent(cleanTicker)}?tf=${timeframe}`;
    safeFetch(url)
      .then(async (res) => {
        if (!res.ok) {
          throw new Error(`HTTP ${res.status}: Gagal memuat chart`);
        }
        return res.json();
      })
      .then((data) => {
        if (controller.signal.aborted) return;
        const history = Array.isArray(data?.history)
          ? data.history
          : Array.isArray(data)
          ? data
          : [];
        if (history.length === 0) {
          throw new Error('Data candle bursa tidak tersedia untuk timeframe ini');
        }

        const parsed: ChartCandle[] = history.map((h: any) => ({
          time: displayText(h.time || h.Date || h.date),
          open: numericValue(h.open ?? h.Open ?? h.close),
          high: numericValue(h.high ?? h.High ?? h.close),
          low: numericValue(h.low ?? h.Low ?? h.close),
          close: numericValue(h.close ?? h.Close),
          volume: numericValue(h.volume ?? h.Volume),
          sessionStatus: h.sessionStatus,
          openEstimated: h.openEstimated === true,
        }));

        setCandles(parsed);
      })
      .catch((err) => {
        if (!controller.signal.aborted) {
          setError(err.message || 'Gagal memuat data grafik');
          setCandles([]);
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      });

    return () => controller.abort();
  }, [cleanTicker, timeframe]);

  // Optionally fetch emiten metadata from /api/stock/[ticker]
  useEffect(() => {
    let active = true;
    safeFetch(`/api/stock/${cleanTicker}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!active || !data) return;
        const body = data.body || data;
        if (body?.companyName) setCompanyName(body.companyName);
        if (body?.profile?.sector) setSector(body.profile.sector);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [cleanTicker]);

  // Compute Technical Suite from loaded candles
  const suite: TechnicalSuiteResult | null = useMemo(() => {
    if (candles.length < 5) return null;
    return buildTechnicalSuite(candles);
  }, [candles]);

  const latestCandle = candles.length > 0 ? candles[candles.length - 1] : null;
  const prevCandle = candles.length > 1 ? candles[candles.length - 2] : latestCandle;
  const currentPrice = latestCandle?.close ?? 0;
  const prevPrice = prevCandle?.close ?? currentPrice;
  const changeVal = currentPrice - prevPrice;
  const changePct = prevPrice > 0 ? (changeVal / prevPrice) * 100 : 0;

  // Toggle indicator helper
  const toggleIndicator = (kind: IndicatorConfig['kind']) => {
    setIndicators((prev) => {
      const exists = prev.find((i) => i.kind === kind);
      if (exists) {
        return prev.filter((i) => i.kind !== kind);
      }
      const meta = INDICATOR_LIBRARY.find((m) => m.kind === kind);
      if (!meta) return prev;
      const newInd: IndicatorConfig = {
        id: `${kind.toLowerCase()}-${Date.now()}`,
        kind,
        period: kind === 'BB' || kind === 'CMF' ? 20 : 14,
        visible: true,
        color:
          kind === 'SMA'
            ? '#38bdf8'
            : kind === 'EMA'
            ? '#a855f7'
            : kind === 'BB'
            ? '#6366f1'
            : '#10b981',
      };
      return [...prev, newInd];
    });
  };

  const activePivots = suite?.pivots[selectedPivotMethod];
  const { range52w, trends, patterns, tradingPlan, dataQuality } = suite || {};

  // Formatter helpers
  const formatRp = (val: number | undefined) =>
    val != null ? `Rp ${Math.round(val).toLocaleString('id-ID')}` : '-';

  const formatLevel = (val: number, refPrice: number) => {
    const decimals = refPrice < 200 ? 2 : refPrice < 1000 ? 1 : 0;
    return (
      'Rp ' +
      val.toLocaleString('id-ID', {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
      })
    );
  };

  return (
    <div className="max-w-[1600px] mx-auto space-y-4 font-sans">
      {/* ----------------- Top Header: Selector & Emiten Bar ----------------- */}
      <div className="bg-[#111115] border border-zinc-800 rounded-xl p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-emerald-600/30 to-teal-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 font-black text-xl font-mono shadow-inner">
            {cleanTicker.slice(0, 4)}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-black text-white tracking-tight">{cleanTicker}</h1>
              <span className="text-xs font-semibold px-2 py-0.5 rounded bg-zinc-800 text-zinc-300">
                {sector}
              </span>
              {tradingPlan && (
                <span
                  className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                    tradingPlan.bias === 'BULLISH_SETUP'
                      ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                      : tradingPlan.bias === 'BEARISH_SETUP'
                      ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                      : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                  }`}
                >
                  {tradingPlan.bias === 'BULLISH_SETUP'
                    ? 'Beli Bertahap (Momentum)'
                    : tradingPlan.bias === 'BEARISH_SETUP'
                    ? 'Batas Batal Aktif'
                    : 'Konsolidasi / Pantau'}
                </span>
              )}
            </div>
            <p className="text-xs text-zinc-400 mt-0.5">{companyName || `Emiten ${cleanTicker} BEI`}</p>
          </div>
        </div>

        {/* Quick Switch Emiten */}
        <div className="flex flex-wrap items-center gap-1.5 bg-zinc-900/80 p-1.5 rounded-lg border border-zinc-800/80">
          <span className="text-[10px] text-zinc-400 font-semibold px-1.5 font-mono">PILIH CEPAT:</span>
          {['BBCA', 'BBRI', 'BMRI', 'BBNI', 'TLKM', 'ASII', 'AMMN', 'ADRO'].map((sym) => (
            <button
              key={sym}
              type="button"
              onClick={() => onSelectStock(sym)}
              className={`px-2.5 py-1 text-[11px] font-bold rounded font-mono transition-all ${
                cleanTicker === sym
                  ? 'bg-emerald-500 text-black shadow-sm'
                  : 'bg-zinc-800/70 text-zinc-300 hover:bg-zinc-700 hover:text-white'
              }`}
            >
              {sym}
            </button>
          ))}
        </div>

        {/* Live Price Display */}
        <div className="text-right font-mono self-end md:self-auto">
          <div className="text-2xl font-black text-white">
            {currentPrice > 0 ? formatRp(currentPrice) : 'Memuat...'}
          </div>
          <div
            className={`text-xs font-bold flex items-center justify-end gap-1 ${
              changePct >= 0 ? 'text-emerald-400' : 'text-rose-400'
            }`}
          >
            {changePct >= 0 ? <ArrowUpRight className="w-3.5 h-3.5" /> : <ArrowDownRight className="w-3.5 h-3.5" />}
            <span>
              {changePct >= 0 ? '+' : ''}
              {changePct.toFixed(2)}%
            </span>
          </div>
        </div>
      </div>

      {/* ----------------- Toolbar: Timeframe & Chart Modes ----------------- */}
      <div className="bg-[#111115] border border-zinc-800 rounded-xl p-2.5 flex flex-wrap items-center justify-between gap-3">
        {/* Timeframe Switcher */}
        <div className="flex items-center gap-1 bg-zinc-900 p-1 rounded-lg border border-zinc-800 text-xs font-mono">
          <span className="text-[10px] text-zinc-500 px-1 font-bold">TF:</span>
          {TIMEFRAMES.map((tf) => (
            <button
              key={tf}
              type="button"
              onClick={() => setTimeframe(tf)}
              className={`px-2.5 py-1 rounded font-bold transition-colors ${
                timeframe === tf
                  ? 'bg-emerald-500 text-black shadow-sm'
                  : 'text-zinc-400 hover:text-white hover:bg-zinc-800'
              }`}
            >
              {tf}
            </button>
          ))}
        </div>

        {/* Chart Type Selector */}
        <div className="flex items-center gap-1 bg-zinc-900 p-1 rounded-lg border border-zinc-800 text-xs font-mono">
          {(
            [
              { id: 'candlestick', label: 'Candle' },
              { id: 'heikin-ashi', label: 'Heikin Ashi' },
              { id: 'bar', label: 'Bar' },
              { id: 'line', label: 'Line' },
              { id: 'area', label: 'Area' },
              { id: 'baseline', label: 'Baseline' },
            ] as const
          ).map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setChartType(t.id)}
              className={`px-2 py-1 rounded font-bold transition-colors ${
                chartType === t.id
                  ? 'bg-zinc-700 text-white'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Indicator Selector Catalog Button */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setIsIndicatorMenuOpen((prev) => !prev)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-xs font-bold text-zinc-300 hover:text-white transition-colors"
          >
            <Sliders className="w-3.5 h-3.5 text-emerald-400" />
            <span>Katalog Indikator ({indicators.length})</span>
          </button>

          {/* Indicator Dropdown Menu */}
          {isIndicatorMenuOpen && (
            <div className="absolute right-0 top-full mt-2 w-72 bg-[#18181b] border border-zinc-700 rounded-xl p-3 shadow-2xl z-50 space-y-2">
              <div className="flex items-center justify-between pb-2 border-b border-zinc-800 text-xs font-bold text-white">
                <span>Pilih Indikator Aktif</span>
                <button
                  type="button"
                  onClick={() => setIsIndicatorMenuOpen(false)}
                  className="text-zinc-400 hover:text-white"
                >
                  ✕
                </button>
              </div>
              <div className="max-h-72 overflow-y-auto space-y-1 text-xs">
                {INDICATOR_LIBRARY.map((ind) => {
                  const isActive = indicators.some((i) => i.kind === ind.kind);
                  return (
                    <button
                      key={ind.kind}
                      type="button"
                      onClick={() => toggleIndicator(ind.kind)}
                      className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded text-left transition-colors ${
                        isActive
                          ? 'bg-emerald-500/20 text-emerald-400 font-bold border border-emerald-500/30'
                          : 'text-zinc-300 hover:bg-zinc-800'
                      }`}
                    >
                      <div className="flex flex-col">
                        <span className="text-[11px]">{ind.name}</span>
                        <span className="text-[9px] text-zinc-500">{ind.category} · {ind.pane}</span>
                      </div>
                      <span className="text-xs">{isActive ? '✓' : '+'}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ----------------- Interactive Candlestick Chart Pane ----------------- */}
      {loading ? (
        <div className="h-96 flex flex-col items-center justify-center bg-[#111115] border border-zinc-800 rounded-xl text-zinc-500 text-xs gap-2">
          <RefreshCw className="w-5 h-5 animate-spin text-emerald-500" />
          <span>Memuat feed candle bursa riil...</span>
        </div>
      ) : error ? (
        <div className="h-96 flex flex-col items-center justify-center bg-[#111115] border border-zinc-800 rounded-xl text-rose-400 text-xs gap-2">
          <AlertTriangle className="w-5 h-5" />
          <span>{error}</span>
        </div>
      ) : (
        <InteractiveChart
          candles={candles}
          symbol={cleanTicker}
          timeframe={timeframe}
          chartType={chartType}
          indicators={indicators}
          tradingLevels={{
            entry: tradingPlan?.entryZone[1],
            cutLoss: tradingPlan?.stopLoss,
            tp1: tradingPlan?.targetPrice1,
            tp2: tradingPlan?.targetPrice2,
            support: activePivots?.s1,
            resistance: activePivots?.r1,
          }}
          height={600}
        />
      )}

      {/* ----------------- Section 1: Support / Resistance & Pivots (Classic, Fibonacci, Camarilla) ----------------- */}
      {suite && activePivots && (
        <div className="bg-[#111115] border border-zinc-800 rounded-xl p-4 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-800 pb-3">
            <div className="flex items-center gap-2">
              <Compass className="h-5 w-5 text-sky-400" />
              <div>
                <h3 className="text-base font-bold text-white">Pivot Points & Rentang 52-Minggu</h3>
                <p className="text-xs text-zinc-400">Level support & resistance matematis berbasis bar harian riil</p>
              </div>
            </div>

            {/* Pivot Method Switcher */}
            <div className="flex items-center gap-1 bg-zinc-900 p-1 rounded-lg border border-zinc-800 text-xs font-mono">
              {(['CLASSIC', 'FIBONACCI', 'CAMARILLA'] as PivotMethod[]).map((method) => (
                <button
                  key={method}
                  type="button"
                  onClick={() => setSelectedPivotMethod(method)}
                  className={`px-3 py-1 rounded font-bold transition-colors ${
                    selectedPivotMethod === method
                      ? 'bg-sky-500 text-black shadow-sm'
                      : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  {method === 'CLASSIC' ? 'Classic Floor' : method === 'FIBONACCI' ? 'Fibonacci' : 'Camarilla'}
                </button>
              ))}
            </div>
          </div>

          {/* Pivot Grid 7 Kolom */}
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2 divide-x divide-zinc-800/50 text-center font-mono">
            <div className="p-2 rounded bg-rose-950/10 border border-rose-900/30">
              <span className="text-[10px] uppercase font-bold text-rose-400">Resistance 3 (R3)</span>
              <div className="text-sm font-bold text-zinc-200 mt-1">{formatLevel(activePivots.r3, currentPrice)}</div>
            </div>
            <div className="p-2 rounded bg-rose-950/10 border border-rose-900/30">
              <span className="text-[10px] uppercase font-bold text-rose-400">Resistance 2 (R2)</span>
              <div className="text-sm font-bold text-zinc-200 mt-1">{formatLevel(activePivots.r2, currentPrice)}</div>
            </div>
            <div className="p-2 rounded bg-rose-950/20 border border-rose-900/40">
              <span className="text-[10px] uppercase font-bold text-rose-400">Resistance 1 (R1)</span>
              <div className="text-sm font-bold text-white mt-1">{formatLevel(activePivots.r1, currentPrice)}</div>
            </div>
            <div className="p-2 rounded bg-sky-950/20 border border-sky-900/40">
              <span className="text-[10px] uppercase font-bold text-sky-400">Pivot Point (PP)</span>
              <div className="text-sm font-black text-sky-300 mt-1">{formatLevel(activePivots.pp, currentPrice)}</div>
            </div>
            <div className="p-2 rounded bg-emerald-950/20 border border-emerald-900/40">
              <span className="text-[10px] uppercase font-bold text-emerald-400">Support 1 (S1)</span>
              <div className="text-sm font-bold text-white mt-1">{formatLevel(activePivots.s1, currentPrice)}</div>
            </div>
            <div className="p-2 rounded bg-emerald-950/10 border border-emerald-900/30">
              <span className="text-[10px] uppercase font-bold text-emerald-400">Support 2 (S2)</span>
              <div className="text-sm font-bold text-zinc-200 mt-1">{formatLevel(activePivots.s2, currentPrice)}</div>
            </div>
            <div className="p-2 rounded bg-emerald-950/10 border border-emerald-900/30">
              <span className="text-[10px] uppercase font-bold text-emerald-400">Support 3 (S3)</span>
              <div className="text-sm font-bold text-zinc-200 mt-1">{formatLevel(activePivots.s3, currentPrice)}</div>
            </div>
          </div>

          {/* 52-Week Range Position Indicator */}
          {range52w && (
            <div className="p-3 rounded-lg bg-zinc-900/60 border border-zinc-800 space-y-2">
              <div className="flex items-center justify-between text-xs font-mono">
                <span className="font-bold text-zinc-300 flex items-center gap-1.5">
                  <Percent className="h-3.5 w-3.5 text-amber-400" />
                  Rentang 52-Minggu
                </span>
                <span className="text-zinc-400">
                  Posisi Saat Ini:{' '}
                  <strong className="text-white font-bold">{range52w.positionPct}%</strong>
                </span>
              </div>
              <div className="relative h-2 w-full rounded-full bg-zinc-800 overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-emerald-500 via-amber-400 to-sky-400 transition-all duration-500"
                  style={{ width: `${range52w.positionPct}%` }}
                />
              </div>
              <div className="flex items-center justify-between text-[11px] text-zinc-400 font-mono">
                <span>Low 52W: {formatRp(range52w.low52w)}</span>
                <span className="text-white font-bold">{formatRp(currentPrice)}</span>
                <span>High 52W: {formatRp(range52w.high52w)}</span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ----------------- Section 2: Multi-Timeframe Trend Alignment ----------------- */}
      {trends && trends.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {trends.map((trend) => (
            <div key={trend.timeframe} className="bg-[#111115] border border-zinc-800 rounded-xl p-4 space-y-2.5">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-bold text-zinc-200 uppercase tracking-wider font-mono">
                  {trend.label}
                </span>
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 ${
                    trend.status === 'BULLISH'
                      ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                      : trend.status === 'BEARISH'
                      ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                      : 'bg-zinc-800 text-zinc-300'
                  }`}
                >
                  {trend.status === 'BULLISH' ? (
                    <>
                      <TrendingUp className="w-3 h-3" /> BULLISH
                    </>
                  ) : trend.status === 'BEARISH' ? (
                    <>
                      <TrendingDown className="w-3 h-3" /> BEARISH
                    </>
                  ) : (
                    'NEUTRAL'
                  )}
                </span>
              </div>
              <p className="text-xs text-zinc-400 leading-relaxed">{trend.detail}</p>
              <div className="pt-2 border-t border-zinc-800 text-[10px] text-zinc-500 flex items-center justify-between font-mono">
                <span>Benchmark:</span>
                <span className="font-semibold text-zinc-300">{trend.benchmark}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ----------------- Section 3: Candlestick Pattern Recognition ----------------- */}
      <div className="bg-[#111115] border border-zinc-800 rounded-xl p-4 space-y-3">
        <div className="flex items-center gap-2 border-b border-zinc-800 pb-2.5">
          <Sparkles className="h-5 w-5 text-amber-400" />
          <div>
            <h3 className="text-base font-bold text-white">Deteksi Pola Candlestick (Rule-Based)</h3>
            <p className="text-xs text-zinc-400">
              Evaluasi formasi candle dengan konfirmasi volume berbasis data harian lengkap
            </p>
          </div>
        </div>

        {dataQuality?.latestObservationPartial && (
          <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 px-3 py-2 text-xs text-zinc-300">
            <strong className="text-amber-400 font-mono">Basis Konfirmasi: </strong>
            Candle sesi berjalan belum final; pola candlestick di bawah dievaluasi sampai sesi lengkap terakhir
            {dataQuality.patternAsOf ? ` (${dataQuality.patternAsOf.slice(0, 10)})` : ''}.
          </div>
        )}

        {patterns && patterns.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {patterns.map((p) => (
              <div
                key={p.id}
                className={`p-3 rounded-xl border ${
                  p.sentiment === 'BULLISH'
                    ? 'border-emerald-500/30 bg-emerald-950/10'
                    : p.sentiment === 'BEARISH'
                    ? 'border-rose-500/30 bg-rose-950/10'
                    : 'border-zinc-800 bg-zinc-900/40'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-bold text-xs text-white">{p.name}</span>
                  <div className="flex items-center gap-1.5">
                    {p.volumeConfirmed && (
                      <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-sky-500/20 text-sky-300 border border-sky-500/30 font-mono">
                        Vol Konfirmasi
                      </span>
                    )}
                    <span
                      className={`text-[9px] font-bold px-1.5 py-0.5 rounded font-mono ${
                        p.sentiment === 'BULLISH'
                          ? 'bg-emerald-500/20 text-emerald-400'
                          : p.sentiment === 'BEARISH'
                          ? 'bg-rose-500/20 text-rose-400'
                          : 'bg-zinc-800 text-zinc-300'
                      }`}
                    >
                      {p.sentiment}
                    </span>
                  </div>
                </div>
                <p className="mt-1.5 text-xs text-zinc-400 leading-relaxed">{p.description}</p>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-4 rounded-xl border border-dashed border-zinc-800 bg-zinc-900/30 text-center text-xs text-zinc-500">
            Tidak ada pola candlestick mayoritas yang terkonfirmasi pada sesi harian terakhir.
          </div>
        )}
      </div>

      {/* ----------------- Section 4 & 5: Trading Plan Terukur (Libas) & Bandarmologi ----------------- */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Left 2 Cols: Trading Plan Terukur */}
        {tradingPlan && (
          <div className="lg:col-span-2 bg-[#111115] border border-zinc-800 rounded-xl p-4 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-zinc-800 pb-3">
              <div className="flex items-center gap-2">
                <Target className="w-5 h-5 text-emerald-400" />
                <div>
                  <h3 className="text-sm font-bold text-white">Trading Plan Terukur (Prinsip Libas)</h3>
                  <p className="text-xs text-zinc-400">Parameter swing momentum dengan batas batal (stop loss) terukur</p>
                </div>
              </div>
              <span className="text-xs font-mono font-bold px-2.5 py-1 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                Disiplin RR {tradingPlan.riskRewardRatio}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 font-mono">
              <div className="p-3 rounded-xl bg-zinc-900/60 border border-zinc-800">
                <span className="text-[10px] text-zinc-400 font-sans uppercase">Area Entry Ideal</span>
                <div className="text-base font-bold text-white mt-1">
                  {formatRp(tradingPlan.entryZone[0])} – {formatRp(tradingPlan.entryZone[1])}
                </div>
                <span className="text-[10px] text-zinc-500 font-sans">Support s.d. Harga Terkini</span>
              </div>

              <div className="p-3 rounded-xl bg-rose-950/20 border border-rose-900/40">
                <span className="text-[10px] text-rose-400 font-sans uppercase font-bold">Batas Batal (Cut Loss)</span>
                <div className="text-base font-bold text-rose-400 mt-1">
                  {formatRp(tradingPlan.stopLoss)}
                </div>
                <span className="text-[10px] text-zinc-400 font-sans">
                  Risiko Batas: -{tradingPlan.riskPct}%
                </span>
              </div>

              <div className="p-3 rounded-xl bg-emerald-950/20 border border-emerald-900/40">
                <span className="text-[10px] text-emerald-400 font-sans uppercase font-bold">Target Profit 1 (TP1)</span>
                <div className="text-base font-bold text-emerald-400 mt-1">
                  {formatRp(tradingPlan.targetPrice1)}
                </div>
                <span className="text-[10px] text-zinc-400 font-sans">
                  Reward TP1: +{tradingPlan.rewardPct1}%
                </span>
              </div>

              <div className="p-3 rounded-xl bg-sky-950/20 border border-sky-900/40">
                <span className="text-[10px] text-sky-400 font-sans uppercase font-bold">Target Profit 2 (TP2)</span>
                <div className="text-base font-bold text-sky-400 mt-1">
                  {formatRp(tradingPlan.targetPrice2)}
                </div>
                <span className="text-[10px] text-zinc-400 font-sans">
                  Reward TP2: +{tradingPlan.rewardPct2}%
                </span>
              </div>
            </div>

            {/* Risk-to-Reward Requirement Check */}
            <div className="p-2.5 rounded-lg bg-emerald-950/30 border border-emerald-800/50 text-[11px] text-emerald-300 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>
                Rasio <strong>{tradingPlan.riskRewardRatio}</strong> memenuhi target minimum 1:1.8. Potensi profit lebih besar dari risiko batas batal.
              </span>
            </div>

            <p className="text-[11px] text-zinc-400 leading-relaxed bg-zinc-900/40 p-2 rounded border border-zinc-800 font-mono">
              <span className="text-zinc-300 font-bold">Volatilitas (ATR 14 Wilder): </span>
              {formatRp(tradingPlan.atr14)} / hari{' '}
              {dataQuality?.atrAsOf ? `(s.d. ${dataQuality.atrAsOf.slice(0, 10)})` : ''}. Stop loss ditempatkan 1.25x ATR di bawah support terdekat.
            </p>
          </div>
        )}

        {/* Right 1 Col: Bandarmologi & Flow */}
        <div className="bg-[#111115] border border-zinc-800 rounded-xl p-4 space-y-3">
          <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-sky-400" />
              <h3 className="text-sm font-bold text-white">Flow & Analisis SahamLens</h3>
            </div>
          </div>

          <div className="space-y-2 text-xs">
            <div className="flex justify-between py-1.5 border-b border-zinc-800/60">
              <span className="text-zinc-400">Tren Multi-Hari</span>
              <span className="font-bold text-white font-mono">
                {trends?.[0]?.status === 'BULLISH' ? 'Uptrend' : trends?.[0]?.status === 'BEARISH' ? 'Downtrend' : 'Sideways'}
              </span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-zinc-800/60">
              <span className="text-zinc-400">Support Terdekat</span>
              <span className="font-mono font-bold text-zinc-200">
                {formatRp(activePivots?.s1)}
              </span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-zinc-800/60">
              <span className="text-zinc-400">Resistance Terdekat</span>
              <span className="font-mono font-bold text-zinc-200">
                {formatRp(activePivots?.r1)}
              </span>
            </div>
            <div className="flex justify-between py-1.5">
              <span className="text-zinc-400">Setup Bias</span>
              <span className="font-bold text-emerald-400 font-mono">
                {tradingPlan?.bias || 'Netral'}
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              onOpenAiChat(`Buatkan analisis teknikal mendalam saham ${cleanTicker} dengan strategi swing trading dan batas batal`);
            }}
            className="mt-3 w-full bg-emerald-600/15 hover:bg-emerald-600/25 border border-emerald-500/30 text-emerald-400 py-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
          >
            <Bot className="w-3.5 h-3.5" />
            <span>Konsultasikan dengan LensAI</span>
          </button>
        </div>
      </div>
    </div>
  );
};
