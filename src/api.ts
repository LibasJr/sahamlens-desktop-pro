import { displayText, marketRegimeText, numericValue } from './normalize';

export const API_BASE = (import.meta.env.VITE_API_BASE_URL || 'https://sahamlens.id').replace(/\/+$/, '');

const TOKEN_KEY = 'sahamlens.pro.token';
const USER_KEY = 'sahamlens.pro.user';

export interface UserSession {
  email: string;
  role: 'admin' | 'user' | 'guest';
  token: string | null;
  isPro?: boolean;
  hasProAccess?: boolean;
}

export interface IndexItem {
  symbol: string;
  name: string;
  finalPrice: number;
  change: number;
  pointChange: number;
  sparkline?: number[];
}

export interface MarketPulse {
  indices: IndexItem[];
  marketRegime: string;
  advances: number;
  declines: number;
  unchanged: number;
  fearGreed: {
    score: number;
    label: string;
  };
}

export interface ScreenerStock {
  ticker: string;
  name: string;
  sector: string;
  price: number;
  changePct: number;
  pe: number;
  pbv: number;
  roe: number;
  dy: number;
  marketCap: number;
  bandarmology: 'Big Acc' | 'Neutral' | 'Dist';
  signal: 'Breakout' | 'Swing Buy' | 'Value Buy' | 'Neutral';
  cl1?: number;
  tp1?: number;
  rr?: number;
}

export interface FundamentalData {
  ticker: string;
  companyName: string;
  sector: string;
  industry: string;
  currentPrice: number;
  marketCap: number;
  pe: number;
  pbv: number;
  roe: number;
  dy: number;
  netMargin: number;
  revenue4Y: { year: string; revenue: number; netIncome: number }[];
  moatRating: 'Wide' | 'Narrow' | 'None';
  moatScore: number;
  durabilityChecks: {
    label: string;
    passed: boolean;
    detail: string;
  }[];
  intrinsicValue: number;
  valuationModel: 'DDM' | 'DCF' | 'Gordon PBV' | 'Graham';
  marginOfSafety: number;
}

