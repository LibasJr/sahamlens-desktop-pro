import React, { useState, useEffect, useMemo } from 'react';
import {
  Activity,
  Search,
  ArrowUpRight,
  Sparkles,
  ShieldCheck,
  Scale,
  Layers,
  BarChart3,
  X,
  Bot,
  RefreshCw,
  Target,
  FileText,
  CheckCircle2,
  Sliders,
  ExternalLink,
} from 'lucide-react';
import {
  API_BASE,
  IndexItem,
  MarketRegime,
  StockItem,
  StockDetail,
  ValuationData,
  ChartHistoryItem,
  fetchMarketPulse,
  fetchBreakoutRadar,
  fetchScreener,
  fetchStockFundamental,
  fetchStockIntrinsic,
  fetchStockChart,
  searchTickers,
  sendChatMessage,
} from './api';

type TabType = 'Beranda' | 'Screener' | 'Fundamental' | 'Valuasi' | 'Compare' | 'LensAI';

export default function App() {
  const [activeTab, setActiveTab] = useState<TabType>('Beranda');
  const [selectedTicker, setSelectedTicker] = useState<string>('BBCA');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [searchResults, setSearchResults] = useState<Array<{ symbol: string; name: string }>>([]);
  const [showSearchDropdown, setShowSearchDropdown] = useState<boolean>(false);

  // Screener Filters
  const [screenerFilter, setScreenerFilter] = useState<string>('Semua');
  const [sectorFilter, setSectorFilter] = useState<string>('Semua');
  const [sortCol, setSortCol] = useState<string>('ticker');
  const [sortAsc, setSortAsc] = useState<boolean>(true);

  // Loading states
  const [loadingMarket, setLoadingMarket] = useState<boolean>(true);
  const [loadingStocks, setLoadingStocks] = useState<boolean>(true);
  const [loadingDetail, setLoadingDetail] = useState<boolean>(false);

  // Core Data
  const [indices, setIndices] = useState<IndexItem[]>([]);
  const [marketRegime, setMarketRegime] = useState<MarketRegime | null>(null);
  const [stocks, setStocks] = useState<StockItem[]>([]);
  const [chartHistory, setChartHistory] = useState<ChartHistoryItem[]>([]);

  // Active Stock Details
  const [detail, setDetail] = useState<StockDetail | null>(null);
  const [valuation, setValuation] = useState<ValuationData | null>(null);

  // Compare Tickers
  const [peerTickerA, setPeerTickerA] = useState<string>('BBCA');
  const [peerTickerB, setPeerTickerB] = useState<string>('BBRI');
  const [peerValuationA, setPeerValuationA] = useState<ValuationData | null>(null);
  const [peerValuationB, setPeerValuationB] = useState<ValuationData | null>(null);

  // DCF Simulation Sliders
  const [customGrowth, setCustomGrowth] = useState<number>(10);
  const [customWacc, setCustomWacc] = useState<number>(11);

  // Detail Sub-Tab in Cockpit: Fundamental vs Technical vs Chart
  const [cockpitSubTab, setCockpitSubTab] = useState<'fundamental' | 'technical' | 'chart'>('fundamental');

  // LensAI Assistant
  const [showAiDrawer, setShowAiDrawer] = useState<boolean>(false);
  const [aiPrompt, setAiPrompt] = useState<string>('');
  const [aiLoading, setAiLoading] = useState<boolean>(false);
  const [aiMessages, setAiMessages] = useState<Array<{ role: 'user' | 'assistant'; text: string }>>([
    {
      role: 'assistant',
      text: 'Halo! Saya LensAI di SahamLens Desktop Pro. Tanyakan analisis fundamental, valuasi adaptif, atau disiplin risiko teknikal untuk emiten IDX apa pun.',
    },
  ]);

  // Autocomplete search
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      const items = await searchTickers(searchQuery);
      setSearchResults(items);
    }, 200);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Fetch Market Pulse & Initial Screener Universe
  useEffect(() => {
    let isMounted = true;

    async function loadInitialData() {
      try {
        setLoadingMarket(true);
        setLoadingStocks(true);

        const [pulseRes, radarList, screenerList] = await Promise.all([
          fetchMarketPulse(),
          fetchBreakoutRadar(),
          fetchScreener(),
        ]);

        if (!isMounted) return;

        setIndices(pulseRes.indices);
        setMarketRegime(pulseRes.marketRegime);

        const combinedMap = new Map<string, StockItem>();

        // Add Screener Stocks
        for (const item of screenerList) {
          const t = item.ticker.replace('.JK', '');
          combinedMap.set(t, {
            ticker: t,
            name: item.name || t,
            sector: item.sector || 'IDX',
            price: Number(item.entry) || 0,
            changePct: 0,
            per: typeof item.per === 'number' ? item.per : null,
            pbv: null,
            roe: item.roe ? parseFloat(item.roe) : null,
            dy: item.div_yield ? parseFloat(item.div_yield) : null,
            moat: item.moat || 'Standar',
            bandarmology: item.bandarmology || 'Netral',
            signal: item.signal || 'WAIT',
            entry: item.entry,
            marketCap: item.market_cap,
            sourceType: 'Screener',
          });
        }

        // Add Breakout Radar Stocks
        for (const item of radarList) {
          const t = item.symbol.replace('.JK', '');
          const changeVal = parseFloat(item.change) || 0;
          if (combinedMap.has(t)) {
            const existing = combinedMap.get(t)!;
            existing.price = item.price || existing.price;
            existing.changePct = changeVal;
            existing.rr = item.rr;
            existing.tp1 = item.tp1;
            existing.cl1 = item.cl1;
            existing.reason = item.reason;
            existing.signal = 'BREAKOUT';
          } else {
            combinedMap.set(t, {
              ticker: t,
              name: t,
              sector: 'Momentum',
              price: item.price || 0,
              changePct: changeVal,
              per: null,
              pbv: null,
              roe: null,
              dy: null,
              moat: 'Breakout',
              bandarmology: 'Akumulasi Kuat',
              signal: 'BUY',
              entry: item.price,
              tp1: item.tp1,
              cl1: item.cl1,
              rr: item.rr,
              reason: item.reason,
              sourceType: 'Radar',
            });
          }
        }

        // Core Anchor Tickers
        const anchors = [
          { ticker: 'BBCA', name: 'Bank Central Asia Tbk', sector: 'Financial Services' },
          { ticker: 'BBRI', name: 'Bank Rakyat Indonesia Tbk', sector: 'Financial Services' },
          { ticker: 'BMRI', name: 'Bank Mandiri Tbk', sector: 'Financial Services' },
          { ticker: 'BBNI', name: 'Bank Negara Indonesia Tbk', sector: 'Financial Services' },
          { ticker: 'TLKM', name: 'Telkom Indonesia Tbk', sector: 'Communication Services' },
          { ticker: 'ASII', name: 'Astra International Tbk', sector: 'Industrials' },
          { ticker: 'ADRO', name: 'Adaro Energy Indonesia Tbk', sector: 'Energy' },
          { ticker: 'UNTR', name: 'United Tractors Tbk', sector: 'Industrials' },
        ];

        for (const a of anchors) {
          if (!combinedMap.has(a.ticker)) {
            combinedMap.set(a.ticker, {
              ticker: a.ticker,
              name: a.name,
              sector: a.sector,
              price: 0,
              changePct: 0,
              per: null,
              pbv: null,
              roe: null,
              dy: null,
              moat: 'Wide',
              bandarmology: 'Akumulasi',
              signal: 'ACCUMULATE',
              sourceType: 'Core',
            });
          }
        }

        setStocks(Array.from(combinedMap.values()));
      } catch (err) {
        console.error('Failed loading desktop initial data:', err);
      } finally {
        if (isMounted) {
          setLoadingMarket(false);
          setLoadingStocks(false);
        }
      }
    }

    loadInitialData();
    return () => {
      isMounted = false;
    };
  }, []);

  // Fetch Stock Deep Dive when selectedTicker changes
  useEffect(() => {
    let isMounted = true;

    async function loadStockDeepDive(ticker: string) {
      setLoadingDetail(true);

      try {
        const [fundRes, intrRes, chartRes] = await Promise.all([
          fetchStockFundamental(ticker),
          fetchStockIntrinsic(ticker),
          fetchStockChart(ticker),
        ]);

        if (!isMounted) return;

        setChartHistory(chartRes);
        setDetail(fundRes);
        setValuation(intrRes);

        if (fundRes && fundRes.price > 0) {
          setStocks((prev) =>
            prev.map((s) => (s.ticker === ticker ? { ...s, price: fundRes.price } : s))
          );
        }
      } catch (err) {
        console.error('Failed loading stock deep dive:', err);
      } finally {
        if (isMounted) {
          setLoadingDetail(false);
        }
      }
    }

    if (selectedTicker) {
      loadStockDeepDive(selectedTicker);
      setPeerTickerA(selectedTicker);
    }

    return () => {
      isMounted = false;
    };
  }, [selectedTicker]);

  // Load Compare Data for Tab Compare
  useEffect(() => {
    let isMounted = true;
    async function loadCompareData() {
      try {
        const [resA, resB] = await Promise.all([
          fetchStockIntrinsic(peerTickerA),
          fetchStockIntrinsic(peerTickerB),
        ]);
        if (!isMounted) return;
        setPeerValuationA(resA);
        setPeerValuationB(resB);
      } catch (e) {
        console.error('Compare load error:', e);
      }
    }
    loadCompareData();
    return () => {
      isMounted = false;
    };
  }, [peerTickerA, peerTickerB]);

  // Recalculate DCF Fair Value when sliders change
  const simulatedDcfValue = useMemo(() => {
    if (!valuation || valuation.isBank || !valuation.fcfPerShare) return null;
    const fcf = valuation.fcfPerShare;
    const g = customGrowth / 100;
    const r = customWacc / 100;
    if (r <= g) return null;
    const fairVal = (fcf * (1 + g)) / (r - g);
    const mos = valuation.price > 0 ? ((fairVal - valuation.price) / fairVal) * 100 : 0;
    return { fairVal: Math.round(fairVal), mos: Math.round(mos * 10) / 10 };
  }, [valuation, customGrowth, customWacc]);

  // Sensitivity Matrix for DCF
  const sensitivityMatrix = useMemo(() => {
    if (!valuation || valuation.isBank || !valuation.fcfPerShare) return null;
    const fcf = valuation.fcfPerShare;
    const growthRates = [6, 8, 10, 12, 14];
    const waccRates = [9, 10, 11, 12, 13];

    return waccRates.map((wacc) => {
      const row = growthRates.map((growth) => {
        const r = wacc / 100;
        const g = growth / 100;
        if (r <= g) return null;
        return Math.round((fcf * (1 + g)) / (r - g));
      });
      return { wacc, values: row };
    });
  }, [valuation]);

  // Filtered & Sorted Stocks for Screener Table
  const filteredStocks = useMemo(() => {
    let result = stocks.filter((s) => {
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        return s.ticker.toLowerCase().includes(q) || s.name.toLowerCase().includes(q);
      }
      if (screenerFilter === 'LQ45') return ['BBCA', 'BBRI', 'BMRI', 'BBNI', 'TLKM', 'ASII', 'ADRO'].includes(s.ticker);
      if (screenerFilter === 'Breakout Radar') return s.sourceType === 'Radar' || s.signal === 'BREAKOUT' || s.signal === 'BUY';
      if (screenerFilter === 'High ROE') return s.roe !== null && s.roe >= 15;
      if (screenerFilter === 'Dividend') return s.dy !== null && s.dy >= 4;
      if (sectorFilter !== 'Semua') return s.sector.toLowerCase().includes(sectorFilter.toLowerCase());
      return true;
    });

    result.sort((a, b) => {
      let valA: any = a[sortCol as keyof StockItem] ?? 0;
      let valB: any = b[sortCol as keyof StockItem] ?? 0;
      if (typeof valA === 'string') valA = valA.toLowerCase();
      if (typeof valB === 'string') valB = valB.toLowerCase();
      if (valA < valB) return sortAsc ? -1 : 1;
      if (valA > valB) return sortAsc ? 1 : -1;
      return 0;
    });

    return result;
  }, [stocks, searchQuery, screenerFilter, sectorFilter, sortCol, sortAsc]);

  // Handle Ask LensAI
  const handleAskLensAi = async (promptText?: string) => {
    const textToSend = (promptText || aiPrompt).trim();
    if (!textToSend || aiLoading) return;

    setAiMessages((prev) => [...prev, { role: 'user', text: textToSend }]);
    setAiPrompt('');
    setAiLoading(true);

    try {
      const answer = await sendChatMessage(
        textToSend,
        selectedTicker,
        `Emiten ${selectedTicker}. Sektor: ${detail?.sector || ''}. Harga: ${detail?.price || ''}. ROE: ${detail?.returnOnEquity || ''}%. Moat: ${detail?.moatStatus || ''}. Nilai Wajar: ${valuation?.fairValue || ''}.`
      );
      setAiMessages((prev) => [...prev, { role: 'assistant', text: answer }]);
    } catch (err) {
      setAiMessages((prev) => [
        ...prev,
        { role: 'assistant', text: 'Koneksi ke backend LensAI sedang sibuk. Silakan coba kembali.' },
      ]);
    } finally {
      setAiLoading(false);
    }
  };

  // Sparkline Generator
  const renderSparkline = (points: number[], isPositive: boolean) => {
    if (!points || points.length < 2) return null;
    const min = Math.min(...points);
    const max = Math.max(...points);
    const range = max - min || 1;
    const width = 100;
    const height = 30;
    const step = width / (points.length - 1);

    const svgPoints = points
      .map((p, idx) => {
        const x = idx * step;
        const y = height - ((p - min) / range) * (height - 6) - 3;
        return `${x.toFixed(1)},${y.toFixed(1)}`;
      })
      .join(' ');

    const strokeColor = isPositive ? '#22C55E' : '#EF4444';
    return (
      <svg className="w-full h-8 overflow-visible" viewBox={`0 0 ${width} ${height}`}>
        <polyline fill="none" stroke={strokeColor} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" points={svgPoints} />
      </svg>
    );
  };

  // 1-Year Interactive Price Chart
  const renderInteractiveChart = () => {
    if (chartHistory.length < 2) {
      return (
        <div className="h-48 flex items-center justify-center text-xs text-zinc-400">
          Memuat riwayat harga 1 tahun...
        </div>
      );
    }

    const prices = chartHistory.map((c) => c.close);
    const minPrice = Math.min(...prices);
    const maxPrice = Math.max(...prices);
    const range = maxPrice - minPrice || 1;
    const w = 480;
    const h = 160;
    const step = w / (prices.length - 1);

    const points = prices
      .map((p, idx) => {
        const x = idx * step;
        const y = h - ((p - minPrice) / range) * (h - 20) - 10;
        return `${x.toFixed(1)},${y.toFixed(1)}`;
      })
      .join(' ');

    const isUp = prices[prices.length - 1] >= prices[0];
    const color = isUp ? '#22C55E' : '#EF4444';

    return (
      <div className="bg-[#1A1A1E] border border-[#26262B] rounded-xl p-3">
        <div className="flex items-center justify-between text-xs mb-2">
          <span className="font-bold text-zinc-300">Grafik Harga 1 Tahun (Daily OHLCV)</span>
          <span className="font-mono text-[11px] text-zinc-400">
            Low: Rp {minPrice.toLocaleString('id-ID')} | High: Rp {maxPrice.toLocaleString('id-ID')}
          </span>
        </div>
        <svg className="w-full h-40 overflow-visible" viewBox={`0 0 ${w} ${h}`}>
          <polyline fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" points={points} />
        </svg>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-[#0A0A0B] text-zinc-100 font-sans antialiased selection:bg-blue-500/20 flex flex-col">
      {/* 1. DESKTOP TITLEBAR & TOP NAVIGATION */}
      <header className="sticky top-0 z-40 backdrop-blur-xl bg-[#0A0A0B]/95 border-b border-[#1E1E21] select-none">
        <div className="px-4 sm:px-6 h-14 flex items-center justify-between gap-4">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-white flex items-center justify-center border border-white/10 shadow-sm">
                <div className="w-3.5 h-3.5 rounded-full border-[2px] border-zinc-950 relative">
                  <div className="absolute w-1 h-1 bg-zinc-950 rounded-full top-[1.5px] right-[1px]" />
                </div>
              </div>
              <div className="flex items-baseline gap-1">
                <span className="font-bold tracking-tight text-base text-white">SahamLens</span>
                <span className="text-zinc-500 text-xs font-semibold">Pro</span>
              </div>
              <span className="ml-1 px-1.5 py-0.5 rounded bg-blue-500/10 border border-blue-500/20 text-[10px] font-semibold text-blue-400 tracking-wider">
                2.0 DESKTOP
              </span>
            </div>

            {/* Navigation Tabs */}
            <nav className="flex items-center gap-1">
              {(['Beranda', 'Screener', 'Fundamental', 'Valuasi', 'Compare', 'LensAI'] as TabType[]).map((tab) => (
                <button
                  key={tab}
                  onClick={() => {
                    setActiveTab(tab);
                    if (tab === 'LensAI') setShowAiDrawer(true);
                  }}
                  className={`px-3 py-1 rounded-full text-xs font-semibold transition-all ${
                    activeTab === tab
                      ? 'bg-[#1E1E24] text-white border border-[#2E2E36] shadow-sm'
                      : 'text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  {tab}
                </button>
              ))}
            </nav>
          </div>

          <div className="flex items-center gap-2.5">
            {/* Search Autocomplete */}
            <div className="relative w-56">
              <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onFocus={() => setShowSearchDropdown(true)}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari emiten (BBCA, ASII)..."
                className="w-full h-8 pl-8 pr-3 text-xs rounded-full bg-[#151518] border border-[#232326] text-zinc-200 placeholder:text-zinc-500 focus:outline-none focus:border-zinc-500"
              />

              {/* Autocomplete Dropdown */}
              {showSearchDropdown && searchResults.length > 0 && (
                <div className="absolute top-10 left-0 right-0 bg-[#16161B] border border-[#2A2A32] rounded-xl shadow-2xl py-1 z-50 divide-y divide-[#222228]">
                  {searchResults.map((item) => (
                    <button
                      key={item.symbol}
                      onClick={() => {
                        setSelectedTicker(item.symbol);
                        setSearchQuery('');
                        setShowSearchDropdown(false);
                      }}
                      className="w-full px-3 py-2 text-left hover:bg-[#202028] flex items-center justify-between text-xs"
                    >
                      <span className="font-bold text-white">{item.symbol}</span>
                      <span className="text-[11px] text-zinc-400 truncate max-w-[140px]">{item.name}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* API Connection Indicator */}
            <div className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#151518] border border-[#232326] text-[11px] text-zinc-400">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span className="truncate max-w-[130px] font-mono text-[10px]">{API_BASE.replace('https://', '')}</span>
            </div>

            {/* LensAI Button */}
            <button
              onClick={() => setShowAiDrawer(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-blue-600/20 border border-blue-500/30 text-blue-400 hover:bg-blue-600/30 transition-all text-xs font-bold"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>LensAI</span>
            </button>
          </div>
        </div>
      </header>

      {/* 2. MARKET PULSE STRIP */}
      <section className="border-b border-[#1E1E21] bg-[#0E0E12]/90 px-4 sm:px-6 py-2">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="text-[11px] font-bold tracking-wider uppercase text-zinc-400 flex items-center gap-1.5">
              <Activity className="w-3.5 h-3.5 text-emerald-400" />
              Market Pulse
            </span>
            {marketRegime && (
              <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                {marketRegime.regime.label} ({marketRegime.fearGreed.label})
              </span>
            )}
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 flex-1 max-w-3xl">
            {indices.slice(0, 4).map((idx) => {
              const isPos = idx.changePct >= 0;
              return (
                <div key={idx.symbol} className="bg-[#151518] border border-[#232326] rounded-xl p-2 flex flex-col justify-between">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-semibold text-zinc-300">{idx.name}</span>
                    <span className={`text-[10px] font-bold ${isPos ? 'text-emerald-400' : 'text-red-400'}`}>
                      {isPos ? '+' : ''}{idx.changePct.toFixed(2)}%
                    </span>
                  </div>
                  <div className="text-xs font-bold tracking-tight text-white mt-0.5">
                    {idx.price.toLocaleString('id-ID', { maximumFractionDigits: 1 })}
                  </div>
                  <div className="mt-1">{renderSparkline(idx.sparkline, isPos)}</div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* 3. CONDITIONAL TAB VIEWS */}
      <main className="flex-1 px-4 sm:px-6 py-5 overflow-y-auto">
        {/* ==================== TAB 1: BERANDA (COCKPIT TERPADU) ==================== */}
        {activeTab === 'Beranda' && (
          <div className="space-y-5">
            {/* Quick Emiten Chips */}
            <div className="flex flex-wrap items-center justify-between gap-2 pb-1">
              <div className="flex items-center gap-1.5 overflow-x-auto">
                <span className="text-xs text-zinc-400 font-semibold mr-1">Riset Cepat:</span>
                {['BBCA', 'BBRI', 'BMRI', 'TLKM', 'ASII', 'BSSR', 'ADRO', 'AMMN', 'DOOH'].map((t) => (
                  <button
                    key={t}
                    onClick={() => setSelectedTicker(t)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-semibold border transition-all ${
                      selectedTicker === t
                        ? 'bg-blue-600 text-white border-blue-500 shadow-sm'
                        : 'bg-[#151518] text-zinc-300 border-[#232326] hover:border-zinc-600'
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
              <div className="text-xs text-zinc-400">
                Terhubung ke API resmi: <span className="font-bold text-white">sahamlens.id</span>
              </div>
            </div>

            {/* 5-Column Master-Detail Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-5 items-start">
              {/* Screener Table (Left 3 Columns) */}
              <div className="lg:col-span-3 bg-[#151518] border border-[#232326] rounded-2xl p-4 flex flex-col">
                <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-[#232326]">
                  <div>
                    <h2 className="text-sm font-bold text-white flex items-center gap-2">
                      <BarChart3 className="w-4 h-4 text-blue-400" />
                      Screener Kuantitatif & Radar
                    </h2>
                    <p className="text-[11px] text-zinc-400">Pilih saham untuk memperbarui cockpit analisis.</p>
                  </div>
                  <div className="flex items-center gap-1 overflow-x-auto">
                    {(['Semua', 'LQ45', 'Breakout Radar', 'High ROE', 'Dividend'] as const).map((filter) => (
                      <button
                        key={filter}
                        onClick={() => setScreenerFilter(filter)}
                        className={`px-2.5 py-1 rounded-full text-xs font-medium whitespace-nowrap ${
                          screenerFilter === filter
                            ? 'bg-[#23232A] text-white border border-zinc-600'
                            : 'text-zinc-400 hover:text-zinc-200 bg-[#1A1A1E]'
                        }`}
                      >
                        {filter}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="overflow-x-auto mt-2">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-[#232326] text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
                        <th className="py-2 px-2.5">Ticker</th>
                        <th className="py-2 px-2.5 text-right">Harga</th>
                        <th className="py-2 px-2.5 text-right">PER</th>
                        <th className="py-2 px-2.5 text-right">ROE</th>
                        <th className="py-2 px-2.5 text-right">DY</th>
                        <th className="py-2 px-2.5">Bandarmology</th>
                        <th className="py-2 px-2.5 text-center">Sinyal</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#1E1E23] text-xs">
                      {filteredStocks.slice(0, 12).map((s) => {
                        const isSelected = s.ticker === selectedTicker;
                        return (
                          <tr
                            key={s.ticker}
                            onClick={() => setSelectedTicker(s.ticker)}
                            className={`cursor-pointer transition-colors ${
                              isSelected ? 'bg-blue-600/15 border-l-4 border-l-blue-500' : 'hover:bg-[#1A1A1E]'
                            }`}
                          >
                            <td className="py-2.5 px-2.5">
                              <span className="font-bold text-white block">{s.ticker}</span>
                              <span className="text-[10px] text-zinc-400 truncate block max-w-[120px]">{s.name}</span>
                            </td>
                            <td className="py-2.5 px-2.5 text-right font-mono font-semibold text-zinc-200">
                              {s.price > 0 ? `Rp ${s.price.toLocaleString('id-ID')}` : '-'}
                            </td>
                            <td className="py-2.5 px-2.5 text-right font-mono text-zinc-300">
                              {s.per !== null ? `${s.per.toFixed(1)}x` : '-'}
                            </td>
                            <td className="py-2.5 px-2.5 text-right font-mono text-zinc-300">
                              {s.roe !== null ? `${s.roe.toFixed(1)}%` : '-'}
                            </td>
                            <td className="py-2.5 px-2.5 text-right font-mono text-zinc-300">
                              {s.dy !== null ? `${s.dy.toFixed(1)}%` : '-'}
                            </td>
                            <td className="py-2.5 px-2.5">
                              <span
                                className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                                  s.bandarmology.includes('Akumulasi')
                                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                    : 'bg-zinc-800 text-zinc-400'
                                }`}
                              >
                                {s.bandarmology}
                              </span>
                            </td>
                            <td className="py-2.5 px-2.5 text-center">
                              <span
                                className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                  s.signal === 'BUY' || s.signal === 'BREAKOUT'
                                    ? 'bg-emerald-500/20 text-emerald-300'
                                    : 'bg-blue-500/20 text-blue-300'
                                }`}
                              >
                                {s.signal}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Active Stock Deep Dive (Right 2 Columns) */}
              <div className="lg:col-span-2 bg-[#151518] border border-[#232326] rounded-2xl p-4 flex flex-col gap-3">
                {/* Header Detail */}
                <div className="flex items-start justify-between gap-3 pb-2.5 border-b border-[#232326]">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-xl font-extrabold text-white">{selectedTicker}</h3>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-500/10 text-purple-300 border border-purple-500/20">
                        MOAT: {detail?.moatStatus || 'TAHAN'}
                      </span>
                    </div>
                    <div className="text-xs text-zinc-400 mt-0.5">{detail?.name || 'Memuat emiten...'}</div>
                    <div className="text-[11px] text-zinc-400">{detail?.sector}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-mono font-extrabold text-white">
                      {detail?.price ? `Rp ${detail.price.toLocaleString('id-ID')}` : '-'}
                    </div>
                    <span className="text-[10px] text-emerald-400 font-semibold flex items-center justify-end gap-1">
                      <ArrowUpRight className="w-3 h-3" />
                      Live Data IDX
                    </span>
                  </div>
                </div>

                {/* Sub-tab Toggle */}
                <div className="flex items-center bg-[#1E1E22] p-1 rounded-xl border border-[#28282E]">
                  <button
                    onClick={() => setCockpitSubTab('fundamental')}
                    className={`flex-1 py-1 text-xs font-semibold rounded-lg transition-all ${
                      cockpitSubTab === 'fundamental' ? 'bg-[#2A2A32] text-white shadow-sm' : 'text-zinc-400'
                    }`}
                  >
                    📊 Fundamental
                  </button>
                  <button
                    onClick={() => setCockpitSubTab('technical')}
                    className={`flex-1 py-1 text-xs font-semibold rounded-lg transition-all ${
                      cockpitSubTab === 'technical' ? 'bg-[#2A2A32] text-white shadow-sm' : 'text-zinc-400'
                    }`}
                  >
                    🎯 Batas Batal
                  </button>
                  <button
                    onClick={() => setCockpitSubTab('chart')}
                    className={`flex-1 py-1 text-xs font-semibold rounded-lg transition-all ${
                      cockpitSubTab === 'chart' ? 'bg-[#2A2A32] text-white shadow-sm' : 'text-zinc-400'
                    }`}
                  >
                    📈 Grafik 1Y
                  </button>
                </div>

                {/* TAB 1: FUNDAMENTAL */}
                {cockpitSubTab === 'fundamental' && (
                  <div className="space-y-3">
                    <div className="grid grid-cols-4 gap-2 text-center">
                      <div className="bg-[#1A1A1E] border border-[#26262B] p-2 rounded-xl">
                        <div className="text-[10px] text-zinc-400">PER</div>
                        <div className="text-xs font-mono font-bold text-white mt-0.5">
                          {detail?.trailingPE ? `${detail.trailingPE.toFixed(1)}x` : '-'}
                        </div>
                      </div>
                      <div className="bg-[#1A1A1E] border border-[#26262B] p-2 rounded-xl">
                        <div className="text-[10px] text-zinc-400">PBV</div>
                        <div className="text-xs font-mono font-bold text-white mt-0.5">
                          {detail?.priceToBook ? `${detail.priceToBook.toFixed(2)}x` : '-'}
                        </div>
                      </div>
                      <div className="bg-[#1A1A1E] border border-[#26262B] p-2 rounded-xl">
                        <div className="text-[10px] text-zinc-400">ROE</div>
                        <div className="text-xs font-mono font-bold text-emerald-400 mt-0.5">
                          {detail?.returnOnEquity ? `${detail.returnOnEquity.toFixed(1)}%` : '-'}
                        </div>
                      </div>
                      <div className="bg-[#1A1A1E] border border-[#26262B] p-2 rounded-xl">
                        <div className="text-[10px] text-zinc-400">DIV YIELD</div>
                        <div className="text-xs font-mono font-bold text-blue-400 mt-0.5">
                          {detail?.dividendYield ? `${detail.dividendYield.toFixed(1)}%` : '-'}
                        </div>
                      </div>
                    </div>

                    {/* Annual Trend */}
                    <div className="bg-[#1A1A1E] border border-[#26262B] rounded-xl p-3">
                      <div className="text-[11px] font-bold text-zinc-300 mb-2 flex items-center justify-between">
                        <span>Tren Laba & Pendapatan Tahunan</span>
                        <span className="text-[10px] text-zinc-400">Satuan Triliun Rp</span>
                      </div>
                      {detail?.annualData && detail.annualData.length > 0 ? (
                        <div className="space-y-1.5">
                          {detail.annualData.map((obs) => (
                            <div key={obs.fiscalYear} className="flex items-center justify-between text-xs font-mono">
                              <span className="text-zinc-400">{obs.fiscalYear}</span>
                              <div className="flex-1 mx-2 h-1.5 bg-[#232328] rounded-full overflow-hidden">
                                <div
                                  className="bg-blue-500 h-full rounded-full"
                                  style={{ width: `${Math.min(100, Math.max(15, (obs.revenue / 1.5e14) * 100))}%` }}
                                />
                              </div>
                              <span className="text-white text-[11px]">
                                {(obs.revenue / 1e12).toFixed(1)}T <span className="text-emerald-400">(Net {(obs.netIncome / 1e12).toFixed(1)}T)</span>
                              </span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-xs text-zinc-400 py-2">Data tahunan LK sedang dimuat...</div>
                      )}
                    </div>
                  </div>
                )}

                {/* TAB 2: TEKNIKAL & BATAS BATAL */}
                {cockpitSubTab === 'technical' && (
                  <div className="bg-[#1A1A1E] border border-[#26262B] rounded-xl p-3.5 space-y-3">
                    <div className="flex items-center justify-between border-b border-[#26262B] pb-2">
                      <span className="text-xs font-bold text-zinc-200 flex items-center gap-1.5">
                        <Target className="w-3.5 h-3.5 text-amber-400" />
                        Disiplin Risiko & Level Kunci
                      </span>
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-400">
                        Risk/Reward 1:2.0
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="p-2 rounded-lg bg-[#232328]">
                        <span className="text-[10px] text-zinc-400 block">Entry Point Acuan</span>
                        <span className="font-mono font-bold text-white text-sm">
                          Rp {detail?.price ? detail.price.toLocaleString('id-ID') : '-'}
                        </span>
                      </div>
                      <div className="p-2 rounded-lg bg-red-500/10 border border-red-500/20">
                        <span className="text-[10px] text-red-300 font-semibold block">Batas Batal (SL 4%)</span>
                        <span className="font-mono font-bold text-red-400 text-sm">
                          Rp {detail?.price ? Math.round(detail.price * 0.96).toLocaleString('id-ID') : '-'}
                        </span>
                      </div>
                      <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                        <span className="text-[10px] text-emerald-300 font-semibold block">Target Profit 1 (+8%)</span>
                        <span className="font-mono font-bold text-emerald-400 text-sm">
                          Rp {detail?.price ? Math.round(detail.price * 1.08).toLocaleString('id-ID') : '-'}
                        </span>
                      </div>
                      <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                        <span className="text-[10px] text-emerald-300 font-semibold block">Target Profit 2 (+16%)</span>
                        <span className="font-mono font-bold text-emerald-400 text-sm">
                          Rp {detail?.price ? Math.round(detail.price * 1.16).toLocaleString('id-ID') : '-'}
                        </span>
                      </div>
                    </div>
                    <div className="p-2 rounded-lg bg-[#222228] text-[11px] text-zinc-300">
                      💡 <strong>Aturan Libas:</strong> Alokasi modal maksimal 10% per emiten. Batas rugi modal portofolio 2-3%.
                    </div>
                  </div>
                )}

                {/* TAB 3: CHART 1 TAHUN */}
                {cockpitSubTab === 'chart' && renderInteractiveChart()}

                {/* Ask LensAI Action Button */}
                <button
                  onClick={() => {
                    setShowAiDrawer(true);
                    handleAskLensAi(`Ringkas keunggulan kompetitif, ketahanan laba, dan valuasi ${selectedTicker}.`);
                  }}
                  className="w-full py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold flex items-center justify-center gap-1.5 transition-all"
                >
                  <Bot className="w-3.5 h-3.5" />
                  Analisis Mendalam {selectedTicker} dengan LensAI
                </button>
              </div>
            </div>

            {/* Bottom 2 Columns: Adaptive Valuation & Peer Compare */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 pt-1">
              {/* Left: Adaptive Valuation */}
              <div className="bg-[#151518] border border-[#232326] rounded-2xl p-5 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between border-b border-[#232326] pb-3">
                    <div className="flex items-center gap-2">
                      <Scale className="w-4 h-4 text-emerald-400" />
                      <h3 className="text-sm font-bold text-white">
                        Valuasi Sektoral ({selectedTicker})
                      </h3>
                    </div>
                    <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold bg-zinc-800 text-zinc-300">
                      {valuation?.isBank ? 'Metode Bank (DDM/PBV)' : 'Metode Industri (DCF)'}
                    </span>
                  </div>

                  {valuation ? (
                    <div className="mt-3 space-y-3">
                      {valuation.isBank ? (
                        <div className="space-y-3">
                          <div className="p-2.5 rounded-xl bg-blue-500/10 border border-blue-500/20 text-xs text-blue-200">
                            🏛️ <strong>Bank / Finansial</strong>: Valuasi menggunakan DDM & Gordon Growth PBV. Free Cash Flow tidak berlaku untuk bank.
                          </div>
                          <div className="grid grid-cols-3 gap-2 text-center">
                            {Object.entries(valuation.methods).map(([k, m]) => (
                              <div key={k} className="bg-[#1A1A1E] border border-[#26262B] p-2 rounded-xl">
                                <div className="text-[10px] text-zinc-400 truncate">{m.name}</div>
                                <div className="text-xs font-mono font-bold text-white mt-0.5">
                                  Rp {Math.round(m.value).toLocaleString('id-ID')}
                                </div>
                              </div>
                            ))}
                          </div>
                          <div className="p-3 rounded-xl bg-[#1A1A1E] border border-[#26262B] flex items-center justify-between">
                            <div>
                              <span className="text-[11px] text-zinc-400 block">Nilai Wajar Konsensus</span>
                              <span className="text-base font-mono font-bold text-white">
                                Rp {Math.round(valuation.fairValue).toLocaleString('id-ID')}
                              </span>
                            </div>
                            <div className="text-right">
                              <span className="text-[11px] text-zinc-400 block">Margin of Safety</span>
                              <span className={`text-sm font-mono font-bold ${valuation.mos >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                                {valuation.mos >= 0 ? `+${valuation.mos.toFixed(1)}%` : `${valuation.mos.toFixed(1)}%`}
                              </span>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-200">
                            ⚙️ <strong>Simulasi DCF</strong>: Atur asumsi pertumbuhan dan tingkat diskonto di bawah.
                          </div>
                          <div className="bg-[#1A1A1E] p-3 rounded-xl border border-[#26262B] space-y-2">
                            <div className="flex justify-between text-xs">
                              <span className="text-zinc-400">Pertumbuhan 5Y:</span>
                              <span className="font-mono font-bold text-blue-400">{customGrowth}%</span>
                            </div>
                            <input
                              type="range"
                              min="3"
                              max="25"
                              value={customGrowth}
                              onChange={(e) => setCustomGrowth(Number(e.target.value))}
                              className="w-full accent-blue-500"
                            />
                            <div className="flex justify-between text-xs pt-1">
                              <span className="text-zinc-400">WACC / Discount Rate:</span>
                              <span className="font-mono font-bold text-blue-400">{customWacc}%</span>
                            </div>
                            <input
                              type="range"
                              min="8"
                              max="18"
                              value={customWacc}
                              onChange={(e) => setCustomWacc(Number(e.target.value))}
                              className="w-full accent-blue-500"
                            />
                          </div>
                          <div className="p-3 rounded-xl bg-[#1A1A1E] border border-[#26262B] flex items-center justify-between">
                            <div>
                              <span className="text-[11px] text-zinc-400 block">Nilai DCF Terhitung</span>
                              <span className="text-base font-mono font-bold text-white">
                                Rp {simulatedDcfValue ? simulatedDcfValue.fairVal.toLocaleString('id-ID') : Math.round(valuation.fairValue).toLocaleString('id-ID')}
                              </span>
                            </div>
                            <div className="text-right">
                              <span className="text-[11px] text-zinc-400 block">Margin of Safety</span>
                              <span className="text-sm font-mono font-bold text-emerald-400">
                                {simulatedDcfValue ? `+${simulatedDcfValue.mos}%` : `+${valuation.mos.toFixed(1)}%`}
                              </span>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="text-xs text-zinc-400 py-6 text-center">Memuat model valuasi...</div>
                  )}
                </div>
              </div>

              {/* Right: Peer Compare */}
              <div className="bg-[#151518] border border-[#232326] rounded-2xl p-5 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between border-b border-[#232326] pb-3">
                    <div className="flex items-center gap-2">
                      <Layers className="w-4 h-4 text-purple-400" />
                      <h3 className="text-sm font-bold text-white">Komparasi Peer Sektor</h3>
                    </div>
                    <select
                      value={peerTickerB}
                      onChange={(e) => setPeerTickerB(e.target.value)}
                      className="bg-[#1A1A1E] border border-[#2B2B30] text-xs text-white rounded px-2 py-1"
                    >
                      {['BBRI', 'BMRI', 'BBNI', 'TLKM', 'ASII', 'ADRO', 'UNTR'].map((t) => (
                        <option key={t} value={t} disabled={t === selectedTicker}>
                          Bandingkan vs {t}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="mt-3 space-y-3 text-xs">
                    <div className="flex justify-between font-bold pb-1 border-b border-[#232326]">
                      <span className="text-blue-400">{selectedTicker}</span>
                      <span className="text-zinc-500">VS</span>
                      <span className="text-purple-400">{peerTickerB}</span>
                    </div>
                    {/* PER Compare */}
                    <div>
                      <div className="flex justify-between text-zinc-300 mb-1">
                        <span>P/E Ratio</span>
                        <span className="font-mono">
                          {detail?.trailingPE ? `${detail.trailingPE.toFixed(1)}x` : '-'} vs{' '}
                          {peerValuationB?.eps && peerValuationB.price ? `${(peerValuationB.price / peerValuationB.eps).toFixed(1)}x` : '-'}
                        </span>
                      </div>
                      <div className="flex gap-2 h-2">
                        <div className="flex-1 bg-blue-500/20 rounded-full overflow-hidden">
                          <div className="bg-blue-500 h-full rounded-full" style={{ width: '60%' }} />
                        </div>
                        <div className="flex-1 bg-purple-500/20 rounded-full overflow-hidden">
                          <div className="bg-purple-500 h-full rounded-full" style={{ width: '45%' }} />
                        </div>
                      </div>
                    </div>

                    {/* ROE Compare */}
                    <div>
                      <div className="flex justify-between text-zinc-300 mb-1">
                        <span>ROE (%)</span>
                        <span className="font-mono">
                          {detail?.returnOnEquity ? `${detail.returnOnEquity.toFixed(1)}%` : '-'} vs{' '}
                          {peerValuationB?.roe ? `${peerValuationB.roe.toFixed(1)}%` : '-'}
                        </span>
                      </div>
                      <div className="flex gap-2 h-2">
                        <div className="flex-1 bg-blue-500/20 rounded-full overflow-hidden">
                          <div className="bg-blue-500 h-full rounded-full" style={{ width: '85%' }} />
                        </div>
                        <div className="flex-1 bg-purple-500/20 rounded-full overflow-hidden">
                          <div className="bg-purple-500 h-full rounded-full" style={{ width: '75%' }} />
                        </div>
                      </div>
                    </div>

                    {/* MOS Compare */}
                    <div>
                      <div className="flex justify-between text-zinc-300 mb-1">
                        <span>Margin of Safety</span>
                        <span className="font-mono">
                          {valuation?.mos ? `${valuation.mos.toFixed(1)}%` : '-'} vs{' '}
                          {peerValuationB?.mos ? `${peerValuationB.mos.toFixed(1)}%` : '-'}
                        </span>
                      </div>
                      <div className="flex gap-2 h-2">
                        <div className="flex-1 bg-blue-500/20 rounded-full overflow-hidden">
                          <div className="bg-blue-500 h-full rounded-full" style={{ width: '70%' }} />
                        </div>
                        <div className="flex-1 bg-purple-500/20 rounded-full overflow-hidden">
                          <div className="bg-purple-500 h-full rounded-full" style={{ width: '60%' }} />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ==================== TAB 2: SCREENER (FULL TABLE & ADVANCED FILTERS) ==================== */}
        {activeTab === 'Screener' && (
          <div className="bg-[#151518] border border-[#232326] rounded-2xl p-5 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-[#232326]">
              <div>
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-blue-400" />
                  Screener Kuantitatif Lengkap
                </h2>
                <p className="text-xs text-zinc-400">Filter berdasarkan rasio finansial terverifikasi.</p>
              </div>
              <div className="flex items-center gap-2">
                <select
                  value={sectorFilter}
                  onChange={(e) => setSectorFilter(e.target.value)}
                  className="bg-[#1A1A1E] border border-[#2A2A30] text-xs text-zinc-200 rounded-xl px-3 py-1.5"
                >
                  <option value="Semua">Semua Sektor</option>
                  <option value="Financial">Financial Services</option>
                  <option value="Energy">Energy</option>
                  <option value="Industrials">Industrials</option>
                  <option value="Communication">Communication</option>
                  <option value="Consumer">Consumer</option>
                </select>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-[#232326] text-xs font-bold text-zinc-400 uppercase tracking-wider">
                    <th className="py-3 px-3 cursor-pointer" onClick={() => { setSortCol('ticker'); setSortAsc(!sortAsc); }}>
                      Ticker
                    </th>
                    <th className="py-3 px-3">Nama Emiten</th>
                    <th className="py-3 px-3 text-right cursor-pointer" onClick={() => { setSortCol('price'); setSortAsc(!sortAsc); }}>
                      Harga
                    </th>
                    <th className="py-3 px-3 text-right cursor-pointer" onClick={() => { setSortCol('per'); setSortAsc(!sortAsc); }}>
                      PER
                    </th>
                    <th className="py-3 px-3 text-right cursor-pointer" onClick={() => { setSortCol('roe'); setSortAsc(!sortAsc); }}>
                      ROE (%)
                    </th>
                    <th className="py-3 px-3 text-right cursor-pointer" onClick={() => { setSortCol('dy'); setSortAsc(!sortAsc); }}>
                      Dividend (%)
                    </th>
                    <th className="py-3 px-3">Moat</th>
                    <th className="py-3 px-3">Bandarmology</th>
                    <th className="py-3 px-3 text-center">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1F1F24] text-xs">
                  {filteredStocks.map((s) => (
                    <tr key={s.ticker} className="hover:bg-[#1A1A1E] transition-colors">
                      <td className="py-3 px-3 font-bold text-white">{s.ticker}</td>
                      <td className="py-3 px-3 text-zinc-300 max-w-[200px] truncate">{s.name}</td>
                      <td className="py-3 px-3 text-right font-mono font-semibold text-white">
                        {s.price > 0 ? `Rp ${s.price.toLocaleString('id-ID')}` : '-'}
                      </td>
                      <td className="py-3 px-3 text-right font-mono text-zinc-300">
                        {s.per ? `${s.per.toFixed(1)}x` : '-'}
                      </td>
                      <td className="py-3 px-3 text-right font-mono font-semibold text-emerald-400">
                        {s.roe ? `${s.roe.toFixed(1)}%` : '-'}
                      </td>
                      <td className="py-3 px-3 text-right font-mono text-blue-400">
                        {s.dy ? `${s.dy.toFixed(1)}%` : '-'}
                      </td>
                      <td className="py-3 px-3 text-zinc-300">{s.moat}</td>
                      <td className="py-3 px-3">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-zinc-800 text-zinc-300">
                          {s.bandarmology}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-center">
                        <button
                          onClick={() => {
                            setSelectedTicker(s.ticker);
                            setActiveTab('Beranda');
                          }}
                          className="px-2.5 py-1 rounded-lg bg-blue-600/20 text-blue-400 hover:bg-blue-600/30 text-xs font-semibold"
                        >
                          Buka Cockpit
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ==================== TAB 3: FUNDAMENTAL DEEP DIVE ==================== */}
        {activeTab === 'Fundamental' && (
          <div className="space-y-6">
            <div className="bg-[#151518] border border-[#232326] rounded-2xl p-6">
              <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-[#232326]">
                <div>
                  <h2 className="text-xl font-extrabold text-white flex items-center gap-2">
                    <FileText className="w-5 h-5 text-blue-400" />
                    Deep Dive Fundamental: {selectedTicker}
                  </h2>
                  <p className="text-xs text-zinc-400 mt-1">{detail?.name} • {detail?.sector}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-zinc-400">Pilih Emiten:</span>
                  <select
                    value={selectedTicker}
                    onChange={(e) => setSelectedTicker(e.target.value)}
                    className="bg-[#1A1A1E] border border-[#2A2A30] text-xs text-white rounded-xl px-3 py-1.5 font-bold"
                  >
                    {['BBCA', 'BBRI', 'BMRI', 'BBNI', 'TLKM', 'ASII', 'ADRO', 'UNTR', 'BSSR'].map((t) => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Company Description */}
              <div className="mt-4 p-4 rounded-xl bg-[#1A1A1E] border border-[#26262B] text-xs text-zinc-300 leading-relaxed">
                <span className="font-bold text-white block mb-1">Profil Bisnis:</span>
                {detail?.description || 'Profil bisnis emiten resmi terdaftar di Bursa Efek Indonesia.'}
              </div>

              {/* 4-Year Financial Statements Table */}
              <div className="mt-6">
                <h3 className="text-sm font-bold text-white mb-3">Ringkasan Laporan Keuangan 4 Tahun (Audited LK)</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-[#26262B] text-[11px] font-semibold text-zinc-400 uppercase">
                        <th className="py-2.5 px-3">Tahun Buku</th>
                        <th className="py-2.5 px-3 text-right">Pendapatan (Revenue)</th>
                        <th className="py-2.5 px-3 text-right">Laba Bersih (Net Income)</th>
                        <th className="py-2.5 px-3 text-right">Net Profit Margin</th>
                        <th className="py-2.5 px-3 text-right">ROE (%)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#222228] font-mono">
                      {detail?.annualData && detail.annualData.map((obs) => (
                        <tr key={obs.fiscalYear} className="hover:bg-[#1C1C22]">
                          <td className="py-3 px-3 font-bold text-white">{obs.fiscalYear}</td>
                          <td className="py-3 px-3 text-right text-zinc-200">
                            Rp {(obs.revenue / 1e12).toFixed(2)} Triliun
                          </td>
                          <td className="py-3 px-3 text-right text-emerald-400 font-semibold">
                            Rp {(obs.netIncome / 1e12).toFixed(2)} Triliun
                          </td>
                          <td className="py-3 px-3 text-right text-zinc-300">
                            {obs.netMarginPct ? `${obs.netMarginPct.toFixed(1)}%` : '-'}
                          </td>
                          <td className="py-3 px-3 text-right text-emerald-400 font-bold">
                            {obs.roePct ? `${obs.roePct.toFixed(1)}%` : '-'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Moat Verification Checklist */}
              {detail?.moatChecks && detail.moatChecks.length > 0 && (
                <div className="mt-6 p-4 rounded-xl bg-blue-500/10 border border-blue-500/20">
                  <h4 className="text-xs font-bold text-blue-300 mb-2">Checklist Daya Tahan Moat Kuantitatif</h4>
                  <div className="space-y-2">
                    {detail.moatChecks.map((check) => (
                      <div key={check.key} className="flex items-start gap-2 text-xs text-zinc-300">
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                        <div>
                          <span className="font-bold text-white">{check.label}: </span>
                          <span>{check.detail}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ==================== TAB 4: VALUASI / DCF ==================== */}
        {activeTab === 'Valuasi' && (
          <div className="space-y-6">
            <div className="bg-[#151518] border border-[#232326] rounded-2xl p-6">
              <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-[#232326]">
                <div>
                  <h2 className="text-xl font-extrabold text-white flex items-center gap-2">
                    <Scale className="w-5 h-5 text-emerald-400" />
                    Kalkulator & Model Valuasi: {selectedTicker}
                  </h2>
                  <p className="text-xs text-zinc-400 mt-1">Multi-model intrinsic valuation teruji.</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-zinc-400">Pilih Emiten:</span>
                  <select
                    value={selectedTicker}
                    onChange={(e) => setSelectedTicker(e.target.value)}
                    className="bg-[#1A1A1E] border border-[#2A2A30] text-xs text-white rounded-xl px-3 py-1.5 font-bold"
                  >
                    {['BBCA', 'BBRI', 'BMRI', 'TLKM', 'ASII', 'ADRO', 'UNTR', 'BSSR'].map((t) => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Sensitivity Matrix Table (For Non-Banks) */}
              {sensitivityMatrix && (
                <div className="mt-6">
                  <h3 className="text-sm font-bold text-white mb-2">Matriks Sensitivitas DCF (WACC vs Pertumbuhan)</h3>
                  <p className="text-xs text-zinc-400 mb-3">Estimasi Nilai Intrinsik pada berbagai skenario suku bunga dan ekspansi.</p>
                  <div className="overflow-x-auto">
                    <table className="w-full text-center border-collapse text-xs font-mono">
                      <thead>
                        <tr className="border-b border-[#26262B] bg-[#1A1A1E] text-zinc-400">
                          <th className="py-2.5 px-3">WACC \ Growth</th>
                          <th className="py-2.5 px-3">6%</th>
                          <th className="py-2.5 px-3">8%</th>
                          <th className="py-2.5 px-3">10%</th>
                          <th className="py-2.5 px-3">12%</th>
                          <th className="py-2.5 px-3">14%</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#222228]">
                        {sensitivityMatrix.map((row) => (
                          <tr key={row.wacc} className="hover:bg-[#1D1D24]">
                            <td className="py-2.5 px-3 font-bold text-zinc-300 bg-[#17171C]">{row.wacc}%</td>
                            {row.values.map((v, i) => (
                              <td key={i} className="py-2.5 px-3 text-white">
                                {v ? `Rp ${v.toLocaleString('id-ID')}` : '-'}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ==================== TAB 5: COMPARE ==================== */}
        {activeTab === 'Compare' && (
          <div className="bg-[#151518] border border-[#232326] rounded-2xl p-6 space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-[#232326]">
              <div>
                <h2 className="text-xl font-extrabold text-white flex items-center gap-2">
                  <Layers className="w-5 h-5 text-purple-400" />
                  Head-to-Head Perbandingan Peer
                </h2>
                <p className="text-xs text-zinc-400 mt-1">Bandingkan rasio kualitas, profitabilitas, dan valuasi.</p>
              </div>

              <div className="flex items-center gap-3">
                <select
                  value={peerTickerA}
                  onChange={(e) => setPeerTickerA(e.target.value)}
                  className="bg-[#1A1A1E] border border-[#2A2A30] text-xs text-white rounded-xl px-3 py-1.5 font-bold"
                >
                  {['BBCA', 'BMRI', 'ASII', 'TLKM', 'ADRO'].map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
                <span className="text-xs font-bold text-zinc-500">VS</span>
                <select
                  value={peerTickerB}
                  onChange={(e) => setPeerTickerB(e.target.value)}
                  className="bg-[#1A1A1E] border border-[#2A2A30] text-xs text-white rounded-xl px-3 py-1.5 font-bold"
                >
                  {['BBRI', 'BBNI', 'UNTR', 'BSSR'].map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Side by Side Comparison Grid */}
            <div className="grid grid-cols-2 gap-4 text-center">
              <div className="bg-[#1A1A1E] border border-[#26262B] p-4 rounded-xl space-y-2">
                <span className="text-base font-extrabold text-blue-400">{peerTickerA}</span>
                <div className="text-xs text-zinc-400">{peerValuationA?.sector}</div>
                <div className="text-xl font-mono font-extrabold text-white">
                  {peerValuationA?.price ? `Rp ${peerValuationA.price.toLocaleString('id-ID')}` : '-'}
                </div>
                <div className="pt-2 text-xs space-y-1 text-zinc-300">
                  <div>ROE: <span className="font-bold text-emerald-400">{peerValuationA?.roe ? `${peerValuationA.roe.toFixed(1)}%` : '-'}</span></div>
                  <div>MOS: <span className="font-bold text-blue-400">{peerValuationA?.mos ? `${peerValuationA.mos.toFixed(1)}%` : '-'}</span></div>
                </div>
              </div>

              <div className="bg-[#1A1A1E] border border-[#26262B] p-4 rounded-xl space-y-2">
                <span className="text-base font-extrabold text-purple-400">{peerTickerB}</span>
                <div className="text-xs text-zinc-400">{peerValuationB?.sector}</div>
                <div className="text-xl font-mono font-extrabold text-white">
                  {peerValuationB?.price ? `Rp ${peerValuationB.price.toLocaleString('id-ID')}` : '-'}
                </div>
                <div className="pt-2 text-xs space-y-1 text-zinc-300">
                  <div>ROE: <span className="font-bold text-emerald-400">{peerValuationB?.roe ? `${peerValuationB.roe.toFixed(1)}%` : '-'}</span></div>
                  <div>MOS: <span className="font-bold text-purple-400">{peerValuationB?.mos ? `${peerValuationB.mos.toFixed(1)}%` : '-'}</span></div>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* 4. LENSAI ASSISTANT DRAWER */}
      {showAiDrawer && (
        <aside aria-label="LensAI Chat Assistant" className="fixed inset-y-0 right-0 z-50 w-full sm:w-[440px] bg-[#121216] border-l border-[#26262C] shadow-2xl flex flex-col">
          <div className="p-4 border-b border-[#232328] flex items-center justify-between bg-[#15151A]">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-blue-600 flex items-center justify-center text-white">
                <Bot className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-white">LensAI Assistant</h4>
                <div className="text-[10px] text-emerald-400 font-medium flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  Konteks Aktif: {selectedTicker}
                </div>
              </div>
            </div>
            <button onClick={() => setShowAiDrawer(false)} className="p-1 rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-white">
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-3 text-xs">
            {aiMessages.map((msg, idx) => (
              <div
                key={idx}
                className={`p-3 rounded-xl leading-relaxed ${
                  msg.role === 'user'
                    ? 'bg-blue-600/20 border border-blue-500/30 text-white ml-6'
                    : 'bg-[#18181D] border border-[#26262B] text-zinc-200 mr-6 whitespace-pre-wrap'
                }`}
              >
                <span className="font-bold block mb-1 text-[10px] text-zinc-400 uppercase">
                  {msg.role === 'user' ? 'Anda' : 'LensAI'}
                </span>
                {msg.text}
              </div>
            ))}
            {aiLoading && (
              <div className="p-3 rounded-xl bg-[#18181D] border border-[#26262B] text-zinc-400 flex items-center gap-2">
                <RefreshCw className="w-3.5 h-3.5 animate-spin text-blue-400" />
                <span>LensAI sedang mengkaji data laporan keuangan...</span>
              </div>
            )}
          </div>

          <div className="p-3 border-t border-[#232328] bg-[#15151A]">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleAskLensAi();
              }}
              className="flex gap-2"
            >
              <input
                type="text"
                value={aiPrompt}
                onChange={(e) => setAiPrompt(e.target.value)}
                placeholder={`Tanya LensAI tentang ${selectedTicker}...`}
                className="flex-1 bg-[#1A1A1E] border border-[#2A2A30] rounded-xl px-3 py-2 text-xs text-white placeholder:text-zinc-500 focus:outline-none focus:border-blue-500"
              />
              <button
                type="submit"
                disabled={aiLoading || !aiPrompt.trim()}
                className="px-3 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-xl text-xs font-semibold"
              >
                Kirim
              </button>
            </form>
          </div>
        </aside>
      )}
    </div>
  );
}
