import React, { useEffect, useRef, useState } from 'react';

export interface ChartSeries {
  key: string;
  label: string;
  color: string;
  unit: string;
  data: number[];
  secondaryAxis?: boolean;
}

interface TelemetryChartProps {
  title: string;
  subtitle?: string;
  timestamps: string[];
  series: ChartSeries[];
  height?: number;
  timeWindow?: number; // max number of points to show
}

export const TelemetryChart: React.FC<TelemetryChartProps> = ({
  title,
  subtitle,
  timestamps,
  series,
  height = 190,
  timeWindow = 60,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  // Render canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    const w = rect.width;
    const h = rect.height;
    const padTop = 20;
    const padBottom = 26;
    const padLeft = 46;
    const padRight = series.some((s) => s.secondaryAxis) ? 46 : 14;

    const plotW = Math.max(10, w - padLeft - padRight);
    const plotH = Math.max(10, h - padTop - padBottom);

    // Clear background
    ctx.fillStyle = '#090d16';
    ctx.fillRect(0, 0, w, h);

    // Filter points to timeWindow
    const totalPoints = timestamps.length;
    const startIndex = Math.max(0, totalPoints - timeWindow);
    const visibleTimestamps = timestamps.slice(startIndex);

    if (visibleTimestamps.length < 2) {
      // Waiting for data state
      ctx.fillStyle = '#475569';
      ctx.font = '12px "IBM Plex Mono", monospace';
      ctx.textAlign = 'center';
      ctx.fillText('Awaiting telemetry stream...', w / 2, h / 2);
      return;
    }

    // Separate primary vs secondary series
    const primarySeries = series.filter((s) => !s.secondaryAxis);
    const secondarySeries = series.filter((s) => s.secondaryAxis);

    // Compute min/max bounds
    let pMin = Infinity;
    let pMax = -Infinity;
    primarySeries.forEach((s) => {
      const sliced = s.data.slice(startIndex);
      sliced.forEach((v) => {
        if (!isNaN(v)) {
          if (v < pMin) pMin = v;
          if (v > pMax) pMax = v;
        }
      });
    });

    if (pMin === Infinity) pMin = 0;
    if (pMax === -Infinity) pMax = 100;
    if (pMin === pMax) {
      pMin -= 1;
      pMax += 1;
    }
    const pRange = pMax - pMin;
    pMin -= pRange * 0.08;
    pMax += pRange * 0.08;

    let sMin = Infinity;
    let sMax = -Infinity;
    if (secondarySeries.length > 0) {
      secondarySeries.forEach((s) => {
        const sliced = s.data.slice(startIndex);
        sliced.forEach((v) => {
          if (!isNaN(v)) {
            if (v < sMin) sMin = v;
            if (v > sMax) sMax = v;
          }
        });
      });
      if (sMin === Infinity) sMin = 0;
      if (sMax === -Infinity) sMax = 100;
      if (sMin === sMax) {
        sMin -= 1;
        sMax += 1;
      }
      const sRange = sMax - sMin;
      sMin -= sRange * 0.08;
      sMax += sRange * 0.08;
    }

    // Draw horizontal grid lines
    const gridLines = 4;
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 1;
    ctx.font = '10px "IBM Plex Mono", monospace';

    for (let i = 0; i <= gridLines; i++) {
      const y = padTop + (plotH / gridLines) * i;
      ctx.beginPath();
      ctx.moveTo(padLeft, y);
      ctx.lineTo(w - padRight, y);
      ctx.stroke();

      // Primary Y axis label
      const pVal = pMax - (i / gridLines) * (pMax - pMin);
      ctx.fillStyle = '#64748b';
      ctx.textAlign = 'right';
      ctx.fillText(pVal.toFixed(pVal > 100 ? 0 : 1), padLeft - 6, y + 3);

      // Secondary Y axis label if exists
      if (secondarySeries.length > 0) {
        const sVal = sMax - (i / gridLines) * (sMax - sMin);
        ctx.fillStyle = secondarySeries[0]?.color || '#94a3b8';
        ctx.textAlign = 'left';
        ctx.fillText(sVal.toFixed(sVal > 100 ? 0 : 1), w - padRight + 6, y + 3);
      }
    }

    // Draw time ticks on bottom
    const xStep = plotW / (visibleTimestamps.length - 1);
    const tickInterval = Math.max(1, Math.floor(visibleTimestamps.length / 5));
    ctx.textAlign = 'center';
    ctx.fillStyle = '#475569';

    for (let i = 0; i < visibleTimestamps.length; i += tickInterval) {
      const x = padLeft + i * xStep;
      ctx.fillText(visibleTimestamps[i], x, h - 8);
    }

    // Function to get coords
    const getPointX = (index: number) => padLeft + index * xStep;
    const getPointY = (val: number, isSecondary?: boolean) => {
      const min = isSecondary ? sMin : pMin;
      const max = isSecondary ? sMax : pMax;
      const pct = (val - min) / (max - min);
      return padTop + plotH - pct * plotH;
    };

    // Draw each series
    series.forEach((s) => {
      const sliced = s.data.slice(startIndex);
      if (sliced.length < 2) return;

      // Draw subtle gradient fill under primary first series
      if (!s.secondaryAxis && s === primarySeries[0]) {
        const grad = ctx.createLinearGradient(0, padTop, 0, padTop + plotH);
        grad.addColorStop(0, `${s.color}33`);
        grad.addColorStop(1, `${s.color}00`);

        ctx.beginPath();
        ctx.moveTo(getPointX(0), getPointY(sliced[0]));
        for (let i = 1; i < sliced.length; i++) {
          ctx.lineTo(getPointX(i), getPointY(sliced[i]));
        }
        ctx.lineTo(getPointX(sliced.length - 1), padTop + plotH);
        ctx.lineTo(getPointX(0), padTop + plotH);
        ctx.closePath();
        ctx.fillStyle = grad;
        ctx.fill();
      }

      // Draw stroke
      ctx.beginPath();
      ctx.strokeStyle = s.color;
      ctx.lineWidth = 1.75;
      ctx.lineJoin = 'round';
      ctx.moveTo(getPointX(0), getPointY(sliced[0], s.secondaryAxis));

      for (let i = 1; i < sliced.length; i++) {
        const x = getPointX(i);
        const y = getPointY(sliced[i], s.secondaryAxis);
        ctx.lineTo(x, y);
      }
      ctx.stroke();

      // Draw point on newest value
      const lastX = getPointX(sliced.length - 1);
      const lastY = getPointY(sliced[sliced.length - 1], s.secondaryAxis);
      ctx.beginPath();
      ctx.arc(lastX, lastY, 3.5, 0, Math.PI * 2);
      ctx.fillStyle = s.color;
      ctx.fill();
    });

    // Draw hover crosshair if user is hovering
    if (hoverIndex !== null && hoverIndex >= 0 && hoverIndex < visibleTimestamps.length) {
      const hx = getPointX(hoverIndex);
      ctx.beginPath();
      ctx.strokeStyle = '#94a3b8';
      ctx.setLineDash([3, 3]);
      ctx.moveTo(hx, padTop);
      ctx.lineTo(hx, padTop + plotH);
      ctx.stroke();
      ctx.setLineDash([]);

      // Point dots on hover line
      series.forEach((s) => {
        const sliced = s.data.slice(startIndex);
        if (hoverIndex < sliced.length) {
          const hy = getPointY(sliced[hoverIndex], s.secondaryAxis);
          ctx.beginPath();
          ctx.arc(hx, hy, 4, 0, Math.PI * 2);
          ctx.fillStyle = '#ffffff';
          ctx.strokeStyle = s.color;
          ctx.lineWidth = 2;
          ctx.fill();
          ctx.stroke();
        }
      });
    }
  }, [timestamps, series, timeWindow, hoverIndex]);

  // Handle mouse move for crosshair
  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const padLeft = 46;
    const padRight = series.some((s) => s.secondaryAxis) ? 46 : 14;
    const plotW = rect.width - padLeft - padRight;
    
    const totalPoints = timestamps.length;
    const visibleCount = Math.min(totalPoints, timeWindow);
    if (visibleCount < 2) return;

    const relX = x - padLeft;
    if (relX < 0 || relX > plotW) {
      setHoverIndex(null);
      return;
    }
    const idx = Math.round((relX / plotW) * (visibleCount - 1));
    setHoverIndex(idx);
  };

  const handleMouseLeave = () => {
    setHoverIndex(null);
  };

  // Get active hover or latest values
  const total = timestamps.length;
  const startIndex = Math.max(0, total - timeWindow);
  const activeIdx = hoverIndex !== null ? startIndex + hoverIndex : total - 1;
  const activeTime = timestamps[activeIdx] || '--:--:--';

  return (
    <div
      ref={containerRef}
      className="bg-slate-950/80 border border-slate-800 rounded-lg p-3 flex flex-col relative"
      style={{ minHeight: height }}
    >
      <div className="flex items-center justify-between pb-2 mb-1 border-b border-slate-900">
        <div className="flex items-baseline gap-2">
          <h4 className="text-xs font-semibold text-slate-200 tracking-wide font-mono uppercase">
            {title}
          </h4>
          {subtitle && (
            <span className="text-[10px] text-slate-500 font-mono">{subtitle}</span>
          )}
        </div>

        {/* Legend with active live or inspected values */}
        <div className="flex items-center gap-3 text-xs font-mono">
          <span className="text-[10px] text-slate-500">{activeTime}</span>
          {series.map((s) => {
            const val = s.data[activeIdx];
            return (
              <div key={s.key} className="flex items-center gap-1.5">
                <span
                  className="w-2 h-2 rounded-xs inline-block"
                  style={{ backgroundColor: s.color }}
                />
                <span className="text-slate-400 text-[11px]">{s.label}:</span>
                <span className="text-slate-100 font-semibold tabular-nums text-[11px]">
                  {typeof val === 'number' ? val.toFixed(1) : '--'}{s.unit}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      <div className="relative flex-1 w-full" style={{ minHeight: height - 48 }}>
        <canvas
          ref={canvasRef}
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
          className="w-full h-full cursor-crosshair block rounded"
        />
      </div>
    </div>
  );
};
