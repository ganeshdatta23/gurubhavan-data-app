import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth';
import { ImportClient } from './import-client';
export default async function ImportPage() { const session = await getSession(); if (!session || !['super_admin', 'admin'].includes(session.role)) redirect('/login'); return <ImportClient />; }
