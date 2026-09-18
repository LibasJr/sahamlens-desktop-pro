# SahamLens Web ↔ Desktop Pro — Source Parity Matrix

Audit date: 2026-09-18

Authoritative revisions:

- Web: `/opt/sahamlens/app` at `a5ad910faab3fabed2e7a6419c86522ed3d3f093` (read-only production checkout).
- Desktop: `/home/lens/sahamlens-desktop-pro` at `ef6071d4503f5976782c8826b922403042138398` before this documentation update.
- Method: source audit only. No UI guessing, production request, database read, or mutation.

Evidence paths without an absolute prefix refer to the web repository. Desktop evidence is prefixed `desktop:` and resolves under `/home/lens/sahamlens-desktop-pro`.

Status definitions:

- **Exact**: same callable contract and substantially same user outcome.
- **Partial**: related workflow exists, but contract, behavior, controls, or depth differs.
- **Missing**: no desktop counterpart.
- **Blocked**: desktop cannot reach equivalent behavior because web has no native-callable API or authorization contract.
- **Excluded**: source route is intentionally non-product/internal and must not be copied into a release build.

Priority definitions: **P0** security, ownership, destructive action, or misleading-data risk; **P1** primary research/operations workflow; **P2** secondary workflow; **P3** presentation/polish.

## Executive result

Desktop is a separate React/Tauri implementation despite stale README claims that it loads the web directly (`desktop:README.md:5-17` versus bundled Vite configuration at `desktop:src-tauri/tauri.conf.json:6-10` and cockpit source at `desktop:src/App.tsx:57-2182`). Therefore parity is measured from executable source, not README intent.

Feature/workflow tally in sections 1–4: **Exact 0; Partial 34; Missing 49; Blocked 8; Excluded 2** (93 items across 60 web pages and core navigation/chart boundaries). Endpoint-level exactness exists for a small subset and is recorded separately in section 5; it does not make the corresponding full UI workflow exact.

No audited LensTechnical feature is exact. Desktop has partial candlestick, indicator-card, support/resistance, and trade-plan surfaces, but lacks interactive chart navigation, timeframe selection, chart-type selection, synchronized indicator panes, hover inspection, and pattern parity. Admin parity is two partial mutations plus partial account-admin login out of twenty page workflows. User parity is concentrated in Beranda, Screener, Teknikal, Fundamental, Valuasi, Compare, LensAI, and login/logout; most deeper workflows remain missing.

## 1. Global shell, navigation, and access contract

| Surface | Web evidence | Auth / role | Desktop evidence | Status | Priority / dependency | Acceptance criteria |
|---|---|---|---|---|---|---|
| Page access boundary | `shared/constants/access.ts:21-24,59-60`; `proxy.ts:430-435` | Only `/portfolio` and `/watchlist` are page-level account-required; account or verified admin passes. | Bearer login exists, but portfolio/watchlist UI does not: `desktop:src/api.ts:233-272`; `desktop:src/App.tsx:477-515`. | Partial | P0; shared access policy, session store | Menu click and direct route enforce same policy; unsafe external `next` rejected; protected data never flashes. |
| Runtime entitlement | `shared/constants/access.ts:27-34`; `proxy.ts:465-480` | Open-testing flag, account, admin, Pro, and trial affect access. | Session keeps `role`, `isPro`, `hasProAccess`: `desktop:src/api.ts:13-19,189-228`. | Partial | P0; entitlement contract | Same session receives same entitlement in web, desktop, proxy, and API. |
| Sidebar groups/menu | `components/Sidebar.tsx:77-155,188-213` | Guest/member groups plus conditional Admin group. | Flat Beranda, Teknikal, Screener, Fundamental, Valuasi, Compare, LensAI; conditional Admin: `desktop:src/App.tsx:477-515`. | Partial | P1; complete route inventory | Every supported web menu/submenu has a desktop destination or explicit documented exclusion; active state and role visibility are correct. |
| Mobile navigation | `components/MobileNav.tsx:11-39,78-113` | Guest/member destination differs. | Native desktop has top navigation only. | Missing | P3; compact-window policy | If desktop supports compact mode, controls remain keyboard accessible and never flash wrong auth destination. |
| Stock perspective submenu | `components/StockPerspectiveNav.tsx:25-42,55-66,85-104` | Public navigation with downstream locks. | Teknikal/Fundamental share `selectedStock`: `desktop:src/App.tsx:83-89,1091-1093,1650-1652`. | Partial | P1; canonical ticker | Ticker survives all research tabs without `.JK` duplication; active destination is accessible. |
| Session refresh / verification | `components/AppShell.tsx:47-77`; `app/api/auth/me/route.ts:5-8` | Cookie/bearer-aware session presence and refresh. | Token/session loaded from localStorage, no `/api/auth/me` verification: `desktop:src/api.ts:189-228`. | Partial | P0; native auth lifecycle | Startup verifies bearer token through `/api/auth/me`; invalid token is deleted; role downgrade removes Admin without restart. |
| Native transport boundary | — | — | API origin and central bearer injection: `desktop:src/api.ts:3-8,150-183`; HTTP allowlist: `desktop:src-tauri/capabilities/default.json:5-14`. | Partial | P0; approved HTTPS origins | Bearer token is attached only to approved SahamLens origin; absolute external URLs never receive credentials. |
| Zero-dummy invariant | Web controller rejects invalid/dummy stock payloads: `modules/technical/controller/stock-analysis.controller.ts:133-147`. | All users | Desktop fabricates market strip and analysis fallbacks: `desktop:src/App.tsx:594-630`; `desktop:src/api.ts:579-716`. | Missing | P0; data-boundary validation | Missing data renders unavailable/loading/error, never plausible prices, scores, labels, levels, or trade plans. |

## 2. LensTechnical deep parity

### 2.1 Feature/component matrix

