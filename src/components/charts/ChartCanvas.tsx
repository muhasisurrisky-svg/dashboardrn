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
    chartRef.current = new Chart(ctx, cfg);

    return () => {
      if (chartRef.current) {
        chartRef.current.destroy();
        chartRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isDark, ...deps]);

  return (
    <div className={`relative w-full ${heightClass}`}>
      <canvas ref={canvasRef} aria-label={ariaLabel} />
    </div>
  );
}
