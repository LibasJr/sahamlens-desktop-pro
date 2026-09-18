# Matriks Paritas Fitur SahamLens Web vs Desktop Pro v2

Dokumen ini adalah matriks audit komprehensif seluruh route, menu, dan API endpoint dari aplikasi web SahamLens (`/opt/sahamlens/app`) terhadap SahamLens Desktop Pro (`/home/lens/sahamlens-desktop-pro`).

Prinsip Paritas:
1. **Pertahankan UI/Cockpit Desktop**: Layout terminal Bloomberg/cockpit desktop tetap menjadi identitas utama tanpa diganti webview.
2. **Zero Dummy Policy**: Tidak ada angka palsu, perkiraan tanpa data, fallback fiktif, atau tombol kosmetik. Bila data kosong/gagal, tampilkan status loading/error/empty secara jujur.
3. **Role Authority**: Menu & fitur admin hanya dapat diakses oleh user dengan role `admin` dan diverifikasi server-side lewat Bearer Token JWT.
4. **Penyelarasan Bertahap**: Scope raksasa dipecah menjadi:
   - **Tahap 1**: Modul Analisis Teknikal (LensTechnical, Interactive Charting, Indicators, Support/Resistance, Trading Plan, Pattern Recognition).
   - **Tahap 2**: Full Admin Suite (Overview, Jobs, Decision Lab, Calibration, ARA Scanner, TP/CL Validation, Intraday Validation, Fundamental Backfill, Transparency, Broker Summary EOD, Ownership Flow Ingestion, User Management).
   - **Tahap 3**: Tools & Intelligence Sisa (Watchlist, Portfolio/Akun Demo, Backtest Engine, Risk Analysis, Dividend Screener, News, Calendar, Macro, AI Briefing Workspace).

---

## 1. Matriks Fitur Pengguna (User-Facing)

