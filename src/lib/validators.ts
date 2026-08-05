import { z } from 'zod';

// ============================================
// ENUM SCHEMAS
// ============================================
export const genderEnum = z.enum(['male', 'female', 'other']);
export const maritalStatusEnum = z.enum(['single', 'married', 'widowed', 'divorced']);
export const bloodGroupEnum = z.enum(['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']);
export const userRoleEnum = z.enum(['admin', 'editor', 'viewer']);
export const userStatusEnum = z.enum(['active', 'inactive', 'suspended']);
export const phoneTypeEnum = z.enum(['mobile', 'landline', 'whatsapp', 'work', 'home']);
export const reviewFlagStatusEnum = z.enum(['pending', 'approved', 'rejected', 'resolved']);
export const auditActionEnum = z.enum(['create', 'update', 'delete', 'bulk_update', 'import', 'export']);
export const campaignStatusEnum = z.enum(['draft', 'scheduled', 'sending', 'sent', 'failed', 'cancelled']);
export const mediaTypeEnum = z.enum(['image', 'video', 'document', 'audio']);
export const deliveryStatusEnum = z.enum(['pending', 'sent', 'delivered', 'read', 'failed', 'bounced', 'opted_out']);

// ============================================
// COMMON VALIDATORS
// ============================================
const emailSchema = z.string().email('Invalid email format').max(255).toLowerCase();
const phoneSchema = z.string().regex(/^\+?[1-9]\d{1,14}$/, 'Invalid phone number format (E.164)');
const optionalPhoneSchema = phoneSchema.optional().nullable();
const urlSchema = z.string().url('Invalid URL format').max(500).optional().nullable();
const dateStringSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format');
const optionalDateStringSchema = dateStringSchema.optional().nullable();
const positiveIntSchema = z.number().int().positive();
const nonNegativeIntSchema = z.number().int().nonnegative();
const optionalPositiveIntSchema = positiveIntSchema.optional().nullable();
const optionalNonNegativeIntSchema = nonNegativeIntSchema.optional().nullable();

// ============================================
// COUNTRY SCHEMAS
// ============================================
export const countryBaseSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  code: z.string().length(2, 'Country code must be 2 characters (ISO 3166-1 alpha-2)').toUpperCase(),
  phoneCode: z.string().min(1, 'Phone code is required').max(10),
  isActive: z.boolean().default(true),
});

export const countryInsertSchema = countryBaseSchema;
export const countryUpdateSchema = countryBaseSchema.partial();
export const countrySelectSchema = countryBaseSchema.extend({
  id: positiveIntSchema,
  createdAt: z.date(),
  updatedAt: z.date(),
});

// ============================================
// STATE SCHEMAS
// ============================================
export const stateBaseSchema = z.object({
  countryId: positiveIntSchema,
  name: z.string().min(1, 'Name is required').max(100),
  code: z.string().max(10).optional().nullable(),
  isActive: z.boolean().default(true),
});

export const stateInsertSchema = stateBaseSchema;
export const stateUpdateSchema = stateBaseSchema.partial();
export const stateSelectSchema = stateBaseSchema.extend({
  id: positiveIntSchema,
  createdAt: z.date(),
  updatedAt: z.date(),
});

// ============================================
// CITY SCHEMAS
// ============================================
export const cityBaseSchema = z.object({
  stateId: positiveIntSchema,
  name: z.string().min(1, 'Name is required').max(100),
  pincode: z.string().max(20).optional().nullable(),
  isActive: z.boolean().default(true),
});

export const cityInsertSchema = cityBaseSchema;
export const cityUpdateSchema = cityBaseSchema.partial();
export const citySelectSchema = cityBaseSchema.extend({
  id: positiveIntSchema,
  createdAt: z.date(),
  updatedAt: z.date(),
});

// ============================================
// SOURCE GROUP SCHEMAS
// ============================================
export const sourceGroupBaseSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  description: z.string().max(500).optional().nullable(),
  chapterCode: z.string().max(20).optional().nullable(),
  isActive: z.boolean().default(true),
});

