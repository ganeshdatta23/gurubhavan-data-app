import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth';
import Link from 'next/link';
import { LayoutDashboard, Users, Upload, Megaphone, LogOut } from 'lucide-react';

const nav = [
  { href: '/admin/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/admin/devotees', label: 'Registry', icon: Users },
  { href: '/admin/import', label: 'Import', icon: Upload },
  { href: '/admin/broadcasts', label: 'Broadcasts', icon: Megaphone },
];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session || session.role === 'member') redirect('/login');

  return (
    <div className="flex min-h-screen bg-bg">
      {/* Sidebar */}
      <aside className="hidden w-56 shrink-0 flex-col border-r border-border bg-surface lg:flex">
        <div className="border-b border-border px-5 py-4">
          <p className="text-xs font-semibold uppercase tracking-widest text-accent">Devotee Registry</p>
          <p className="mt-0.5 truncate text-sm text-muted">{session.name}</p>
        </div>
        <nav className="flex-1 space-y-0.5 p-3">
          {nav.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-muted transition hover:bg-accent/10 hover:text-accent"
            >
              <Icon size={16} />
              {label}
            </Link>
          ))}
        </nav>
        <div className="border-t border-border p-3">
          <form action="/api/auth/logout" method="POST">
            <button
              type="submit"
              className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-muted transition hover:bg-red-50 hover:text-red-700"
            >
              <LogOut size={16} />
              Sign out
            </button>
          </form>
        </div>
      </aside>

      {/* Mobile bottom nav */}
      <div className="fixed bottom-0 left-0 right-0 z-40 flex border-t border-border bg-surface lg:hidden">
        {nav.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className="flex flex-1 flex-col items-center gap-1 py-2 text-xs text-muted hover:text-accent"
          >
            <Icon size={20} />
            {label}
          </Link>
        ))}
      </div>

      {/* Main content */}
      <main className="flex-1 overflow-auto pb-16 lg:pb-0">{children}</main>
    </div>
  );
}
