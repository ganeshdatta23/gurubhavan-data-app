import { redirect } from 'next/navigation';
import { AdminApp } from '@/components/admin/AdminApp';
import { getCountries } from '@/db/queries/lookups';
import { getSession } from '@/lib/auth';

export default async function AdminPage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const session = await getSession();
  if (!session) redirect('/login');
  const countries = await getCountries();
  const tab = (await searchParams).tab;
  return <AdminApp userName={session.name} countries={countries} initialTab={tab === 'people' ? 'people' : tab === 'overview' ? 'overview' : 'add'} />;
}
