import { NextRequest, NextResponse } from 'next/server';
import { and, eq, inArray, isNull } from 'drizzle-orm';
import { getSession } from '@/lib/auth';
import { db } from '@/db';
import { campaignDeliveries, campaigns, devotees, devoteePhones } from '@/db/schema';
import { getCampaignById } from '@/db/queries/campaigns';

export async function POST(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession(); if (!session || !['super_admin', 'admin'].includes(session.role)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const id = Number((await params).id); const campaign = await getCampaignById(id);
  if (!campaign || (session.role !== 'super_admin' && campaign.createdBy !== session.userId)) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  if (campaign.status !== 'draft' && campaign.status !== 'scheduled') return NextResponse.json({ error: 'Only draft or scheduled campaigns can be sent.' }, { status: 409 });
  const filters = (campaign.audienceFilters ?? {}) as { countryId?: number; stateId?: number; cityId?: number; stateIds?: number[]; cityIds?: number[]; recipientIds?: number[]; selectionMode?: 'all' | 'filtered' | 'manual'; sourceGroupId?: number; status?: 'clean' | 'needs_review' | 'duplicate' };
  const conditions = [isNull(devotees.deletedAt), eq(devotees.whatsappOptedOut, false)]; if (filters.countryId) conditions.push(eq(devotees.countryId, filters.countryId)); if (filters.stateId) conditions.push(eq(devotees.stateId, filters.stateId)); if (filters.cityId) conditions.push(eq(devotees.cityId, filters.cityId)); if (filters.sourceGroupId) conditions.push(eq(devotees.sourceGroupId, filters.sourceGroupId)); if (filters.status) conditions.push(eq(devotees.recordStatus, filters.status));
  if (filters.cityIds?.length) conditions.push(inArray(devotees.cityId, filters.cityIds)); else if (filters.stateIds?.length) conditions.push(inArray(devotees.stateId, filters.stateIds));
  if (filters.selectionMode === 'manual') { if (!filters.recipientIds?.length) return NextResponse.json({ error: 'Select at least one recipient.' }, { status: 400 }); conditions.push(inArray(devotees.id, filters.recipientIds)); }
  const recipients = await db.select({ devoteeId: devotees.id, phoneNumber: devoteePhones.phoneNumber }).from(devotees).innerJoin(devoteePhones, and(eq(devoteePhones.devoteeId, devotees.id), eq(devoteePhones.isPrimary, true))).where(and(...conditions));
  if (!recipients.length) return NextResponse.json({ error: 'No eligible recipients remain.' }, { status: 400 });
  const live = process.env.WHATSAPP_MODE === 'live';
  await db.update(campaigns).set({ status: 'running', startedAt: new Date(), totalRecipients: recipients.length }).where(eq(campaigns.id, id));
  for (const recipient of recipients) {
    let status: 'sent' | 'failed' = 'sent'; let messageId: string | null = `mock-${id}-${recipient.devoteeId}`; let errorMessage: string | null = null;
    if (live) { status = 'failed'; messageId = null; errorMessage = 'Live WhatsApp delivery requires a configured provider adapter.'; }
    await db.insert(campaignDeliveries).values({ campaignId: id, devoteeId: recipient.devoteeId, phoneNumber: recipient.phoneNumber, status, whatsappMessageId: messageId, sentAt: status === 'sent' ? new Date() : null, errorMessage });
  }
  const sent = live ? 0 : recipients.length; await db.update(campaigns).set({ status: live ? 'failed' : 'completed', sentCount: sent, deliveredCount: sent, failedCount: recipients.length - sent, completedAt: new Date() }).where(eq(campaigns.id, id));
  return NextResponse.json({ sent, failed: recipients.length - sent, mode: live ? 'live' : 'mock' });
}
