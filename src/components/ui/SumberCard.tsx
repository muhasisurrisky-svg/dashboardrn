import React from 'react';
import { ExternalLink, FileSpreadsheet } from 'lucide-react';
import type { SheetSourceLink } from '../../types/dashboard';

interface SumberCardProps {
  links: SheetSourceLink[];
}

export const SumberCard: React.FC<SumberCardProps> = ({ links }) => {
  if (!links.length) return null;

  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-4 py-3 flex flex-wrap items-center justify-between gap-3">
      <div className="flex items-center gap-2 text-xs font-medium text-slate-600 dark:text-slate-300">
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
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-2.5 py-1 text-xs font-medium text-slate-700 dark:text-slate-200 hover:border-blue-400 hover:text-blue-600 dark:hover:text-blue-400 transition"
          >
            <span>{l.nama}</span>
            <ExternalLink className="w-3 h-3 opacity-70" />
          </a>
        ))}
      </div>
    </div>
  );
};