export const sourceGroupInsertSchema = sourceGroupBaseSchema;
export const sourceGroupUpdateSchema = sourceGroupBaseSchema.partial();
export const sourceGroupSelectSchema = sourceGroupBaseSchema.extend({
  id: positiveIntSchema,
  createdAt: z.date(),
  updatedAt: z.date(),
});

// ============================================
// USER SCHEMAS
// ============================================
export const userBaseSchema = z.object({
  email: emailSchema,
  name: z.string().min(1, 'Name is required').max(100),
  role: userRoleEnum.default('viewer'),
  status: userStatusEnum.default('active'),
  passwordHash: z.string().min(60, 'Password hash must be at least 60 characters').optional().nullable(),
});

export const userInsertSchema = userBaseSchema;
export const userUpdateSchema = userBaseSchema.partial().omit({ passwordHash: true }).extend({
  passwordHash: z.string().min(60).optional().nullable(),
});
export const userSelectSchema = userBaseSchema.extend({
  id: positiveIntSchema,
  lastLoginAt: z.date().optional().nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

// ============================================
// DEVOTEE SCHEMAS
// ============================================
export const devoteeBaseSchema = z.object({
  sourceGroupId: positiveIntSchema,
  firstName: z.string().min(1, 'First name is required').max(50),
  middleName: z.string().max(50).optional().nullable(),
  lastName: z.string().max(50).optional().nullable(),
  gender: genderEnum,
  dateOfBirth: optionalDateStringSchema,
  maritalStatus: maritalStatusEnum.optional().nullable(),
  bloodGroup: bloodGroupEnum.optional().nullable(),
  email: emailSchema.optional().nullable(),
  addressLine1: z.string().max(200).optional().nullable(),
  addressLine2: z.string().max(200).optional().nullable(),
  cityId: optionalPositiveIntSchema,
  stateId: optionalPositiveIntSchema,
  countryId: optionalPositiveIntSchema,
  pincode: z.string().max(20).optional().nullable(),
  occupation: z.string().max(100).optional().nullable(),
  education: z.string().max(100).optional().nullable(),
  emergencyContactName: z.string().max(100).optional().nullable(),
  emergencyContactPhone: optionalPhoneSchema,
  emergencyContactRelation: z.string().max(50).optional().nullable(),
  notes: z.string().max(2000).optional().nullable(),
  isActive: z.boolean().default(true),
});

export const devoteeInsertSchema = devoteeBaseSchema;
export const devoteeUpdateSchema = devoteeBaseSchema.partial();
export const devoteeSelectSchema = devoteeBaseSchema.extend({
  id: positiveIntSchema,
  createdAt: z.date(),
  updatedAt: z.date(),
});

// ============================================
// DEVOTEE PHONE SCHEMAS
// ============================================
export const devoteePhoneBaseSchema = z.object({
  devoteeId: positiveIntSchema,
  phoneNumber: phoneSchema,
  type: phoneTypeEnum.default('mobile'),
  isPrimary: z.boolean().default(false),
  isVerified: z.boolean().default(false),
  isWhatsApp: z.boolean().default(false),
  countryCode: z.string().max(5).default('+91'),
  label: z.string().max(50).optional().nullable(),
});

export const devoteePhoneInsertSchema = devoteePhoneBaseSchema;
export const devoteePhoneUpdateSchema = devoteePhoneBaseSchema.partial();
export const devoteePhoneSelectSchema = devoteePhoneBaseSchema.extend({
  id: positiveIntSchema,
  createdAt: z.date(),
  updatedAt: z.date(),
});

// ============================================
// REVIEW FLAG SCHEMAS
// ============================================
export const reviewFlagBaseSchema = z.object({
  devoteeId: positiveIntSchema,
  flaggedBy: positiveIntSchema,
  reason: z.string().min(1, 'Reason is required').max(500),
  status: reviewFlagStatusEnum.default('pending'),
  reviewedBy: optionalPositiveIntSchema,
  reviewedAt: z.date().optional().nullable(),
  resolutionNotes: z.string().max(1000).optional().nullable(),
});

export const reviewFlagInsertSchema = reviewFlagBaseSchema;
export const reviewFlagUpdateSchema = reviewFlagBaseSchema.partial();
export const reviewFlagSelectSchema = reviewFlagBaseSchema.extend({
  id: positiveIntSchema,
  createdAt: z.date(),
  updatedAt: z.date(),
});

// ============================================
// AUDIT LOG SCHEMAS
// ============================================
export const auditLogBaseSchema = z.object({
  userId: positiveIntSchema,
  entityType: z.string().min(1).max(50),
  entityId: positiveIntSchema,
  action: auditActionEnum,
  oldValues: z.record(z.unknown()).optional().nullable(),
  newValues: z.record(z.unknown()).optional().nullable(),
  ipAddress: z.string().max(45).optional().nullable(),
  userAgent: z.string().max(500).optional().nullable(),
});

export const auditLogInsertSchema = auditLogBaseSchema;
export const auditLogSelectSchema = auditLogBaseSchema.extend({
  id: positiveIntSchema,
  createdAt: z.date(),
});

// ============================================
// CAMPAIGN SCHEMAS
// ============================================
export const campaignBaseSchema = z.object({
  name: z.string().min(1, 'Name is required').max(200),
  description: z.string().max(1000).optional().nullable(),
  templateName: z.string().min(1, 'Template name is required').max(100),
  templateLanguage: z.string().length(2, 'Language code must be 2 characters').default('en'),
  templateParams: z.record(z.unknown()).optional().nullable(),
  mediaUrl: urlSchema,
  mediaType: mediaTypeEnum.optional().nullable(),
  status: campaignStatusEnum.default('draft'),
  scheduledAt: z.date().optional().nullable(),
  sentAt: z.date().optional().nullable(),
  completedAt: z.date().optional().nullable(),
  totalRecipients: nonNegativeIntSchema.default(0),
  sentCount: nonNegativeIntSchema.default(0),
  deliveredCount: nonNegativeIntSchema.default(0),
  readCount: nonNegativeIntSchema.default(0),
  failedCount: nonNegativeIntSchema.default(0),
  createdBy: positiveIntSchema,
});

export const campaignInsertSchema = campaignBaseSchema;
export const campaignUpdateSchema = campaignBaseSchema.partial();
export const campaignSelectSchema = campaignBaseSchema.extend({
  id: positiveIntSchema,
  createdAt: z.date(),
  updatedAt: z.date(),
});

// ============================================
// CAMPAIGN DELIVERY SCHEMAS
// ============================================
export const campaignDeliveryBaseSchema = z.object({
  campaignId: positiveIntSchema,
  devoteeId: positiveIntSchema,
  phoneId: positiveIntSchema,
  status: deliveryStatusEnum.default('pending'),
  metaMessageId: z.string().max(100).optional().nullable(),
  errorCode: z.string().max(50).optional().nullable(),
  errorMessage: z.string().max(500).optional().nullable(),
  sentAt: z.date().optional().nullable(),
  deliveredAt: z.date().optional().nullable(),
  readAt: z.date().optional().nullable(),
  failedAt: z.date().optional().nullable(),
  retryCount: nonNegativeIntSchema.default(0),
});

export const campaignDeliveryInsertSchema = campaignDeliveryBaseSchema;
export const campaignDeliveryUpdateSchema = campaignDeliveryBaseSchema.partial();
export const campaignDeliverySelectSchema = campaignDeliveryBaseSchema.extend({
  id: positiveIntSchema,
  createdAt: z.date(),
  updatedAt: z.date(),
});

// ============================================
// QUERY/FILTER SCHEMAS (for API routes)
// ============================================
export const paginationSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).default('asc'),
});

