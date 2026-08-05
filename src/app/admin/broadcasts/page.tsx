import { redirect } from 'next/navigation'; import { getSession } from '@/lib/auth'; import { BroadcastClient } from './broadcast-client';
export default async function BroadcastsPage() { const session = await getSession(); if (!session || !['super_admin', 'admin'].includes(session.role)) redirect('/login'); return <BroadcastClient />; }
