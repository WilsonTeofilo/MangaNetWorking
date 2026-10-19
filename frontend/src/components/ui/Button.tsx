import { ReactNode, ButtonHTMLAttributes } from 'react';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  children: ReactNode;
  className?: string;
}

export function Button({
  variant = 'primary',
  children,
  className = '',
  disabled,
  ...props
}: ButtonProps) {
  const baseStyles =
    'inline-flex items-center justify-center font-display text-base uppercase tracking-wider px-5 py-2.5 min-h-[44px] cursor-pointer select-none border-2 transition-all duration-100 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none disabled:shadow-none';

  let variantStyles = '';

  switch (variant) {
    case 'primary':
      variantStyles =
        'bg-[var(--mn-yellow)] text-[var(--mn-ink)] border-[var(--mn-ink)] shadow-[4px_4px_0_var(--mn-ink)] hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[6px_6px_0_var(--mn-ink)] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none';
      break;
    case 'secondary':
      variantStyles =
        'bg-transparent text-[var(--mn-paper)] border-[var(--mn-paper)] shadow-[4px_4px_0_var(--mn-paper)] hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[6px_6px_0_var(--mn-paper)] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none hover:bg-[rgba(244,239,227,0.08)]';
      break;
    case 'danger':
      variantStyles =
        'bg-[var(--mn-red)] text-[var(--mn-paper)] border-[var(--mn-ink)] shadow-[4px_4px_0_var(--mn-ink)] hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[6px_6px_0_var(--mn-ink)] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none';
      break;
    case 'ghost':
      variantStyles =
        'bg-transparent text-[var(--mn-paper)] border-transparent hover:underline hover:text-[var(--mn-yellow)] shadow-none min-h-[36px] px-3 py-1';
      break;
  }

  return (
    <button
      className={`${baseStyles} ${variantStyles} ${className}`}
      disabled={disabled}
      {...props}
    >
      {children}
    </button>
  );
}
