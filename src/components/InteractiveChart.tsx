import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  adxSeries,
  atrSeries,
  bollingerSeries,
  cmfSeries,
  emaSeries,
  heikinAshi,
  indicatorLabel,
  isOscillatorKind,
  macdSeries,
  obvSeries,
  rsiSeries,
  smaSeries,
  stochasticSeries,
  williamsRSeries,
  type ChartCandle,
  type ChartType,
  type IndicatorConfig,
} from '../technical/indicators';

interface InteractiveChartProps {
  candles: ChartCandle[];
  symbol: string;
  timeframe: string;
  chartType: ChartType;
  indicators: IndicatorConfig[];
  tradingLevels?: {
    entry?: number;
    cutLoss?: number;
    tp1?: number;
    tp2?: number;
    support?: number;
    resistance?: number;
  };
  height?: number;
}

export const InteractiveChart: React.FC<InteractiveChartProps> = ({
  candles,
  symbol,
  timeframe,
  chartType,
  indicators,
  tradingLevels,
  height = 560,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(900);

  // Viewport slice (panning and zooming)
  const totalBars = candles.length;
  // default visible bar count: up to 60 or all if fewer
  const [visibleCount, setVisibleCount] = useState(() => Math.min(60, Math.max(15, totalBars)));
  const [endOffset, setEndOffset] = useState(0); // 0 means latest candle is visible at right edge

  // Resize observer for container
  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        if (entry.contentRect.width > 100) {
          setContainerWidth(Math.floor(entry.contentRect.width));
        }
      }
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  // Reset or adjust visible range when candles change significantly
  useEffect(() => {
    setVisibleCount((prev) => Math.min(Math.max(15, prev), Math.max(15, candles.length)));
    setEndOffset(0);
  }, [symbol, timeframe, candles.length]);

  // Transform candles for chartType (e.g. Heikin-Ashi)
  const displayCandles = useMemo(() => {
    if (chartType === 'heikin-ashi') return heikinAshi(candles);
    return candles;
  }, [candles, chartType]);

  // Compute slice of candles to display
  const effectiveVisible = Math.min(visibleCount, Math.max(1, displayCandles.length));
  const maxEndOffset = Math.max(0, displayCandles.length - effectiveVisible);
  const clampedEndOffset = Math.max(0, Math.min(maxEndOffset, endOffset));
  const startIndex = Math.max(0, displayCandles.length - effectiveVisible - clampedEndOffset);
  const endIndex = Math.min(displayCandles.length, startIndex + effectiveVisible);

  const visibleCandles = useMemo(
    () => displayCandles.slice(startIndex, endIndex),
    [displayCandles, startIndex, endIndex]
  );

  // Full-series indicators (computed over entire history for accuracy)
  const activeOverlays = useMemo(
    () => indicators.filter((ind) => ind.visible !== false && !isOscillatorKind(ind.kind)),
    [indicators]
  );
  const activeOscillators = useMemo(
    () => indicators.filter((ind) => ind.visible !== false && isOscillatorKind(ind.kind)),
    [indicators]
  );

  // Indicator series cache
  const computedSeries = useMemo(() => {
    if (candles.length === 0) return {};
    const seriesMap: Record<string, any> = {};

    indicators.forEach((ind) => {
      if (ind.visible === false) return;
      switch (ind.kind) {
        case 'SMA':
          seriesMap[ind.id] = smaSeries(candles, ind.period ?? 20);
          break;
        case 'EMA':
          seriesMap[ind.id] = emaSeries(candles, ind.period ?? 20);
          break;
        case 'BB':
          seriesMap[ind.id] = bollingerSeries(candles, ind.period ?? 20, ind.stdDev ?? 2);
          break;
        case 'RSI':
          seriesMap[ind.id] = rsiSeries(candles, ind.period ?? 14);
          break;
        case 'MACD':
          seriesMap[ind.id] = macdSeries(candles, ind.fast ?? 12, ind.slow ?? 26, ind.signal ?? 9);
          break;
        case 'ATR':
          seriesMap[ind.id] = atrSeries(candles, ind.period ?? 14);
          break;
        case 'CMF':
          seriesMap[ind.id] = cmfSeries(candles, ind.period ?? 20);
          break;
        case 'STOCH':
          seriesMap[ind.id] = stochasticSeries(candles, ind.period ?? 14);
          break;
        case 'WILLIAMS_R':
          seriesMap[ind.id] = williamsRSeries(candles, ind.period ?? 14);
          break;
        case 'ADX':
          seriesMap[ind.id] = adxSeries(candles, ind.period ?? 14);
          break;
        case 'OBV':
          seriesMap[ind.id] = obvSeries(candles);
          break;
      }
    });

    return seriesMap;
  }, [candles, indicators]);

  // Drag / Pan interaction state
  const isDraggingRef = useRef(false);
  const dragStartXRef = useRef(0);
  const dragStartOffsetRef = useRef(0);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button !== 0) return; // Left button only
    isDraggingRef.current = true;
    dragStartXRef.current = e.clientX;
    dragStartOffsetRef.current = clampedEndOffset;
  }, [clampedEndOffset]);

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      // Panning
      if (isDraggingRef.current) {
        const deltaX = e.clientX - dragStartXRef.current;
        const barWidth = containerWidth / Math.max(1, effectiveVisible);
        const barsShift = Math.round(deltaX / barWidth);
        const nextOffset = Math.max(0, Math.min(maxEndOffset, dragStartOffsetRef.current + barsShift));
        setEndOffset(nextOffset);
      }
    },
    [containerWidth, effectiveVisible, maxEndOffset]
  );

  const handleMouseUp = useCallback(() => {
    isDraggingRef.current = false;
  }, []);

  // Mouse wheel zoom
  const handleWheel = useCallback(
    (e: React.WheelEvent) => {
      e.preventDefault();
      const zoomFactor = e.deltaY > 0 ? 1.15 : 0.87;
      setVisibleCount((prev) => {
        const next = Math.round(prev * zoomFactor);
        return Math.max(15, Math.min(candles.length, next));
      });
    },
    [candles.length]
  );

  // Touch handlers for mobile / tablet drag
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      isDraggingRef.current = true;
      dragStartXRef.current = e.touches[0].clientX;
      dragStartOffsetRef.current = clampedEndOffset;
    }
  }, [clampedEndOffset]);

  const handleTouchMove = useCallback(
    (e: React.TouchEvent) => {
      if (isDraggingRef.current && e.touches.length === 1) {
        const deltaX = e.touches[0].clientX - dragStartXRef.current;
        const barWidth = containerWidth / Math.max(1, effectiveVisible);
        const barsShift = Math.round(deltaX / barWidth);
        const nextOffset = Math.max(0, Math.min(maxEndOffset, dragStartOffsetRef.current + barsShift));
        setEndOffset(nextOffset);
      }
    },
    [containerWidth, effectiveVisible, maxEndOffset]
  );

  const handleTouchEnd = useCallback(() => {
    isDraggingRef.current = false;
  }, []);

  // Crosshair / Hover state
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const [hoverY, setHoverY] = useState<number | null>(null);

  const handleChartHover = useCallback(
    (e: React.MouseEvent<SVGSVGElement>) => {
      if (visibleCandles.length === 0) return;
      const rect = e.currentTarget.getBoundingClientRect();
      const clientX = e.clientX - rect.left;
      const clientY = e.clientY - rect.top;
      const priceWidth = containerWidth - 70; // right 70px for price scale
      if (clientX < 0 || clientX > priceWidth) {
        setHoverIndex(null);
        setHoverY(null);
        return;
      }
      const barW = priceWidth / visibleCandles.length;
      const idx = Math.min(visibleCandles.length - 1, Math.max(0, Math.floor(clientX / barW)));
      setHoverIndex(idx);
      setHoverY(clientY);
    },
    [containerWidth, visibleCandles.length]
  );

  const handleMouseLeave = useCallback(() => {
    setHoverIndex(null);
    setHoverY(null);
  }, []);

  // Reset to default
  const handleResetZoom = useCallback(() => {
    setVisibleCount(Math.min(60, Math.max(15, candles.length)));
    setEndOffset(0);
  }, [candles.length]);

  // Fit all
  const handleFitAll = useCallback(() => {
    setVisibleCount(Math.max(15, candles.length));
    setEndOffset(0);
  }, [candles.length]);

  // Zoom In / Out buttons
  const handleZoomIn = useCallback(() => {
    setVisibleCount((prev) => Math.max(15, Math.round(prev * 0.8)));
  }, []);

  const handleZoomOut = useCallback(() => {
    setVisibleCount((prev) => Math.min(candles.length, Math.round(prev * 1.25)));
  }, [candles.length]);

  if (candles.length === 0) {
    return (
      <div className="w-full h-80 flex flex-col items-center justify-center bg-[#111115] border border-zinc-800 rounded-xl text-zinc-500 text-xs gap-2">
        <span>Data grafik candle belum tersedia untuk simbol ini.</span>
      </div>
    );
  }

  // Layout Dimensions
  const plotWidth = Math.max(200, containerWidth - 70); // 70px right margin for axis labels
  const totalOscillators = activeOscillators.length;
  const oscPaneHeight = 70;
  const oscMargin = 8;
  const bottomOscillatorsHeight = totalOscillators * (oscPaneHeight + oscMargin);
  const timeAxisHeight = 24;
  const priceChartHeight = Math.max(220, height - bottomOscillatorsHeight - timeAxisHeight - 40);

  // Price Scale Calculation for visible candles + overlays
  let minPrice = Infinity;
  let maxPrice = -Infinity;
  visibleCandles.forEach((c) => {
    if (c.low < minPrice) minPrice = c.low;
    if (c.high > maxPrice) maxPrice = c.high;
  });

  // Include active overlays in price scale
  activeOverlays.forEach((ind) => {
    const series = computedSeries[ind.id];
    if (!series) return;
    if (ind.kind === 'BB') {
      const { upper, lower } = series;
      for (let i = startIndex; i < endIndex; i++) {
        if (upper[i] != null && upper[i] > maxPrice) maxPrice = upper[i]!;
        if (lower[i] != null && lower[i] < minPrice) minPrice = lower[i]!;
      }
    } else {
      for (let i = startIndex; i < endIndex; i++) {
        const val = series[i];
        if (val != null) {
          if (val > maxPrice) maxPrice = val;
          if (val < minPrice) minPrice = val;
        }
      }
    }
  });

  // Include trading levels in scale if set
  if (tradingLevels?.cutLoss && tradingLevels.cutLoss < minPrice) minPrice = tradingLevels.cutLoss * 0.99;
  if (tradingLevels?.tp2 && tradingLevels.tp2 > maxPrice) maxPrice = tradingLevels.tp2 * 1.01;

  if (!Number.isFinite(minPrice) || !Number.isFinite(maxPrice) || minPrice >= maxPrice) {
    minPrice = 1;
    maxPrice = 100;
  }
  const priceRange = Math.max(1, maxPrice - minPrice);
  const paddingPrice = priceRange * 0.05;
  const adjustedMin = minPrice - paddingPrice;
  const adjustedMax = maxPrice + paddingPrice;
  const adjustedRange = adjustedMax - adjustedMin;

  const toPriceY = (price: number) => {
    return priceChartHeight - ((price - adjustedMin) / adjustedRange) * priceChartHeight;
  };

  const toPriceFromY = (y: number) => {
    const fraction = (priceChartHeight - y) / priceChartHeight;
    return adjustedMin + fraction * adjustedRange;
  };

  const barStep = plotWidth / Math.max(1, visibleCandles.length);
  const candleBarWidth = Math.max(2, Math.min(24, Math.floor(barStep * 0.75)));

  // Hovered candle data
  const hoveredCandle =
    hoverIndex != null && hoverIndex >= 0 && hoverIndex < visibleCandles.length
      ? visibleCandles[hoverIndex]
      : visibleCandles[visibleCandles.length - 1];
  const hoveredOriginalIndex =
    hoverIndex != null && hoverIndex >= 0 && hoverIndex < visibleCandles.length
      ? startIndex + hoverIndex
      : endIndex - 1;

  const prevCandle =
    hoveredOriginalIndex > 0 ? displayCandles[hoveredOriginalIndex - 1] : hoveredCandle;
  const candleChange = (hoveredCandle?.close ?? 0) - (prevCandle?.close ?? hoveredCandle?.close ?? 0);
  const candleChangePct =
    prevCandle && prevCandle.close > 0 ? (candleChange / prevCandle.close) * 100 : 0;

  return (
    <div
      ref={containerRef}
      className="w-full bg-[#111115] border border-zinc-800 rounded-xl p-3 select-none relative font-mono text-xs"
      onWheel={handleWheel}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Top Controls & Status Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-zinc-800 mb-2">
        <div className="flex flex-wrap items-center gap-3 text-[11px]">
          <span className="font-black text-white px-1.5 py-0.5 rounded bg-zinc-800">
            {symbol} · {timeframe}
          </span>
          {hoveredCandle && (
            <div className="flex flex-wrap items-center gap-2 text-zinc-400">
              <span>T: <strong className="text-zinc-200">{hoveredCandle.time.slice(0, 10)}</strong></span>
              <span>O: <strong className="text-zinc-200">{Math.round(hoveredCandle.open).toLocaleString('id-ID')}</strong></span>
              <span>H: <strong className="text-zinc-200">{Math.round(hoveredCandle.high).toLocaleString('id-ID')}</strong></span>
              <span>L: <strong className="text-zinc-200">{Math.round(hoveredCandle.low).toLocaleString('id-ID')}</strong></span>
              <span>C: <strong className="text-white font-bold">{Math.round(hoveredCandle.close).toLocaleString('id-ID')}</strong></span>
              <span className={candleChange >= 0 ? 'text-emerald-400 font-bold' : 'text-rose-400 font-bold'}>
                {candleChange >= 0 ? '+' : ''}
                {Math.round(candleChange).toLocaleString('id-ID')} ({candleChangePct >= 0 ? '+' : ''}
                {candleChangePct.toFixed(2)}%)
              </span>
              <span>Vol: <strong className="text-zinc-300">{hoveredCandle.volume.toLocaleString('id-ID')}</strong></span>
            </div>
          )}
        </div>

        {/* Navigation & Zoom buttons */}
        <div className="flex items-center gap-1 text-[11px]">
          <button
            type="button"
            onClick={handleZoomIn}
            className="px-2 py-0.5 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-200 transition-colors"
            title="Zoom In"
          >
            +
          </button>
          <button
            type="button"
            onClick={handleZoomOut}
            className="px-2 py-0.5 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-200 transition-colors"
            title="Zoom Out"
          >
            -
          </button>
          <button
            type="button"
            onClick={handleResetZoom}
            className="px-2 py-0.5 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-200 transition-colors"
            title="Reset Zoom"
          >
            Reset
          </button>
          <button
            type="button"
            onClick={handleFitAll}
            className="px-2 py-0.5 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-200 transition-colors"
            title="Fit All"
          >
            Fit ({candles.length})
          </button>
        </div>
      </div>

      {/* Overlays Legend Bar */}
      {activeOverlays.length > 0 && (
        <div className="flex flex-wrap items-center gap-3 text-[10px] pb-1 text-zinc-400">
          {activeOverlays.map((ind) => {
            const series = computedSeries[ind.id];
            const val = series ? series[hoveredOriginalIndex] : null;
            const color = ind.color || '#38bdf8';
            if (ind.kind === 'BB' && series) {
              const u = series.upper[hoveredOriginalIndex];
              const m = series.middle[hoveredOriginalIndex];
              const l = series.lower[hoveredOriginalIndex];
              return (
                <div key={ind.id} className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
                  <span>{indicatorLabel(ind)}:</span>
                  <span className="text-zinc-200 font-bold">
                    {u != null ? `${Math.round(u)} / ${Math.round(m)} / ${Math.round(l)}` : 'N/A'}
                  </span>
                </div>
              );
            }
            return (
              <div key={ind.id} className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
                <span>{indicatorLabel(ind)}:</span>
                <span className="text-zinc-200 font-bold">
                  {val != null ? `Rp ${Math.round(val).toLocaleString('id-ID')}` : 'N/A'}
                </span>
              </div>
            );
          })}
        </div>
      )}

      {/* Main Chart SVG Canvas */}
      <svg
        width={containerWidth}
        height={height - 50}
        className="cursor-crosshair overflow-visible"
        onMouseMove={handleChartHover}
        onMouseLeave={handleMouseLeave}
      >
        <defs>
          <clipPath id="pricePlotClip">
            <rect x="0" y="0" width={plotWidth} height={priceChartHeight} />
          </clipPath>
          <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#10b981" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#10b981" stopOpacity="0.0" />
          </linearGradient>
        </defs>

        {/* ----------------- Price Pane Background & Gridlines ----------------- */}
        <g clipPath="url(#pricePlotClip)">
          {/* Horizontal Gridlines & Price Scale Labels */}
          {[0.15, 0.35, 0.55, 0.75, 0.95].map((pct, i) => {
            const y = priceChartHeight * (1 - pct);
            const priceVal = Math.round(adjustedMin + pct * adjustedRange);
            return (
              <g key={i}>
                <line x1="0" y1={y} x2={plotWidth} y2={y} stroke="#27272a" strokeDasharray="3 3" strokeWidth="0.8" />
                <text
                  x={containerWidth - 5}
                  y={y + 3}
                  fill="#71717a"
                  fontSize="9"
                  textAnchor="end"
                  fontFamily="monospace"
                >
                  {priceVal.toLocaleString('id-ID')}
                </text>
              </g>
            );
          })}

          {/* Vertical Gridlines */}
          {visibleCandles.map((c, i) => {
            if (i % Math.max(1, Math.floor(visibleCandles.length / 6)) !== 0) return null;
            const x = i * barStep + barStep / 2;
            return (
              <line key={i} x1={x} y1="0" x2={x} y2={priceChartHeight} stroke="#27272a" strokeDasharray="3 3" strokeWidth="0.8" />
            );
          })}

          {/* Baseline Horizontal Line (if chartType === 'baseline') */}
          {chartType === 'baseline' && visibleCandles.length > 0 && (
            <line
              x1="0"
              y1={toPriceY(visibleCandles[0].close)}
              x2={plotWidth}
              y2={toPriceY(visibleCandles[0].close)}
              stroke="#71717a"
              strokeDasharray="4 2"
              strokeWidth="1"
            />
          )}

          {/* ----------------- Trading Plan Levels ----------------- */}
          {tradingLevels && (
            <>
              {/* Entry Level */}
              {tradingLevels.entry && tradingLevels.entry >= adjustedMin && tradingLevels.entry <= adjustedMax && (
                <g>
                  <line
                    x1="0"
                    y1={toPriceY(tradingLevels.entry)}
                    x2={plotWidth}
                    y2={toPriceY(tradingLevels.entry)}
                    stroke="#38bdf8"
                    strokeDasharray="3 3"
                    strokeWidth="1"
                  />
                  <rect x={plotWidth - 110} y={toPriceY(tradingLevels.entry) - 8} width="105" height="14" fill="#0284c7" rx="3" />
                  <text x={plotWidth - 5} y={toPriceY(tradingLevels.entry) + 2} fill="#ffffff" fontSize="8" fontWeight="bold" textAnchor="end">
                    ENTRY: {tradingLevels.entry.toLocaleString('id-ID')}
                  </text>
                </g>
              )}

              {/* Cut Loss (Batas Batal) */}
              {tradingLevels.cutLoss && tradingLevels.cutLoss >= adjustedMin && tradingLevels.cutLoss <= adjustedMax && (
                <g>
                  <line
                    x1="0"
                    y1={toPriceY(tradingLevels.cutLoss)}
                    x2={plotWidth}
                    y2={toPriceY(tradingLevels.cutLoss)}
                    stroke="#f43f5e"
                    strokeDasharray="4 2"
                    strokeWidth="1.2"
                  />
                  <rect x={plotWidth - 110} y={toPriceY(tradingLevels.cutLoss) - 8} width="105" height="14" fill="#e11d48" rx="3" />
                  <text x={plotWidth - 5} y={toPriceY(tradingLevels.cutLoss) + 2} fill="#ffffff" fontSize="8" fontWeight="bold" textAnchor="end">
                    CL: {tradingLevels.cutLoss.toLocaleString('id-ID')}
                  </text>
                </g>
              )}

              {/* TP1 */}
              {tradingLevels.tp1 && tradingLevels.tp1 >= adjustedMin && tradingLevels.tp1 <= adjustedMax && (
                <g>
                  <line
                    x1="0"
                    y1={toPriceY(tradingLevels.tp1)}
                    x2={plotWidth}
                    y2={toPriceY(tradingLevels.tp1)}
                    stroke="#10b981"
                    strokeDasharray="4 2"
                    strokeWidth="1.2"
                  />
                  <rect x={plotWidth - 110} y={toPriceY(tradingLevels.tp1) - 8} width="105" height="14" fill="#059669" rx="3" />
                  <text x={plotWidth - 5} y={toPriceY(tradingLevels.tp1) + 2} fill="#ffffff" fontSize="8" fontWeight="bold" textAnchor="end">
                    TP1: {tradingLevels.tp1.toLocaleString('id-ID')}
                  </text>
                </g>
              )}

              {/* TP2 */}
              {tradingLevels.tp2 && tradingLevels.tp2 >= adjustedMin && tradingLevels.tp2 <= adjustedMax && (
                <g>
                  <line
                    x1="0"
                    y1={toPriceY(tradingLevels.tp2)}
                    x2={plotWidth}
                    y2={toPriceY(tradingLevels.tp2)}
                    stroke="#06b6d4"
                    strokeDasharray="4 2"
                    strokeWidth="1"
                  />
                  <rect x={plotWidth - 110} y={toPriceY(tradingLevels.tp2) - 8} width="105" height="14" fill="#0891b2" rx="3" />
                  <text x={plotWidth - 5} y={toPriceY(tradingLevels.tp2) + 2} fill="#ffffff" fontSize="8" fontWeight="bold" textAnchor="end">
                    TP2: {tradingLevels.tp2.toLocaleString('id-ID')}
                  </text>
                </g>
              )}
            </>
          )}

          {/* ----------------- Bollinger Bands Clouds & Lines ----------------- */}
          {activeOverlays.filter((i) => i.kind === 'BB').map((ind) => {
            const bb = computedSeries[ind.id];
            if (!bb) return null;
            const pointsUpper: string[] = [];
            const pointsLower: string[] = [];
            for (let i = 0; i < visibleCandles.length; i++) {
              const origIdx = startIndex + i;
              const x = i * barStep + barStep / 2;
              const u = bb.upper[origIdx];
              const l = bb.lower[origIdx];
              if (u != null && l != null) {
                pointsUpper.push(`${x},${toPriceY(u)}`);
                pointsLower.unshift(`${x},${toPriceY(l)}`);
              }
            }
            if (pointsUpper.length < 2) return null;
            const areaPath = `M ${pointsUpper.join(' L ')} L ${pointsLower.join(' L ')} Z`;
            return (
              <g key={ind.id}>
                <path d={areaPath} fill="#6366f1" fillOpacity="0.08" />
                <path d={`M ${pointsUpper.join(' L ')}`} fill="none" stroke="#6366f1" strokeWidth="1" opacity="0.6" />
                <path d={`M ${pointsLower.reverse().join(' L ')}`} fill="none" stroke="#6366f1" strokeWidth="1" opacity="0.6" />
              </g>
            );
          })}

          {/* ----------------- Moving Average Lines (SMA/EMA) ----------------- */}
          {activeOverlays.filter((i) => i.kind === 'SMA' || i.kind === 'EMA').map((ind) => {
            const series = computedSeries[ind.id];
            if (!series) return null;
            const pts: string[] = [];
            for (let i = 0; i < visibleCandles.length; i++) {
              const origIdx = startIndex + i;
              const val = series[origIdx];
              if (val != null) {
                const x = i * barStep + barStep / 2;
                pts.push(`${x},${toPriceY(val)}`);
              }
            }
            if (pts.length < 2) return null;
            return (
              <path
                key={ind.id}
                d={`M ${pts.join(' L ')}`}
                fill="none"
                stroke={ind.color || '#38bdf8'}
                strokeWidth="1.5"
              />
            );
          })}

          {/* ----------------- Price Rendering: Candlestick, OHLC Bars, Line, Area, Baseline ----------------- */}
          {chartType === 'candlestick' || chartType === 'heikin-ashi' ? (
            visibleCandles.map((c, i) => {
              const x = i * barStep + barStep / 2;
              const yHigh = toPriceY(c.high);
              const yLow = toPriceY(c.low);
              const yOpen = toPriceY(c.open);
              const yClose = toPriceY(c.close);
              const isUp = c.close >= c.open;
              const candleColor = isUp ? '#10b981' : '#f43f5e';
              const bodyY = Math.min(yOpen, yClose);
              const bodyH = Math.max(1.5, Math.abs(yClose - yOpen));

              return (
                <g key={i}>
                  {/* Wick */}
                  <line x1={x} y1={yHigh} x2={x} y2={yLow} stroke={candleColor} strokeWidth="1.2" />
                  {/* Body */}
                  <rect
                    x={x - candleBarWidth / 2}
                    y={bodyY}
                    width={candleBarWidth}
                    height={bodyH}
                    fill={candleColor}
                    rx="0.5"
                  />
                </g>
              );
            })
          ) : chartType === 'bar' ? (
            visibleCandles.map((c, i) => {
              const x = i * barStep + barStep / 2;
              const yHigh = toPriceY(c.high);
              const yLow = toPriceY(c.low);
              const yOpen = toPriceY(c.open);
              const yClose = toPriceY(c.close);
              const isUp = c.close >= c.open;
              const barColor = isUp ? '#10b981' : '#f43f5e';
              const tickW = Math.max(2, candleBarWidth / 2);

              return (
                <g key={i}>
                  {/* Vertical high-low line */}
                  <line x1={x} y1={yHigh} x2={x} y2={yLow} stroke={barColor} strokeWidth="1.5" />
                  {/* Left open tick */}
                  <line x1={x - tickW} y1={yOpen} x2={x} y2={yOpen} stroke={barColor} strokeWidth="1.5" />
                  {/* Right close tick */}
                  <line x1={x} y1={yClose} x2={x + tickW} y2={yClose} stroke={barColor} strokeWidth="1.5" />
                </g>
              );
            })
          ) : chartType === 'line' ? (
            (() => {
              const pts = visibleCandles.map((c, i) => `${i * barStep + barStep / 2},${toPriceY(c.close)}`);
              return <path d={`M ${pts.join(' L ')}`} fill="none" stroke="#10b981" strokeWidth="2" />;
            })()
          ) : chartType === 'area' ? (
            (() => {
              const pts = visibleCandles.map((c, i) => `${i * barStep + barStep / 2},${toPriceY(c.close)}`);
              const firstX = barStep / 2;
              const lastX = (visibleCandles.length - 1) * barStep + barStep / 2;
              const areaD = `M ${firstX},${priceChartHeight} L ${pts.join(' L ')} L ${lastX},${priceChartHeight} Z`;
              return (
                <g>
                  <path d={areaD} fill="url(#areaGradient)" />
                  <path d={`M ${pts.join(' L ')}`} fill="none" stroke="#10b981" strokeWidth="2" />
                </g>
              );
            })()
          ) : chartType === 'baseline' ? (
            (() => {
              const basePrice = visibleCandles[0].close;
              const baseY = toPriceY(basePrice);
              const pts = visibleCandles.map((c, i) => `${i * barStep + barStep / 2},${toPriceY(c.close)}`);
              return (
                <g>
                  <path d={`M ${pts.join(' L ')}`} fill="none" stroke="#38bdf8" strokeWidth="2" />
                  <line x1="0" y1={baseY} x2={plotWidth} y2={baseY} stroke="#71717a" strokeDasharray="3 3" />
                </g>
              );
            })()
          ) : null}
        </g>

        {/* ----------------- Synchronized Crosshair (Price Pane) ----------------- */}
        {hoverIndex != null && hoverIndex >= 0 && hoverIndex < visibleCandles.length && (
          <g>
            {/* Vertical crosshair */}
            <line
              x1={hoverIndex * barStep + barStep / 2}
              y1="0"
              x2={hoverIndex * barStep + barStep / 2}
              y2={height - 50}
              stroke="#a1a1aa"
              strokeDasharray="2 2"
              strokeWidth="0.8"
            />
            {/* Horizontal crosshair (on price pane) */}
            {hoverY != null && hoverY <= priceChartHeight && (
              <g>
                <line x1="0" y1={hoverY} x2={plotWidth} y2={hoverY} stroke="#a1a1aa" strokeDasharray="2 2" strokeWidth="0.8" />
                <rect x={plotWidth} y={hoverY - 8} width="68" height="16" fill="#3f3f46" rx="2" />
                <text x={containerWidth - 5} y={hoverY + 4} fill="#ffffff" fontSize="9" textAnchor="end">
                  {Math.round(toPriceFromY(hoverY)).toLocaleString('id-ID')}
                </text>
              </g>
            )}
          </g>
        )}

        {/* ----------------- Oscillator Panes (Synchronized below Price) ----------------- */}
        {activeOscillators.map((ind, paneIdx) => {
          const paneY = priceChartHeight + 10 + paneIdx * (oscPaneHeight + oscMargin);
          const series = computedSeries[ind.id];

          return (
            <g key={ind.id} transform={`translate(0, ${paneY})`}>
              {/* Border & Pane Background */}
              <rect x="0" y="0" width={plotWidth} height={oscPaneHeight} fill="#09090b" rx="4" stroke="#27272a" strokeWidth="0.8" />

              {/* Pane Label */}
              <text x="8" y="14" fill="#a1a1aa" fontSize="10" fontWeight="bold">
                {indicatorLabel(ind)}
              </text>

              {/* Specific indicator drawings */}
              {ind.kind === 'VOLUME' && (
                (() => {
                  const maxVol = Math.max(1, ...visibleCandles.map((c) => c.volume));
                  return (
                    <g>
                      {visibleCandles.map((c, i) => {
                        const x = i * barStep + barStep / 2;
                        const vH = (c.volume / maxVol) * (oscPaneHeight - 20);
                        const isUp = c.close >= c.open;
                        return (
                          <rect
                            key={i}
                            x={x - candleBarWidth / 2}
                            y={oscPaneHeight - vH - 2}
                            width={candleBarWidth}
                            height={Math.max(1, vH)}
                            fill={isUp ? '#10b981' : '#f43f5e'}
                            opacity="0.6"
                          />
                        );
                      })}
                      <text x={containerWidth - 5} y="15" fill="#71717a" fontSize="8" textAnchor="end">
                        {(maxVol / 1_000_000).toFixed(1)}M
                      </text>
                    </g>
                  );
                })()
              )}

              {ind.kind === 'RSI' && series && (
                (() => {
                  // Scale 0 to 100
                  const toRsiY = (val: number) => oscPaneHeight - (val / 100) * (oscPaneHeight - 16) - 8;
                  const y70 = toRsiY(70);
                  const y30 = toRsiY(30);
                  const pts: string[] = [];
                  for (let i = 0; i < visibleCandles.length; i++) {
                    const r = series[startIndex + i];
                    if (r != null) {
                      pts.push(`${i * barStep + barStep / 2},${toRsiY(r)}`);
                    }
                  }
                  const curRsi = series[hoveredOriginalIndex];
                  return (
                    <g>
                      {/* 70/30 Thresholds */}
                      <line x1="0" y1={y70} x2={plotWidth} y2={y70} stroke="#f43f5e" strokeDasharray="2 2" strokeWidth="0.8" />
                      <line x1="0" y1={y30} x2={plotWidth} y2={y30} stroke="#10b981" strokeDasharray="2 2" strokeWidth="0.8" />
                      {pts.length > 1 && <path d={`M ${pts.join(' L ')}`} fill="none" stroke="#a855f7" strokeWidth="1.5" />}
                      <text x={containerWidth - 5} y="15" fill="#c084fc" fontSize="9" fontWeight="bold" textAnchor="end">
                        {curRsi != null ? curRsi.toFixed(1) : 'N/A'}
                      </text>
                    </g>
                  );
                })()
              )}

              {ind.kind === 'MACD' && series && (
                (() => {
                  const { macd, signal, histogram } = series;
                  let maxAbs = 1;
                  for (let i = startIndex; i < endIndex; i++) {
                    if (macd[i] != null && Math.abs(macd[i]) > maxAbs) maxAbs = Math.abs(macd[i]);
                    if (histogram[i] != null && Math.abs(histogram[i]) > maxAbs) maxAbs = Math.abs(histogram[i]);
                  }
                  const toMacdY = (v: number) => oscPaneHeight / 2 - (v / maxAbs) * (oscPaneHeight / 2 - 10);
                  const zeroY = oscPaneHeight / 2;

                  const macdPts: string[] = [];
                  const sigPts: string[] = [];
                  for (let i = 0; i < visibleCandles.length; i++) {
                    const idx = startIndex + i;
                    const x = i * barStep + barStep / 2;
                    if (macd[idx] != null) macdPts.push(`${x},${toMacdY(macd[idx])}`);
                    if (signal[idx] != null) sigPts.push(`${x},${toMacdY(signal[idx])}`);
                  }
                  return (
                    <g>
                      <line x1="0" y1={zeroY} x2={plotWidth} y2={zeroY} stroke="#3f3f46" strokeWidth="0.8" />
                      {/* Histogram bars */}
                      {visibleCandles.map((_, i) => {
                        const idx = startIndex + i;
                        const h = histogram[idx];
                        if (h == null) return null;
                        const x = i * barStep + barStep / 2;
                        const y = toMacdY(h);
                        const barH = Math.abs(y - zeroY);
                        return (
                          <rect
                            key={i}
                            x={x - candleBarWidth / 2}
                            y={Math.min(y, zeroY)}
                            width={candleBarWidth}
                            height={Math.max(1, barH)}
                            fill={h >= 0 ? '#10b981' : '#f43f5e'}
                            opacity="0.6"
                          />
                        );
                      })}
                      {macdPts.length > 1 && <path d={`M ${macdPts.join(' L ')}`} fill="none" stroke="#38bdf8" strokeWidth="1.2" />}
                      {sigPts.length > 1 && <path d={`M ${sigPts.join(' L ')}`} fill="none" stroke="#f59e0b" strokeWidth="1.2" />}
                      <text x={containerWidth - 5} y="15" fill="#38bdf8" fontSize="8" textAnchor="end">
                        {macd[hoveredOriginalIndex]?.toFixed(2) ?? '0.00'}
                      </text>
                    </g>
                  );
                })()
              )}

              {ind.kind === 'STOCH' && series && (
                (() => {
                  const { k, d } = series;
                  const toStochY = (val: number) => oscPaneHeight - (val / 100) * (oscPaneHeight - 16) - 8;
                  const kPts: string[] = [];
                  const dPts: string[] = [];
                  for (let i = 0; i < visibleCandles.length; i++) {
                    const idx = startIndex + i;
                    const x = i * barStep + barStep / 2;
                    if (k[idx] != null) kPts.push(`${x},${toStochY(k[idx])}`);
                    if (d[idx] != null) dPts.push(`${x},${toStochY(d[idx])}`);
                  }
                  return (
                    <g>
                      <line x1="0" y1={toStochY(80)} x2={plotWidth} y2={toStochY(80)} stroke="#f43f5e" strokeDasharray="2 2" strokeWidth="0.8" />
                      <line x1="0" y1={toStochY(20)} x2={plotWidth} y2={toStochY(20)} stroke="#10b981" strokeDasharray="2 2" strokeWidth="0.8" />
                      {kPts.length > 1 && <path d={`M ${kPts.join(' L ')}`} fill="none" stroke="#10b981" strokeWidth="1.2" />}
                      {dPts.length > 1 && <path d={`M ${dPts.join(' L ')}`} fill="none" stroke="#38bdf8" strokeWidth="1.2" />}
                      <text x={containerWidth - 5} y="15" fill="#10b981" fontSize="8" textAnchor="end">
                        {k[hoveredOriginalIndex]?.toFixed(1) ?? 'N/A'}
                      </text>
                    </g>
                  );
                })()
              )}

              {ind.kind === 'ATR' && series && (
                (() => {
                  let maxAtr = 1;
                  for (let i = startIndex; i < endIndex; i++) {
                    if (series[i] != null && series[i]! > maxAtr) maxAtr = series[i]!;
                  }
                  const toAtrY = (val: number) => oscPaneHeight - (val / maxAtr) * (oscPaneHeight - 20) - 10;
                  const pts: string[] = [];
                  for (let i = 0; i < visibleCandles.length; i++) {
                    const val = series[startIndex + i];
                    if (val != null) pts.push(`${i * barStep + barStep / 2},${toAtrY(val)}`);
                  }
                  return (
                    <g>
                      {pts.length > 1 && <path d={`M ${pts.join(' L ')}`} fill="none" stroke="#f59e0b" strokeWidth="1.5" />}
                      <text x={containerWidth - 5} y="15" fill="#f59e0b" fontSize="9" fontWeight="bold" textAnchor="end">
                        {series[hoveredOriginalIndex] != null ? Math.round(series[hoveredOriginalIndex]!) : 'N/A'}
                      </text>
                    </g>
                  );
                })()
              )}

              {ind.kind === 'CMF' && series && (
                (() => {
                  const toCmfY = (val: number) => oscPaneHeight / 2 - (val / 0.5) * (oscPaneHeight / 2 - 10);
                  const zeroY = oscPaneHeight / 2;
                  const pts: string[] = [];
                  for (let i = 0; i < visibleCandles.length; i++) {
                    const val = series[startIndex + i];
                    if (val != null) pts.push(`${i * barStep + barStep / 2},${toCmfY(val)}`);
                  }
                  return (
                    <g>
                      <line x1="0" y1={zeroY} x2={plotWidth} y2={zeroY} stroke="#3f3f46" strokeWidth="0.8" />
                      {pts.length > 1 && <path d={`M ${pts.join(' L ')}`} fill="none" stroke="#06b6d4" strokeWidth="1.5" />}
                      <text x={containerWidth - 5} y="15" fill="#06b6d4" fontSize="8" textAnchor="end">
                        {series[hoveredOriginalIndex]?.toFixed(2) ?? 'N/A'}
                      </text>
                    </g>
                  );
                })()
              )}

              {ind.kind === 'WILLIAMS_R' && series && (
                (() => {
                  // -100 to 0
                  const toWRY = (val: number) => oscPaneHeight - ((val + 100) / 100) * (oscPaneHeight - 16) - 8;
                  const pts: string[] = [];
                  for (let i = 0; i < visibleCandles.length; i++) {
                    const val = series[startIndex + i];
                    if (val != null) pts.push(`${i * barStep + barStep / 2},${toWRY(val)}`);
                  }
                  return (
                    <g>
                      <line x1="0" y1={toWRY(-20)} x2={plotWidth} y2={toWRY(-20)} stroke="#f43f5e" strokeDasharray="2 2" strokeWidth="0.8" />
                      <line x1="0" y1={toWRY(-80)} x2={plotWidth} y2={toWRY(-80)} stroke="#10b981" strokeDasharray="2 2" strokeWidth="0.8" />
                      {pts.length > 1 && <path d={`M ${pts.join(' L ')}`} fill="none" stroke="#eab308" strokeWidth="1.5" />}
                      <text x={containerWidth - 5} y="15" fill="#eab308" fontSize="8" textAnchor="end">
                        {series[hoveredOriginalIndex]?.toFixed(1) ?? 'N/A'}
                      </text>
                    </g>
                  );
                })()
              )}

              {ind.kind === 'ADX' && series && (
                (() => {
                  const { adx, plusDi, minusDi } = series;
                  const toAdxY = (val: number) => oscPaneHeight - (val / 100) * (oscPaneHeight - 16) - 8;
                  const adxPts: string[] = [];
                  const plusPts: string[] = [];
                  const minusPts: string[] = [];
                  for (let i = 0; i < visibleCandles.length; i++) {
                    const idx = startIndex + i;
                    const x = i * barStep + barStep / 2;
                    if (adx[idx] != null) adxPts.push(`${x},${toAdxY(adx[idx])}`);
                    if (plusDi[idx] != null) plusPts.push(`${x},${toAdxY(plusDi[idx])}`);
                    if (minusDi[idx] != null) minusPts.push(`${x},${toAdxY(minusDi[idx])}`);
                  }
                  return (
                    <g>
                      <line x1="0" y1={toAdxY(25)} x2={plotWidth} y2={toAdxY(25)} stroke="#71717a" strokeDasharray="2 2" strokeWidth="0.8" />
                      {adxPts.length > 1 && <path d={`M ${adxPts.join(' L ')}`} fill="none" stroke="#f59e0b" strokeWidth="1.5" />}
                      {plusPts.length > 1 && <path d={`M ${plusPts.join(' L ')}`} fill="none" stroke="#10b981" strokeWidth="1" />}
                      {minusPts.length > 1 && <path d={`M ${minusPts.join(' L ')}`} fill="none" stroke="#f43f5e" strokeWidth="1" />}
                      <text x={containerWidth - 5} y="15" fill="#f59e0b" fontSize="8" textAnchor="end">
                        {adx[hoveredOriginalIndex]?.toFixed(1) ?? 'N/A'}
                      </text>
                    </g>
                  );
                })()
              )}

              {ind.kind === 'OBV' && series && (
                (() => {
                  let minObv = Infinity;
                  let maxObv = -Infinity;
                  for (let i = startIndex; i < endIndex; i++) {
                    if (series[i] != null) {
                      if (series[i]! < minObv) minObv = series[i]!;
                      if (series[i]! > maxObv) maxObv = series[i]!;
                    }
                  }
                  const obvRange = Math.max(1, maxObv - minObv);
                  const toObvY = (val: number) => oscPaneHeight - ((val - minObv) / obvRange) * (oscPaneHeight - 20) - 10;
                  const pts: string[] = [];
                  for (let i = 0; i < visibleCandles.length; i++) {
                    const val = series[startIndex + i];
                    if (val != null) pts.push(`${i * barStep + barStep / 2},${toObvY(val)}`);
                  }
                  return (
                    <g>
                      {pts.length > 1 && <path d={`M ${pts.join(' L ')}`} fill="none" stroke="#3b82f6" strokeWidth="1.5" />}
                      <text x={containerWidth - 5} y="15" fill="#3b82f6" fontSize="8" textAnchor="end">
                        {series[hoveredOriginalIndex] != null ? `${(series[hoveredOriginalIndex]! / 1_000_000).toFixed(1)}M` : 'N/A'}
                      </text>
                    </g>
                  );
                })()
              )}
            </g>
          );
        })}

        {/* ----------------- Bottom Time Axis Labels ----------------- */}
        <g transform={`translate(0, ${height - 50 - timeAxisHeight})`}>
          <line x1="0" y1="0" x2={plotWidth} y2="0" stroke="#27272a" strokeWidth="1" />
          {visibleCandles.map((c, i) => {
            const step = Math.max(1, Math.floor(visibleCandles.length / 5));
            if (i % step !== 0 && i !== visibleCandles.length - 1) return null;
            const x = i * barStep + barStep / 2;
            const dateStr = c.time.length > 10 ? c.time.slice(5, 10) : c.time.slice(5);
            return (
              <text key={i} x={x} y="16" fill="#71717a" fontSize="9" textAnchor="middle" fontFamily="monospace">
                {dateStr}
              </text>
            );
          })}
        </g>
      </svg>

      {/* Footer Info / Interaction Guide */}
      <div className="flex items-center justify-between text-[10px] text-zinc-500 font-mono pt-1.5 border-t border-zinc-800/80">
        <span>Navigasi: Drag mouse untuk Pan, Scroll wheel untuk Zoom · Menampilkan {visibleCandles.length} bar</span>
        <span>Sumber: Feed Resmi SahamLens (Real Data, Zero Dummy)</span>
      </div>
    </div>
  );
};
