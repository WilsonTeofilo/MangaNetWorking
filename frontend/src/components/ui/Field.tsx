import { InputHTMLAttributes, ReactNode } from 'react';
import { AlertCircle } from 'lucide-react';

export interface FieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
  helperText?: string;
  childrenRight?: ReactNode;
}

export function Field({
  label,
  error,
  helperText,
  childrenRight,
  className = '',
  id,
  ...props
}: FieldProps) {
  const inputId = id || `field-${label.toLowerCase().replace(/\s+/g, '-')}`;

  return (
    <div className="flex flex-col gap-1.5 w-full">
      <label
        htmlFor={inputId}
        className="font-body text-sm font-semibold text-[#F4EFE3] flex items-center justify-between"
      >
        <span>{label}</span>
      </label>

      <div className="relative flex items-center">
        <input
          id={inputId}
          className={`w-full min-h-[44px] px-3.5 py-2 bg-[#151517] text-[#F4EFE3] font-body text-sm border-2 ${
            error
              ? 'border-[#E8402F] focus:border-[#E8402F]'
              : 'border-[#34343A] focus:border-[#F4EFE3] focus:shadow-[3px_3px_0_#FFD400]'
          } transition-all outline-none disabled:opacity-50 ${className}`}
          {...props}
        />
        {childrenRight && (
          <div className="absolute right-3 flex items-center">{childrenRight}</div>
        )}
      </div>

      {error ? (
        <span className="font-body text-xs text-[#E8402F] flex items-center gap-1 mt-0.5">
          <AlertCircle size={13} />
          {error}
        </span>
      ) : helperText ? (
        <span className="font-body text-xs text-[#A9A59A] mt-0.5">
          {helperText}
        </span>
      ) : null}
    </div>
  );
}
