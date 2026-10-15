import { ButtonHTMLAttributes } from 'react';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'creator' | 'outline' | 'danger';
  size?: 'sm' | 'md' | 'lg';
}

export function Button({
  children,
  variant = 'primary',
  size = 'md',
  className = '',
  disabled,
  ...props
}: ButtonProps) {
  const sizeClasses = {
    sm: 'px-3 py-1 text-xs font-semibold',
    md: 'px-4 py-2 text-sm font-bold',
    lg: 'px-6 py-3 text-base font-bold'
  };

  const variantClasses = {
    primary: 'bg-[#EFC33C] text-[#0E0D0C] hover:bg-[#F5CD4E] border-[#38251F]',
    secondary: 'bg-[#221F1D] text-[#F5EFEB] hover:bg-[#2C2825] border-[#38251F]',
    creator: 'bg-[#54245F] text-[#F5EFEB] hover:bg-[#682E76] border-[#38251F]',
    outline: 'bg-transparent text-[#F5EFEB] hover:bg-[#1E1B19] border-[#38251F]',
    danger: 'bg-[#D33F3F] text-white hover:bg-[#E04D4D] border-[#38251F]'
  };

  return (
    <button
      className={`btn-tactile inline-flex items-center justify-center gap-2 uppercase tracking-wider transition-all disabled:opacity-50 disabled:cursor-not-allowed ${sizeClasses[size]} ${variantClasses[variant]} ${className}`}
      disabled={disabled}
      {...props}
    >
      {children}
    </button>
  );
}
