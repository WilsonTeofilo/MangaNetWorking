import React from 'react';

interface StatCardProps {
  icon: React.ReactNode;
  label: string;
  value: string;
  hint?: string;
  delta?: { text: string; tone: 'up' | 'down' | 'flat' } | null;
  badge?: string;
}

export function StatCard({
  icon,
  label,
  value,
  hint,
  delta,
  badge,
}: StatCardProps) {
  return (
    <div className="min-w-0 border-2 border-[var(--mn-line)] bg-[var(--mn-ink-2)] p-3 sm:p-4">
      <p className="flex items-center gap-1.5 font-pixel text-[10px] uppercase text-[var(--mn-mute)]">
        {icon} <span className="min-w-0 break-words">{label}</span>
      </p>
      <p className="mt-2 break-words font-display text-xl sm:text-2xl text-[var(--mn-paper)] tabular-nums">
        {value}
      </p>
      {badge && (
        <span className="mt-1 inline-block border border-[var(--mn-yellow)] px-1.5 font-pixel text-[8px] uppercase text-[var(--mn-yellow)]">
          {badge}
        </span>
      )}
      {delta && (
        <p
          className={`mt-1 font-body text-[10px] ${
            delta.tone === 'up'
              ? 'text-[var(--mn-ok)]'
              : delta.tone === 'down'
                ? 'text-[var(--mn-red)]'
                : 'text-[var(--mn-mute)]'
          }`}
        >
          {delta.text}
        </p>
      )}
      {hint && <p className="mt-1 font-body text-[10px] leading-snug text-[var(--mn-mute)]">{hint}</p>}
    </div>
  );
}

export function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="font-pixel text-[10px] uppercase text-[var(--mn-mute)]">{label}</p>
      <p className="font-display text-xl text-[var(--mn-paper)] tabular-nums">{value}</p>
    </div>
  );
}

export function FinanceRow({
  label,
  value,
  highlight = false,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div
      className={`flex justify-between gap-3 border-b py-1 ${
        highlight ? 'border-[var(--mn-yellow)]' : 'border-[var(--mn-line)]'
      }`}
    >
      <dt className="text-[var(--mn-mute)]">{label}</dt>
      <dd
        className={`tabular-nums ${
          highlight ? 'text-[var(--mn-yellow)]' : 'text-[var(--mn-paper)]'
        }`}
      >
        {value}
      </dd>
    </div>
  );
}