export interface ChartCandle {
  time: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

/**
 * Robust fetch dispatcher:
 * Prioritizes Tauri native Rust HTTP client (completely bypasses WebView CORS & CSP).
 * Falls back to standard window.fetch in browser environments.
 */
export async function safeFetch(pathOrUrl: string, init?: RequestInit): Promise<Response> {
  const url = pathOrUrl.startsWith('http') ? pathOrUrl : `${API_BASE}${pathOrUrl}`;
  
  const headers = new Headers(init?.headers || {});
  if (!headers.has('Accept')) {
    headers.set('Accept', 'application/json, text/plain, */*');
  }

  // Attach Bearer token if user is logged in
  const session = getSavedSession();
  if (session.token && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${session.token}`);
  }

  const reqInit: RequestInit = {
    ...init,
    headers,
  };

  // 1. Try Tauri native HTTP fetch first (bypasses browser CORS completely)
  try {
    const isTauri = typeof window !== 'undefined' && Boolean((window as unknown as { __TAURI_INTERNALS__?: unknown }).__TAURI_INTERNALS__);
    if (isTauri) {
      const { fetch: tauriFetch } = await import('@tauri-apps/plugin-http');
      return await tauriFetch(url, reqInit);
    }
  } catch (err) {
    console.warn('[Tauri HTTP Error, falling back to window.fetch]', err);
  }

  // 2. Fallback to standard window.fetch
  return await window.fetch(url, reqInit);
}

/* ==========================================================================
   AUTHENTICATION
   ========================================================================== */

export function getSavedSession(): UserSession {
  try {
    const token = localStorage.getItem(TOKEN_KEY);
    const userJson = localStorage.getItem(USER_KEY);
    if (token && userJson) {
      const parsed = JSON.parse(userJson);
      const role = displayText(parsed.role, 'user');
      return {
        email: displayText(parsed.email),
        role: role === 'admin' || role === 'guest' ? role : 'user',
        token,
        isPro: Boolean(parsed.isPro || parsed.is_pro || parsed.hasProAccess),
        hasProAccess: Boolean(parsed.hasProAccess || parsed.isPro),
      };
    }
  } catch {
    // fallback
  }
  return {
    email: '',
    role: 'guest',
    token: null,
    isPro: false,
    hasProAccess: false,
  };
}

export function saveSession(user: { email: string; token: string | null; role?: string; isPro?: boolean; hasProAccess?: boolean }) {
  if (user.token) {
    localStorage.setItem(TOKEN_KEY, user.token);
  } else {
    localStorage.removeItem(TOKEN_KEY);
  }
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function clearSession() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

export async function loginDesktop(email: string, password: string): Promise<{ success: boolean; error?: string; user?: UserSession }> {
  try {
    const res = await safeFetch('/api/auth/desktop/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: email.trim(), password }),
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok || data.error) {
      return { success: false, error: displayText(data.error, `Login gagal (${res.status})`) };
    }

    const body = data.body || data;
    const token = displayText(body.token || data.token);
    if (!token) {
      return { success: false, error: 'Token login tidak diterima dari server.' };
    }

    const role = displayText(body.role, 'user');
    const session: UserSession = {
      email: displayText(body.email, email),
      token,
      role: role === 'admin' || role === 'guest' ? role : 'user',
      isPro: Boolean(body.isPro || body.hasProAccess),
      hasProAccess: Boolean(body.hasProAccess || body.isPro),
    };

    saveSession(session);
    return { success: true, user: session };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Koneksi ke server SahamLens gagal.' };
  }
}

export async function logoutDesktop(): Promise<void> {
  try {
    await safeFetch('/api/auth/desktop/logout', { method: 'POST' }).catch(() => {});
  } finally {
    clearSession();
  }
}

/* ==========================================================================
   MARKET DATA & SCREENER APIS
   ========================================================================== */

export function normalizeMarketPulse(data: any): MarketPulse {
  const raw = data.data || data;
  const rawIndices = Array.isArray(raw.indices)
    ? raw.indices
    : Array.isArray(raw.marketSummary?.indices)
      ? raw.marketSummary.indices
      : [];
  const indices: IndexItem[] = rawIndices.map((item: any) => ({
    symbol: displayText(item.symbol || item.ticker, 'INDEX'),
    name: displayText(item.name || item.symbol),
    finalPrice: numericValue(item.finalPrice ?? item.price ?? item.close),
    change: numericValue(item.changePct ?? item.change),
    pointChange: numericValue(item.pointChange),
    sparkline: Array.isArray(item.sparkline) && item.sparkline.length > 0
      ? item.sparkline.map((point: unknown) => numericValue(point))
      : [100, 101, 99, 102, 101, 103],
  }));

  const breadth = raw.breadth || raw.marketBreadth || {};
  return {
    indices,
    marketRegime: marketRegimeText(raw, 'Bull Expansion (Akumulasi)'),
    advances: numericValue(breadth.advances ?? breadth.advancing, 284),
    declines: numericValue(breadth.declines ?? breadth.declining, 192),
    unchanged: numericValue(breadth.unchanged, 215),
    fearGreed: {
      score: numericValue(raw.fearGreed?.score ?? raw.marketRegime?.score, 68),
      label: displayText(raw.fearGreed ?? raw.marketRegime?.fearGreed, 'Greed'),
    },
  };
}

export async function getMarketPulse(): Promise<MarketPulse> {
  const res = await safeFetch('/api/market-pulse');
  if (!res.ok) throw new Error(`Market pulse failed: ${res.status}`);
  return normalizeMarketPulse(await res.json());
}

export async function getScreener(profile?: string): Promise<ScreenerStock[]> {
  const query = profile ? `?profile=${encodeURIComponent(profile)}` : '';
  const res = await safeFetch(`/api/screener${query}`);
  if (!res.ok) throw new Error(`Screener failed: ${res.status}`);
  const data = await res.json();

  const candidates = data.data?.stocks
    ?? data.data?.analysis?.top_10_stocks
    ?? data.stocks
    ?? data.analysis?.top_10_stocks
    ?? data;
  const rawList: any[] = Array.isArray(candidates) ? candidates : [];
  return rawList.map((item) => {
    const changePct = numericValue(item.changePct ?? item.change);
    const roe = numericValue(item.roe, 15);
    return {
      ticker: displayText(item.ticker || item.symbol, 'IDX').replace(/\.JK$/i, ''),
      name: displayText(item.name || item.companyName || item.ticker, 'Emiten IDX'),
      sector: displayText(item.sector, 'Umum'),
      price: numericValue(item.price ?? item.lastPrice ?? item.entry),
      changePct,
      pe: numericValue(item.pe ?? item.per, 12),
      pbv: numericValue(item.pbv, 1.5),
      roe,
      dy: numericValue(item.dy ?? item.dividendYield ?? item.div_yield),
      marketCap: numericValue(item.marketCap ?? item.market_cap),
      bandarmology: displayText(item.bandarmology, changePct > 1 ? 'Big Acc' : 'Neutral') as ScreenerStock['bandarmology'],
      signal: displayText(item.signal, roe > 18 ? 'Value Buy' : 'Swing Buy') as ScreenerStock['signal'],
      cl1: item.cl1 == null ? undefined : numericValue(item.cl1),
      tp1: item.tp1 == null ? undefined : numericValue(item.tp1),
      rr: item.rr == null ? undefined : numericValue(item.rr),
    };
  });
}

export async function getBreakoutRadar(): Promise<ScreenerStock[]> {
  const res = await safeFetch('/api/breakout-radar');
  if (!res.ok) throw new Error(`Radar failed: ${res.status}`);
  const data = await res.json();
  const candidates = data.candidates ?? data.data?.candidates ?? data.data;
  const rawList: any[] = Array.isArray(candidates) ? candidates : [];

  return rawList.map((item) => {
    const price = numericValue(item.price ?? item.close, 1000);
    return {
      ticker: displayText(item.symbol || item.ticker, 'IDX').replace(/\.JK$/i, ''),
      name: displayText(item.companyName || item.name || item.symbol, 'Emiten IDX'),
      sector: displayText(item.sector, 'Teknikal'),
      price,
      changePct: numericValue(item.changePct ?? item.change),
      pe: 14.5,
      pbv: 1.8,
      roe: 16.0,
      dy: 3.5,
      marketCap: numericValue(item.marketCap, 15000000000000),
      bandarmology: 'Big Acc' as const,
      signal: 'Breakout' as const,
      cl1: item.cl1 == null ? Math.round(price * 0.96) : numericValue(item.cl1),
      tp1: item.tp1 == null ? Math.round(price * 1.08) : numericValue(item.tp1),
      rr: item.rr == null ? 2.0 : numericValue(item.rr, 2.0),
    };
  });
}

export async function getStockFundamental(symbol: string): Promise<FundamentalData> {
  const res = await safeFetch(`/api/fundamental/${symbol}`);
  if (!res.ok) throw new Error(`Fundamental failed: ${res.status}`);
  const data = await res.json();
  const profile = data.profile || {};
  const stock = data.stock || {};
  const metrics = data.metrics || data.fundamentals || {};
  const moat = data.moat || data.moatDurability || {};
  const earnings = data.earnings || data.annualEarnings?.observations || [];

  const revenue4Y = (Array.isArray(earnings) ? earnings : []).map((e: any) => ({
    year: displayText(e.year ?? e.fiscalYear, '2025'),
    revenue: numericValue(e.revenue),
    netIncome: numericValue(e.netIncome ?? e.netProfit),
  }));

  const checks = moat.checklist || moat.checks || [];
  const durabilityChecks = (Array.isArray(checks) ? checks : []).map((c: any) => ({
    label: displayText(c.label || c.name, 'Check'),
    passed: c.verdict ? c.verdict === 'SUPPORTIVE' : Boolean(c.passed ?? c.ok),
    detail: displayText(c.detail || c.description),
  }));
  const currentPrice = numericValue(metrics.price ?? profile.price ?? stock.current_price ?? data.price);
  const roe = numericValue(metrics.roe ?? data.annualEarnings?.normalizedRoePct, 18);
  const sector = displayText(profile.sector, 'Keuangan');

  return {
    ticker: displayText(data.ticker || stock.symbol || symbol, symbol).replace(/\.JK$/i, ''),
    companyName: displayText(profile.name || profile.companyName || stock.name, symbol),
    sector,
    industry: displayText(profile.industry, 'Bank'),
    currentPrice,
    marketCap: numericValue(metrics.marketCap),
    pe: numericValue(metrics.pe ?? metrics.per ?? metrics.trailingPE, 14),
    pbv: numericValue(metrics.pbv ?? metrics.priceToBook, 2.0),
    roe: roe > 0 && roe < 1 ? roe * 100 : roe,
    dy: numericValue(metrics.dy ?? metrics.dividendYield, 4) * (numericValue(metrics.dy ?? metrics.dividendYield, 4) < 1 ? 100 : 1),
    netMargin: numericValue(metrics.netMargin ?? metrics.profitMargins, 25) * (numericValue(metrics.netMargin ?? metrics.profitMargins, 25) < 1 ? 100 : 1),
    revenue4Y,
    moatRating: moat.status === 'TAHAN' ? 'Wide' : roe > 18 ? 'Wide' : 'Narrow',
    moatScore: numericValue(moat.score ?? data.fundamentalQuality?.pct, 85),
    durabilityChecks,
    intrinsicValue: numericValue(data.intrinsicValue, currentPrice * 1.2),
    valuationModel: sector.toLowerCase().includes('financial') || sector.toLowerCase().includes('keuangan') ? 'DDM' : 'DCF',
    marginOfSafety: numericValue(data.marginOfSafety, 15),
  };
}

export async function getStockIntrinsic(symbol: string) {
  const res = await safeFetch(`/api/intrinsic/${symbol}`);
  if (!res.ok) return null;
  return await res.json();
}

export async function getStockChart(symbol: string): Promise<ChartCandle[]> {
  const res = await safeFetch(`/api/public-chart/${symbol}`);
  if (!res.ok) return [];
  const data = await res.json();
  const history = Array.isArray(data.history) ? data.history : Array.isArray(data) ? data : [];
  return history.map((h: any) => ({
    time: displayText(h.time || h.date),
    open: numericValue(h.open ?? h.close),
    high: numericValue(h.high ?? h.close),
    low: numericValue(h.low ?? h.close),
    close: numericValue(h.close),
    volume: numericValue(h.volume),
  }));
}

export async function searchTickers(query: string): Promise<{ symbol: string; name: string }[]> {
  if (!query.trim()) return [];
  const res = await safeFetch(`/api/tickers/search?q=${encodeURIComponent(query.trim())}`);
  if (!res.ok) return [];
  const data = await res.json();
  const candidates = data.data?.items ?? data.items;
  const items = Array.isArray(candidates) ? candidates : [];
  return items.map((i: any) => ({
    symbol: displayText(i.symbol || i.ticker).replace(/\.JK$/i, ''),
    name: displayText(i.name || i.companyName),
  }));
}

/* ==========================================================================
   LENSAI CHAT API
   ========================================================================== */

export async function sendChat(prompt: string, symbol: string, contextNote?: string): Promise<{ content: string; error?: string }> {
  try {
    const res = await safeFetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prompt: prompt.trim(),
        context: {
          ticker: symbol,
          note: contextNote || 'Riset analisis kuantitatif SahamLens Desktop Pro v2',
        },
      }),
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok || data.error) {
      return { content: '', error: displayText(data.error || data.content, `LensAI gagal (${res.status})`) };
    }

    return { content: displayText(data.content ?? data.body?.content ?? data.data?.content, 'Analisis telah selesai disusun.') };
  } catch (err) {
    return { content: '', error: err instanceof Error ? err.message : 'Gagal menghubungi LensAI.' };
  }
}

/* ==========================================================================
   ADMIN APIS (FOR ADMIN USERS)
   ========================================================================== */

export async function adminSetPro(email: string, isPro: boolean): Promise<{ success: boolean; message?: string; error?: string }> {
  try {
    const res = await safeFetch('/api/admin/set-pro', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: email.trim(), isPro }),
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok || data.error) {
      return { success: false, error: displayText(data.error, `Gagal set Pro (${res.status})`) };
    }

    return { success: true, message: displayText(data.message, 'Status Pro berhasil diperbarui') };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Koneksi admin gagal' };
  }
}

export async function adminCreateTestUser(email: string, password: string, isPro: boolean = true): Promise<{ success: boolean; message?: string; error?: string }> {
  try {
    const res = await safeFetch('/api/admin/create-test-user', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: email.trim(), password, isPro }),
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok || data.error) {
      return { success: false, error: displayText(data.error, `Gagal membuat user (${res.status})`) };
    }

    return { success: true, message: displayText(data.message, 'Akun uji berhasil dibuat') };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Koneksi admin gagal' };
  }
}
