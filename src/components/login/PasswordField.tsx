'use client';

import { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';

type Props = {
  hasError?: boolean;
};

export function PasswordField({ hasError = false }: Props) {
  const [visible, setVisible] = useState(false);

  const inputClass = `h-12 w-full rounded-xl border bg-white px-4 pr-12 text-base outline-none transition focus:ring-4 ${
    hasError
      ? 'border-red-300 focus:border-red-400 focus:ring-red-100'
      : 'border-border focus:border-accent focus:ring-amber-100'
  }`;

  return (
    <div className="space-y-2">
      <label htmlFor="password" className="block text-sm font-semibold text-foreground">
        Password
      </label>
      <div className="relative">
        <input
          id="password"
          required
          name="password"
          type={visible ? 'text' : 'password'}
          autoComplete="current-password"
          aria-invalid={hasError || undefined}
          aria-describedby={hasError ? 'login-error' : undefined}
          className={inputClass}
        />
        <button
          type="button"
          onClick={() => setVisible((show) => !show)}
          className="absolute inset-y-0 right-0 z-10 flex w-12 items-center justify-center rounded-r-xl text-muted hover:text-foreground focus:outline-none focus-visible:ring-4 focus-visible:ring-amber-100"
          aria-label={visible ? 'Hide password' : 'Show password'}
          aria-pressed={visible}
        >
          {visible ? <EyeOff size={18} aria-hidden="true" /> : <Eye size={18} aria-hidden="true" />}
        </button>
      </div>
    </div>
  );
}
