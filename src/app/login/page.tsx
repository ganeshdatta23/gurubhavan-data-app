import { AlertCircle, LockKeyhole } from 'lucide-react';
import { PasswordField } from '@/components/login/PasswordField';

export const dynamic = 'force-dynamic';

type Props = {
  searchParams: Promise<{ error?: string }>;
};

export default async function LoginPage({ searchParams }: Props) {
  const params = await searchParams;
  const error = typeof params.error === 'string' ? params.error : '';

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-bg px-4 py-10">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(251,191,36,0.14),_transparent_55%),radial-gradient(ellipse_at_bottom,_rgba(120,113,108,0.08),_transparent_50%)]"
      />
      <div className="relative w-full max-w-[420px]">
        <section className="w-full overflow-hidden rounded-2xl border border-border/80 bg-white shadow-[0_20px_50px_rgba(45,35,20,0.10)]">
          <div className="relative bg-gradient-to-br from-amber-50 via-orange-50 to-stone-50 px-6 pb-6 pt-7 sm:px-8 sm:pt-8">
            <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-amber-400 via-orange-400 to-amber-500" />
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-accent shadow-sm ring-1 ring-amber-100">
              <LockKeyhole size={22} aria-hidden="true" />
            </div>
            <p className="mt-5 text-xs font-semibold uppercase tracking-[0.18em] text-accent">Guru Bhavan</p>
            <h1 className="mt-1.5 text-2xl font-bold tracking-tight text-foreground">Staff sign in</h1>
          </div>

          {/* Native form POST — works without client JS hydration */}
          <form action="/api/auth/login-form" method="post" className="space-y-5 px-6 py-6 sm:px-8 sm:pb-8">
            <div className="space-y-2">
              <label htmlFor="username" className="block text-sm font-semibold text-foreground">
                Username
              </label>
              <input
                id="username"
                required
                name="username"
                autoComplete="username"
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                autoFocus
                aria-invalid={Boolean(error) || undefined}
                aria-describedby={error ? 'login-error' : undefined}
                className={`h-12 w-full rounded-xl border bg-white px-4 text-base outline-none transition focus:ring-4 ${
                  error
                    ? 'border-red-300 focus:border-red-400 focus:ring-red-100'
                    : 'border-border focus:border-accent focus:ring-amber-100'
                }`}
              />
            </div>

            <PasswordField hasError={Boolean(error)} />

            {error ? (
              <div
                id="login-error"
                role="alert"
                className="flex gap-3 rounded-xl border border-red-200 bg-red-50 px-3.5 py-3 text-sm text-red-800"
              >
                <AlertCircle size={18} className="mt-0.5 shrink-0 text-red-600" aria-hidden="true" />
                <p className="leading-snug">{error}</p>
              </div>
            ) : null}

            <button
              type="submit"
              className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-accent px-5 text-base font-semibold text-white shadow-sm transition hover:bg-accent-hover focus:outline-none focus:ring-4 focus:ring-amber-200"
            >
              Sign in
            </button>
          </form>
        </section>
        <p className="mt-6 text-center text-xs text-muted">Guru Bhavan · Devotee Registry</p>
      </div>
    </main>
  );
}
