import React from 'react';

interface LogoProps {
  compact?: boolean;
  forceVariant?: 'auto' | 'dark' | 'light';
}

export const DanantaraLogo: React.FC<LogoProps> = ({ compact, forceVariant = 'auto' }) => {
  const heightCls = compact ? 'h-7 sm:h-8' : 'h-9 sm:h-11';

  if (forceVariant === 'dark') {
    return (
      <div className="flex items-center shrink-0">
        <img
          src="/logos/dn-dk.png"
          alt="Danantara Indonesia"
          className={`${heightCls} w-auto object-contain`}
        />
      </div>
    );
  }

  if (forceVariant === 'light') {
    return (
      <div className="flex items-center shrink-0">
        <img
          src="/logos/dn-lt.png"
          alt="Danantara Indonesia"
          className={`${heightCls} w-auto object-contain`}
        />
      </div>
    );
  }

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

export const KaiRightLogos: React.FC<LogoProps> = ({ compact, forceVariant = 'auto' }) => {
  const smCls = compact ? 'h-6 sm:h-7' : 'h-7 sm:h-8';
  const kaiCls = compact ? 'h-5 sm:h-6' : 'h-6 sm:h-7';

  if (forceVariant === 'dark') {
    return (
      <div className="flex items-center gap-2.5 shrink-0">
        <img src="/logos/sm-dk.png" alt="Semakin Melayani" className={`${smCls} w-auto object-contain`} />
        <span className="h-5 w-px bg-white/25" aria-hidden="true" />
        <img src="/logos/kai-dk.png" alt="KAI" className={`${kaiCls} w-auto object-contain`} />
      </div>
    );
  }

  if (forceVariant === 'light') {
    return (
      <div className="flex items-center gap-2.5 shrink-0">
        <img src="/logos/sm-lt.png" alt="Semakin Melayani" className={`${smCls} w-auto object-contain`} />
        <span className="h-5 w-px bg-slate-300" aria-hidden="true" />
        <img src="/logos/kai-lt.png" alt="KAI" className={`${kaiCls} w-auto object-contain`} />
      </div>
    );
  }

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
      <span className="h-5 w-px bg-slate-300 dark:bg-[#2A3B40]" aria-hidden="true" />
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