| Feature | Web source and behavior | Desktop counterpart | Status | Priority / dependency | Acceptance criteria |
|---|---|---|---|---|---|
| Candlestick + volume | Six chart modes use `lightweight-charts`: `components/TradingViewChart.tsx:248-359`; volume pane `:432-445`. | Static SVG candles/volume, last 45 bars: `desktop:src/App.tsx:1199-1298`. | Partial | P1; validated OHLCV model, chart engine | Same validated candles render without truncation surprises; volume shares aligned time axis; empty/malformed input is explicit. |
| Pan / drag | Wheel, pressed-mouse, horizontal-touch enabled: `components/TradingViewChart.tsx:288-293`; interaction help `:734-736`. | No pointer/mouse/wheel/touch handlers: `desktop:src/App.tsx:1224-1297`. | Missing | P1; interactive chart engine | Mouse/touch drag pans horizontally without selecting page text; vertical touch scroll remains usable. |
| Zoom / fit / reset / fullscreen | Axis drag, wheel, pinch `components/TradingViewChart.tsx:294-298`; toolbar controls `components/chart/FinancialChartToolbar.tsx:242-290`; reset `components/TradingViewChart.tsx:620-624`. | No zoom/range state or controls. | Missing | P1; chart engine/window integration | Wheel/pinch/axis zoom work; fit/reset restore deterministic range; fullscreen exits safely. |
| Timeframes | `1D,3D,7D,1M,3M,1Y,10Y,ALL`: `components/StockChartPanel.tsx:19-32`; selector `components/chart/FinancialChartToolbar.tsx:167-187`; API mapping `app/api/public-chart/[ticker]/route.ts:24-42`. | `getStockChart` sends no `tf`; fixed 45-bar slice: `desktop:src/api.ts:436-448`; `desktop:src/App.tsx:1205-1209`. | Missing | P1; timeframe contract and cancellation | All eight values send exact `tf`; rapid changes cannot show stale data; unknown values and 7D semantics are deterministic and tested. |
| Chart types | Candlestick, OHLC bars, line, area, baseline, Heikin Ashi: `components/chart/FinancialChartToolbar.tsx:30-37`; renderer `components/TradingViewChart.tsx:312-359`. | Candlestick only: `desktop:src/App.tsx:1259-1297`. | Missing | P2; chart engine | Six types use same candle source; derived Heikin Ashi is labeled and never replaces source OHLC. |
| Indicator selector/catalog | SMA, EMA, BB, Volume, RSI, MACD, ATR, CMF, Stochastic, Williams %R, ADX/DMI, OBV: `lib/chart-indicators.ts:15-50`; configuration `:53-90`; add/remove limits `components/chart/FinancialChartToolbar.tsx:129-156`. | Fixed RSI/MACD/Stochastic/ATR/MA values and four cards: `desktop:src/api.ts:120-128`; `desktop:src/App.tsx:1313-1434`. | Partial | P1; canonical formulas, chart series | All web indicators can be selected/configured/removed; overlay max 5, oscillator max 4; insufficient history is `N/A`, never neutral. |
| MA overlays | SMA/EMA/BB series on price chart: `components/TradingViewChart.tsx:399-421`. | MA20/50/200 labels exist but SVG draws no MA paths: `desktop:src/App.tsx:1174-1195,1224-1298`. | Missing | P1; series computation | Legend appears only for rendered lines; periods/colors match selector and values. |
| Indicator formula parity | Wilder RSI/ATR `lib/chart-indicators.ts:178-205,237-273`; canonical slow stochastic referenced at `:1,47`. | `%D=%K`; ATR simple average; neutral defaults on insufficient history: `desktop:src/api.ts:473-547`. | Partial | P0; shared canonical calculator | Golden-vector tests match canonical web outputs; partial history yields unavailable state, not fabricated neutral signal. |
| Tooltip / OHLC hover | Crosshair mapping `components/TradingViewChart.tsx:549-568`; tooltip time/change/OHLC/indicators `:707-723`. | No hover state or tooltip. | Missing | P1; chart engine | Hover shows candle timestamp/OHLC/change and every visible series value; leaving plot has documented behavior. |
| Crosshair | Horizontal/vertical crosshair with labels: `components/TradingViewChart.tsx:268-272`. | None. | Missing | P1 | Crosshair remains synchronized across price, volume, and indicator panes. |
| Legend | Active chips `components/chart/FinancialChartToolbar.tsx:293-319`; live values `components/TradingViewChart.tsx:707-721`. | Static MA color keys disconnected from series: `desktop:src/App.tsx:1174-1195`. | Partial | P1 | Legend contains only rendered series and never silently truncates configured values. |
| Oscillator panes | Independent scales/layout: `components/TradingViewChart.tsx:241-242,423-545`; pane labels `:630-647,725-731`. | Detached summary cards: `desktop:src/App.tsx:1313-1434`. | Partial | P1; synchronized time scale | RSI/MACD/Stochastic/etc. render time series on independent readable scales without overlap. |
| Support/resistance/pivots | Three pivot methods + 52-week range: `components/technical/TechnicalAnalysisSuite.tsx:122-222`; formulas `lib/technical/technical-levels.ts:97-178`. | 20-bar local support/resistance only: `desktop:src/api.ts:659-662`; UI `desktop:src/App.tsx:1543-1553`. | Partial | P1; canonical levels service | Classic/Fibonacci/Camarilla ladders and 52-week position match web service; missing history blocks output. |
| Multi-timeframe trend | EMA20, MA50/100/200 matrix: `lib/technical/technical-levels.ts:235-303`; UI `components/technical/TechnicalAnalysisSuite.tsx:224-251`. | One text trend/momentum summary: `desktop:src/App.tsx:1534-1542`; local logic `desktop:src/api.ts:684-691`. | Missing | P1 | Short/medium/long states use same formulas and show as-of/provenance. |
| Trade plan | ATR14 entry zone, stop, TP1/TP2, risk/reward, bias: `lib/technical/technical-levels.ts:64-77,449-507`; UI `components/technical/TechnicalAnalysisSuite.tsx:315-375`. | Entry, CL1/CL2, TP1/TP2, RR exist: `desktop:src/api.ts:94-119`; `desktop:src/App.tsx:1437-1511`; missing values synthesized `desktop:src/api.ts:579-604,642-716`. | Partial | P0; one canonical contract | No percentage/default synthesis; arithmetic reconciles; completed daily sessions drive ATR; provenance/disclaimer visible. |
| TP/CL chart annotations | Web price lines: `components/TradingViewChart.tsx:361-379`. | Static TP1/CL dashed lines only inside current range: `desktop:src/App.tsx:1241-1257`. | Partial | P2; chart overlays | Levels remain visible/navigable across range changes and match trade-plan values exactly. |
| Candlestick patterns | Seven rule-based patterns, complete-candle and volume confirmation: `lib/technical/technical-levels.ts:306-443`; cards `components/technical/TechnicalAnalysisSuite.tsx:253-312`. | No pattern model, mapping, detector, annotation, or UI. | Missing | P1; canonical detector | Same rules/names/sentiment/explanation; partial candles excluded; volume confirmation and heuristic reliability disclosed. |
| Data integrity/provenance | Server validates timestamp/OHLC/positive close/nonnegative volume/high-low: `app/api/public-chart/[ticker]/route.ts:96-135`; partial-session provenance `:147-188`; disclosure `components/StockChartPanel.tsx:57-101`. | Permissive mapping/defaults, no schema/order/duplicate/invariant checks: `desktop:src/api.ts:436-448,564-573`; numeric substring fallback `desktop:src/normalize.ts:28-37`. | Partial | P0; runtime schema | Validate finiteness, chronology, uniqueness, volume and `low <= open/close <= high`; preserve `adjClose` and partial-session metadata. |
| Stale ticker/request handling | Abort and clear on symbol/timeframe changes: `components/StockChartPanel.tsx:36-55`. | State updates only for truthy result and can retain old ticker data: `desktop:src/App.tsx:179-205`. | Missing | P0; AbortController/generation guard | Old data clears immediately; aborted/late requests cannot overwrite latest ticker. |
| Export / research card | Signed-in export and technical card flow: `app/technical/[symbol]/page.tsx:742-817`; `components/export/TechnicalExportSection.tsx`. | No technical export. | Missing | P2; native save/image path | Export uses only real loaded data, labels unavailable fields, includes ticker/as-of/provenance, and matches preview. |

### 2.2 Technical API contracts

| Endpoint | Method/auth | Contract | Desktop status | Acceptance criteria |
|---|---|---|---|---|
| `/api/public-chart/[ticker]` | GET; public; shared public-compute budget (`app/api/public-chart/[ticker]/route.ts:11-23`). | Query `tf`; `{ticker,history[]}` where bars include `time,open,high,low,close,adjClose,price,volume` and optional session provenance (`app/api/public-chart/[ticker]/route.ts:81-95,125-134,171-204`). | Partial: consumes history but sends no `tf` and drops provenance (`desktop:src/api.ts:436-448`). | Exact timeframe mapping, typed validation, explicit 429/retry, no credential on public call, and provenance retained. |
| `/api/stock/[ticker]` | GET; session/internal-service; guest 401, non-Pro daily quota then 402: `modules/technical/service/stock-analysis-access.service.ts:36-91`. | Legacy root plus `data`; full analysis includes trade plan, analyzers, consensus, scoring, quality/audit/decision and `stock.history`: `modules/technical/service/stock-analysis-response.service.ts:184-258`; stale-cache success possible `modules/technical/controller/stock-analysis.controller.ts:89-115`. | Partial: expects `body.history`, not `body.stock.history`; silently falls back to public-chart/local synthesis: `desktop:src/api.ts:549-573,637-716`. | Contract test covers envelope, `stock.history`, bearer acceptance, 401/402/429/stale/5xx; reduced fallback is labeled and contains no fabricated metrics. |

### 2.3 Web-reference defects that must not be copied

- Unknown timeframe silently maps to `6mo`, while UI `7D` maps to provider `5d`: `app/api/public-chart/[ticker]/route.ts:24-42`.
- Compact `TechnicalAnalysisSuite` can report no patterns while pattern cards are hidden behind full mode: `components/technical/TechnicalAnalysisSuite.tsx:42-46,278-312`.
- Hover values are truncated to eight despite configurations that can exceed eight: `components/TradingViewChart.tsx:560-566`.
- Web client uses `apiRequest<any>` and only checks non-empty history: `components/StockChartPanel.tsx:33-47`; server lacks explicit sorting, uniqueness, and `low <= open/close <= high` checks.

