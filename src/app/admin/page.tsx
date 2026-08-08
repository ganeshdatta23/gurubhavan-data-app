import { redirect } from 'next/navigation';
import { AdminApp } from '@/components/admin/AdminApp';
import { getCountries } from '@/db/queries/lookups';
import { getSession } from '@/lib/auth';

export default async function AdminPage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const session = await getSession();
  if (!session) redirect('/login');
  const countries = await getCountries();
  return <AdminApp userName={session.name} countries={countries} initialTab={(await searchParams).tab === 'people' ? 'people' : 'add'} />;
}
