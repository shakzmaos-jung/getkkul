import type { InputHTMLAttributes } from 'react';

export function Input({ className = '', ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      // text-base(16px) on mobile prevents iOS Safari focus zoom; sm+ keeps 14px(compact).
      className={`h-9 w-full rounded-lg border border-border bg-background px-3 text-base outline-none transition-colors placeholder:text-muted-foreground focus:border-foreground/25 focus:ring-2 focus:ring-accent/20 sm:text-sm ${className}`}
      {...props}
    />
  );
}
