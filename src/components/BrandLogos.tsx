import React from 'react';

interface DanantaraLogoProps {
  compact?: boolean;
}

export const DanantaraLogo: React.FC<DanantaraLogoProps> = ({ compact }) => {
  const heightCls = compact ? 'h-7' : 'h-8 sm:h-9';
  return (
    <div className="flex items-center shrink-0">
      <img
        src="/logos/dn-lt.png"
        alt="Danantara Indonesia"
        className={`${heightCls} w-auto object-contain dark:hidden`}
      />
      {/* Crisp vector version for dark mode without white background plate */}
      <svg
        viewBox="0 0 210 56"
        className={`hidden dark:block ${heightCls} w-auto`}
        aria-label="Danantara Indonesia"
      >
        <g transform="translate(4,6)">
          <path d="M2 8C14 0 28 2 38 9C27 7 15 9 4 17Z" fill="#EF4444" />
          <path d="M5 20C16 13 29 14 38 20C28 19 16 21 7 29Z" fill="#F8FAFC" />
          <path d="M10 31C19 25 30 25 38 30C29 30 20 32 13 38Z" fill="#EF4444" />
        </g>
        <text
          x="52"
          y="25"
          fill="#F8FAFC"
          fontSize="16"
          fontWeight="700"
          fontFamily="Plus Jakarta Sans, sans-serif"
          letterSpacing="-0.02em"
        >
          Danantara
        </text>
        <text
          x="52"
          y="42"
          fill="#CBD5E1"
          fontSize="13.5"
          fontWeight="600"
          fontFamily="Plus Jakarta Sans, sans-serif"
        >
          Indonesia
        </text>
      </svg>
    </div>
  );
};

interface KaiRightLogosProps {
  compact?: boolean;
}

export const KaiRightLogos: React.FC<KaiRightLogosProps> = ({ compact }) => {
  const smCls = compact ? 'h-6' : 'h-7 sm:h-8';
  const kaiCls = compact ? 'h-5' : 'h-6 sm:h-7';
  return (
    <div className="flex items-center gap-2.5 shrink-0">
      <img
        src="/logos/sm-lt.png"
        alt="Semakin Melayani"
        className={`${smCls} w-auto object-contain dark:hidden`}
      />
      <img
        src="/logos/sm-dk.png"
        alt="Semakin Melayani"
        className={`hidden dark:block ${smCls} w-auto object-contain`}
      />
      <span className="h-5 w-px bg-slate-300 dark:bg-slate-700" aria-hidden="true" />
      <img
        src="/logos/kai-lt.png"
        alt="KAI"
        className={`${kaiCls} w-auto object-contain dark:hidden`}
      />
      <img
        src="/logos/kai-dk.png"
        alt="KAI"
        className={`hidden dark:block ${kaiCls} w-auto object-contain`}
      />
    </div>
  );
};
