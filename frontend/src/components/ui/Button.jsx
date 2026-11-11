import React from 'react';

const VARIANTS = {
  primary:
    'bg-neo-vermilion hover:bg-neo-vermilion-hover text-white border-[#991B1B] shadow-[0_2px_0_#991B1B] active:translate-y-[1px] active:shadow-none',
  secondary:
    'bg-neo-cobalt hover:bg-neo-cobalt-hover text-white border-[#1E3A8A] shadow-[0_2px_0_#1E3A8A] active:translate-y-[1px] active:shadow-none',
  outline:
    'bg-neo-surface hover:bg-neo-muted text-neo-ink border-neo-border hover:border-neo-cobalt shadow-tactile-sm active:translate-y-[1px] active:shadow-none',
  subtle:
    'bg-neo-alt hover:bg-[#D7DCE5] dark:hover:bg-[#30363D] text-neo-ink border-neo-border active:translate-y-[1px]',
  danger:
    'bg-[#DC2626] hover:bg-[#B91C1C] text-white border-[#991B1B] shadow-[0_2px_0_#991B1B] active:translate-y-[1px] active:shadow-none',
  'danger-outline':
    'bg-[#FEF2F2] hover:bg-[#FEE2E2] text-[#B91C1C] border-[#FCA5A5] dark:bg-[#450A0A] dark:hover:bg-[#7F1D1D]/70 dark:text-[#FCA5A5] dark:border-[#991B1B] active:translate-y-[1px]',
  ghost:
    'bg-transparent hover:bg-neo-alt text-neo-ink-2 hover:text-neo-ink border-transparent',
};

const SIZES = {
  xs: 'h-8 px-2.5 text-xs gap-1.5',
  sm: 'h-9 px-3 text-xs gap-1.5',
  md: 'h-10 px-4 text-sm gap-2',
  lg: 'h-11 px-5 text-sm gap-2',
  icon: 'h-10 w-10 p-0 justify-center',
};

export default function Button({
  variant = 'outline',
  size = 'md',
  type = 'button',
  className = '',
  children,
  ...props
}) {
  const variantCls = VARIANTS[variant] || VARIANTS.outline;
  const sizeCls = SIZES[size] || SIZES.md;

  return (
    <button
      type={type}
      className={`inline-flex items-center justify-center font-semibold rounded-[6px] border-[1.5px] transition-colors duration-150 select-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed disabled:active:translate-y-0 ${variantCls} ${sizeCls} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}

