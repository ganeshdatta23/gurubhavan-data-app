import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth';

export default async function AdminDashboardPage() {
  const session = await getSession();
  if (!session || session.role === 'member') redirect('/login');

  return (
    <main className="min-h-screen bg-bg p-6 sm:p-10">
      <div className="mx-auto max-w-5xl">
        <p className="text-sm font-medium text-accent">Devotee Registry</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">Welcome, {session.name}</h1>
        <p className="mt-3 max-w-2xl text-muted">Keep member contact details accurate, find the right people, and prepare trusted outreach.</p>
        <section className="mt-8 grid gap-4 sm:grid-cols-2">
          <Link href="/admin/devotees" className="rounded-lg border border-border bg-surface p-6 transition hover:border-accent hover:shadow-sm focus:outline-none focus:ring-2 focus:ring-accent">
            <h2 className="font-semibold">Manage registry</h2>
            <p className="mt-2 text-sm text-muted">Search, filter, register, and correct devotee records.</p>
          </Link>
          <Link href="/admin/import" className="rounded-lg border border-border bg-surface p-6 transition hover:border-accent hover:shadow-sm focus:outline-none focus:ring-2 focus:ring-accent">
            <h2 className="font-semibold">Import Excel records</h2>
            <p className="mt-2 text-sm text-muted">Validate a spreadsheet, repair only invalid rows, then import safely.</p>
          </Link>
          <div className="rounded-lg border border-border bg-surface p-6">
            <Link href="/admin/broadcasts" className="block focus:outline-none focus:ring-2 focus:ring-accent">
              <h2 className="font-semibold">Broadcasts</h2>
              <p className="mt-2 text-sm text-muted">Create consent-aware campaigns and inspect delivery results.</p>
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}
