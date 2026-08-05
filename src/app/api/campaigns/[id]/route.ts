import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { getCampaignById } from '@/db/queries/campaigns';
export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) { const session = await getSession(); if (!session || !['super_admin', 'admin'].includes(session.role)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 }); const campaign = await getCampaignById(Number((await params).id)); if (!campaign || (session.role !== 'super_admin' && campaign.createdBy !== session.userId)) return NextResponse.json({ error: 'Not found' }, { status: 404 }); return NextResponse.json(campaign); }
