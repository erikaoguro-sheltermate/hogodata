// JASA Data Hub — 共通UIプリミティブ（Tailwind）
// shadcn/ui 相当を最小実装。サーバー/クライアント両方から使える純粋な見た目部品。
import * as React from 'react';
import { cn } from '@/lib/utils';

// ---- Card ----
export function Card({ className, children }: { className?: string; children: React.ReactNode }) {
  return <div className={cn('rounded-2xl border border-slate-200 bg-white shadow-sm', className)}>{children}</div>;
}
export function CardBody({ className, children }: { className?: string; children: React.ReactNode }) {
  return <div className={cn('p-5', className)}>{children}</div>;
}

// ---- Button ----
type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';
type Size = 'sm' | 'md';
const VARIANTS: Record<Variant, string> = {
  primary: 'bg-emerald-600 text-white hover:bg-emerald-700 border-transparent',
  secondary: 'bg-white text-slate-700 hover:bg-slate-50 border-slate-300',
  ghost: 'bg-transparent text-slate-600 hover:bg-slate-100 border-transparent',
  danger: 'bg-white text-red-600 hover:bg-red-50 border-red-300',
};
const SIZES: Record<Size, string> = { sm: 'px-3 py-1.5 text-sm', md: 'px-4 py-2 text-sm' };

export function buttonClass(variant: Variant = 'primary', size: Size = 'md', className?: string) {
  return cn(
    'inline-flex items-center justify-center gap-2 rounded-full border font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed',
    VARIANTS[variant], SIZES[size], className,
  );
}

export const Button = React.forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: Size }
>(function Button({ variant = 'primary', size = 'md', className, ...props }, ref) {
  return <button ref={ref} className={buttonClass(variant, size, className)} {...props} />;
});

// ---- Badge ----
export function Badge({ color = 'slate', children }: { color?: 'slate' | 'green' | 'amber' | 'blue' | 'red'; children: React.ReactNode }) {
  const colors: Record<string, string> = {
    slate: 'bg-slate-100 text-slate-700',
    green: 'bg-emerald-100 text-emerald-700',
    amber: 'bg-amber-100 text-amber-800',
    blue: 'bg-sky-100 text-sky-700',
    red: 'bg-red-100 text-red-700',
  };
  return <span className={cn('inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium', colors[color])}>{children}</span>;
}

// ---- Form ----
export function Field({ label, hint, children, required }: { label: string; hint?: string; required?: boolean; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium text-slate-700">
        {label} {required && <span className="text-red-500">*</span>}
      </span>
      {children}
      {hint && <span className="mt-1 block text-xs text-slate-400">{hint}</span>}
    </label>
  );
}

const inputBase = 'w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100';

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  function Input({ className, ...props }, ref) {
    return <input ref={ref} className={cn(inputBase, className)} {...props} />;
  },
);

export const Select = React.forwardRef<HTMLSelectElement, React.SelectHTMLAttributes<HTMLSelectElement>>(
  function Select({ className, children, ...props }, ref) {
    return <select ref={ref} className={cn(inputBase, 'appearance-none pr-8', className)} {...props}>{children}</select>;
  },
);

// ---- Section heading ----
export function SectionTitle({ children, subtitle }: { children: React.ReactNode; subtitle?: string }) {
  return (
    <div className="mb-4">
      <h2 className="text-lg font-bold text-slate-800">{children}</h2>
      {subtitle && <p className="mt-0.5 text-sm text-slate-500">{subtitle}</p>}
    </div>
  );
}

// ---- StatCard ----
export function StatCard({ label, value, sub, accent }: { label: string; value: React.ReactNode; sub?: string; accent?: 'emerald' | 'sky' | 'amber' | 'slate' }) {
  const ring: Record<string, string> = {
    emerald: 'text-emerald-600', sky: 'text-sky-600', amber: 'text-amber-600', slate: 'text-slate-800',
  };
  return (
    <Card>
      <CardBody>
        <div className="text-sm text-slate-500">{label}</div>
        <div className={cn('mt-1 text-2xl font-bold tabular-nums', ring[accent ?? 'slate'])}>{value}</div>
        {sub && <div className="mt-0.5 text-xs text-slate-400">{sub}</div>}
      </CardBody>
    </Card>
  );
}