## 3. User-facing route, page, component, and workflow inventory

| Web route / feature | Evidence | Auth / data contract | Desktop counterpart | Status | Priority / dependency | Acceptance criteria |
|---|---|---|---|---|---|---|
| `/` workspace | `app/page.tsx:20`; `components/HomeWorkspace.tsx:65-93,326-327,441-443` | Public; technical, screener, backtest, watchlist, market, radar. | Beranda combines screener/radar/stock: `desktop:src/App.tsx:637-1043`. | Partial | P1; market pulse, screener, radar | Partial API failure leaves other cards usable; protected links open auth flow. |
| `/home` legacy entry | `app/home/page.tsx:3`; `proxy.ts:53-56` | Public legacy route. | Beranda tab. | Partial | P2; canonical routing | Canonical redirect/content is deterministic; no conflicting home state. |
| `/market-pulse` | `app/market-pulse/page.tsx:65-69,183,319` | Public; `/api/market-pulse`, `/api/breakout-radar`. | Header/Beranda: `desktop:src/App.tsx:594-630`. | Partial | P1; cached pulse/radar | Source/timestamp/delayed state visible; no hard-coded fallback. |
| `/market/[category]` | `app/market/[category]/page.tsx:39,52-54,115-165` | Public; `/api/market-summary`. | None. | Missing | P2; market-summary cache | Supported categories and search map exactly; unsupported category fails safely. |
| `/breakout-radar` | `app/breakout-radar/page.tsx:36,101-138,243-303` | Public shell; `/api/ai-pick`, `/api/lens-score-bucket-backtest`; quota/Pro states. | Reduced `/api/breakout-radar` table: `desktop:src/api.ts:353-356`. | Partial | P1; scan/calibration/entitlement | Lock/quota/error states do not flash data; generated time and delayed disclosure shown. |
| `/recommendations` | `app/recommendations/page.tsx:91,109-138,476-488` | Public shell; chunked `/api/recommendations`, calendar flags. | None. | Missing | P1; chunk merge, calendar | Deduplicate chunks; stale requests cannot overwrite filters; action flags match calendar. |
| `/calendar` | `app/calendar/page.tsx:63,76-78,175-188,315-318` | Public; `/api/calendar`. | None. | Missing | P2; timezone/cache | Month rollover and timezone are correct; loading, empty, filtered-empty, error differ. |
| `/news` | `app/news/page.tsx:69,79-81,118-152` | Public; `/api/news`; tone/sentiment filters. | None. | Missing | P2; feed/classifier | Filter counts reconcile; external links are safe; source/time/uncertainty retained. |
| `/dashboard` | `app/dashboard/page.tsx:558`; `components/dashboard/GuestLockedSection.tsx:26-28`; `components/dashboard/DashboardFooterActions.tsx:67-84` | Public shell with guest-locked detail. | Beranda + Teknikal. | Partial | P1; multi-API orchestration | One ticker updates all panels; locks never flash; module failures are isolated. |
| `/technical/[symbol]` | `app/technical/[symbol]/page.tsx:125-136,240,552-556,742-817` | Public analysis; `/api/stock`; export requires sign-in. | Teknikal + public fallback: `desktop:src/App.tsx:1091-1093`; `desktop:src/api.ts:549-643`. | Partial | P1; see section 2 | Canonical ticker, safe invalid ticker, labeled reduced mode, export auth enforced. |
| `/fundamental` | `app/fundamental/page.tsx:68-71,116-129,276-281,435-439,514-517` | Public teaser; stock + fundamental APIs; advanced locks. | Fundamental: `desktop:src/App.tsx:1650-1652`; `desktop:src/api.ts:382-385`. | Partial | P1; contract merge | Independent endpoint failures; units/period/source explicit; protected data never flashes. |
| `/compare` | `app/compare/page.tsx:67-70,128-180,250,310-328` | Public shell; `/api/compare`; authenticated detail; auto peer. | Local dual fundamental fetch, no compare API: `desktop:src/App.tsx:211-213,1774-1777`. | Partial | P1; peer contract | Explicit second ticker preserved; auto-peer deterministic/labeled; stale response ignored. |
| `/dcf` | `app/dcf/page.tsx:59-61,90-91,374`; `components/IntrinsicValue.tsx:270-278` | Public shell; `/api/dcf`; assumptions. | Valuasi uses `/api/intrinsic`: `desktop:src/App.tsx:1721-1724`; `desktop:src/api.ts:430-433`. | Partial | P1; valuation models | Model difference, assumptions, units, sources visible; missing input blocks false precision. |
| `/moat` | `app/moat/page.tsx:87,148-150,219-220,417` | Public; fundamental-derived business quality; some locks. | Reduced Fundamental view. | Partial | P2; score provenance | Every score identifies formula/source; absent input does not become zero. |
| `/earnings` | `app/earnings/page.tsx:38,112-114,197-198` | Public; `/api/earnings/[ticker]`. | None. | Missing | P2; earnings provider | Cancel stale ticker; period order/units stable; no data differs from zero. |
| `/macro` | `app/macro/page.tsx:36,105-107,142,306-309` | Public; `/api/macro`; source links. | None. | Missing | P2; macro freshness | Every metric shows period, age, source; stale/missing explicit. |
| `/ownership-flow` | `app/ownership-flow/page.tsx:39,56-58,145,212` | Public; `/api/ownership-flow`. | None. | Missing | P2; KSEI coverage | Coverage date/denominator shown; percentages reconcile; unsupported ticker explicit. |
| `/screener` | `app/screener/page.tsx:35,110-134`; `components/screener/ScreenerControls.tsx:151-153`; `components/screener/ScreenerResults.tsx:193-203` | Public; `/api/screener`; save/export require auth. | Filters and same endpoint: `desktop:src/App.tsx:653-665,1573-1636`; `desktop:src/api.ts:318-322`. | Partial | P1; filter schema/cancellation | One settled request per filter change; count/result/URL agree; save/export enforce auth. |
| `/backtest` | `app/backtest/page.tsx:30-33,66-68,132-202`; `components/backtest/BacktestResultsPanel.tsx:170-179` | Public builder; chart, backtest, live-filter APIs; deeper result gates. | None. | Missing | P1; candles/compute budget | Validate strategy before compute; replay uses same candles; data/rate errors differ. |
| `/risk` | `app/risk/page.tsx:36,60-73,95-97,139-140,340` | Public tool; portfolio + `/api/risk-analysis`; some locks. | None. | Missing | P1; portfolio/IHSG/FX | Weights reconcile; failed beta symbols disclosed; guest policy explicit. |
| `/risk-calculator` | `app/risk-calculator/page.tsx:63-65,141,288,396` | Public; live quote + local sizing. | None. | Missing | P2; quote freshness | Reject invalid/negative inputs; quote failure visible; units/rounding stable. |
| `/dividend` | `app/dividend/page.tsx:18,43-49,96-97,278-356` | Public shell; `/api/dividend-plan`; possible 402. | None. | Missing | P2; entitlement/scan | Query modes exact; 402 differs from data failure; assumptions/status shown. |
| `/pattern` | `app/pattern/page.tsx:11-13,18,29-30` | Public statistical/seasonality surface; prior hard-coded claims removed. | None. | Missing | P0; real statistical dataset | Every claim has source, period, sample and formula; otherwise explicitly unavailable. |
| `/watchlist` | `app/watchlist/page.tsx:70-73,120-290,598-759`; `shared/constants/access.ts:21-24` | Account; watchlist, alert, alert-check, per-stock APIs. | Desktop-specific route exists but no caller/UI. | Missing | P0; ownership/limits/alerts | CRUD idempotent; ownership and free limit server-side; quote failure preserves saved item. |
| `/portfolio` | `app/portfolio/page.tsx:32,88-144,301-332,432-564`; `shared/constants/access.ts:21-24` | Account; portfolio buy/sell and quote merge. | None. | Missing | P0; ledger/atomic mutation | Validate quantity/price/ownership; oversell rejected; totals reconcile after refresh. |
| `/login` | `app/login/page.tsx:43-52`; `app/api/auth/login/route.ts:8-11` | Anonymous browser cookie flow. | Native bearer modal: `desktop:src/App.tsx:2013-2015`; `desktop:src/api.ts:233-237`. | Partial | P0; auth throttling | Generic invalid error; safe destination; rate limit; session only after success. |
| `/signup` | `app/signup/page.tsx:13,44-48,64-68,84-103` | Anonymous signup, resend, verify. | None. | Missing | P0; OTP | Validate input; throttle resend; reject expired/replayed OTP; create session after verification. |
| `/forgot-password` | `app/forgot-password/page.tsx:11,30-32,46` | Anonymous recovery request. | None. | Missing | P0; non-enumeration | Known/unknown email indistinguishable; repeated submission throttled. |
| `/reset-password` | `app/reset-password/page.tsx:42-45,74-114,186` | Anonymous reset/resend. | None. | Missing | P0; one-time credential | Same password policy; code expires and cannot replay; success returns to login. |
| `/login-required` | `app/login-required/page.tsx:12-30`; `components/Sidebar.tsx:86-89` | Guest explanation/gate. | Login modal only. | Partial | P1; destination preservation | Login/signup preserves safe destination; signed-in user is not trapped. |
| Profile/account | `components/UserProfileModal.tsx:26-28,46-84`; `components/Sidebar.tsx:381-383,626-628` | Account; profile, exact-phrase delete, logout. | Local email/access + logout only: `desktop:src/App.tsx:555-573`. | Partial | P0; destructive policy | Redacted profile; exact confirmation; admin/synthetic deletion forbidden; success clears session. |
| LensAI drawer | `components/Sidebar.tsx:121-125`; `components/AppShell.tsx:21,127`; `components/AIChat.tsx:318-320` | `/api/chat`; API limits. | Drawer + same endpoint: `desktop:src/App.tsx:2091-2094`; `desktop:src/api.ts:760-764`. | Partial | P1; stream/citations/quota | Compatible streaming/JSON contract; rate/quota visible; focus restored; context consistent. |
| `/about` | `app/about/page.tsx:9,51`; `components/Sidebar.tsx:129` | Public informational. | None. | Missing | P2; product claims | Claims match implementation; title/heading/canonical unique. |
| `/transparency` | `app/transparency/page.tsx:22,37`; `components/Sidebar.tsx:130` | Public methodology/evidence via `/api/transparency`. | None. | Missing | P1; versioned evidence | Every metric states model version, period, method, sample, limitation. |
| `/multi-agent` | `app/multi-agent/page.tsx:19,28`; `components/Sidebar.tsx:114-125` | Public informational/orphaned. | LensAI only. | Partial | P2; capability truthfulness | Linked intentionally or removed; claims map to executable behavior. |
| `/status` | `app/status/page.tsx:10-12,29-37,55`; `components/SiteFooter.tsx:25` | Public `/api/health`; parses 503 body. | Only backend URL text: `desktop:src/App.tsx:1998-2001`. | Missing | P2; redacted health | Healthy/degraded/network errors differ; no operator detail leaks. |
| `/privacy`, `/terms`, `/disclaimer` | `app/privacy/page.tsx:3`; `app/terms/page.tsx:3`; `app/disclaimer/page.tsx:3`; `components/SiteFooter.tsx:21-26` | Public legal. | None. | Missing | P2; legal metadata | Unique canonical/title/effective date/return path and required contact/controller details. |
| `/_workbench` | Internal visual primitive workbench; production calls `notFound()`, plus `noindex`: `app/_workbench/page.tsx:12-28,37-39`. | No product counterpart required. | Excluded | —; developer-only source route | Release desktop must not expose sample-data workbench; reusable primitives are audited through real product screens. |
| `/docs/admin/decision-lab-role-stack` | Static, `noindex` architecture explainer: `app/docs/admin/decision-lab-role-stack/page.tsx:1-4,16-23`. | No product counterpart required; Decision Lab workflow tracked in section 4. | Excluded | —; internal documentation | Keep architecture claims in maintained documentation; do not create duplicate desktop navigation or imply independent AI agents. |

