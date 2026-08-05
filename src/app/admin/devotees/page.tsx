import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth';
import { RegistryClient } from './registry-client';

export default async function DevoteesPage() {
  const session = await getSession();
  if (!session || session.role === 'member') redirect('/login');
  return <RegistryClient />;
}
