import { db } from '@/db';
import { campaigns, campaignDeliveries, devotees, devoteePhones } from '@/db/schema';
import { eq, and, isNull, count, sql, inArray, or } from 'drizzle-orm';
import type { CampaignInput } from '@/lib/validators/index';

export async function listCampaigns(createdBy?: number) {
  const where = createdBy ? eq(campaigns.createdBy, createdBy) : undefined;
  return db.select().from(campaigns).where(where).orderBy(sql`${campaigns.createdAt} desc`);
}

export async function getCampaignById(id: number) {
  const [campaign] = await db.select().from(campaigns).where(eq(campaigns.id, id)).limit(1);
  if (!campaign) return null;

  const deliveries = await db
    .select()
    .from(campaignDeliveries)
    .where(eq(campaignDeliveries.campaignId, id));

  return { ...campaign, deliveries };
}

export async function createCampaign(data: CampaignInput, createdBy: number) {
  const [campaign] = await db
    .insert(campaigns)
    .values({
      name: data.name,
      templateName: data.templateName,
      templateLanguage: data.templateLanguage,
      templateVariables: data.templateVariables,
      audienceFilters: data.audienceFilters,
      scheduledAt: data.scheduledAt ? new Date(data.scheduledAt) : null,
      createdBy,
    })
    .returning();
  return campaign;
}

export async function getAudiencePreview(filters: CampaignInput['audienceFilters']) {
  const conditions = [isNull(devotees.deletedAt)];
  if (filters.countryId) conditions.push(eq(devotees.countryId, filters.countryId));
  if (filters.stateId) conditions.push(eq(devotees.stateId, filters.stateId));
  if (filters.cityId) conditions.push(eq(devotees.cityId, filters.cityId));
  if (filters.cityIds?.length) conditions.push(inArray(devotees.cityId, filters.cityIds));
  else if (filters.stateIds?.length) conditions.push(inArray(devotees.stateId, filters.stateIds));
  if (filters.sourceGroupId) conditions.push(eq(devotees.sourceGroupId, filters.sourceGroupId));
  if (filters.status) conditions.push(eq(devotees.recordStatus, filters.status));

  const where = and(...conditions);

  const [{ total }] = await db.select({ total: count() }).from(devotees).where(where);

  const [{ optedOut }] = await db
    .select({ optedOut: count() })
    .from(devotees)
    .where(and(where, eq(devotees.whatsappOptedOut, true)));

  // Count devotees with no phone
  const withPhone = await db
    .select({ devoteeId: devoteePhones.devoteeId })
    .from(devoteePhones)
    .where(eq(devoteePhones.isPrimary, true));

  const withPhoneIds = new Set(withPhone.map((r) => r.devoteeId));

  const allDevotees = await db.select({ id: devotees.id }).from(devotees).where(where);
  const noPhone = allDevotees.filter((d) => !withPhoneIds.has(d.id)).length;

  return {
    total,
    noPhone,
    optedOut,
    eligible: total - noPhone - optedOut,
  };
}