## 4. Admin menu, submenu, and workflow inventory

### 4.1 Security boundary

- Web pages use `isAdminServer()` and the `ADMIN_COOKIE`: `modules/user/service/admin.service.ts:12-24`. The proxy does not centrally authorize every `/admin/*` page: `proxy.ts:50-54,336-340`; page-local guard remains critical.
- Native-capable APIs should use `requireAdminSession()`, which requires `session.role === 'admin'` and supports browser/bearer sessions: `shared/auth/admin-session.ts:4-18`.
- Desktop shows Admin from locally persisted `session.role`: `desktop:src/api.ts:13-19,189-228`; `desktop:src/App.tsx:458,502-515,1833-1835`. This is presentation only, never an authorization boundary.
- Desktop bundles Vite UI and cannot execute Next.js Server Components: `desktop:src-tauri/tauri.conf.json:6-10`. Pages without JSON APIs are **Blocked**, not candidates for local/dummy reconstruction.

### 4.2 Page/workflow matrix

| Web feature | Web evidence, method, auth, contract | Desktop counterpart | Status | Priority / dependency | Acceptance criteria |
|---|---|---|---|---|---|
| Admin authentication | `/admin-login`; form and key flow `app/admin-login/page.tsx:7-16,22-43,75-116`; secret/break-glass controller `modules/user/controller/admin.controller.ts:49-95,119-135`. | Account bearer login maps role: `desktop:src/api.ts:13-19,233-259`; no shared-secret form. | Partial | P0; choose account-role identity, do not copy shared secret | Admin account gets bearer role, non-admin stays hidden/403, expiry or role removal revokes access without restart. |
| Admin hub/stats | `/admin`; guarded server loads presence, activity, auth, signup, research journey, payments, ARA readiness: `app/admin/page.tsx:67-100`; `/api/admin/stats` at `app/api/admin/stats/route.ts:4-10`. | Admin tab has only two forms: `desktop:src/App.tsx:1833-1941`. | Missing | P1; bearer summary contract | Loading/error/empty/success per section; refresh cannot expose secrets; 403 removes Admin UI. |
| Desktop operations overview | `GET /api/admin/desktop-overview`; role-admin; `{redis,jobs:jobs.slice(0,30),sources}`: `app/api/admin/desktop-overview/route.ts:8-15`. | None. | Missing | P1; existing native-capable endpoint | Render Redis/jobs/sources with as-of, partial unhealthy state, request ID, refresh, 401/403. |
| Set Pro | `GET /api/admin/pro-status?email=…` `app/api/admin/pro-status/route.ts:12-16`; `POST /api/admin/set-pro` same-origin/cookie `app/api/admin/set-pro/route.ts:9-14`. | Mutation form/caller: `desktop:src/App.tsx:292-306,1833-1904`; `desktop:src/api.ts:789-805`; no status lookup. | Partial | P0; bearer-admin mutation | Read authoritative tier first; confirm target/new state; refresh result; validate email; non-admin 403. |
| Create Test User | `POST /api/admin/create-test-user`, same-origin/cookie: `app/api/admin/create-test-user/route.ts:9-14`; verified non-admin creation: `modules/user/controller/admin.controller.ts:252-299`. | Form/caller: `desktop:src/App.tsx:308-323,1906-1941`; `desktop:src/api.ts:808-825`. | Partial | P0; bearer-admin mutation | Duplicate/weak/invalid data gets field error; created identity/tier shown; password never logged/persisted; cannot create admin. |
| Change admin secret | Embedded `/admin`; `POST /api/admin/change-secret`: `app/api/admin/change-secret/route.ts:9-14`; caller `app/admin/ChangeSecretForm.tsx:35-39`. | None. | Missing | P2; preferably omit under account-role model | If retained: recent re-auth, current secret, strength, confirmation, audit event; never persist/display secret. |
| Admin export | `GET /api/admin/export?cursor=&limit=` `app/api/admin/export/route.ts:9-12`; web requests 200 rows `app/admin/ExportButton.tsx:17-24`. | None. | Missing | P2; bearer guard, save dialog | Follow cursors or explicit limit; atomic write; row count; cancel/disk failure; no silent 200-row truncation. |
| Infographic Studio | `/admin/infographic-studio`; guards and API fan-out `app/admin/infographic-studio/page.tsx:14-19`; `app/admin/infographic-studio/InfographicStudioClient.tsx:31-34,97-108,308-323`. | None in Admin boundary `desktop:src/App.tsx:1833-1941`. | Missing | P3; native image/file export | Optional dataset failure is labeled; IHSG skips company-only requests; exported artifact matches preview and includes provenance/as-of. |
| LensScore Calibration | `/admin/calibration`; guard `app/admin/calibration/page.tsx:7-10`; GET dashboard `app/api/admin/calibration/route.ts:13-20`; POST recommendation `app/api/admin/calibration/recommend-threshold/route.ts:13-18`. | None. | Missing | P1; bearer mutation, research-only policy | Render buckets/validation/proposal; confirmation; recommendation does not silently mutate production model. |
| Decision Lab | `/admin/decision-lab`; guard `app/admin/decision-lab/page.tsx:10-12`; GET/POST and action union `app/api/admin/decision-lab/route.ts:28-90`. | None. | Missing | P0; typed action union, execution gates | Every action validates payload; paper/live execution separately confirmed; retries cannot duplicate execution; dashboard refreshes from server. |
| ARA Scanner Audit | `/admin/ara-scanner`; readiness `app/admin/ara-scanner/page.tsx:20-23`; GET `{readiness,policy}` `app/api/admin/ara-scanner/route.ts:10-20`. | None. | Missing | P2; existing bearer endpoint | Show READY/blockers/policy/version; no scanner action while server readiness is not READY. |
| Transparency evidence | `/admin/transparency`; reconciliation `app/admin/transparency/page.tsx:40-45`; client `app/admin/transparency/TransparencyClient.tsx:243-247`; GET role-admin `app/api/admin/transparency/route.ts:12-16`. | None. | Missing | P2; existing bearer endpoint | Show buckets/OOS/reconciliation/provenance; no public caching; stale/conflict evidence remains visible. |
| Fundamental Backfill | `/admin/fundamental-backfill`; guard `app/admin/fundamental-backfill/page.tsx:8-11`; POST CSV/mode/options `app/api/admin/fundamental-backfill/route.ts:13-27`. | None. | Missing | P1; bearer mutation, file picker | Dry-run first; row errors; explicit insert confirmation; provenance; inserted/skipped/rejected totals; no duplicate writes. |
| Financial Integrity | `/admin/financial-integrity`; direct macro/bank services `app/admin/financial-integrity/page.tsx:21-25`; no API. | None. | Blocked | P1; add read-only admin JSON API | API returns section status/provenance/freshness/blockers; one section failure does not crash all. |
| Data Integrity | `/admin/data-integrity`; direct repository reads `app/admin/data-integrity/page.tsx:23-25`; no API. | None. | Blocked | P1; paginated admin API | Paginated runs/issues, filters, timestamps; limits explicit; repository failure recoverable. |
| Macro Assumptions | `/admin/macro-assumptions`; direct valuation audit `app/admin/macro-assumptions/page.tsx:5-7,54-56`; no API. | None. | Blocked | P2; read-only API | SBN 10Y/ERP/BI Rate/inflation show source/as-of/freshness/adoption; stale input blocks use. |
| Bank Fundamentals Audit | `/admin/bank-fundamentals`; direct evidence/collector `app/admin/bank-fundamentals/page.tsx:20-23`; no API. | None. | Blocked | P2; paginated evidence API | NIM/NPL/CASA/CAR/LDR/credit-cost/PPOP by ticker-period plus collector failures; adoption status explicit. |
| Ownership Flow Monitor | `/admin/ownership-flow`; direct page service `app/admin/ownership-flow/page.tsx:56-59`; native GET `app/api/admin/ownership-flow/route.ts:17-22`. | None. | Missing | P2; existing bearer endpoint | Observation date, coverage, failures, source/provenance/freshness; refresh has no mutation semantics. |
| Ownership Flow Validation | `/admin/ownership-flow-validation`; direct dashboard, `NOT_PIT_ELIGIBLE`: `app/admin/ownership-flow-validation/page.tsx:14-17`; no API. | None. | Blocked | P1; validation API | PIT blocker visible; predictive interpretation disabled while not eligible. |
| Broker EOD Monitor | `/admin/broker-eod`; server search params `app/admin/broker-eod/page.tsx:24-27`; no read API. | None. | Blocked | P1; date/filter API | Select available date; official artifact provenance; distinguish missing artifact from zero activity. |
| Broker Summary Monitor/Import | `/admin/broker-summary`; guard `app/admin/broker-summary/page.tsx:27-32`; POST delegates controller `app/api/admin/broker-summary/import/route.ts:4-10`. | None. | Missing | P0; verify controller auth/payload, native file picker | Non-admin bearer rejected; validate file/date/source; dry-run; idempotent/atomic import; report row errors/counts. |
| Foreign Flow Coverage | `/admin/foreign-flow`; direct artifact reads `app/admin/foreign-flow/page.tsx:71-74`; no API. | None. | Blocked | P1; coverage API | Show covered/uncovered issuers/latest dates; official foreign flow never replaced by Yahoo CMF proxy or zero. |
| TP/CL Validation | `/admin/tpcl-validation`; GET range `app/api/admin/tpcl-validation/route.ts:17-28`; POST clear/run `app/api/admin/tpcl-validation/actions/route.ts:23-58`; run polling `app/api/admin/tpcl-validation/runs/route.ts:10-21`; client `app/admin/tpcl-validation/TpclValidationClient.tsx:189-220`. | None. | Missing | P1; unify mixed role/cookie auth | Select range; queue once; poll by run ID with backoff/cancel; terminal status; no duplicate run after retry. |
| LensAI Feedback Review | `/admin/lensai-feedback`; direct repository report `app/admin/lensai-feedback/page.tsx:17-21`; no API. | None. | Blocked | P2; paginated redacted API | Filter by intent/rating/date; provenance; pagination; no secrets or unnecessary user data. |
| Intraday Validation Lab | `/admin/intraday-validation`; dashboard/runs/actions `app/api/admin/intraday-validation/route.ts:15-20`; `app/api/admin/intraday-validation/runs/route.ts:18-32`; action schema/concurrency `app/api/admin/intraday-validation/actions/route.ts:30-60,68-134`. | None. | Missing | P0; bearer auth, destructive confirmation | Typed collect/validate/freeze/reset/simulate/propose; exact reset confirmation; 409 running state; paginated H15/H30/H60/EOD runs. |
| Jobs Monitor | `/admin/jobs`; guard `app/admin/jobs/page.tsx:7-8`; GET `{asOf,jobs,caches,sourceHealth,weeklyMaintenance}` `app/api/admin/jobs/route.ts:82-179`; health caller `app/admin/jobs/JobsMonitorClient.tsx:184-189`. | None. | Missing | P1; bearer-compatible GET | Render schedule/runs/cache age/provider health/maintenance; subsystems degrade independently; no trigger button without authorized POST. |

