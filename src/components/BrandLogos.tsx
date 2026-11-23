import React from 'react';

interface DanantaraLogoProps {
  compact?: boolean;
}

export const DanantaraLogo: React.FC<DanantaraLogoProps> = ({ compact }) => {
  const heightCls = compact ? 'h-7 sm:h-8' : 'h-9 sm:h-10';
  return (
    <div className="flex items-center shrink-0">
      <img
        src="/logos/dn-lt.png"
        alt="Danantara Indonesia"
        className={`${heightCls} w-auto object-contain dark:hidden`}
      />
      <img
        src="/logos/dn-dk.png"
        alt="Danantara Indonesia"
        className={`hidden dark:block ${heightCls} w-auto object-contain`}
      />
    </div>
  );
};

interface KaiRightLogosProps {
  compact?: boolean;
}

export const KaiRightLogos: React.FC<KaiRightLogosProps> = ({ compact }) => {
  const smCls = compact ? 'h-6 sm:h-7' : 'h-7 sm:h-8';
  const kaiCls = compact ? 'h-5 sm:h-6' : 'h-6 sm:h-7';
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
