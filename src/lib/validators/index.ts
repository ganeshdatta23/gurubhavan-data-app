import { z } from 'zod';

// ── Shared primitives ──────────────────────────────────────────────
const phoneNumber = z
  .string()
  .min(7, 'Phone number is too short')
  .max(15, 'Phone number is too long')
  .regex(/^\d+$/, 'Phone number must contain only digits');

const postalCode = z.string().max(10).optional().nullable();

// ── Auth ───────────────────────────────────────────────────────────
export const loginSchema = z.object({
  email: z.string().email('Enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
});

export const registerSchema = z.object({
  email: z.string().email('Enter a valid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  name: z.string().min(1, 'Name is required').max(100),
});

// ── Devotee ────────────────────────────────────────────────────────
export const devoteeFormSchema = z.object({
  fullName: z.string().min(1, 'Full name is required').max(200),
  sourceGroupId: z.number({ required_error: 'Chapter is required' }).int().positive(),
  primaryPhone: phoneNumber,
  secondaryPhones: z.array(phoneNumber).max(5).default([]),
  primaryCountryCode: z.string().default('+91'),
  addressLine1: z.string().max(200).optional().nullable(),
  addressLine2: z.string().max(200).optional().nullable(),
  addressLine3: z.string().max(200).optional().nullable(),
  countryId: z.number().int().positive().optional().nullable(),
  stateId: z.number().int().positive().optional().nullable(),
  districtId: z.number().int().positive().optional().nullable(),
  cityId: z.number().int().positive().optional().nullable(),
  postalCode,
  notes: z.string().max(1000).optional().nullable(),
});

export const devoteeUpdateSchema = devoteeFormSchema.partial().extend({
  recordStatus: z.enum(['clean', 'needs_review', 'duplicate']).optional(),
});

export const devoteeQuerySchema = z.object({
  q: z.string().optional(),
  status: z.enum(['clean', 'needs_review', 'duplicate']).optional(),
  countryId: z.coerce.number().int().positive().optional(),
  stateId: z.coerce.number().int().positive().optional(),
  districtId: z.coerce.number().int().positive().optional(),
  cityId: z.coerce.number().int().positive().optional(),
  sourceGroupId: z.coerce.number().int().positive().optional(),
  hasFlags: z.coerce.boolean().optional(),
  whatsappOptedIn: z.coerce.boolean().optional(),
  createdAfter: z.string().optional(),
  createdBefore: z.string().optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(200).default(25),
  sort: z.enum(['name_asc', 'name_desc', 'created_desc', 'created_asc', 'updated_desc', 'status']).default('name_asc'),
});

export const checkDuplicateSchema = z.object({
  phoneNumber,
  excludeId: z.number().int().positive().optional(),
});

// ── Campaign ───────────────────────────────────────────────────────
export const campaignSchema = z.object({
  name: z.string().min(1, 'Campaign name is required').max(200),
  templateName: z.string().min(1, 'Template name is required'),
  templateLanguage: z.string().default('en'),
  templateVariables: z
    .array(
      z.object({
        placeholder: z.string(),
        source: z.enum(['fullName', 'primaryPhone', 'city', 'chapter', 'free']),
        value: z.string().optional(),
      })
    )
    .default([]),
  audienceFilters: z
    .object({
      countryId: z.number().optional(),
      stateId: z.number().optional(),
      cityId: z.number().optional(),
      stateIds: z.array(z.number().int().positive()).default([]),
      cityIds: z.array(z.number().int().positive()).default([]),
      recipientIds: z.array(z.number().int().positive()).default([]),
      selectionMode: z.enum(['all', 'filtered', 'manual']).default('all'),
      sourceGroupId: z.number().optional(),
      status: z.enum(['clean', 'needs_review', 'duplicate']).optional(),
    })
    .default({}),
  scheduledAt: z.string().datetime().optional().nullable(),
});

// ── Export ─────────────────────────────────────────────────────────
export const exportBodySchema = z.object({
  ids: z.array(z.number().int().positive()).optional(),
  filters: z
    .object({
      q: z.string().optional(),
      status: z.enum(['clean', 'needs_review', 'duplicate']).optional(),
      countryId: z.number().optional(),
      stateId: z.number().optional(),
      cityId: z.number().optional(),
      sourceGroupId: z.number().optional(),
    })
    .optional(),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type DevoteeFormInput = z.infer<typeof devoteeFormSchema>;
export type DevoteeUpdateInput = z.infer<typeof devoteeUpdateSchema>;
export type DevoteeQuery = z.infer<typeof devoteeQuerySchema>;
export type CheckDuplicateInput = z.infer<typeof checkDuplicateSchema>;
export type CampaignInput = z.infer<typeof campaignSchema>;
export type ExportBody = z.infer<typeof exportBodySchema>;