export const devoteeFilterSchema = z.object({
  search: z.string().optional(),
  sourceGroupId: optionalPositiveIntSchema,
  cityId: optionalPositiveIntSchema,
  stateId: optionalPositiveIntSchema,
  countryId: optionalPositiveIntSchema,
  gender: genderEnum.optional(),
  maritalStatus: maritalStatusEnum.optional(),
  isActive: z.boolean().optional(),
  hasWhatsApp: z.boolean().optional(),
  dateOfBirthFrom: optionalDateStringSchema,
  dateOfBirthTo: optionalDateStringSchema,
  createdAtFrom: optionalDateStringSchema,
  createdAtTo: optionalDateStringSchema,
}).merge(paginationSchema);

export const campaignFilterSchema = z.object({
  search: z.string().optional(),
  status: campaignStatusEnum.optional(),
  createdBy: optionalPositiveIntSchema,
  scheduledAtFrom: optionalDateStringSchema,
  scheduledAtTo: optionalDateStringSchema,
}).merge(paginationSchema);

export const exportFilterSchema = z.object({
  format: z.enum(['excel', 'pdf', 'word']).default('excel'),
  fields: z.array(z.string()).optional(),
  filters: devoteeFilterSchema.optional(),
});

// ============================================
// TYPE EXPORTS
// ============================================
export type CountryInsert = z.infer<typeof countryInsertSchema>;
export type CountryUpdate = z.infer<typeof countryUpdateSchema>;
export type CountrySelect = z.infer<typeof countrySelectSchema>;