| Menu / Fitur Web | Route Web | Endpoint API Web | Method | Auth / Role | Status Desktop Saat Ini | Rencana Paritas Cockpit |
|---|---|---|---|---|---|---|
| **Beranda / Market Pulse** | `/`, `/market-pulse` | `/api/market-pulse` | GET | Publik | Ada di Header / Bar atas, namun ada fallback sparkline & nilai default fiktif | Hapus data dummy; hubungkan langsung ke respons aktual `/api/market-pulse` |
| **LensTechnical (Deep Dive)** | `/technical/[symbol]`, `/dashboard` | `/api/stock/[ticker]`, `/api/public-chart/[ticker]` | GET | Publik / Member (Quota) | Hanya chart 1Y sederhana tanpa indikator & trading plan | **Tahap 1**: Tambah tab Teknikal di cockpit: Candlestick, volume, SMA/EMA, RSI, MACD, Support/Resistance, Trading Plan |
| **Pattern Recognition** | `/pattern` | `/api/stock/[ticker]` (`patterns`) | GET | Publik | Belum ada | **Tahap 1**: Render kartu pattern terdeteksi di sub-panel Teknikal |
| **LensFundamental** | `/fundamental` | `/api/fundamental/[ticker]`, `/api/stock/[ticker]/fundamental` | GET | Publik / Pro | Ada tab Fundamental, namun ada fallback ROE/PE/netMargin statis | Bersihkan fallback fiktif, tampilkan metrik LK & rasio dari API nyata |
| **Earnings & History** | `/earnings` | `/api/earnings/[ticker]` | GET | Publik | Belum ada di cockpit | Sub-tab di panel Fundamental |
| **Valuasi & Intrinsic (DCF)** | `/dcf` | `/api/intrinsic/[ticker]`, `/api/dcf/[ticker]` | GET | Publik (Compute Budget) | Ada tab Valuasi, namun kalkulasi DCF memakai formula lokal bukan API | Konsumsi hasil hitungan `/api/intrinsic/[ticker]` dari backend |
| **Ownership & Foreign Flow** | `/ownership-flow` | `/api/flow/[ticker]`, `/api/ownership-flow/[ticker]`, `/api/ownership-flow` | GET | Publik | Belum ada tab dedicated | **Tahap 3**: Tambah sub-panel Flow di cockpit (Net foreign buy/sell, akumulasi broker) |
| **Screener & Breakout Radar** | `/screener`, `/breakout-radar` | `/api/screener`, `/api/breakout-radar` | GET | Publik / Pro | Ada tab Screener, tapi fallback 8 saham hardcoded jika API kosong | Hapus 8 saham dummy, tampilkan filter sektor & sinyal breakout riil |
| **Peer Compare** | `/compare` | `/api/compare` | GET | Publik | Ada tab Compare, membandingkan 2 emiten | Pertahankan, perbaiki kontrak response parsing |
| **LensWatch (Watchlist)** | `/watchlist` | `/api/watchlist/desktop`, `/api/v1/watchlists` | GET, POST, DELETE | User (Bearer) | Belum ada | **Tahap 3**: Tambah tab/panel Watchlist dengan sync server |
| **Akun Demo (Portfolio)** | `/portfolio` | `/api/portfolio`, `/api/portfolio/buy`, `/api/portfolio/sell`, `/api/v1/portfolio` | GET, POST | User (Bearer) | Belum ada | **Tahap 3**: Tambah tab Portfolio Demo dengan order & tracking PnL |
| **Backtest Engine** | `/backtest` | `/api/backtest`, `/api/backtest/live-filter-check` | POST, GET | Pro (Bearer) | Belum ada | **Tahap 3**: Panel simulasi strategi historis & live check |
| **Risk Analysis** | `/risk`, `/risk-calculator` | `/api/risk-analysis` | GET | Publik / User | Belum ada | **Tahap 3**: Kalkulator batas risiko modal & drawdown |
| **Dividend Plan** | `/dividend` | `/api/dividend-plan` | GET | Publik | Belum ada | **Tahap 3**: Screener yield & kalender ex-date |
| **Macro Indicators** | `/macro` | `/api/macro` | GET | Publik | Belum ada | **Tahap 3**: Bar indikator makro (BI 7DRR, Inflasi, USD/IDR) |
| **News & Calendar** | `/news`, `/calendar` | `/api/news`, `/api/calendar` | GET | Publik | Belum ada | **Tahap 3**: Feed berita emiten & kalender aksi korporasi |
| **LensAI Research Chat** | `/ai-briefing`, floating | `/api/chat` | POST | User / Pro (Bearer) | Ada drawer LensAI | Hubungkan ke streaming / API `/api/chat` dengan konteks emiten aktif |
| **Rekomendasi / Daily Picks** | `/recommendations` | `/api/recommendations`, `/api/daily-picks` | GET | Publik (Teaser) / Pro | Belum ada | **Tahap 3**: Widget rekomendasi harian |

---

## 2. Matriks Menu & Fitur Admin