### 4.3 Admin API inventory

All `runController` object responses add `meta.requestId` per `CLAUDE.md:105-115`.

| Endpoint | Method | Authorization | Contract / evidence |
|---|---|---|---|
| `/api/admin/pro-status` | GET | Admin cookie/controller | Query `email`; reduced status: `app/api/admin/pro-status/route.ts:12-16`. |
| `/api/admin/tpcl-validation` | GET | Role-admin session | `range=1y|3y|5y|10y`; cached dashboard: `app/api/admin/tpcl-validation/route.ts:17-28`. |
| `/api/admin/tpcl-validation/actions` | POST | Admin cookie + same-origin | Clear cache or queue validation: `app/api/admin/tpcl-validation/actions/route.ts:23-58`. |
| `/api/admin/tpcl-validation/runs` | GET | Admin cookie | Optional `id`, else latest ten: `app/api/admin/tpcl-validation/runs/route.ts:10-21`. |
| `/api/admin/change-secret` | POST | Admin cookie + same-origin | Delegated secret mutation: `app/api/admin/change-secret/route.ts:9-14`. |
| `/api/admin/jobs` | GET | Admin cookie | Jobs/caches/source health/maintenance: `app/api/admin/jobs/route.ts:82-180`. |
| `/api/admin/set-pro` | POST | Admin cookie + same-origin | Target/tier mutation: `app/api/admin/set-pro/route.ts:9-14`. |
| `/api/admin/export` | GET | Admin cookie | Cursor/limit export: `app/api/admin/export/route.ts:9-12`. |
| `/api/admin/fundamental-backfill` | POST | Admin cookie + same-origin | CSV/mode/empty-row/percent/source: `app/api/admin/fundamental-backfill/route.ts:13-27`. |
| `/api/admin/transparency` | GET | Role-admin session | Full diagnostic projection, no public cache: `app/api/admin/transparency/route.ts:12-16`. |
| `/api/admin/ownership-flow` | GET | Role-admin session | Ownership ingestion monitor: `app/api/admin/ownership-flow/route.ts:17-22`. |
| `/api/admin/stats` | GET | Admin cookie/controller | Current admin stats: `app/api/admin/stats/route.ts:4-10`. |
| `/api/admin/decision-lab` | GET, POST | Role-admin; POST same-origin | Dashboard + discriminated action; `{result,dashboard}`: `app/api/admin/decision-lab/route.ts:28-90`. |
| `/api/admin/desktop-overview` | GET | Role-admin bearer-compatible | `{redis,jobs:first30,sources}`: `app/api/admin/desktop-overview/route.ts:8-15`. |
| `/api/admin/ara-scanner` | GET | Role-admin session | `{readiness,policy}`: `app/api/admin/ara-scanner/route.ts:10-20`. |
| `/api/admin/create-test-user` | POST | Admin cookie + same-origin | Test-user creation: `app/api/admin/create-test-user/route.ts:9-14`. |
| `/api/admin/intraday-validation` | GET | Admin cookie | Dashboard summary: `app/api/admin/intraday-validation/route.ts:15-20`. |
| `/api/admin/intraday-validation/runs` | GET | Admin cookie | Bounded pagination: `app/api/admin/intraday-validation/runs/route.ts:18-32`. |
| `/api/admin/intraday-validation/actions` | POST | Admin cookie + same-origin | Action union, lock, 409: `app/api/admin/intraday-validation/actions/route.ts:30-60,68-134`. |
| `/api/admin/calibration` | GET | Admin cookie | Dashboard + latest proposal: `app/api/admin/calibration/route.ts:13-20`. |
| `/api/admin/calibration/recommend-threshold` | POST | Admin cookie + same-origin | Compute recommendation: `app/api/admin/calibration/recommend-threshold/route.ts:13-18`. |
| `/api/admin/broker-summary/import` | POST | Delegated controller; route guard not visible | `handleBrokerSummaryImport`: `app/api/admin/broker-summary/import/route.ts:4-10`; verify before native exposure. |
| `/api/admin-status` | GET | Admin cookie/controller | Cookie status only, not desktop authority: `app/api/admin-status/route.ts:8-12`. |