export type StateInsert = z.infer<typeof stateInsertSchema>;
export type StateUpdate = z.infer<typeof stateUpdateSchema>;
export type StateSelect = z.infer<typeof stateSelectSchema>;

export type CityInsert = z.infer<typeof cityInsertSchema>;
export type CityUpdate = z.infer<typeof cityUpdateSchema>;
export type CitySelect = z.infer<typeof citySelectSchema>;

export type SourceGroupInsert = z.infer<typeof sourceGroupInsertSchema>;
export type SourceGroupUpdate = z.infer<typeof sourceGroupUpdateSchema>;
export type SourceGroupSelect = z.infer<typeof sourceGroupSelectSchema>;

export type UserInsert = z.infer<typeof userInsertSchema>;
export type UserUpdate = z.infer<typeof userUpdateSchema>;
export type UserSelect = z.infer<typeof userSelectSchema>;

export type DevoteeInsert = z.infer<typeof devoteeInsertSchema>;
export type DevoteeUpdate = z.infer<typeof devoteeUpdateSchema>;
export type DevoteeSelect = z.infer<typeof devoteeSelectSchema>;

export type DevoteePhoneInsert = z.infer<typeof devoteePhoneInsertSchema>;
export type DevoteePhoneUpdate = z.infer<typeof devoteePhoneUpdateSchema>;
export type DevoteePhoneSelect = z.infer<typeof devoteePhoneSelectSchema>;

export type ReviewFlagInsert = z.infer<typeof reviewFlagInsertSchema>;
export type ReviewFlagUpdate = z.infer<typeof reviewFlagUpdateSchema>;
export type ReviewFlagSelect = z.infer<typeof reviewFlagSelectSchema>;

export type AuditLogInsert = z.infer<typeof auditLogInsertSchema>;
export type AuditLogSelect = z.infer<typeof auditLogSelectSchema>;

export type CampaignInsert = z.infer<typeof campaignInsertSchema>;
export type CampaignUpdate = z.infer<typeof campaignUpdateSchema>;
export type CampaignSelect = z.infer<typeof campaignSelectSchema>;

export type CampaignDeliveryInsert = z.infer<typeof campaignDeliveryInsertSchema>;
export type CampaignDeliveryUpdate = z.infer<typeof campaignDeliveryUpdateSchema>;
export type CampaignDeliverySelect = z.infer<typeof campaignDeliverySelectSchema>;

export type PaginationParams = z.infer<typeof paginationSchema>;
export type DevoteeFilterParams = z.infer<typeof devoteeFilterSchema>;
export type CampaignFilterParams = z.infer<typeof campaignFilterSchema>;
export type ExportParams = z.infer<typeof exportFilterSchema>;