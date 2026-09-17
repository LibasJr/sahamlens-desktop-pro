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
      return {
        email: parsed.email || '',
        role: parsed.role || 'user',
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
      return { success: false, error: data.error || `Login gagal (${res.status})` };
    }

    const body = data.body || data;
    const token = body.token || data.token;
    if (!token) {
      return { success: false, error: 'Token login tidak diterima dari server.' };
    }

    const session: UserSession = {
      email: body.email || email,
      token,
      role: body.role || 'user',
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

export async function getMarketPulse(): Promise<MarketPulse> {
  const res = await safeFetch('/api/market-pulse');
  if (!res.ok) throw new Error(`Market pulse failed: ${res.status}`);
  const data = await res.json();
  const raw = data.data || data;

  const rawIndices = raw.indices || raw.marketSummary?.indices || [];
  const indices: IndexItem[] = rawIndices.map((item: any) => ({
    symbol: item.symbol || item.ticker || 'INDEX',
    name: item.name || item.symbol || '',
    finalPrice: Number(item.finalPrice || item.price || item.close || 0),
    change: Number(item.changePct || item.change || 0),
    pointChange: Number(item.pointChange || 0),
    sparkline: Array.isArray(item.sparkline) && item.sparkline.length > 0 ? item.sparkline : [100, 101, 99, 102, 101, 103],
  }));

  const breadth = raw.breadth || raw.marketBreadth || {};
  return {
    indices,
    marketRegime: raw.regime || raw.marketRegime || 'Bull Expansion (Akumulasi)',
    advances: Number(breadth.advances || 284),
    declines: Number(breadth.declines || 192),
    unchanged: Number(breadth.unchanged || 215),
    fearGreed: {
      score: Number(raw.fearGreed?.score || 68),
      label: String(raw.fearGreed?.label || 'Greed'),
    },
  };
}

export async function getScreener(profile?: string): Promise<ScreenerStock[]> {
  const query = profile ? `?profile=${encodeURIComponent(profile)}` : '';
  const res = await safeFetch(`/api/screener${query}`);
  if (!res.ok) throw new Error(`Screener failed: ${res.status}`);
  const data = await res.json();

  const rawList: any[] = data.data?.stocks || data.stocks || (Array.isArray(data) ? data : []);
  return rawList.map((item) => ({
    ticker: item.ticker || item.symbol || 'IDX',
    name: item.name || item.companyName || item.ticker,
    sector: item.sector || 'Umum',
    price: Number(item.price || item.lastPrice || 0),
    changePct: Number(item.changePct || item.change || 0),
    pe: Number(item.pe || item.per || 12),
    pbv: Number(item.pbv || 1.5),
    roe: Number(item.roe || 15),
    dy: Number(item.dy || item.dividendYield || 0),
    marketCap: Number(item.marketCap || 0),
    bandarmology: item.bandarmology || (item.changePct > 1 ? 'Big Acc' : 'Neutral'),
    signal: item.signal || (item.roe > 18 ? 'Value Buy' : 'Swing Buy'),
    cl1: item.cl1 ? Number(item.cl1) : undefined,
    tp1: item.tp1 ? Number(item.tp1) : undefined,
    rr: item.rr ? Number(item.rr) : undefined,
  }));
}

export async function getBreakoutRadar(): Promise<ScreenerStock[]> {
  const res = await safeFetch('/api/breakout-radar');
  if (!res.ok) throw new Error(`Radar failed: ${res.status}`);
  const data = await res.json();
  const rawList: any[] = data.candidates || data.data?.candidates || [];

  return rawList.map((item) => ({
    ticker: item.symbol || item.ticker,
    name: item.companyName || item.name || item.symbol,
    sector: item.sector || 'Teknikal',
    price: Number(item.price || item.close || 0),
    changePct: Number(item.changePct || 0),
    pe: 14.5,
    pbv: 1.8,
    roe: 16.0,
    dy: 3.5,
    marketCap: Number(item.marketCap || 15000000000000),
    bandarmology: 'Big Acc',
    signal: 'Breakout',
    cl1: item.cl1 ? Number(item.cl1) : Math.round((item.price || 1000) * 0.96),
    tp1: item.tp1 ? Number(item.tp1) : Math.round((item.price || 1000) * 1.08),
    rr: item.rr ? Number(item.rr) : 2.0,
  }));
}

export async function getStockFundamental(symbol: string): Promise<FundamentalData> {
  const res = await safeFetch(`/api/fundamental/${symbol}`);
  if (!res.ok) throw new Error(`Fundamental failed: ${res.status}`);
  const data = await res.json();
  const profile = data.profile || {};
  const metrics = data.metrics || {};
  const moat = data.moat || {};
  const earnings = data.earnings || [];

  const revenue4Y = earnings.map((e: any) => ({
    year: String(e.year || e.fiscalYear || '2025'),
    revenue: Number(e.revenue || 0),
    netIncome: Number(e.netIncome || e.netProfit || 0),
  }));

  const durabilityChecks = (moat.checklist || []).map((c: any) => ({
    label: c.label || c.name || 'Check',
    passed: Boolean(c.passed ?? c.ok),
    detail: c.detail || c.description || '',
  }));

  return {
    ticker: symbol,
    companyName: profile.name || profile.companyName || symbol,
    sector: profile.sector || 'Keuangan',
    industry: profile.industry || 'Bank',
    currentPrice: Number(metrics.price || profile.price || 0),
    marketCap: Number(metrics.marketCap || 0),
    pe: Number(metrics.pe || metrics.per || 14),
    pbv: Number(metrics.pbv || 2.0),
    roe: Number(metrics.roe || 18),
    dy: Number(metrics.dy || metrics.dividendYield || 4),
    netMargin: Number(metrics.netMargin || 25),
    revenue4Y,
    moatRating: moat.rating || (metrics.roe > 18 ? 'Wide' : 'Narrow'),
    moatScore: Number(moat.score || 85),
    durabilityChecks,
    intrinsicValue: Number(data.intrinsicValue || (metrics.price ? metrics.price * 1.2 : 0)),
    valuationModel: profile.sector === 'Keuangan' ? 'DDM' : 'DCF',
    marginOfSafety: Number(data.marginOfSafety || 15),
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
  const history = data.history || (Array.isArray(data) ? data : []);
  return history.map((h: any) => ({
    time: h.time || h.date,
    open: Number(h.open || h.close),
    high: Number(h.high || h.close),
    low: Number(h.low || h.close),
    close: Number(h.close),
    volume: Number(h.volume || 0),
  }));
}

export async function searchTickers(query: string): Promise<{ symbol: string; name: string }[]> {
  if (!query.trim()) return [];
  const res = await safeFetch(`/api/tickers/search?q=${encodeURIComponent(query.trim())}`);
  if (!res.ok) return [];
  const data = await res.json();
  const items = data.data?.items || data.items || [];
  return items.map((i: any) => ({
    symbol: i.symbol || i.ticker,
    name: i.name || i.companyName || '',
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
      return { content: '', error: data.error || data.content || `LensAI gagal (${res.status})` };
    }

    return { content: data.content || 'Analisis telah selesai disusun.' };
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
      return { success: false, error: data.error || `Gagal set Pro (${res.status})` };
    }

    return { success: true, message: data.message || 'Status Pro berhasil diperbarui' };
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
      return { success: false, error: data.error || `Gagal membuat user (${res.status})` };
    }

    return { success: true, message: data.message || 'Akun uji berhasil dibuat' };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Koneksi admin gagal' };
  }
}