### 4.4 Admin-wide acceptance gates

1. Server bearer session with `role=admin` is authority; local role is never authority.
2. Browser same-origin protection remains for cookie mutations; native bearer path is explicit rather than globally exempted.
3. Responses have typed models and tolerate additive `meta.requestId`.
4. Screens cover loading, empty, partial, validation, 401, 403, 409, 429, and server errors where applicable.
5. State-changing actions require confirmation and are safe against retry/double click.
6. Source, provenance, as-of, freshness, model status, and blockers remain visible; missing evidence never becomes zero.
7. Native file workflows use OS pick/save and expose cancel, parse, partial rejection, and disk failures.
8. Logout/role downgrade removes navigation and invalidates calls without restart.

Discoverability gaps: sidebar list is `components/Sidebar.tsx:188-207`; hub-only routes appear at `app/admin/page.tsx:163-179,329-450`; `/admin/broker-summary` has no verified sidebar/hub link.

## 5. Complete non-admin API inventory

This table names every non-admin, non-cron route under `app/api`. Admin routes are in section 4.3; cron routes are in section 6. Several related paths share one row only where their ownership and contract form one workflow. “Exact API” means desktop calls the same endpoint; it does not assert full screen parity.

| Endpoint(s) | Method / contract | Auth, rate, cache | Desktop parity / priority | Acceptance criteria / evidence |
|---|---|---|---|---|
| `/api/auth/me` | GET; `{authenticated,user|null,meta.requestId}` | Cookie/bearer session probe | Missing / P0 | Redacted identity only; desktop verifies startup token. `app/api/auth/me/route.ts:7`; `lib/hooks/useAuthUser.ts:86-105`. |
| `/api/auth/login`, `/api/auth/logout` | POST browser credential/cookie lifecycle | Anonymous login or cookie logout; same-origin mutation; auth throttle | Partial / P0 | Foreign origin rejected; generic login error; logout invalidates cookie. `app/api/auth/login/route.ts:10`; `app/api/auth/logout/route.ts:5`. |
| `/api/auth/desktop/login`, `/api/auth/desktop/logout` | POST native bearer lifecycle | Native login throttle; bearer logout | Exact API / P0 | Valid login returns token/role/email; subsequent `/auth/me` succeeds; logout clears local token. `app/api/auth/desktop/login/route.ts:9`; `app/api/auth/desktop/logout/route.ts:8`; `desktop:src/api.ts:233-272`. |
| `/api/auth/signup`, `/api/auth/verify` | POST account and OTP verification payloads | Anonymous; same-origin; OTP throttle | Missing / P0 | Duplicate/malformed/replayed/expired input rejected without data leak. `app/api/auth/signup/route.ts:10`; `app/api/auth/verify/route.ts:10`. |
| `/api/auth/forgot-password`, `/api/auth/reset-password` | POST recovery request and one-time credential | Anonymous; same-origin; sensitive throttle | Missing / P0 | Non-enumerating request; password policy; expiring single-use reset. `app/api/auth/forgot-password/route.ts:10`; `app/api/auth/reset-password/route.ts:9`. |
| `/api/market-pulse` | GET cached regime, breadth, indicators | Public guest API | Exact API / P1 | Same payload, as-of, degraded state; no hard-coded fallback. `app/api/market-pulse/route.ts:18`; `desktop:src/api.ts:312-315`. |
| `/api/market-summary` | GET category collections/movers/value groups | Public cache; response must be session-independent if CDN-public | Missing / P2 | Categories/timestamps reconcile. `app/api/market-summary/route.ts:16`. |
| `/api/screener` | GET bounded profile/filter query | Public compute/cache | Exact API / P1 | Same filter semantics, cancellation, object `meta.requestId`. `app/api/screener/route.ts:28`; `desktop:src/api.ts:318-322`. |
| `/api/breakout-radar` | GET cached radar | Public guest API | Exact API / P1 | Canonical tickers and generated time; unavailable scan is not dummy. `app/api/breakout-radar/route.ts:9`; `desktop:src/api.ts:353-356`. |
| `/api/ai-pick`, `/api/lens-score-bucket-backtest` | GET pick scan and calibration buckets | Public projection with entitlement/quota policy | Missing / P1 | Lock/quota/error distinct; version/sample window present. `app/api/ai-pick/route.ts:17`; `app/api/lens-score-bucket-backtest/route.ts:7`. |
| `/api/stock/{ticker}` | GET quote/history/full analysis envelope | Guest/session quota; may return stale-cache success | Exact endpoint, partial contract / P0 | Desktop consumes canonical `stock.history`; 401/402/429/stale/5xx covered; no local fabricated analysis. `app/api/stock/[ticker]/route.ts:8`; `modules/technical/service/stock-analysis-response.service.ts:184-258`; `desktop:src/api.ts:549-716`. |
| `/api/public-chart/{ticker}` | GET `tf`; validated OHLCV + optional session provenance | Public compute budget; session-independent cache | Exact endpoint, partial contract / P0 | All timeframes, schema/order/uniqueness/provenance and 429 retry are handled. `app/api/public-chart/[ticker]/route.ts:11,24-42,81-95,125-204`; `desktop:src/api.ts:436-448`. |
| `/api/fundamental/{ticker}` | GET analyzer/fundamental payload | Guest allowed; cache-backed | Exact API / P1 | Units, periods, source and missing values remain explicit. `app/api/fundamental/[ticker]/route.ts:7`; `desktop:src/api.ts:382-385`. |
| `/api/intrinsic/{ticker}`, `/api/dcf/{ticker}` | GET intrinsic and DCF model projections | Public compute/cache; DCF guest-safe projection | Partial / P1 | Typed responses; model inputs/version/source; null distinct from failure; endpoint-specific 429. `app/api/intrinsic/[ticker]/route.ts:20`; `app/api/dcf/[ticker]/route.ts:26`; `desktop:src/api.ts:430-433`. |
| `/api/compare` | GET `symbol1`, optional `symbol2`, possible auto-peer | Public shell; detail entitlement downstream | Partial / P1 | Both tickers canonical; auto-peer deterministic/labeled; late requests ignored. `app/api/compare/route.ts:7`. |
| `/api/flow/{ticker}`, `/api/broker-summary/{ticker}` | GET foreign flow and broker summary | Public compute; currently share/manual limit paths | Missing / P1 | Standard retry envelope; source/date/coverage; shared quota decision documented. `app/api/flow/[ticker]/route.ts:45`; `app/api/broker-summary/[ticker]/route.ts:10`. |
| `/api/earnings/{ticker}` | GET earnings history/monitor | Public compute budget | Missing / P2 | Period/currency/source retained; no-data differs from zero; standard 429. `app/api/earnings/[ticker]/route.ts:8`. |
| `/api/news`, `/api/news/stock/{ticker}` | GET feed and ticker-specific classified items | Public cache / public compute | Missing / P2 | Bounded limit; safe external links; classification uncertainty/source/time retained. `app/api/news/route.ts:15`; `app/api/news/stock/[ticker]/route.ts:11`. |
| `/api/calendar` | GET corporate-action calendar | Public cached guest API | Missing / P2 | Timezone/source/generated time and filtered-empty state explicit. `app/api/calendar/route.ts:12`. |
| `/api/recommendations`, `/api/daily-picks` | GET recommendation chunks and daily picks | Session/trial/quota-aware; not public-CDN safe when personalized | Missing / P1 | Bounded/deduped symbols; entitlement server-enforced; generated/as-of/universe shown. `app/api/recommendations/route.ts:29`; `app/api/daily-picks/route.ts:30`. |
| `/api/macro` | GET `PublicMacroDashboard` | Public cache-backed | Missing / P2 | Every series states period/source/freshness; partial failure stays visible. `app/api/macro/route.ts:10`. |
| `/api/ownership-flow`, `/api/ownership-flow/{ticker}` | GET universe/search and detail | Public cached data | Missing / P2 | Coverage date/denominator; list/detail totals reconcile. `app/api/ownership-flow/route.ts:21`; `app/api/ownership-flow/[ticker]/route.ts:27`. |
| `/api/risk-analysis` | POST positions/settings to portfolio-risk output | Compute route; body validation required | Missing / P1 | Bounded positions/weights; invalid values rejected; failed symbols disclosed. `app/api/risk-analysis/route.ts:48`. |
| `/api/live/{ticker}` | GET live/reference quote | Public self-limited quote path | Missing / P2 | Source/timestamp/freshness prevents reference quote being labeled live. `app/api/live/[ticker]/route.ts:7`. |
| `/api/dividend-plan` | GET ticker or universe scenario; may return 402 | `hasOpenOrProAccess`; cache/compute | Missing / P2 | Exclusive query modes; 402 distinct from data failure; assumptions/status visible. `app/api/dividend-plan/route.ts:15`. |
| `/api/backtest`, `/api/backtest/live-filter-check` | GET presets; POST strategy/candles or live filter | Compute controllers; bounded input required | Missing / P1 | Same filter semantics; strategy validated before compute; GET exception/meta documented. `app/api/backtest/route.ts:12-16`; `app/api/backtest/live-filter-check/route.ts:9`. |
| `/api/chat`, `/api/chat/feedback` | POST prompt/context and response feedback | Expensive session/trial/quota path; mutation abuse protection | Partial / P1 | Desktop transport negotiation works; inputs bounded; citations safe; feedback ownership/duplication enforced. `app/api/chat/route.ts:9`; `app/api/chat/feedback/route.ts:23`; `desktop:src/api.ts:760-764`. |
| `/api/explain`, `/api/intrinsic-explain`, `/api/ai-briefing` | POST structured research context | Expensive/session-aware AI routes | Missing / P1 | Inputs derive from cited data; failures explicit; no unsupported broker claims. `app/api/explain/route.ts:20`; `app/api/intrinsic-explain/route.ts:48`; `app/api/ai-briefing/route.ts:63`. |
| `/api/watchlist` | GET list; POST symbol; DELETE query symbol | Account; browser mutations same-origin | Missing UI / P0 | Ownership/free limit/canonical ticker/idempotency server-enforced. `app/api/watchlist/route.ts:9-17`. |
| `/api/watchlist/desktop` | GET/POST/DELETE native watchlist service | Valid desktop bearer required before handler | Partial API / P0 | Invalid bearer rejected; same ownership/limit semantics; full desktop UI required. `app/api/watchlist/desktop/route.ts:13-21`. |
| `/api/v1/watchlists`, `/api/v1/watchlists/{symbol}` | GET/POST list/add; DELETE path symbol | Account; POST same-origin | Missing / P1 | Current and v1 endpoints share canonical/ownership/error semantics. `app/api/v1/watchlists/route.ts:9-13`; `app/api/v1/watchlists/[symbol]/route.ts:11`. |
| `/api/alert`, `/api/alerts/check` | GET/POST/DELETE alerts; GET evaluate | Account/session; same-origin mutations | Missing / P0 | Caller ownership, threshold/direction, idempotent trigger, isolated quote failure. `app/api/alert/route.ts:9-17`; `app/api/alerts/check/route.ts:29`. |
| `/api/portfolio`, `/api/portfolio/buy`, `/api/portfolio/sell` | GET portfolio; POST transactions | Account; same-origin mutation | Missing / P0 | Finite positive values, no oversell, atomic ledger/holdings, caller-only data. `app/api/portfolio/route.ts:7`; `app/api/portfolio/buy/route.ts:9`; `app/api/portfolio/sell/route.ts:9`. |
| `/api/v1/portfolio`, `/api/v1/portfolio/transactions` | GET portfolio/filtered transactions; POST transaction | Account; POST same-origin | Missing / P0 | v1/current ledger reconcile; filters bounded; ownership enforced. `app/api/v1/portfolio/route.ts:9`; `app/api/v1/portfolio/transactions/route.ts:9-14`. |
| `/api/user/profile`, `/api/user/delete-account` | GET redacted profile; POST exact confirmation | Account; delete forbids admin/synthetic admin | Partial / P0 | No secret/hash fields; exact phrase; one-way deletion clears session. `app/api/user/profile/route.ts:7`; `app/api/user/delete-account/route.ts:13`. |
| `/api/tickers/search`, `/api/emiten` | GET lightweight search and issuer catalogue | Public | Exact search, partial catalogue / P1 | Blank/bounded query; canonical symbol/name; cacheable bounded catalogue. `app/api/tickers/search/route.ts:12`; `app/api/emiten/route.ts:7`; `desktop:src/api.ts:743-747`. |
| `/api/company-logo` | GET validated logo proxy/redirect | Public image endpoint | Missing / P2 | URL/domain allowlist prevents SSRF/open proxy; deterministic fallback/cache. `app/api/company-logo/route.ts:4`. |
| `/api/market-data-integrity/{ticker}`, `/api/transparency` | GET public-safe integrity/methodology projection | Public, operator detail excluded | Missing / P1 | No internal path/provider secret/raw anomaly; evidence version/window/limitations present. `app/api/market-data-integrity/[ticker]/route.ts:6`; `app/api/transparency/route.ts:12`. |
| `/api/health` | GET public status; admin may receive detail; 503 is valid response | Public redacted response | Missing / P2 | Non-admin detail stays redacted; 503 body remains parseable/timestamped. `app/api/health/route.ts:21,81-88`. |
| `/api/desktop/update` | GET release metadata | Public; env-controlled release | Partial / P1 | Version, signed URL, checksum are atomic; no-release explicit; updater consumer tested. `app/api/desktop/update/route.ts:11`. |
| `/api/notifications/push` | GET/POST/DELETE subscription lifecycle | Authenticated device ownership | Missing / P1 | Subscription belongs to caller; endpoint/key validation; cross-account deletion impossible. `app/api/notifications/push/route.ts:15-32`. |
| `/api/analytics/funnel`, `/api/analytics/journey` | POST event or batch | Public/user-aware telemetry with privacy and abuse limits | Missing / P2 | Bounded schema/size; no token/password/raw chat; consent/retention honored. `app/api/analytics/funnel/route.ts:6`; `app/api/analytics/journey/route.ts:6`. |
| `/api/payment/notify` | POST payment-notification payload | Provider webhook; proxy rate-limit exemption; controller verifies trust/contract | Missing, intentionally server-only / P0 | Never expose as desktop UI action; reject forged/replayed notification and keep provider retries idempotent. `app/api/payment/notify/route.ts:5-6`; `proxy.ts:302-324`. |
| `/api/admin-status` | GET browser admin-cookie status | Admin cookie/controller | Missing, not native authority / P0 | Desktop never treats this endpoint or local role as bearer authorization. `app/api/admin-status/route.ts:10`. |

