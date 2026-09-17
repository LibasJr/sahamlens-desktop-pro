export const API_BASE = (import.meta.env.VITE_API_BASE_URL || 'https://sahamlens.id').replace(/\/+$/, '');

export interface IndexItem {
  symbol: string;
  name: string;
  fullName: string;
  price: number;
  changePct: number;
  sparkline: number[];
}

export interface MarketRegime {
  score: number;
  regime: { code: string; label: string; posture: string };
  fearGreed: { code: string; label: string };
  summary: string;
}

export interface StockItem {
  ticker: string;
  name: string;
  sector: string;
  price: number;
  changePct: number;
  per: number | null;
  pbv: number | null;
  roe: number | null;
  dy: number | null;
  moat: string;
  bandarmology: string;
  signal: string;
  entry?: number;
  tp1?: number;
  cl1?: number;
  rr?: string;
  reason?: string;
  marketCap?: number;
  sourceType?: string;
}

export interface AnnualObservation {
  fiscalYear: number;
  revenue: number;
  netIncome: number;
  roePct: number | null;
  netMarginPct: number | null;
  operatingMarginPct?: number | null;
}

export interface ChartHistoryItem {
  time: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface StockDetail {
  ticker: string;
  name: string;
  sector: string;
  industry: string;
  description: string;
  price: number;
  trailingPE: number | null;
  priceToBook: number | null;
  returnOnEquity: number | null;
  dividendYield: number | null;
  marketCap: number | null;
  totalRevenue: number | null;
  moatStatus: string;
  moatYears: number;
  moatConclusion: string;
  moatChecks: Array<{ key: string; label: string; detail: string; verdict: string }>;
  annualData: AnnualObservation[];
}

export interface ValuationMethod {
  name: string;
  value: number;
  color: string;
}

export interface ValuationData {
  ticker: string;
  sector: string;
  price: number;
  eps: number | null;
  bvps: number | null;
  roe: number | null;
  dps: number | null;
  fcfPerShare: number | null;
  fairValue: number;
  mos: number;
  methods: Record<string, ValuationMethod>;
  isBank: boolean;
}

export async function fetchMarketPulse(): Promise<{ indices: IndexItem[]; marketRegime: MarketRegime | null }> {
  try {
    const res = await fetch(`${API_BASE}/api/market-pulse`);
    const data = await res.json();
    return {
      indices: Array.isArray(data.indices) ? data.indices : [],
      marketRegime: data.marketRegime || null,
    };
  } catch (err) {
    console.error('Failed fetching market pulse:', err);
    return { indices: [], marketRegime: null };
  }
}

export async function fetchBreakoutRadar(): Promise<any[]> {
  try {
    const res = await fetch(`${API_BASE}/api/breakout-radar`);
    const json = await res.json();
    return Array.isArray(json.data) ? json.data : [];
  } catch (err) {
    console.error('Failed fetching breakout radar:', err);
    return [];
  }
}

export async function fetchScreener(): Promise<any[]> {
  try {
    const res = await fetch(`${API_BASE}/api/screener`);
    const json = await res.json();
    return json?.data?.analysis?.top_10_stocks || [];
  } catch (err) {
    console.error('Failed fetching screener:', err);
    return [];
  }
}

export async function fetchStockFundamental(ticker: string): Promise<StockDetail | null> {
  try {
    const res = await fetch(`${API_BASE}/api/fundamental/${ticker}`);
    const data = await res.json();
    if (!data || !data.profile) return null;

    const rawFund = data.fundamentals || {};
    const moatDur = data.moatDurability || {};
    const annualObs: AnnualObservation[] = data.annualEarnings?.observations || [];

    return {
      ticker,
      name: data.stock?.name || data.profile.industry || ticker,
      sector: data.profile.sector || 'Umum',
      industry: data.profile.industry || '',
      description: data.profile.description || '',
      price: Number(data.price) || 0,
      trailingPE: rawFund.trailingPE ? Number(rawFund.trailingPE) : null,
      priceToBook: rawFund.priceToBook ? Number(rawFund.priceToBook) : null,
      returnOnEquity: rawFund.returnOnEquity ? Number(rawFund.returnOnEquity) * 100 : null,
      dividendYield: rawFund.dividendYield ? Number(rawFund.dividendYield) * 100 : null,
      marketCap: rawFund.marketCap ? Number(rawFund.marketCap) : null,
      totalRevenue: rawFund.totalRevenue ? Number(rawFund.totalRevenue) : null,
      moatStatus: moatDur.status || 'TERVERIFIKASI',
      moatYears: moatDur.yearsAboveCostOfEquity || 4,
      moatConclusion: moatDur.conclusion || '',
      moatChecks: moatDur.checks || [],
      annualData: annualObs,
    };
  } catch (err) {
    console.error(`Failed fetching fundamental for ${ticker}:`, err);
    return null;
  }
}

export async function fetchStockIntrinsic(ticker: string): Promise<ValuationData | null> {
  try {
    const res = await fetch(`${API_BASE}/api/intrinsic/${ticker}`);
    const data = await res.json();
    if (!data || !data.methods) return null;

    const isFinancial = data.sektor === 'Financial Services' || data.fcf_per_share === null;
    return {
      ticker,
      sector: data.sektor || 'Umum',
      price: Number(data.harga) || 0,
      eps: data.eps ? Number(data.eps) : null,
      bvps: data.bvps ? Number(data.bvps) : null,
      roe: data.roe ? Number(data.roe) : null,
      dps: data.dps ? Number(data.dps) : null,
      fcfPerShare: data.fcf_per_share ? Number(data.fcf_per_share) : null,
      fairValue: Number(data.fair_value) || 0,
      mos: Number(data.mos) || 0,
      methods: data.methods || {},
      isBank: isFinancial,
    };
  } catch (err) {
    console.error(`Failed fetching intrinsic for ${ticker}:`, err);
    return null;
  }
}

export async function fetchStockChart(ticker: string): Promise<ChartHistoryItem[]> {
  try {
    const res = await fetch(`${API_BASE}/api/public-chart/${ticker}`);
    const data = await res.json();
    return Array.isArray(data.history) ? data.history : [];
  } catch (err) {
    console.error(`Failed fetching chart for ${ticker}:`, err);
    return [];
  }
}

export async function searchTickers(query: string): Promise<Array<{ symbol: string; name: string }>> {
  if (!query.trim()) return [];
  try {
    const res = await fetch(`${API_BASE}/api/tickers/search?q=${encodeURIComponent(query)}`);
    const json = await res.json();
    if (json?.ok && Array.isArray(json?.data?.items)) {
      return json.data.items.slice(0, 8);
    }
    return [];
  } catch (err) {
    return [];
  }
}

export async function sendChatMessage(prompt: string, symbol: string, context?: string): Promise<string> {
  try {
    const res = await fetch(`${API_BASE}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt, symbol, context }),
    });
    const data = await res.json();
    return data.content || data.reply || 'Data berhasil diproses oleh LensAI.';
  } catch (err) {
    return 'Koneksi ke API SahamLens sedang sibuk. Silakan coba kembali.';
  }
}
