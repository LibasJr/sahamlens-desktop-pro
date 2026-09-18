import React, { useState, useEffect, useMemo, useRef } from "react";
import {
  Activity,
  Search,
  ArrowUpRight,
  ArrowDownRight,
  Sparkles,
  ShieldCheck,
  Scale,
  Layers,
  BarChart3,
  X,
  Bot,
  RefreshCw,
  Target,
  AlertTriangle,
  ChevronRight,
  TrendingUp,
  Sliders,
  Maximize2,
  ExternalLink,
  Lock,
  User,
  LogOut,
  LogIn,
  CheckCircle2,
  PieChart,
  ShieldAlert,
  Server,
  UserPlus,
} from "lucide-react";
import {
  API_BASE,
  UserSession,
  IndexItem,
  MarketPulse,
  ScreenerStock,
  FundamentalData,
  ChartCandle,
  TechnicalAnalysis,
  getSavedSession,
  loginDesktop,
  logoutDesktop,
  getMarketPulse,
  getScreener,
  getBreakoutRadar,
  getStockFundamental,
  getStockIntrinsic,
  getStockChart,
  getStockAnalysis,
  searchTickers,
  sendChat,
  adminSetPro,
  adminCreateTestUser,
} from "./api";

export function App() {
  // Navigation
  const [activeTab, setActiveTab] = useState<"Beranda" | "Teknikal" | "Screener" | "Fundamental" | "Valuasi" | "Compare" | "LensAI" | "Admin">("Beranda");
  const [stockDetailTab, setStockDetailTab] = useState<"fundamental" | "teknikal" | "chart">("teknikal");

  // Auth state
  const [session, setSession] = useState<UserSession>(() => getSavedSession());
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);

  // Admin Panel states
  const [adminTargetEmail, setAdminTargetEmail] = useState("");
  const [adminTargetIsPro, setAdminTargetIsPro] = useState(true);
  const [adminProLoading, setAdminProLoading] = useState(false);
  const [adminProMsg, setAdminProMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const [testUserEmail, setTestUserEmail] = useState("");
  const [testUserPassword, setTestUserPassword] = useState("");
  const [testUserIsPro, setTestUserIsPro] = useState(true);
  const [testUserLoading, setTestUserLoading] = useState(false);
  const [testUserMsg, setTestUserMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Market & Stocks data
  const [marketPulse, setMarketPulse] = useState<MarketPulse | null>(null);
  const [screenerUniverse, setScreenerUniverse] = useState<ScreenerStock[]>([]);
  const [selectedStock, setSelectedStock] = useState<string>("BBCA");
  const [stockDetail, setStockDetail] = useState<FundamentalData | null>(null);
  const [stockChart, setStockChart] = useState<ChartCandle[]>([]);
  const [technicalData, setTechnicalData] = useState<TechnicalAnalysis | null>(null);
  const [intrinsicData, setIntrinsicData] = useState<any | null>(null);
  const [loadingDetail, setLoadingDetail] = useState<boolean>(false);
  const [loadingTechnical, setLoadingTechnical] = useState<boolean>(false);
  const [dataError, setDataError] = useState<string | null>(null);

  // DCF Sliders
  const [dcfGrowth, setDcfGrowth] = useState<number>(8.0);
  const [dcfWacc, setDcfWacc] = useState<number>(10.5);

  // Peer Compare state
  const [peerTickerA, setPeerTickerA] = useState<string>("BBCA");
  const [peerTickerB, setPeerTickerB] = useState<string>("BBRI");
  const [peerDataA, setPeerDataA] = useState<FundamentalData | null>(null);
  const [peerDataB, setPeerDataB] = useState<FundamentalData | null>(null);

  // Screener Filters
  const [screenerFilter, setScreenerFilter] = useState<"Semua" | "LQ45" | "Breakout" | "High ROE" | "Dividend">("Semua");
  const [sectorFilter, setSectorFilter] = useState<string>("Semua Sektor");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [searchResults, setSearchResults] = useState<{ symbol: string; name: string }[]>([]);
  const [isSearching, setIsSearching] = useState<boolean>(false);

  // LensAI state
  const [isAiDrawerOpen, setIsAiDrawerOpen] = useState<boolean>(false);
  const [aiChatMessages, setAiChatMessages] = useState<Array<{ role: "user" | "assistant"; text: string; time: string }>>([
    {
      role: "assistant",
      text: "Halo! Saya asisten riset LensAI Desktop Pro v2. Klik salah satu prompt cepat di bawah atau tanyakan apa saja seputar emiten IHSG.",
      time: "Baru saja",
    },
  ]);
  const [aiInputText, setAiInputText] = useState<string>("");
  const [aiLoading, setAiLoading] = useState<boolean>(false);

  // Ref for search debounce
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  /* --------------------------------------------------------------------------
     INITIAL DATA FETCHING
     -------------------------------------------------------------------------- */
  useEffect(() => {
    loadMarketAndScreener();
  }, []);

  const loadMarketAndScreener = async () => {
    try {
      setDataError(null);
      const pulse = await getMarketPulse().catch(() => null);
      if (pulse) setMarketPulse(pulse);

      const [screenerData, radarData] = await Promise.all([
        getScreener().catch(() => []),
        getBreakoutRadar().catch(() => []),
      ]);

      const combinedMap = new Map<string, ScreenerStock>();
      radarData.forEach((s) => combinedMap.set(s.ticker, s));
      screenerData.forEach((s) => {
        if (!combinedMap.has(s.ticker)) combinedMap.set(s.ticker, s);
      });

      if (combinedMap.size === 0) {
        ["BBCA", "BBRI", "BMRI", "TLKM", "ASII", "BSSR", "UNTR", "ICBP"].forEach((t) => {
          combinedMap.set(t, {
            ticker: t,
            name: `${t} Persero Tbk`,
            sector: t.startsWith("B") ? "Keuangan" : "Industri",
            price: 5000,
            changePct: 0.5,
            pe: 12,
            pbv: 1.5,
            roe: 18,
            dy: 4.2,
            marketCap: 100000000000000,
            bandarmology: "Big Acc",
            signal: "Swing Buy",
          });
        });
      }

      setScreenerUniverse(Array.from(combinedMap.values()));
    } catch (err) {
      console.error("[Load Error]", err);
      setDataError("Beberapa data pasar sedang diperbarui.");
    }
  };

  /* --------------------------------------------------------------------------
     SELECTED STOCK DETAILS
     -------------------------------------------------------------------------- */
  useEffect(() => {
    if (!selectedStock) return;
    loadStockDetails(selectedStock);
  }, [selectedStock]);

  const loadStockDetails = async (ticker: string) => {
    setLoadingDetail(true);
    setLoadingTechnical(true);
    try {
      const [fund, chart, intrinsic, tech] = await Promise.all([
        getStockFundamental(ticker).catch(() => null),
        getStockChart(ticker).catch(() => []),
        getStockIntrinsic(ticker).catch(() => null),
        getStockAnalysis(ticker).catch(() => null),
      ]);

      if (fund) setStockDetail(fund);
      setStockChart(chart);
      setIntrinsicData(intrinsic);
      if (tech) setTechnicalData(tech);
    } catch (err) {
      console.error("[Detail Error]", err);
    } finally {
      setLoadingDetail(false);
      setLoadingTechnical(false);
    }
  };

  /* --------------------------------------------------------------------------
     PEER COMPARE FETCH
     -------------------------------------------------------------------------- */
  useEffect(() => {
    if (activeTab === "Compare") {
      loadPeerData();
    }
  }, [activeTab, peerTickerA, peerTickerB]);

  const loadPeerData = async () => {
    const [dataA, dataB] = await Promise.all([
      getStockFundamental(peerTickerA).catch(() => null),
      getStockFundamental(peerTickerB).catch(() => null),
    ]);
    setPeerDataA(dataA);
    setPeerDataB(dataB);
  };

  /* --------------------------------------------------------------------------
     SEARCH AUTOCOMPLETE
     -------------------------------------------------------------------------- */
  const handleSearchChange = (query: string) => {
    setSearchQuery(query);
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);

    if (!query.trim()) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    searchTimeoutRef.current = setTimeout(async () => {
      try {
        const results = await searchTickers(query);
        setSearchResults(results.slice(0, 8));
      } catch {
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    }, 200);
  };

  const handleSelectTicker = (symbol: string) => {
    setSelectedStock(symbol.toUpperCase());
    setSearchQuery("");
    setSearchResults([]);
  };

  /* --------------------------------------------------------------------------
     AUTH / LOGIN HANDLERS
     -------------------------------------------------------------------------- */
  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginEmail.trim() || !loginPassword) {
      setLoginError("Email dan password wajib diisi.");
      return;
    }

    setLoginLoading(true);
    setLoginError(null);

    const result = await loginDesktop(loginEmail, loginPassword);
    setLoginLoading(false);

    if (result.success && result.user) {
      setSession(result.user);
      setIsLoginModalOpen(false);
      setLoginPassword("");
      loadMarketAndScreener();
    } else {
      setLoginError(result.error || "Email atau kata sandi tidak cocok.");
    }
  };

  const handleLogout = async () => {
    await logoutDesktop();
    setSession({ email: "", role: "guest", token: null, isPro: false, hasProAccess: false });
    if (activeTab === "Admin") setActiveTab("Beranda");
  };

  /* --------------------------------------------------------------------------
     ADMIN ACTION HANDLERS
     -------------------------------------------------------------------------- */
  const handleAdminSetPro = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adminTargetEmail.trim()) return;
    setAdminProLoading(true);
    setAdminProMsg(null);

    const res = await adminSetPro(adminTargetEmail, adminTargetIsPro);
    setAdminProLoading(false);
    if (res.success) {
      setAdminProMsg({ type: "success", text: res.message || "Berhasil mengubah status Pro" });
      setAdminTargetEmail("");
    } else {
      setAdminProMsg({ type: "error", text: res.error || "Gagal mengubah status Pro" });
    }
  };

  const handleAdminCreateTestUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!testUserEmail.trim() || !testUserPassword) return;
    setTestUserLoading(true);
    setTestUserMsg(null);

    const res = await adminCreateTestUser(testUserEmail, testUserPassword, testUserIsPro);
    setTestUserLoading(false);
    if (res.success) {
      setTestUserMsg({ type: "success", text: res.message || "Akun berhasil dibuat" });
      setTestUserEmail("");
      setTestUserPassword("");
    } else {
      setTestUserMsg({ type: "error", text: res.error || "Gagal membuat akun uji" });
    }
  };

  /* --------------------------------------------------------------------------
     LENSAI CHAT HANDLER
     -------------------------------------------------------------------------- */
  const handleSendChatMessage = async (presetPrompt?: string) => {
    const query = presetPrompt || aiInputText;
    if (!query.trim() || aiLoading) return;

    const userMsg = {
      role: "user" as const,
      text: query.trim(),
      time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    setAiChatMessages((prev) => [...prev, userMsg]);
    if (!presetPrompt) setAiInputText("");
    setAiLoading(true);

    try {
      const response = await sendChat(query, selectedStock, `Harga: ${stockDetail?.currentPrice || 0}, Sektor: ${stockDetail?.sector || "Umum"}`);
      const botMsg = {
        role: "assistant" as const,
        text: response.error || response.content,
        time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };
      setAiChatMessages((prev) => [...prev, botMsg]);
    } catch {
      setAiChatMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          text: "Maaf, terjadi gangguan koneksi ke server LensAI.",
          time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        },
      ]);
    } finally {
      setAiLoading(false);
    }
  };

  /* --------------------------------------------------------------------------
     CALCULATED VALUES FOR ACTIVE STOCK
     -------------------------------------------------------------------------- */
  const activeStock = useMemo(() => {
    const fromScreener = screenerUniverse.find((s) => s.ticker === selectedStock);
    if (fromScreener) return fromScreener;

    return {
      ticker: selectedStock,
      name: stockDetail?.companyName || `${selectedStock} Tbk`,
      sector: stockDetail?.sector || "Umum",
      price: stockDetail?.currentPrice || 6350,
      changePct: 0.8,
      pe: stockDetail?.pe || 13.5,
      pbv: stockDetail?.pbv || 2.8,
      roe: stockDetail?.roe || 21.8,
      dy: stockDetail?.dy || 4.1,
      marketCap: stockDetail?.marketCap || 780000000000000,
      bandarmology: "Big Acc" as const,
      signal: "Swing Buy" as const,
    };
  }, [selectedStock, screenerUniverse, stockDetail]);

  const tradingRisk = useMemo(() => {
    if (technicalData) {
      const entry = technicalData.tradeSetup.entry;
      const cutLoss = technicalData.tradeSetup.cl1;
      const riskPerShare = entry - cutLoss;
      const tp1 = technicalData.tradeSetup.tp1;
      const tp2 = technicalData.tradeSetup.tp2;
      const rrRatio = technicalData.tradeSetup.riskRewardRatio.toFixed(1);
      return { entry, cutLoss, tp1, tp2, riskPerShare, rrRatio };
    }

    const entry = activeStock.price || 1000;
    const cutLoss = activeStock.cl1 || Math.round(entry * 0.955);
    const riskPerShare = entry - cutLoss;
    const tp1 = activeStock.tp1 || Math.round(entry + riskPerShare * 1.8);
    const tp2 = Math.round(entry + riskPerShare * 2.5);
    const rrRatio = riskPerShare > 0 ? ((tp1 - entry) / riskPerShare).toFixed(1) : "1.8";

    return { entry, cutLoss, tp1, tp2, riskPerShare, rrRatio };
  }, [activeStock, technicalData]);

  const isBankStock = activeStock.sector.toLowerCase().includes("keuangan") || activeStock.sector.toLowerCase().includes("bank");
  
  const dcfCalculated = useMemo(() => {
    if (isBankStock) {
      const eps = (activeStock.price / (activeStock.pe || 12)) || 450;
      const dps = eps * ((activeStock.dy || 4) / 100) || 200;
      const costOfEquity = 0.095;
      const g = 0.05;
      const intrinsic = Math.round(dps * (1 + g) / (costOfEquity - g));
      const mos = Math.round(((intrinsic - activeStock.price) / intrinsic) * 100);
      return { intrinsic, mos, model: "Dividend Discount Model (DDM)" };
    } else {
      const fcfProxy = (activeStock.price * ((activeStock.roe || 15) / 100) * 0.5) || 300;
      const g = dcfGrowth / 100;
      const wacc = Math.max(dcfWacc / 100, g + 0.01);
      const intrinsic = Math.round((fcfProxy * (1 + g)) / (wacc - g) * 3.5);
      const mos = Math.round(((intrinsic - activeStock.price) / intrinsic) * 100);
      return { intrinsic, mos, model: "DCF Perpetuity" };
    }
  }, [activeStock, isBankStock, dcfGrowth, dcfWacc]);

  const filteredScreener = useMemo(() => {
    return screenerUniverse.filter((item) => {
      if (screenerFilter === "LQ45") {
        const lq45List = ["BBCA", "BBRI", "BMRI", "BBNI", "TLKM", "ASII", "UNTR", "ICBP", "AMMN", "ADRO"];
        if (!lq45List.includes(item.ticker)) return false;
      } else if (screenerFilter === "Breakout" && item.signal !== "Breakout") {
        return false;
      } else if (screenerFilter === "High ROE" && item.roe < 18) {
        return false;
      } else if (screenerFilter === "Dividend" && item.dy < 4) {
        return false;
      }

      if (sectorFilter !== "Semua Sektor" && item.sector !== sectorFilter) {
        return false;
      }

      return true;
    });
  }, [screenerUniverse, screenerFilter, sectorFilter]);

  const allSectors = useMemo(() => {
    const s = new Set<string>();
    screenerUniverse.forEach((stock) => {
      if (stock.sector) s.add(stock.sector);
    });
    return ["Semua Sektor", ...Array.from(s)];
  }, [screenerUniverse]);

  const isAdmin = session.role === "admin";

  return (
    <div className="flex flex-col h-screen w-screen bg-[#0A0A0B] text-zinc-100 overflow-hidden font-sans select-none">
      {/* 1. TITLEBAR / HEADER */}
      <header className="h-12 border-b border-zinc-800 bg-[#0E0E12] flex items-center justify-between px-4 shrink-0 z-30">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-emerald-600 to-teal-400 flex items-center justify-center font-black text-black text-sm shadow-md shadow-emerald-950">
              SL
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className="font-extrabold text-sm tracking-tight text-white">SahamLens</span>
              <span className="text-[10px] font-bold tracking-widest uppercase px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                Pro 2.0
              </span>
            </div>
          </div>

          {/* Navigation Tabs */}
          <nav className="flex items-center gap-1 bg-zinc-900/90 p-0.5 rounded-lg border border-zinc-800/80">
            {(["Beranda", "Teknikal", "Screener", "Fundamental", "Valuasi", "Compare", "LensAI"] as const).map((tab) => {
              const active = activeTab === tab;
              return (
                <button
                  key={tab}
                  onClick={() => {
                    if (tab === "LensAI") {
                      setIsAiDrawerOpen(true);
                    } else {
                      setActiveTab(tab);
                    }
                  }}
                  className={`px-3 py-1 text-xs font-semibold rounded-md transition-all ${
                    active
                      ? "bg-zinc-800 text-white shadow-sm"
                      : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/40"
                  }`}
                >
                  {tab}
                </button>
              );
            })}

            {/* KHUSUS USER ADMIN: TAMPILKAN MENU ADMIN */}
            {isAdmin && (
              <button
                onClick={() => setActiveTab("Admin")}
                className={`px-3 py-1 text-xs font-bold rounded-md transition-all flex items-center gap-1.5 ${
                  activeTab === "Admin"
                    ? "bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-sm"
                    : "text-amber-400/80 hover:text-amber-300 hover:bg-amber-500/10"
                }`}
              >
                <ShieldAlert className="w-3.5 h-3.5" />
                <span>Admin</span>
              </button>
            )}
          </nav>
        </div>

        {/* Center: Search Autocomplete */}
        <div className="relative w-72">
          <div className="relative flex items-center">
            <Search className="absolute left-2.5 w-3.5 h-3.5 text-zinc-500" />
            <input
              type="text"
              placeholder="Cari emiten (cth: BBCA, ASII)..."
              value={searchQuery}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="w-full bg-zinc-900/90 border border-zinc-800 rounded-lg pl-8 pr-4 py-1 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-emerald-500/50 transition-colors"
            />
            {isSearching && (
              <RefreshCw className="absolute right-2.5 w-3 h-3 text-zinc-400 animate-spin" />
            )}
          </div>

          {searchResults.length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-1.5 bg-[#121217] border border-zinc-700 rounded-lg shadow-2xl overflow-hidden z-50">
              <div className="py-1">
                {searchResults.map((item) => (
                  <button
                    key={item.symbol}
                    onClick={() => handleSelectTicker(item.symbol)}
                    className="w-full px-3 py-2 text-left flex items-center justify-between hover:bg-zinc-800/70 transition-colors"
                  >
                    <span className="font-bold text-xs text-emerald-400">{item.symbol}</span>
                    <span className="text-[11px] text-zinc-400 truncate max-w-[170px]">{item.name}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right: Auth & AI */}
        <div className="flex items-center gap-3">
          {session.token ? (
            <div className="flex items-center gap-2 bg-zinc-900 border border-zinc-800 px-2.5 py-1 rounded-lg">
              <div className={`w-2 h-2 rounded-full animate-pulse ${isAdmin ? "bg-amber-400" : "bg-emerald-400"}`} />
              <div className="flex flex-col text-left">
                <span className="text-[11px] font-bold text-zinc-200 truncate max-w-[110px]">
                  {session.email}
                </span>
                <span className={`text-[9px] font-semibold ${isAdmin ? "text-amber-400" : "text-emerald-400"}`}>
                  {isAdmin ? "Admin Console" : session.isPro ? "Akses Pro Aktif" : "Member"}
                </span>
              </div>
              <button
                onClick={handleLogout}
                title="Keluar"
                className="ml-1 p-1 hover:bg-zinc-800 rounded text-zinc-400 hover:text-rose-400 transition-colors"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <button
              onClick={() => setIsLoginModalOpen(true)}
              className="flex items-center gap-1.5 bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/40 text-emerald-400 px-3 py-1 rounded-lg text-xs font-semibold transition-colors"
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>Masuk (Login)</span>
            </button>
          )}

          <button
            onClick={() => setIsAiDrawerOpen(true)}
            className="flex items-center gap-1.5 bg-zinc-900 hover:bg-zinc-800 border border-zinc-700/80 px-2.5 py-1 rounded-lg text-xs font-semibold text-zinc-200 transition-colors"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>LensAI</span>
          </button>
        </div>
      </header>

      {/* 2. MARKET PULSE TICKER */}
      <section className="h-10 border-b border-zinc-800/80 bg-[#0B0B0E] flex items-center px-4 justify-between shrink-0 overflow-x-auto gap-4 text-xs">
        <div className="flex items-center gap-5 shrink-0">
          {(marketPulse?.indices || [
            { symbol: "IHSG", finalPrice: 7780, change: 0.42 },
            { symbol: "LQ45", finalPrice: 985, change: 0.58 },
            { symbol: "IDX30", finalPrice: 504, change: -0.15 },
          ]).map((idx) => {
            const isUp = idx.change >= 0;
            return (
              <div key={idx.symbol} className="flex items-center gap-2">
                <span className="font-bold text-zinc-300">{idx.symbol}</span>
                <span className="font-mono text-zinc-100">{idx.finalPrice?.toLocaleString("id-ID")}</span>
                <span
                  className={`flex items-center text-[11px] font-semibold ${
                    isUp ? "text-emerald-400" : "text-rose-400"
                  }`}
                >
                  {isUp ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                  {isUp ? "+" : ""}
                  {idx.change?.toFixed(2)}%
                </span>
              </div>
            );
          })}
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <div className="flex items-center gap-1.5 text-[11px] text-zinc-400">
            <span className="text-emerald-400 font-semibold">{marketPulse?.advances || 284} Naik</span>
            <span>•</span>
            <span className="text-rose-400 font-semibold">{marketPulse?.declines || 192} Turun</span>
          </div>
          <div className="h-3 w-px bg-zinc-800" />
          <div className="flex items-center gap-1 text-[11px] bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded text-emerald-400 font-semibold">
            <Activity className="w-3 h-3" />
            <span>{marketPulse?.marketRegime || "Bull Expansion (Akumulasi)"}</span>
          </div>
        </div>
      </section>

      {/* 3. MAIN CONTENT VIEW */}
      <main className="flex-1 overflow-y-auto bg-[#0A0A0B] p-4">
        {/* TAB: BERANDA */}
        {activeTab === "Beranda" && (
          <div className="space-y-4 max-w-[1600px] mx-auto">
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
              {/* Screener Table (Left 3) */}
              <div className="lg:col-span-3 bg-[#111115] border border-zinc-800 rounded-xl p-3.5 flex flex-col">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <BarChart3 className="w-4 h-4 text-emerald-400" />
                    <h2 className="font-bold text-sm text-zinc-100">Universe Screener & Radar</h2>
                    <span className="text-[10px] text-zinc-400 bg-zinc-800 px-1.5 py-0.5 rounded">
                      {filteredScreener.length} Saham
                    </span>
                  </div>

                  <div className="flex items-center gap-1 text-xs">
                    {(["Semua", "LQ45", "Breakout", "High ROE", "Dividend"] as const).map((filter) => (
                      <button
                        key={filter}
                        onClick={() => setScreenerFilter(filter)}
                        className={`px-2 py-0.5 rounded text-[11px] font-medium transition-colors ${
                          screenerFilter === filter
                            ? "bg-emerald-600 text-white"
                            : "bg-zinc-800/80 text-zinc-400 hover:text-zinc-200"
                        }`}
                      >
                        {filter}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="overflow-x-auto max-h-[380px] overflow-y-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="sticky top-0 bg-[#16161B] text-zinc-400 border-b border-zinc-800">
                      <tr>
                        <th className="py-2 px-2 font-semibold">Emiten</th>
                        <th className="py-2 px-2 font-semibold text-right">Harga</th>
                        <th className="py-2 px-2 font-semibold text-right">PER</th>
                        <th className="py-2 px-2 font-semibold text-right">ROE</th>
                        <th className="py-2 px-2 font-semibold text-right">DY</th>
                        <th className="py-2 px-2 font-semibold text-center">Flow</th>
                        <th className="py-2 px-2 font-semibold text-center">Sinyal</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-800/50">
                      {filteredScreener.map((stock) => {
                        const isSelected = stock.ticker === selectedStock;
                        return (
                          <tr
                            key={stock.ticker}
                            onClick={() => setSelectedStock(stock.ticker)}
                            className={`cursor-pointer transition-colors ${
                              isSelected
                                ? "bg-emerald-950/40 border-l-2 border-emerald-400"
                                : "hover:bg-zinc-800/40"
                            }`}
                          >
                            <td className="py-2 px-2">
                              <div className="font-bold text-white flex items-center gap-1.5">
                                <span>{stock.ticker}</span>
                                <span className="text-[10px] text-zinc-500 font-normal truncate max-w-[90px]">
                                  {stock.name}
                                </span>
                              </div>
                            </td>
                            <td className="py-2 px-2 text-right font-mono">
                              <div>{stock.price.toLocaleString("id-ID")}</div>
                              <div
                                className={`text-[10px] ${
                                  stock.changePct >= 0 ? "text-emerald-400" : "text-rose-400"
                                }`}
                              >
                                {stock.changePct >= 0 ? "+" : ""}
                                {stock.changePct.toFixed(2)}%
                              </div>
                            </td>
                            <td className="py-2 px-2 text-right font-mono text-zinc-300">{stock.pe}x</td>
                            <td className="py-2 px-2 text-right font-mono text-zinc-300">{stock.roe}%</td>
                            <td className="py-2 px-2 text-right font-mono text-zinc-300">{stock.dy}%</td>
                            <td className="py-2 px-2 text-center">
                              <span
                                className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${
                                  stock.bandarmology === "Big Acc"
                                    ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                                    : "bg-zinc-800 text-zinc-400"
                                }`}
                              >
                                {stock.bandarmology}
                              </span>
                            </td>
                            <td className="py-2 px-2 text-center">
                              <span
                                className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${
                                  stock.signal === "Breakout"
                                    ? "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                                    : "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                                }`}
                              >
                                {stock.signal}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Active Stock Deep Dive (Right 2) */}
              <div className="lg:col-span-2 bg-[#111115] border border-zinc-800 rounded-xl p-3.5 flex flex-col justify-between">
                <div>
                  <div className="flex items-start justify-between pb-3 border-b border-zinc-800">
                    <div>
                      <div className="flex items-center gap-2">
                        <h2 className="text-xl font-extrabold text-white tracking-tight">{activeStock.ticker}</h2>
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-zinc-800 text-zinc-300">
                          {activeStock.sector}
                        </span>
                      </div>
                      <p className="text-xs text-zinc-400 mt-0.5 truncate max-w-[220px]">
                        {stockDetail?.companyName || activeStock.name}
                      </p>
                    </div>

                    <div className="text-right font-mono">
                      <div className="text-lg font-bold text-white">
                        Rp {activeStock.price.toLocaleString("id-ID")}
                      </div>
                      <div
                        className={`text-xs font-semibold ${
                          activeStock.changePct >= 0 ? "text-emerald-400" : "text-rose-400"
                        }`}
                      >
                        {activeStock.changePct >= 0 ? "+" : ""}
                        {activeStock.changePct.toFixed(2)}%
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 my-3 bg-zinc-900 p-0.5 rounded-lg text-xs">
                    <button
                      onClick={() => setStockDetailTab("fundamental")}
                      className={`flex-1 py-1 text-center font-medium rounded-md transition-colors ${
                        stockDetailTab === "fundamental" ? "bg-zinc-800 text-white" : "text-zinc-400"
                      }`}
                    >
                      Fundamental LK
                    </button>
                    <button
                      onClick={() => setStockDetailTab("teknikal")}
                      className={`flex-1 py-1 text-center font-medium rounded-md transition-colors ${
                        stockDetailTab === "teknikal" ? "bg-zinc-800 text-white" : "text-zinc-400"
                      }`}
                    >
                      Batas Batal (Risk)
                    </button>
                    <button
                      onClick={() => setStockDetailTab("chart")}
                      className={`flex-1 py-1 text-center font-medium rounded-md transition-colors ${
                        stockDetailTab === "chart" ? "bg-zinc-800 text-white" : "text-zinc-400"
                      }`}
                    >
                      Grafik 1Y
                    </button>
                  </div>

                  {stockDetailTab === "fundamental" && (
                    <div className="space-y-3">
                      <div className="grid grid-cols-4 gap-2 text-center">
                        <div className="bg-zinc-900/80 p-2 rounded-lg border border-zinc-800/80">
                          <div className="text-[10px] text-zinc-400">PER</div>
                          <div className="font-bold text-xs text-white">{activeStock.pe}x</div>
                        </div>
                        <div className="bg-zinc-900/80 p-2 rounded-lg border border-zinc-800/80">
                          <div className="text-[10px] text-zinc-400">PBV</div>
                          <div className="font-bold text-xs text-white">{activeStock.pbv}x</div>
                        </div>
                        <div className="bg-zinc-900/80 p-2 rounded-lg border border-zinc-800/80">
                          <div className="text-[10px] text-zinc-400">ROE</div>
                          <div className="font-bold text-xs text-emerald-400">{activeStock.roe}%</div>
                        </div>
                        <div className="bg-zinc-900/80 p-2 rounded-lg border border-zinc-800/80">
                          <div className="text-[10px] text-zinc-400">DY</div>
                          <div className="font-bold text-xs text-amber-400">{activeStock.dy}%</div>
                        </div>
                      </div>

                      <div className="bg-zinc-900/50 p-2.5 rounded-lg border border-zinc-800/60">
                        <div className="text-[11px] font-semibold text-zinc-300 mb-2 flex items-center justify-between">
                          <span>Tren Laba Bersih 4 Tahun</span>
                          <span className="text-[10px] text-emerald-400 font-bold">
                            Moat: {stockDetail?.moatRating || "Wide"} ({stockDetail?.moatScore || 85}%)
                          </span>
                        </div>
                        <div className="space-y-1.5">
                          {stockDetail?.revenue4Y && stockDetail.revenue4Y.length > 0 ? (
                            stockDetail.revenue4Y.map((item) => (
                              <div key={item.year} className="flex items-center text-[10px] gap-2">
                                <span className="w-8 font-mono text-zinc-400">{item.year}</span>
                                <div className="flex-1 bg-zinc-800 h-3 rounded-sm overflow-hidden flex">
                                  <div
                                    className="bg-emerald-500 h-full"
                                    style={{
                                      width: `${Math.min(100, Math.max(15, (item.netIncome / 60000) * 100))}%`,
                                    }}
                                    title={`Laba: Rp ${(item.netIncome / 1000).toFixed(1)}T`}
                                  />
                                </div>
                                <span className="w-14 text-right font-mono text-zinc-300">
                                  {(item.netIncome / 1000).toFixed(1)}T
                                </span>
                              </div>
                            ))
                          ) : (
                            <div className="text-[10px] text-zinc-500 italic py-2 text-center">
                              Data riwayat tahunan belum dilaporkan di bursa.
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {stockDetailTab === "teknikal" && (
                    <div className="space-y-2.5 bg-zinc-900/60 p-3 rounded-lg border border-zinc-800/80 text-xs">
                      <div className="flex items-center justify-between pb-2 border-b border-zinc-800">
                        <span className="text-zinc-400">Entry Ideal (Swing)</span>
                        <span className="font-mono font-bold text-white">
                          Rp {tradingRisk.entry.toLocaleString("id-ID")}
                        </span>
                      </div>
                      <div className="flex items-center justify-between pb-2 border-b border-zinc-800">
                        <div className="flex items-center gap-1.5 text-rose-400 font-semibold">
                          <AlertTriangle className="w-3.5 h-3.5" />
                          <span>Batas Batal (Cut Loss)</span>
                        </div>
                        <span className="font-mono font-bold text-rose-400">
                          Rp {tradingRisk.cutLoss.toLocaleString("id-ID")} ({(((tradingRisk.cutLoss - tradingRisk.entry) / (tradingRisk.entry || 1)) * 100).toFixed(1)}%)
                        </span>
                      </div>
                      <div className="flex items-center justify-between pb-2 border-b border-zinc-800">
                        <span className="text-zinc-400">Target Profit 1 (TP1)</span>
                        <span className="font-mono font-bold text-emerald-400">
                          Rp {tradingRisk.tp1.toLocaleString("id-ID")} (+{(((tradingRisk.tp1 - tradingRisk.entry) / (tradingRisk.entry || 1)) * 100).toFixed(1)}%)
                        </span>
                      </div>
                      <div className="flex items-center justify-between pb-2 border-b border-zinc-800">
                        <span className="text-zinc-400">Target Profit 2 (TP2)</span>
                        <span className="font-mono font-bold text-teal-400">
                          Rp {tradingRisk.tp2.toLocaleString("id-ID")} (+{(((tradingRisk.tp2 - tradingRisk.entry) / (tradingRisk.entry || 1)) * 100).toFixed(1)}%)
                        </span>
                      </div>
                      <div className="flex items-center justify-between pb-2 border-b border-zinc-800">
                        <span className="text-zinc-400">Risk-to-Reward (RR)</span>
                        <span className="font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                          1 : {tradingRisk.rrRatio} (Syarat ≥ 1.8)
                        </span>
                      </div>
                      <div className="flex items-center justify-between pb-2 border-b border-zinc-800">
                        <span className="text-zinc-400">RSI (14) / Bandar Flow</span>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-zinc-300">
                            {technicalData?.indicators.rsi ? technicalData.indicators.rsi.toFixed(1) : "50.0"}
                          </span>
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-zinc-800 text-emerald-400">
                            {technicalData?.bandarFlow.status || "Netral"}
                          </span>
                        </div>
                      </div>
                      <button
                        onClick={() => setActiveTab("Teknikal")}
                        className="w-full mt-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 py-1.5 rounded text-[11px] font-semibold flex items-center justify-center gap-1 transition-colors"
                      >
                        <span>Buka Analisis Teknikal Lengkap</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}

                  {stockDetailTab === "chart" && (
                    <div className="bg-zinc-900/60 p-3 rounded-lg border border-zinc-800/80">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[11px] text-zinc-400 font-semibold">Riwayat Harga 1 Tahun</span>
                        <span className="text-[10px] text-zinc-500">{stockChart.length} hari bursa</span>
                      </div>
                      {stockChart.length > 0 ? (
                        <div className="h-32 flex items-end gap-0.5 w-full pt-2">
                          {stockChart.slice(-60).map((c, i) => {
                            const minPrice = Math.min(...stockChart.slice(-60).map((x) => x.low));
                            const maxPrice = Math.max(...stockChart.slice(-60).map((x) => x.high));
                            const range = Math.max(1, maxPrice - minPrice);
                            const heightPct = Math.max(10, ((c.close - minPrice) / range) * 100);
                            const isUp = c.close >= c.open;

                            return (
                              <div
                                key={i}
                                className={`flex-1 rounded-t-xs transition-all ${
                                  isUp ? "bg-emerald-500" : "bg-rose-500"
                                }`}
                                style={{ height: `${heightPct}%` }}
                                title={`${c.time}: Close Rp ${c.close.toLocaleString("id-ID")}`}
                              />
                            );
                          })}
                        </div>
                      ) : (
                        <div className="h-32 flex items-center justify-center text-xs text-zinc-500">
                          Memuat data grafik bursa...
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <button
                  onClick={() => {
                    handleSendChatMessage(`Analisis komprehensif saham ${activeStock.ticker} dari segi Moat dan Risk`);
                    setIsAiDrawerOpen(true);
                  }}
                  className="mt-3 w-full bg-emerald-600/15 hover:bg-emerald-600/25 border border-emerald-500/30 text-emerald-400 py-1.5 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
                >
                  <Bot className="w-3.5 h-3.5" />
                  <span>Bedah {activeStock.ticker} dengan LensAI</span>
                </button>
              </div>
            </div>

            {/* Valuation & Compare (Lower 2) */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div className="bg-[#111115] border border-zinc-800 rounded-xl p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Scale className="w-4 h-4 text-emerald-400" />
                    <h3 className="font-bold text-sm text-white">Valuasi Sektoral & Nilai Intrinsik</h3>
                  </div>
                  <span className="text-[10px] font-semibold bg-zinc-800 text-zinc-300 px-2 py-0.5 rounded">
                    {dcfCalculated.model}
                  </span>
                </div>

                <div className="bg-zinc-900/60 p-3 rounded-lg border border-zinc-800/80 mb-3 flex items-center justify-between">
                  <div>
                    <div className="text-xs text-zinc-400">Nilai Intrinsik Acuan</div>
                    <div className="text-lg font-bold text-white font-mono">
                      Rp {dcfCalculated.intrinsic.toLocaleString("id-ID")}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs text-zinc-400">Margin of Safety</div>
                    <div
                      className={`text-base font-extrabold font-mono ${
                        dcfCalculated.mos >= 15 ? "text-emerald-400" : "text-amber-400"
                      }`}
                    >
                      {dcfCalculated.mos}%
                    </div>
                  </div>
                </div>

                {!isBankStock && (
                  <div className="space-y-3 text-xs bg-zinc-900/30 p-2.5 rounded-lg border border-zinc-800/40">
                    <div>
                      <div className="flex justify-between text-zinc-400 mb-1">
                        <span>Asumsi Pertumbuhan 5Y: {dcfGrowth.toFixed(1)}%</span>
                      </div>
                      <input
                        type="range"
                        min="3"
                        max="20"
                        step="0.5"
                        value={dcfGrowth}
                        onChange={(e) => setDcfGrowth(parseFloat(e.target.value))}
                        className="w-full accent-emerald-500 h-1.5 bg-zinc-800 rounded-lg cursor-pointer"
                      />
                    </div>

                    <div>
                      <div className="flex justify-between text-zinc-400 mb-1">
                        <span>WACC (Cost of Capital): {dcfWacc.toFixed(1)}%</span>
                      </div>
                      <input
                        type="range"
                        min="8"
                        max="16"
                        step="0.5"
                        value={dcfWacc}
                        onChange={(e) => setDcfWacc(parseFloat(e.target.value))}
                        className="w-full accent-emerald-500 h-1.5 bg-zinc-800 rounded-lg cursor-pointer"
                      />
                    </div>
                  </div>
                )}
              </div>

              <div className="bg-[#111115] border border-zinc-800 rounded-xl p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Layers className="w-4 h-4 text-emerald-400" />
                    <h3 className="font-bold text-sm text-white">Komparasi Sektor Head-to-Head</h3>
                  </div>
                  <button
                    onClick={() => setActiveTab("Compare")}
                    className="text-[11px] text-emerald-400 hover:underline flex items-center gap-1 font-medium"
                  >
                    <span>Layar Penuh</span>
                    <ChevronRight className="w-3 h-3" />
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="bg-zinc-900/70 p-3 rounded-lg border border-zinc-800">
                    <div className="font-bold text-sm text-emerald-400">{activeStock.ticker}</div>
                    <div className="mt-2 space-y-1.5">
                      <div className="flex justify-between text-zinc-400">
                        <span>PER</span>
                        <span className="font-mono text-zinc-200">{activeStock.pe}x</span>
                      </div>
                      <div className="flex justify-between text-zinc-400">
                        <span>PBV</span>
                        <span className="font-mono text-zinc-200">{activeStock.pbv}x</span>
                      </div>
                      <div className="flex justify-between text-zinc-400">
                        <span>ROE</span>
                        <span className="font-mono text-emerald-400 font-bold">{activeStock.roe}%</span>
                      </div>
                    </div>
                  </div>

                  <div className="bg-zinc-900/70 p-3 rounded-lg border border-zinc-800">
                    <div className="font-bold text-sm text-amber-400">BBRI</div>
                    <div className="mt-2 space-y-1.5">
                      <div className="flex justify-between text-zinc-400">
                        <span>PER</span>
                        <span className="font-mono text-zinc-200">11.8x</span>
                      </div>
                      <div className="flex justify-between text-zinc-400">
                        <span>PBV</span>
                        <span className="font-mono text-zinc-200">2.1x</span>
                      </div>
                      <div className="flex justify-between text-zinc-400">
                        <span>ROE</span>
                        <span className="font-mono text-emerald-400 font-bold">18.5%</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB: TEKNIKAL (LENSTECHNICAL DEEP DIVE) */}
        {activeTab === "Teknikal" && (
          <div className="max-w-[1600px] mx-auto space-y-4">
            {/* Top Bar: Selector & Emiten Header */}
            <div className="bg-[#111115] border border-zinc-800 rounded-xl p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-emerald-600/30 to-teal-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 font-black text-xl font-mono shadow-inner">
                  {activeStock.ticker.slice(0, 4)}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h1 className="text-2xl font-black text-white tracking-tight">{activeStock.ticker}</h1>
                    <span className="text-xs font-semibold px-2 py-0.5 rounded bg-zinc-800 text-zinc-300">
                      {stockDetail?.sector || activeStock.sector}
                    </span>
                    <span
                      className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                        technicalData?.consensus.overall.includes("Beli")
                          ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                          : technicalData?.consensus.overall.includes("Batal") || technicalData?.consensus.overall.includes("Hindari")
                          ? "bg-rose-500/20 text-rose-400 border border-rose-500/30"
                          : "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                      }`}
                    >
                      {technicalData?.consensus.overall || "Hold / Pantau Area Entry"}
                    </span>
                  </div>
                  <p className="text-xs text-zinc-400 mt-0.5">{stockDetail?.companyName || activeStock.name}</p>
                </div>
              </div>

              {/* Quick Switch Emiten */}
              <div className="flex flex-wrap items-center gap-1.5 bg-zinc-900/80 p-1.5 rounded-lg border border-zinc-800/80">
                <span className="text-[10px] text-zinc-400 font-semibold px-1.5">PILIH CEPAT:</span>
                {["BBCA", "BBRI", "BMRI", "BBNI", "TLKM", "ASII", "AMMN", "ADRO"].map((sym) => (
                  <button
                    key={sym}
                    onClick={() => setSelectedStock(sym)}
                    className={`px-2.5 py-1 text-[11px] font-bold rounded font-mono transition-all ${
                      selectedStock === sym
                        ? "bg-emerald-500 text-black shadow-sm"
                        : "bg-zinc-800/70 text-zinc-300 hover:bg-zinc-700 hover:text-white"
                    }`}
                  >
                    {sym}
                  </button>
                ))}
              </div>

              {/* Price Display */}
              <div className="text-right font-mono self-end md:self-auto">
                <div className="text-2xl font-black text-white">
                  Rp {(technicalData?.price || activeStock.price).toLocaleString("id-ID")}
                </div>
                <div
                  className={`text-xs font-bold flex items-center justify-end gap-1 ${
                    (technicalData?.changePct ?? activeStock.changePct) >= 0 ? "text-emerald-400" : "text-rose-400"
                  }`}
                >
                  {(technicalData?.changePct ?? activeStock.changePct) >= 0 ? (
                    <ArrowUpRight className="w-3.5 h-3.5" />
                  ) : (
                    <ArrowDownRight className="w-3.5 h-3.5" />
                  )}
                  <span>
                    {(technicalData?.changePct ?? activeStock.changePct) >= 0 ? "+" : ""}
                    {(technicalData?.changePct ?? activeStock.changePct).toFixed(2)}%
                  </span>
                </div>
              </div>
            </div>

            {/* Main Content Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              {/* Left Column: Interactive Candlestick Chart & Technical Indicators */}
              <div className="lg:col-span-2 space-y-4">
                {/* Candlestick OHLCV Chart Card */}
                <div className="bg-[#111115] border border-zinc-800 rounded-xl p-4">
                  <div className="flex items-center justify-between pb-3 border-b border-zinc-800 mb-3">
                    <div className="flex items-center gap-2">
                      <BarChart3 className="w-4 h-4 text-emerald-400" />
                      <h2 className="text-sm font-bold text-white">Grafik Candlestick OHLCV & Moving Averages</h2>
                    </div>
                    <div className="flex items-center gap-3 text-[11px] font-mono">
                      <div className="flex items-center gap-1.5">
                        <span className="w-2.5 h-0.5 bg-emerald-400 rounded-full" />
                        <span className="text-zinc-400">MA20:</span>
                        <span className="text-zinc-200 font-bold">
                          {technicalData?.indicators.ma20 ? `Rp ${technicalData.indicators.ma20.toLocaleString("id-ID")}` : "-"}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="w-2.5 h-0.5 bg-sky-400 rounded-full" />
                        <span className="text-zinc-400">MA50:</span>
                        <span className="text-zinc-200 font-bold">
                          {technicalData?.indicators.ma50 ? `Rp ${technicalData.indicators.ma50.toLocaleString("id-ID")}` : "-"}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="w-2.5 h-0.5 bg-amber-400 rounded-full" />
                        <span className="text-zinc-400">MA200:</span>
                        <span className="text-zinc-200 font-bold">
                          {technicalData?.indicators.ma200 ? `Rp ${technicalData.indicators.ma200.toLocaleString("id-ID")}` : "-"}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* SVG Candle Chart */}
                  {loadingTechnical ? (
                    <div className="h-72 flex flex-col items-center justify-center text-zinc-500 text-xs gap-2">
                      <RefreshCw className="w-5 h-5 animate-spin text-emerald-500" />
                      <span>Memuat data candle bursa riil...</span>
                    </div>
                  ) : ((technicalData?.candles && technicalData.candles.length > 0) || stockChart.length > 0) ? (
                    (() => {
                      const candles = (technicalData?.candles && technicalData.candles.length > 0)
                        ? technicalData.candles.slice(-45)
                        : stockChart.slice(-45);
                      const minPrice = Math.min(...candles.map((c) => c.low));
                      const maxPrice = Math.max(...candles.map((c) => c.high));
                      const range = Math.max(1, maxPrice - minPrice);
                      const maxVol = Math.max(...candles.map((c) => c.volume), 1);
                      const width = 800;
                      const height = 260;
                      const chartBottom = 190;
                      const chartTop = 20;
                      const chartHeight = chartBottom - chartTop;
                      const volHeight = 45;
                      const candleW = Math.max(3, Math.floor(width / candles.length) - 3);

                      const toY = (price: number) => chartBottom - ((price - minPrice) / range) * chartHeight;

                      return (
                        <div className="w-full">
                          <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-72 select-none">
                            {/* Gridlines */}
                            {[0.25, 0.5, 0.75].map((pct, idx) => {
                              const y = chartBottom - pct * chartHeight;
                              const p = Math.round(minPrice + pct * range);
                              return (
                                <g key={idx}>
                                  <line x1="0" y1={y} x2={width} y2={y} stroke="#27272a" strokeDasharray="3 3" />
                                  <text x={width - 5} y={y - 3} fill="#71717a" fontSize="9" textAnchor="end" fontFamily="monospace">
                                    Rp {p.toLocaleString("id-ID")}
                                  </text>
                                </g>
                              );
                            })}

                            {/* TP1 & Cut Loss levels dashed lines */}
                            {tradingRisk.tp1 <= maxPrice && tradingRisk.tp1 >= minPrice && (
                              <g>
                                <line x1="0" y1={toY(tradingRisk.tp1)} x2={width} y2={toY(tradingRisk.tp1)} stroke="#10b981" strokeDasharray="4 2" strokeWidth="1" />
                                <text x="10" y={toY(tradingRisk.tp1) - 4} fill="#10b981" fontSize="9" fontWeight="bold">
                                  TP1: Rp {tradingRisk.tp1.toLocaleString("id-ID")}
                                </text>
                              </g>
                            )}
                            {tradingRisk.cutLoss <= maxPrice && tradingRisk.cutLoss >= minPrice && (
                              <g>
                                <line x1="0" y1={toY(tradingRisk.cutLoss)} x2={width} y2={toY(tradingRisk.cutLoss)} stroke="#f43f5e" strokeDasharray="4 2" strokeWidth="1" />
                                <text x="10" y={toY(tradingRisk.cutLoss) - 4} fill="#f43f5e" fontSize="9" fontWeight="bold">
                                  Batas Batal (CL): Rp {tradingRisk.cutLoss.toLocaleString("id-ID")}
                                </text>
                              </g>
                            )}

                            {/* Candles & Volume Bars */}
                            {candles.map((c, i) => {
                              const x = (i / candles.length) * width + (width / candles.length) / 2;
                              const yHigh = toY(c.high);
                              const yLow = toY(c.low);
                              const yOpen = toY(c.open);
                              const yClose = toY(c.close);
                              const isUp = c.close >= c.open;
                              const candleColor = isUp ? "#10b981" : "#f43f5e";
                              const bodyY = Math.min(yOpen, yClose);
                              const bodyH = Math.max(2, Math.abs(yClose - yOpen));
                              const vH = (c.volume / maxVol) * volHeight;
                              const vY = height - 5 - vH;

                              return (
                                <g key={i}>
                                  {/* High-Low Wick */}
                                  <line x1={x} y1={yHigh} x2={x} y2={yLow} stroke={candleColor} strokeWidth="1.2" />
                                  {/* Candle Body */}
                                  <rect
                                    x={x - candleW / 2}
                                    y={bodyY}
                                    width={candleW}
                                    height={bodyH}
                                    fill={candleColor}
                                    rx="0.5"
                                  />
                                  {/* Volume Bar */}
                                  <rect
                                    x={x - candleW / 2}
                                    y={vY}
                                    width={candleW}
                                    height={Math.max(1, vH)}
                                    fill={candleColor}
                                    opacity="0.6"
                                  />
                                </g>
                              );
                            })}
                          </svg>
                          <div className="flex items-center justify-between text-[10px] text-zinc-500 font-mono pt-2 border-t border-zinc-800/80">
                            <span>Bawah: Volume Transaksi Harian ({candles.length} Bar Terakhir)</span>
                            <span>Sumber: Feed Historis Bursa SahamLens (Resmi)</span>
                          </div>
                        </div>
                      );
                    })()
                  ) : (
                    <div className="h-72 flex items-center justify-center text-xs text-zinc-500">
                      Data grafik candle belum tersedia untuk emiten ini.
                    </div>
                  )}
                </div>

                {/* Sub-Panel: Indikator Kuantitatif Grid 4 Kolom */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {/* Card RSI (14) */}
                  <div className="bg-[#111115] border border-zinc-800 rounded-xl p-3">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-[11px] font-bold text-zinc-400">RSI (14)</span>
                      <span
                        className={`text-[10px] font-bold px-1.5 py-0.2 rounded ${
                          (technicalData?.indicators.rsi || 50) > 70
                            ? "bg-rose-500/20 text-rose-400"
                            : (technicalData?.indicators.rsi || 50) < 30
                            ? "bg-emerald-500/20 text-emerald-400"
                            : "bg-zinc-800 text-zinc-300"
                        }`}
                      >
                        {(technicalData?.indicators.rsi || 50) > 70
                          ? "Overbought"
                          : (technicalData?.indicators.rsi || 50) < 30
                          ? "Oversold"
                          : "Netral"}
                      </span>
                    </div>
                    <div className="text-xl font-extrabold font-mono text-white mb-2">
                      {technicalData?.indicators.rsi ? technicalData.indicators.rsi.toFixed(1) : "50.0"}
                    </div>
                    <div className="w-full bg-zinc-800 h-2 rounded-full overflow-hidden flex">
                      <div
                        className="bg-gradient-to-r from-emerald-500 via-amber-400 to-rose-500 h-full rounded-full transition-all"
                        style={{ width: `${Math.min(100, Math.max(0, technicalData?.indicators.rsi || 50))}%` }}
                      />
                    </div>
                    <div className="flex justify-between text-[9px] text-zinc-500 font-mono mt-1">
                      <span>30 (Oversold)</span>
                      <span>70 (Overbought)</span>
                    </div>
                  </div>

                  {/* Card MACD */}
                  <div className="bg-[#111115] border border-zinc-800 rounded-xl p-3">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-[11px] font-bold text-zinc-400">MACD (12,26,9)</span>
                      <span
                        className={`text-[10px] font-bold px-1.5 py-0.2 rounded ${
                          (technicalData?.indicators.macd.histogram || 0) >= 0
                            ? "bg-emerald-500/20 text-emerald-400"
                            : "bg-rose-500/20 text-rose-400"
                        }`}
                      >
                        {(technicalData?.indicators.macd.histogram || 0) >= 0 ? "Bullish" : "Bearish"}
                      </span>
                    </div>
                    <div className="text-xl font-extrabold font-mono text-white mb-1">
                      {technicalData?.indicators.macd.value ? technicalData.indicators.macd.value.toFixed(2) : "0.00"}
                    </div>
                    <div className="text-[10px] font-mono text-zinc-400 space-y-0.5">
                      <div className="flex justify-between">
                        <span>Signal:</span>
                        <span className="text-zinc-200">
                          {technicalData?.indicators.macd.signal ? technicalData.indicators.macd.signal.toFixed(2) : "0.00"}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>Histogram:</span>
                        <span
                          className={
                            (technicalData?.indicators.macd.histogram || 0) >= 0 ? "text-emerald-400" : "text-rose-400"
                          }
                        >
                          {technicalData?.indicators.macd.histogram ? technicalData.indicators.macd.histogram.toFixed(2) : "0.00"}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Card Stochastic */}
                  <div className="bg-[#111115] border border-zinc-800 rounded-xl p-3">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-[11px] font-bold text-zinc-400">Stochastic (14,3)</span>
                      <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-zinc-800 text-zinc-300">
                        Oscillator
                      </span>
                    </div>
                    <div className="text-xl font-extrabold font-mono text-white mb-1">
                      {technicalData?.indicators.stochastic.k ? `${technicalData.indicators.stochastic.k.toFixed(1)}%` : "50.0%"}
                    </div>
                    <div className="text-[10px] font-mono text-zinc-400 space-y-0.5">
                      <div className="flex justify-between">
                        <span>%K Fast:</span>
                        <span className="text-emerald-400 font-bold">
                          {technicalData?.indicators.stochastic.k ? technicalData.indicators.stochastic.k.toFixed(1) : "50.0"}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>%D Slow:</span>
                        <span className="text-sky-400">
                          {technicalData?.indicators.stochastic.d ? technicalData.indicators.stochastic.d.toFixed(1) : "50.0"}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Card ATR (14) */}
                  <div className="bg-[#111115] border border-zinc-800 rounded-xl p-3">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-[11px] font-bold text-zinc-400">ATR Volatilitas</span>
                      <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-zinc-800 text-amber-400">
                        {technicalData?.consensus.volatility || "Normal"}
                      </span>
                    </div>
                    <div className="text-xl font-extrabold font-mono text-white mb-1">
                      Rp {technicalData?.indicators.atr ? technicalData.indicators.atr.toLocaleString("id-ID") : "0"}
                    </div>
                    <div className="text-[10px] font-mono text-zinc-400">
                      <span>Rentang Ayunan: </span>
                      <span className="text-zinc-200 font-bold">
                        {technicalData?.price && technicalData?.indicators.atr
                          ? `${((technicalData.indicators.atr / technicalData.price) * 100).toFixed(1)}% / hari`
                          : "2.0% / hari"}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Column: Trading Plan Terukur (Prinsip Libas) & Flow */}
              <div className="space-y-4">
                {/* Card 1: Trading Plan Libas Terukur */}
                <div className="bg-[#111115] border border-zinc-800 rounded-xl p-4">
                  <div className="flex items-center justify-between pb-3 border-b border-zinc-800 mb-3">
                    <div className="flex items-center gap-2">
                      <Target className="w-4 h-4 text-emerald-400" />
                      <h3 className="text-sm font-bold text-white">Trading Plan Terukur (Libas)</h3>
                    </div>
                    <span className="text-[10px] font-bold tracking-wider uppercase px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                      Disiplin RR
                    </span>
                  </div>

                  {/* Action Badge */}
                  <div className="mb-3.5 p-3 rounded-lg bg-zinc-900/90 border border-zinc-800 flex items-center justify-between">
                    <div>
                      <div className="text-[10px] text-zinc-400 uppercase font-semibold">Saran Tindakan</div>
                      <div className="text-sm font-extrabold text-white">
                        {technicalData?.consensus.overall || "Beli Bertahap (Momentum)"}
                      </div>
                    </div>
                    <span className="text-xs font-mono font-bold px-2 py-1 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                      RR 1 : {tradingRisk.rrRatio}
                    </span>
                  </div>

                  {/* Key Price Levels */}
                  <div className="space-y-2 text-xs font-mono">
                    <div className="flex items-center justify-between p-2 rounded bg-zinc-900/50 border border-zinc-800/60">
                      <span className="text-zinc-400 font-sans">Area Entry Ideal (Swing)</span>
                      <span className="font-bold text-white">
                        Rp {tradingRisk.entry.toLocaleString("id-ID")}
                      </span>
                    </div>

                    <div className="flex items-center justify-between p-2 rounded bg-rose-950/20 border border-rose-900/40">
                      <div className="flex items-center gap-1.5 text-rose-400 font-semibold font-sans">
                        <AlertTriangle className="w-3.5 h-3.5" />
                        <span>Batas Batal 1 (Cut Loss)</span>
                      </div>
                      <span className="font-bold text-rose-400">
                        Rp {tradingRisk.cutLoss.toLocaleString("id-ID")} ({(((tradingRisk.cutLoss - tradingRisk.entry) / (tradingRisk.entry || 1)) * 100).toFixed(1)}%)
                      </span>
                    </div>

                    <div className="flex items-center justify-between p-2 rounded bg-zinc-900/40 border border-zinc-800/40">
                      <span className="text-zinc-400 font-sans">Batas Batal 2 (Hard Stop)</span>
                      <span className="font-bold text-zinc-300">
                        Rp {technicalData?.tradeSetup.cl2 ? technicalData.tradeSetup.cl2.toLocaleString("id-ID") : Math.round(tradingRisk.cutLoss * 0.98).toLocaleString("id-ID")}
                      </span>
                    </div>

                    <div className="flex items-center justify-between p-2 rounded bg-emerald-950/20 border border-emerald-900/40">
                      <span className="text-emerald-400 font-semibold font-sans">Target Profit 1 (TP1)</span>
                      <span className="font-bold text-emerald-400">
                        Rp {tradingRisk.tp1.toLocaleString("id-ID")} (+{(((tradingRisk.tp1 - tradingRisk.entry) / (tradingRisk.entry || 1)) * 100).toFixed(1)}%)
                      </span>
                    </div>

                    <div className="flex items-center justify-between p-2 rounded bg-teal-950/20 border border-teal-900/40">
                      <span className="text-teal-400 font-semibold font-sans">Target Profit 2 (TP2)</span>
                      <span className="font-bold text-teal-400">
                        Rp {tradingRisk.tp2.toLocaleString("id-ID")} (+{(((tradingRisk.tp2 - tradingRisk.entry) / (tradingRisk.entry || 1)) * 100).toFixed(1)}%)
                      </span>
                    </div>
                  </div>

                  {/* Risk-to-Reward Requirement Check */}
                  <div className="mt-3.5 p-2.5 rounded-lg bg-emerald-950/30 border border-emerald-800/50 text-[11px] text-emerald-300 flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>
                      Rasio <strong>1:{tradingRisk.rrRatio}</strong> memenuhi prinsip minimum 1:1.8. Potensi profit lebih besar dari risiko batas batal.
                    </span>
                  </div>
                </div>

                {/* Card 2: Bandarmologi & Volume Flow */}
                <div className="bg-[#111115] border border-zinc-800 rounded-xl p-4">
                  <div className="flex items-center justify-between pb-3 border-b border-zinc-800 mb-3">
                    <div className="flex items-center gap-2">
                      <Activity className="w-4 h-4 text-sky-400" />
                      <h3 className="text-sm font-bold text-white">Bandarmologi & Volume Flow</h3>
                    </div>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        (technicalData?.bandarFlow.status || "Netral").includes("Acc")
                          ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                          : (technicalData?.bandarFlow.status || "Netral").includes("Dist")
                          ? "bg-rose-500/20 text-rose-400 border border-rose-500/30"
                          : "bg-zinc-800 text-zinc-300"
                      }`}
                    >
                      {technicalData?.bandarFlow.status || "Netral"}
                    </span>
                  </div>

                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between py-1.5 border-b border-zinc-800/60">
                      <span className="text-zinc-400">Tren Harga Multi-Hari</span>
                      <span className="font-bold text-white">{technicalData?.consensus.trend || "Uptrend"}</span>
                    </div>
                    <div className="flex justify-between py-1.5 border-b border-zinc-800/60">
                      <span className="text-zinc-400">Momentum Kekuatan</span>
                      <span className="font-bold text-emerald-400">{technicalData?.consensus.momentum || "Bullish"}</span>
                    </div>
                    <div className="flex justify-between py-1.5 border-b border-zinc-800/60">
                      <span className="text-zinc-400">Level Support 20D</span>
                      <span className="font-mono font-bold text-zinc-200">
                        Rp {technicalData?.tradeSetup.support ? technicalData.tradeSetup.support.toLocaleString("id-ID") : "-"}
                      </span>
                    </div>
                    <div className="flex justify-between py-1.5">
                      <span className="text-zinc-400">Level Resistance 20D</span>
                      <span className="font-mono font-bold text-zinc-200">
                        Rp {technicalData?.tradeSetup.resistance ? technicalData.tradeSetup.resistance.toLocaleString("id-ID") : "-"}
                      </span>
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      handleSendChatMessage(`Buatkan analisis teknikal mendalam saham ${activeStock.ticker} dengan strategi swing trading dan batas batal`);
                      setIsAiDrawerOpen(true);
                    }}
                    className="mt-3.5 w-full bg-emerald-600/15 hover:bg-emerald-600/25 border border-emerald-500/30 text-emerald-400 py-1.5 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
                  >
                    <Bot className="w-3.5 h-3.5" />
                    <span>Konsultasikan dengan LensAI</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB: SCREENER */}
        {activeTab === "Screener" && (
          <div className="max-w-[1600px] mx-auto bg-[#111115] border border-zinc-800 rounded-xl p-4">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-base font-bold text-white">Master Screener Kuantitatif</h2>
                <p className="text-xs text-zinc-400">Filter universe bursa berdasarkan kriteria rasio & timing</p>
              </div>

              <div className="flex items-center gap-2">
                <select
                  value={sectorFilter}
                  onChange={(e) => setSectorFilter(e.target.value)}
                  className="bg-zinc-900 border border-zinc-700 text-xs text-zinc-200 px-3 py-1.5 rounded-lg focus:outline-none"
                >
                  {allSectors.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#16161B] text-zinc-400 border-b border-zinc-800">
                  <tr>
                    <th className="py-2.5 px-3">Ticker</th>
                    <th className="py-2.5 px-3">Nama Emiten</th>
                    <th className="py-2.5 px-3">Sektor</th>
                    <th className="py-2.5 px-3 text-right">Harga (Rp)</th>
                    <th className="py-2.5 px-3 text-right">PER</th>
                    <th className="py-2.5 px-3 text-right">PBV</th>
                    <th className="py-2.5 px-3 text-right">ROE</th>
                    <th className="py-2.5 px-3 text-right">DY</th>
                    <th className="py-2.5 px-3 text-center">Sinyal</th>
                    <th className="py-2.5 px-3 text-center">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/50">
                  {filteredScreener.map((stock) => (
                    <tr key={stock.ticker} className="hover:bg-zinc-800/30">
                      <td className="py-2.5 px-3 font-bold text-emerald-400">{stock.ticker}</td>
                      <td className="py-2.5 px-3 text-zinc-300">{stock.name}</td>
                      <td className="py-2.5 px-3 text-zinc-400">{stock.sector}</td>
                      <td className="py-2.5 px-3 text-right font-mono font-bold text-white">
                        {stock.price.toLocaleString("id-ID")}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono">{stock.pe}x</td>
                      <td className="py-2.5 px-3 text-right font-mono">{stock.pbv}x</td>
                      <td className="py-2.5 px-3 text-right font-mono text-emerald-400 font-bold">{stock.roe}%</td>
                      <td className="py-2.5 px-3 text-right font-mono text-amber-400">{stock.dy}%</td>
                      <td className="py-2.5 px-3 text-center">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/20 text-emerald-300">
                          {stock.signal}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <button
                          onClick={() => {
                            setSelectedStock(stock.ticker);
                            setActiveTab("Beranda");
                          }}
                          className="px-2.5 py-1 rounded bg-zinc-800 hover:bg-emerald-600 hover:text-white text-zinc-300 text-[11px] font-medium transition-colors"
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

        {/* TAB: FUNDAMENTAL */}
        {activeTab === "Fundamental" && (
          <div className="max-w-[1600px] mx-auto space-y-4">
            <div className="bg-[#111115] border border-zinc-800 rounded-xl p-4">
              <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-xl font-bold text-white">{activeStock.ticker}</h2>
                    <span className="text-xs bg-zinc-800 text-zinc-300 px-2 py-0.5 rounded">
                      {stockDetail?.sector || "Sektor Keuangan"}
                    </span>
                  </div>
                  <p className="text-xs text-zinc-400">{stockDetail?.companyName || activeStock.name}</p>
                </div>
                <div className="text-right">
                  <div className="text-xs text-zinc-400">Ketahanan Moat</div>
                  <div className="text-sm font-bold text-emerald-400">
                    {stockDetail?.moatRating || "Wide"} ({stockDetail?.moatScore || 85}%)
                  </div>
                </div>
              </div>

              <div className="mt-4">
                <h3 className="text-xs font-bold text-zinc-300 uppercase tracking-wider mb-2">
                  Ringkasan Laporan Keuangan Tahunan (Audited)
                </h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-[#16161B] text-zinc-400">
                      <tr>
                        <th className="py-2 px-3">Tahun Buku</th>
                        <th className="py-2 px-3 text-right">Pendapatan (Miliar Rp)</th>
                        <th className="py-2 px-3 text-right">Laba Bersih (Miliar Rp)</th>
                        <th className="py-2 px-3 text-right">Net Margin (%)</th>
                        <th className="py-2 px-3 text-right">ROE (%)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-800/60 font-mono">
                      {stockDetail?.revenue4Y && stockDetail.revenue4Y.length > 0 ? (
                        stockDetail.revenue4Y.map((row) => (
                          <tr key={row.year} className="hover:bg-zinc-800/30">
                            <td className="py-2 px-3 font-bold text-white">{row.year}</td>
                            <td className="py-2 px-3 text-right text-zinc-300">
                              {row.revenue.toLocaleString("id-ID")}
                            </td>
                            <td className="py-2 px-3 text-right text-emerald-400 font-bold">
                              {row.netIncome.toLocaleString("id-ID")}
                            </td>
                            <td className="py-2 px-3 text-right text-zinc-300">
                              {((row.netIncome / Math.max(1, row.revenue)) * 100).toFixed(1)}%
                            </td>
                            <td className="py-2 px-3 text-right text-emerald-400">
                              {activeStock.roe}%
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={5} className="py-6 text-center text-zinc-500 font-sans">
                            Data LK tahunan sedang disinkronisasi dari bursa atau belum dilaporkan.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB: VALUASI */}
        {activeTab === "Valuasi" && (
          <div className="max-w-[1600px] mx-auto space-y-4">
            <div className="bg-[#111115] border border-zinc-800 rounded-xl p-4">
              <h2 className="text-base font-bold text-white mb-1">Matriks Sensitivitas DCF</h2>
              <p className="text-xs text-zinc-400 mb-4">
                Simulasi nilai wajar saham {activeStock.ticker} berdasarkan kombinasi tingkat pertumbuhan dan WACC
              </p>

              <div className="overflow-x-auto">
                <table className="w-full text-center text-xs border border-zinc-800 font-mono">
                  <thead className="bg-[#16161B] text-zinc-400">
                    <tr>
                      <th className="p-2 border border-zinc-800">WACC \ Growth</th>
                      {[6, 8, 10, 12, 14].map((g) => (
                        <th key={g} className="p-2 border border-zinc-800 text-zinc-200">
                          g = {g}%
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {[9.5, 10.5, 11.5, 12.5].map((w) => (
                      <tr key={w} className="hover:bg-zinc-800/30">
                        <td className="p-2 font-bold text-zinc-300 bg-zinc-900 border border-zinc-800">
                          {w}%
                        </td>
                        {[6, 8, 10, 12, 14].map((g) => {
                          const base = activeStock.price || 6000;
                          const factor = (1 + (g - 8) * 0.05) / (1 + (w - 10.5) * 0.08);
                          const val = Math.round(base * 1.15 * factor);
                          const isUndervalued = val > base;

                          return (
                            <td
                              key={g}
                              className={`p-2 border border-zinc-800 ${
                                isUndervalued ? "text-emerald-400 bg-emerald-950/20" : "text-zinc-400"
                              }`}
                            >
                              Rp {val.toLocaleString("id-ID")}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB: COMPARE */}
        {activeTab === "Compare" && (
          <div className="max-w-[1600px] mx-auto space-y-4">
            <div className="bg-[#111115] border border-zinc-800 rounded-xl p-4">
              <h2 className="text-base font-bold text-white mb-3">Komparasi Head-to-Head</h2>

              <div className="grid grid-cols-2 gap-4">
                <div className="bg-zinc-900/60 p-4 rounded-xl border border-zinc-800">
                  <div className="text-lg font-bold text-emerald-400 mb-3">{peerTickerA}</div>
                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between pb-1 border-b border-zinc-800">
                      <span className="text-zinc-400">Harga Terakhir</span>
                      <span className="font-mono font-bold text-white">
                        Rp {(peerDataA?.currentPrice || 6350).toLocaleString("id-ID")}
                      </span>
                    </div>
                    <div className="flex justify-between pb-1 border-b border-zinc-800">
                      <span className="text-zinc-400">PER</span>
                      <span className="font-mono">{peerDataA?.pe || 13.5}x</span>
                    </div>
                    <div className="flex justify-between pb-1 border-b border-zinc-800">
                      <span className="text-zinc-400">ROE</span>
                      <span className="font-mono text-emerald-400 font-bold">{peerDataA?.roe || 21.8}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-zinc-400">Ketahanan Moat</span>
                      <span className="font-semibold text-emerald-400">{peerDataA?.moatRating || "Wide"}</span>
                    </div>
                  </div>
                </div>

                <div className="bg-zinc-900/60 p-4 rounded-xl border border-zinc-800">
                  <div className="text-lg font-bold text-amber-400 mb-3">{peerTickerB}</div>
                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between pb-1 border-b border-zinc-800">
                      <span className="text-zinc-400">Harga Terakhir</span>
                      <span className="font-mono font-bold text-white">
                        Rp {(peerDataB?.currentPrice || 4800).toLocaleString("id-ID")}
                      </span>
                    </div>
                    <div className="flex justify-between pb-1 border-b border-zinc-800">
                      <span className="text-zinc-400">PER</span>
                      <span className="font-mono">{peerDataB?.pe || 11.8}x</span>
                    </div>
                    <div className="flex justify-between pb-1 border-b border-zinc-800">
                      <span className="text-zinc-400">ROE</span>
                      <span className="font-mono text-emerald-400 font-bold">{peerDataB?.roe || 18.5}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-zinc-400">Ketahanan Moat</span>
                      <span className="font-semibold text-emerald-400">{peerDataB?.moatRating || "Wide"}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB: ADMIN (KHUSUS ROLE ADMIN) */}
        {activeTab === "Admin" && isAdmin && (
          <div className="max-w-[1400px] mx-auto space-y-5">
            <div className="bg-[#111115] border border-amber-500/30 rounded-xl p-5 shadow-lg shadow-amber-950/10">
              <div className="flex items-center gap-3 pb-4 border-b border-zinc-800">
                <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400">
                  <ShieldAlert className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-white flex items-center gap-2">
                    <span>Konsol Administrator SahamLens</span>
                    <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                      Admin Access
                    </span>
                  </h2>
                  <p className="text-xs text-zinc-400">
                    Akses kontrol fitur Pro, provisioning akun uji, dan diagnostik server langsung
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mt-5">
                {/* 1. Form Set Pro User */}
                <div className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-4 text-xs">
                  <div className="flex items-center gap-2 mb-3">
                    <ShieldCheck className="w-4 h-4 text-emerald-400" />
                    <h3 className="font-bold text-white text-sm">Kelola Akses Pro Pengguna</h3>
                  </div>

                  {adminProMsg && (
                    <div
                      className={`mb-3 p-2.5 rounded-lg flex items-center gap-2 ${
                        adminProMsg.type === "success"
                          ? "bg-emerald-500/10 border border-emerald-500/30 text-emerald-400"
                          : "bg-rose-500/10 border border-rose-500/30 text-rose-400"
                      }`}
                    >
                      <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                      <span>{adminProMsg.text}</span>
                    </div>
                  )}

                  <form onSubmit={handleAdminSetPro} className="space-y-3">
                    <div>
                      <label className="block text-zinc-300 font-medium mb-1">Email Pengguna</label>
                      <input
                        type="email"
                        required
                        placeholder="pengguna@email.com"
                        value={adminTargetEmail}
                        onChange={(e) => setAdminTargetEmail(e.target.value)}
                        className="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-2 text-white placeholder-zinc-500 focus:outline-none focus:border-amber-500"
                      />
                    </div>

                    <div className="flex items-center gap-2 pt-1">
                      <input
                        type="checkbox"
                        id="isProCheck"
                        checked={adminTargetIsPro}
                        onChange={(e) => setAdminTargetIsPro(e.target.checked)}
                        className="rounded bg-zinc-800 border-zinc-700 text-amber-500 focus:ring-0 cursor-pointer"
                      />
                      <label htmlFor="isProCheck" className="text-zinc-300 cursor-pointer">
                        Aktifkan Status Pro (Berikan Akses Tanpa Batas)
                      </label>
                    </div>

                    <button
                      type="submit"
                      disabled={adminProLoading}
                      className="w-full bg-amber-600 hover:bg-amber-500 text-black font-bold py-2 rounded-lg transition-colors flex items-center justify-center gap-1.5 mt-2"
                    >
                      {adminProLoading ? (
                        <>
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          <span>Menyimpan...</span>
                        </>
                      ) : (
                        <span>Simpan Status Akses</span>
                      )}
                    </button>
                  </form>
                </div>

                {/* 2. Form Buat Test User */}
                <div className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-4 text-xs">
                  <div className="flex items-center gap-2 mb-3">
                    <UserPlus className="w-4 h-4 text-amber-400" />
                    <h3 className="font-bold text-white text-sm">Buat Akun Uji Cepat</h3>
                  </div>

                  {testUserMsg && (
                    <div
                      className={`mb-3 p-2.5 rounded-lg flex items-center gap-2 ${
                        testUserMsg.type === "success"
                          ? "bg-emerald-500/10 border border-emerald-500/30 text-emerald-400"
                          : "bg-rose-500/10 border border-rose-500/30 text-rose-400"
                      }`}
                    >
                      <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                      <span>{testUserMsg.text}</span>
                    </div>
                  )}

                  <form onSubmit={handleAdminCreateTestUser} className="space-y-3">
                    <div>
                      <label className="block text-zinc-300 font-medium mb-1">Email Akun Baru</label>
                      <input
                        type="email"
                        required
                        placeholder="testuser@sahamlens.id"
                        value={testUserEmail}
                        onChange={(e) => setTestUserEmail(e.target.value)}
                        className="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-2 text-white placeholder-zinc-500 focus:outline-none focus:border-amber-500"
                      />
                    </div>

                    <div>
                      <label className="block text-zinc-300 font-medium mb-1">Kata Sandi</label>
                      <input
                        type="password"
                        required
                        placeholder="••••••••"
                        value={testUserPassword}
                        onChange={(e) => setTestUserPassword(e.target.value)}
                        className="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-2 text-white placeholder-zinc-500 focus:outline-none focus:border-amber-500"
                      />
                    </div>

                    <div className="flex items-center gap-2 pt-1">
                      <input
                        type="checkbox"
                        id="testUserProCheck"
                        checked={testUserIsPro}
                        onChange={(e) => setTestUserIsPro(e.target.checked)}
                        className="rounded bg-zinc-800 border-zinc-700 text-amber-500 focus:ring-0 cursor-pointer"
                      />
                      <label htmlFor="testUserProCheck" className="text-zinc-300 cursor-pointer">
                        Jadikan Akun Pro Langsung
                      </label>
                    </div>

                    <button
                      type="submit"
                      disabled={testUserLoading}
                      className="w-full bg-zinc-800 hover:bg-zinc-700 text-white font-bold py-2 rounded-lg transition-colors flex items-center justify-center gap-1.5 mt-2"
                    >
                      {testUserLoading ? (
                        <>
                          <RefreshCw className="w-3.5 h-3.5 animate-spin text-amber-400" />
                          <span>Mendaftarkan...</span>
                        </>
                      ) : (
                        <span>Buat Akun Sekarang</span>
                      )}
                    </button>
                  </form>
                </div>
              </div>

              {/* Status Server Info */}
              <div className="mt-5 p-3.5 bg-zinc-950/80 border border-zinc-800/80 rounded-xl flex items-center justify-between text-xs">
                <div className="flex items-center gap-3">
                  <Server className="w-4 h-4 text-emerald-400" />
                  <div>
                    <span className="font-semibold text-zinc-200">Koneksi Backend SahamLens:</span>{" "}
                    <span className="font-mono text-emerald-400">{API_BASE}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-[11px] text-zinc-400">
                  <span>Sesi Admin:</span>
                  <span className="font-mono text-white bg-zinc-800 px-2 py-0.5 rounded">{session.email}</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* 4. MODAL LOGIN */}
      {isLoginModalOpen && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#121217] border border-zinc-700 rounded-2xl w-full max-w-md p-6 shadow-2xl relative">
            <button
              onClick={() => setIsLoginModalOpen(false)}
              className="absolute top-4 right-4 p-1 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-400 flex items-center justify-center font-bold text-black text-lg shadow-lg shadow-emerald-950">
                SL
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Masuk ke SahamLens Pro</h3>
                <p className="text-xs text-zinc-400">Buka akses Screener Pro, DCF, dan LensAI tanpa batas</p>
              </div>
            </div>

            {loginError && (
              <div className="mb-4 bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs p-3 rounded-xl flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{loginError}</span>
              </div>
            )}

            <form onSubmit={handleLoginSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block text-zinc-300 font-medium mb-1.5">Alamat Email</label>
                <div className="relative">
                  <User className="absolute left-3 top-2.5 w-4 h-4 text-zinc-500" />
                  <input
                    type="email"
                    required
                    placeholder="nama@email.com"
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-700 rounded-xl pl-9 pr-3 py-2 text-white placeholder-zinc-500 focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-zinc-300 font-medium mb-1.5">Kata Sandi</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-2.5 w-4 h-4 text-zinc-500" />
                  <input
                    type="password"
                    required
                    placeholder="••••••••"
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-700 rounded-xl pl-9 pr-3 py-2 text-white placeholder-zinc-500 focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loginLoading}
                className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-semibold py-2.5 rounded-xl transition-all shadow-md shadow-emerald-950 flex items-center justify-center gap-2 mt-2"
              >
                {loginLoading ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Memverifikasi...</span>
                  </>
                ) : (
                  <span>Masuk Sekarang</span>
                )}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* 5. SLIDE-OVER DRAWER: LENSAI */}
      {isAiDrawerOpen && (
        <div className="fixed inset-0 z-40 flex justify-end bg-black/50 backdrop-blur-xs">
          <div className="w-full max-w-md bg-[#121217] border-l border-zinc-800 h-full flex flex-col shadow-2xl animate-in slide-in-from-right duration-200">
            <div className="h-14 border-b border-zinc-800 px-4 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-400" />
                <h3 className="font-bold text-sm text-white">LensAI Assistant Pro</h3>
                <span className="text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-1.5 py-0.5 rounded font-semibold">
                  {activeStock.ticker}
                </span>
              </div>
              <button
                onClick={() => setIsAiDrawerOpen(false)}
                className="p-1 rounded text-zinc-400 hover:text-white hover:bg-zinc-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3 text-xs">
              {aiChatMessages.map((msg, idx) => (
                <div
                  key={idx}
                  className={`p-3 rounded-xl leading-relaxed ${
                    msg.role === "user"
                      ? "bg-emerald-600/20 text-emerald-100 border border-emerald-500/30 ml-8"
                      : "bg-zinc-900 text-zinc-200 border border-zinc-800 mr-4 whitespace-pre-line"
                  }`}
                >
                  <div className="text-[9px] font-semibold text-zinc-400 mb-1">
                    {msg.role === "user" ? "Anda" : "LensAI"} • {msg.time}
                  </div>
                  <div>{msg.text}</div>
                </div>
              ))}
              {aiLoading && (
                <div className="bg-zinc-900 p-3 rounded-xl border border-zinc-800 text-zinc-400 flex items-center gap-2">
                  <RefreshCw className="w-3.5 h-3.5 animate-spin text-emerald-400" />
                  <span>LensAI sedang menyusun analisis bursa...</span>
                </div>
              )}
            </div>

            <div className="p-2 border-t border-zinc-800 bg-[#0E0E12] flex gap-1.5 overflow-x-auto text-[11px]">
              {[
                `Analisis Moat ${activeStock.ticker}`,
                `Batas Batal & Timing`,
                `Valuasi Wajar`,
              ].map((p) => (
                <button
                  key={p}
                  onClick={() => handleSendChatMessage(p)}
                  className="shrink-0 px-2.5 py-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg transition-colors"
                >
                  {p}
                </button>
              ))}
            </div>

            <div className="p-3 border-t border-zinc-800 bg-[#0E0E12]">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSendChatMessage();
                }}
                className="flex items-center gap-2"
              >
                <input
                  type="text"
                  placeholder={`Tanya LensAI tentang ${activeStock.ticker}...`}
                  value={aiInputText}
                  onChange={(e) => setAiInputText(e.target.value)}
                  className="flex-1 bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-1.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-emerald-500"
                />
                <button
                  type="submit"
                  disabled={aiLoading || !aiInputText.trim()}
                  className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors"
                >
                  Kirim
                </button>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