## 6. Cron and operator-only API inventory

These routes are server scheduler contracts, not desktop feature candidates. Desktop Admin should observe their job records through authorized admin APIs; it must never embed `CRON_SECRET`, QStash signing keys, or direct trigger buttons without a separate audited operator contract.

| Endpoint | Method / authorization | Job contract | Desktop status / acceptance | Evidence |
|---|---|---|---|---|
| `/api/cron/macro` | POST; QStash signature | Refresh macro dashboard | Server-only; Admin monitor shows terminal run/result without secrets. | `app/api/cron/macro/route.ts:19-27,51-54`. |
| `/api/cron/market-data-reconcile` | GET; `CRON_SECRET` bearer | Reconcile market data | Server-only; partial/error remains visible. | `app/api/cron/market-data-reconcile/route.ts:11-25`. |
| `/api/cron/calendar-scan` | GET; `CRON_SECRET` bearer | Warm corporate calendar cache | Server-only; 202 skipped differs from success. | `app/api/cron/calendar-scan/route.ts:29-42`. |
| `/api/cron/lens-score-optimizer` | GET secret or POST QStash | Optimize LensScore model | Server-only; method/scheduler split preserved. | `app/api/cron/lens-score-optimizer/route.ts:19-30,40-52,56-60`. |
| `/api/cron/market-summary` | POST; QStash signature | Refresh market summary | Server-only; monitor as-of and failure. | `app/api/cron/market-summary/route.ts:31-51`. |
| `/api/cron/dividend-scan` | GET; `CRON_SECRET` bearer | Warm dividend universe | Server-only; skipped/success/error distinct. | `app/api/cron/dividend-scan/route.ts:26-39`. |
| `/api/cron/bank-fundamental-collect` | GET; `CRON_SECRET` bearer | Collect bank issuer evidence and source health | Server-only; source-health failure visible. | `app/api/cron/bank-fundamental-collect/route.ts:37-39,55-68`. |
| `/api/cron/privacy-cleanup` | GET; `CRON_SECRET` bearer | Retention/privacy cleanup | Server-only; result counts auditable. | `app/api/cron/privacy-cleanup/route.ts:27-29,46-56`. |
| `/api/cron/fundamental-snapshot` | POST; QStash signature | Build fundamental snapshots | Server-only; 202 non-run and errors visible. | `app/api/cron/fundamental-snapshot/route.ts:77-84,146-153`. |
| `/api/cron/lens-bucket-backtest` | GET secret or POST QStash | Compute calibration buckets | Server-only; scheduler methods retained. | `app/api/cron/lens-bucket-backtest/route.ts:19-30,40-69,73-77`. |
| `/api/cron/backtest-precompute` | POST; QStash signature | Precompute backtests | Server-only; skipped and completed runs differ. | `app/api/cron/backtest-precompute/route.ts:15-39`. |
| `/api/cron/market-pulse` | POST; QStash signature | Refresh market pulse | Server-only; 202 skipped explicit. | `app/api/cron/market-pulse/route.ts:21-49`. |
| `/api/cron/ai-pick-scan` | POST; QStash signature | Generate AI picks within scan window | Server-only; scan window/stage/skipped visible. | `app/api/cron/ai-pick-scan/route.ts:18-32,40-85`. |
| `/api/cron/screener-scan` | GET; `CRON_SECRET` bearer | Warm screener scan | Server-only; no desktop trigger. | `app/api/cron/screener-scan/route.ts:23-46`. |
| `/api/cron/idx-flow-sync` | GET; `CRON_SECRET` bearer | Sync official IDX flow | Server-only; `PARTIAL` cannot look successful. | `app/api/cron/idx-flow-sync/route.ts:55-57,162-175`. |
| `/api/cron/recommendation-scan` | POST; QStash signature | Generate recommendation cache | Server-only; skipped/success/error distinct. | `app/api/cron/recommendation-scan/route.ts:34-65`. |
| `/api/cron/tpcl-validation-worker` | GET; `CRON_SECRET` bearer | Execute queued TP/CL validation | Server-only; correlate result to queued run ID. | `app/api/cron/tpcl-validation-worker/route.ts:19-21,53-63`. |
| `/api/cron/idx-financial-sync` | GET; `CRON_SECRET` bearer | Sync official IDX financial reports | Server-only; partial and source errors visible. | `app/api/cron/idx-financial-sync/route.ts:59-61,109-122`. |
| `/api/cron/intraday-collect` | GET secret or POST QStash | Collect intraday validation samples | Server-only; duplicate/concurrent runs guarded. | `app/api/cron/intraday-collect/route.ts:12-35,57-69`. |
| `/api/cron/breakout-scan` | POST; QStash signature | Generate breakout cache | Server-only; 202 skipped remains non-run. | `app/api/cron/breakout-scan/route.ts:17-47`. |
| `/api/cron/watchlist-alert` | POST; QStash signature | Evaluate and dispatch account alerts | Server-only; dispatch idempotency and run result auditable. | `app/api/cron/watchlist-alert/route.ts:12-30`. |
| `/api/cron/ownership-flow-ksei-sync` | GET; `CRON_SECRET` bearer | Sync KSEI holdings composition | Server-only; provenance/source-health and failure shown. | `app/api/cron/ownership-flow-ksei-sync/route.ts:74-86,113-118`. |
| `/api/cron/news` | POST; QStash signature | Refresh classified news | Server-only; failure/as-of visible. | `app/api/cron/news/route.ts:19-39`. |

