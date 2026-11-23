import React from 'react';
import { ExternalLink, FileSpreadsheet } from 'lucide-react';
import type { SheetSourceLink } from '../../types/dashboard';
import { MotionCard } from './MotionPrimitives';

interface SumberCardProps {
  links: SheetSourceLink[];
}

export const SumberCard: React.FC<SumberCardProps> = ({ links }) => {
  if (!links.length) return null;

  return (
    <MotionCard className="rounded-xl border border-[#E5DFD0] dark:border-[#1D2D32] bg-white dark:bg-[#0D1619] px-4 py-3 flex flex-wrap items-center justify-between gap-3">
      <div className="flex items-center gap-2 text-xs font-bold text-slate-700 dark:text-[#D5CFC2]">
        <FileSpreadsheet className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
        <span>Sumber data halaman ini:</span>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {links.map((l) => (
          <a
            key={`${l.nama}-${l.url}`}
            href={l.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 rounded-lg border border-[#DCD4C0] dark:border-[#23353B] bg-[#FAF8F2] dark:bg-[#111D21] px-2.5 py-1 text-xs font-semibold text-slate-800 dark:text-[#E5DFD0] hover:border-[#C69320] hover:text-[#8E6510] dark:hover:border-[#D4AF37] dark:hover:text-[#E6C45A] transition"
          >
            <span>{l.nama}</span>
            <ExternalLink className="w-3 h-3 opacity-70" />
          </a>
        ))}
      </div>
    </MotionCard>
  );
};