| Menu Admin Web | Route Web | Endpoint API Web | Method | Status Desktop Saat Ini | Rencana Paritas (Tahap 2) |
|---|---|---|---|---|---|
| **Admin Hub & Stats** | `/admin` | `/api/admin/stats`, `/api/admin/desktop-overview` | GET | Hanya ada 2 form terisolasi | Dashboard ringkasan sistem, metrik pengguna & health |
| **Set Pro User** | `/admin` (embedded) | `/api/admin/set-pro`, `/api/admin/pro-status` | POST, GET | Sudah ada | Pertahankan dan rapikan feedback state |
| **Create Test User** | `/admin` (embedded) | `/api/admin/create-test-user` | POST | Sudah ada | Pertahankan dan rapikan feedback state |
| **Change Secret** | `/admin` (embedded) | `/api/admin/change-secret` | POST | Belum ada | Form ganti secret admin |
| **Export Data** | `/admin` (embedded) | `/api/admin/export` | GET | Belum ada | Trigger download/export data |
| **Jobs Monitor** | `/admin/jobs` | `/api/admin/jobs` | GET, POST | Belum ada | Monitoring scheduled cron jobs & trigger manual |
| **Decision Lab** | `/admin/decision-lab` | `/api/admin/decision-lab` | GET, POST | Belum ada | Pengujian & simulasi bobot rule model keputusan |
| **LensScore Calibration** | `/admin/calibration` | `/api/admin/calibration`, `/api/admin/calibration/recommend-threshold` | GET, POST | Belum ada | Kalibrasi threshold probabilitas & winrate |
| **ARA Scanner Audit** | `/admin/ara-scanner` | `/api/admin/ara-scanner` | GET, POST | Belum ada | Monitoring kesiapan scanner ARA harian |
| **TP/CL Validation** | `/admin/tpcl-validation` | `/api/admin/tpcl-validation`, `/api/admin/tpcl-validation/runs`, `/api/admin/tpcl-validation/actions` | GET, POST | Belum ada | Evaluasi ketepatan target harga & batas batal historis |
| **Intraday Validation** | `/admin/intraday-validation` | `/api/admin/intraday-validation`, `/api/admin/intraday-validation/runs`, `/api/admin/intraday-validation/actions` | GET, POST | Belum ada | Uji konsistensi bar intraday terhadap data bursa |
| **Fundamental Backfill** | `/admin/fundamental-backfill` | `/api/admin/fundamental-backfill` | GET, POST | Belum ada | Trigger backfill laporan keuangan emiten |
| **Transparency Evidence** | `/admin/transparency` | `/api/admin/transparency` | GET | Belum ada | Rekapitulasi bukti performa model |
| **Broker Summary EOD** | `/admin/broker-eod`, `/admin/broker-summary` | `/api/admin/broker-summary/import` | POST | Belum ada | Upload dan impor file rekap broker summary harian |
| **Ownership Flow Ingest** | `/admin/ownership-flow` | `/api/admin/ownership-flow` | GET, POST | Belum ada | Trigger sinkronisasi kepemilikan KSEI |

---

## 3. Identifikasi Blocker & Keterbatasan Server-Component

Berikut adalah halaman admin di repo web yang dibangun murni sebagai **Server Component** (mengakses database Prisma / Redis langsung via query server-side, tanpa endpoint REST publik/internal):
1. `/admin/financial-integrity` (Pemeriksaan anomali laporan keuangan).
2. `/admin/macro-assumptions` (Audit metodologi indikator makro PIT).
3. `/admin/bank-fundamentals` (Audit metrik perbankan NIM/NPL/CASA/LDR/CAR).
4. `/admin/ownership-flow-validation` (Validasi integritas arus scripless KSEI).
5. `/admin/foreign-flow` (Coverage audit data foreign flow).
6. `/admin/lensai-feedback` (Review feedback thumbs-up/down AI analyst).

**Catatan Kepatuhan Mandat**: Sesuai instruksi operator, repo web produksi `/opt/sahamlens/app` adalah **read-only** dan tidak boleh diubah/dideploy. Karena itu, modul di atas dicatat sebagai **Server-Component Blocker**: fitur ini membutuhkan endpoint REST baru di repo web sebelum dapat disajikan di client native desktop. SahamLens Desktop **dilarang membuat dummy workaround** untuk fitur tersebut.

---

## 4. Rencana Kerja Bertahap (Staged Execution)

- **Tahap 1 (Fokus Saat Ini)**:
  1. Buat client API nyata untuk data teknikal: `getStockTechnical(ticker)` dan `getStockChart(ticker, tf)`.
  2. Implementasikan panel **LensTechnical** di cockpit desktop:
     - Candlestick & Volume chart dengan data OHLCV historis riil.
     - Indikator teknikal (SMA 20/50/200, EMA, RSI 14, MACD).
     - Support, Resistance, dan pivot levels.
     - Trading Plan: Entry zone, Target Price (TP1/TP2), Cut Loss (CL), Risk-to-Reward ratio terhitung.
     - Deteksi pola candlestick & sinyal teknikal riil.
  3. Eliminasi dummy data & hardcoded mock dari `src/api.ts` dan `src/App.tsx`.
  4. Tambahkan regression & contract audit test di `scripts/`.
  5. Verifikasi build lokal (`npm run check` & Tauri build) serta CI Windows di GitHub Actions.
- **Tahap 2**: Implementasi Modular Full Admin Suite.
- **Tahap 3**: Implementasi Tools & Intelligence (Watchlist, Demo Portfolio, Backtest, Risk, Dividend, News, Macro).