## 7. Delivery order and failure modes

1. **P0 foundation:** remove dummy synthesis; verify bearer through `/api/auth/me`; enforce approved origins; add typed error/metadata models; preserve role downgrade/logout.
2. **P0 account/admin:** watchlist, alerts, portfolio ledger, profile deletion, admin bearer mutations, broker import, Decision Lab, and Intraday destructive actions.
3. **P1 LensTechnical:** canonical data validation/formulas, request cancellation, interactive chart navigation, timeframes, indicators, patterns, and trade-plan parity.
4. **P1 research/admin operations:** recommendations, backtest/risk, dashboard orchestration, jobs, TP/CL, calibration, data/financial/ownership validation APIs.
5. **P2/P3:** news/calendar/macro/dividend/legal/status, read-only audits, infographic/export polish.

Thesis killers to prevent:

- Treating endpoint 200 or a similarly named card as workflow parity.
- Copying web defects listed in section 2.3 instead of matching intended contract.
- Granting admin authority from local `session.role` or weakening same-origin checks globally.
- Rendering dummy/neutral/zero values when evidence is missing.
- Triggering cron/operator routes from native UI or shipping scheduler secrets.
- Declaring blocked server-component workflows complete without an authenticated JSON API.
- Merging desktop implementation against a newer web contract without rerunning this source inventory.
