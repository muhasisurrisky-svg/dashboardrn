import React, { useEffect, useRef } from 'react';
import {
  BarController,
  BarElement,
  CategoryScale,
  Chart,
  Filler,
  Legend,
  LinearScale,
  LineController,
  LineElement,
  PointElement,
  Tooltip,
  type ChartConfiguration,
} from 'chart.js';

Chart.register(
  BarController,
  BarElement,
  LineController,
  LineElement,
  PointElement,
  CategoryScale,
  LinearScale,
  Tooltip,
  Legend,
  Filler
);

interface ChartCanvasProps {
  buildConfig: (ctx: CanvasRenderingContext2D, isDark: boolean) => ChartConfiguration<any, any, any>;
  deps: unknown[];
  isDark: boolean;
  heightClass?: string;
  ariaLabel?: string;
}

export function ChartCanvas({
  buildConfig,
  deps,
  isDark,
  heightClass = 'h-64',
  ariaLabel,
}: ChartCanvasProps) {
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const chartRef = useRef<Chart | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    if (chartRef.current) {
      chartRef.current.destroy();
      chartRef.current = null;
    }

    const cfg = buildConfig(ctx, isDark);
    const prefersReduced =
      typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (!prefersReduced) {
      cfg.options = {
        ...cfg.options,
        animation:
          cfg.options?.animation === false
            ? false
            : {
                duration: 680,
                easing: 'easeOutQuart',
                ...(typeof cfg.options?.animation === 'object' ? cfg.options.animation : {}),
              },
      };
    }
    chartRef.current = new Chart(ctx, cfg);

    return () => {
      if (chartRef.current) {
        chartRef.current.destroy();
        chartRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isDark, ...deps]);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    let rafId = 0;
    let lastW = Math.round(el.clientWidth);
    let lastH = Math.round(el.clientHeight);
    const ro = new ResizeObserver((entries) => {
      const entry = entries[0];
      const w = entry ? Math.round(entry.contentRect.width) : Math.round(el.clientWidth);
      const h = entry ? Math.round(entry.contentRect.height) : Math.round(el.clientHeight);
      if (w === lastW && h === lastH) return;
      lastW = w;
      lastH = h;
      if (rafId) cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(() => {
        rafId = 0;
        if (w > 0 && h > 0) {
          chartRef.current?.resize();
        }
      });
    });
    ro.observe(el);
    return () => {
      if (rafId) cancelAnimationFrame(rafId);
      ro.disconnect();
    };
  }, []);

  return (
    <div ref={wrapRef} className={`relative w-full min-h-0 ${heightClass}`}>
      <div className="absolute inset-0">
        <canvas ref={canvasRef} aria-label={ariaLabel} />
      </div>
    </div>
  );
}
