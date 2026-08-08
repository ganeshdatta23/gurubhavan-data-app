import {
  sqliteTable,
  text,
  integer,
  uniqueIndex,
  index,
} from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';

// ── COUNTRIES ────────────────────────────────────────────────────────
export const countries = sqliteTable(
  'countries',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    name: text('name').notNull(),
    iso2: text('iso2').notNull(),
    phoneCode: text('phone_code').notNull(),
    createdAt: integer('created_at', { mode: 'timestamp' }).default(sql`(unixepoch())`).notNull(),
    updatedAt: integer('updated_at', { mode: 'timestamp' }).default(sql`(unixepoch())`).notNull(),
  },
  (t) => ({
    nameIdx: uniqueIndex('countries_name_idx').on(t.name),
    iso2Idx: uniqueIndex('countries_iso2_idx').on(t.iso2),
  })
);

// ── STATES ───────────────────────────────────────────────────────────
export const states = sqliteTable(
  'states',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    countryId: integer('country_id').notNull().references(() => countries.id, { onDelete: 'restrict' }),
    name: text('name').notNull(),
    code: text('code'),
    createdAt: integer('created_at', { mode: 'timestamp' }).default(sql`(unixepoch())`).notNull(),
    updatedAt: integer('updated_at', { mode: 'timestamp' }).default(sql`(unixepoch())`).notNull(),
  },
  (t) => ({
    countryIdx: index('states_country_idx').on(t.countryId),
    countryNameUnique: uniqueIndex('states_country_name_unique').on(t.name, t.countryId),
  })
);

// ── DISTRICTS ────────────────────────────────────────────────────────
export const districts = sqliteTable(
  'districts',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    stateId: integer('state_id').notNull().references(() => states.id, { onDelete: 'restrict' }),
    name: text('name').notNull(),
    createdAt: integer('created_at', { mode: 'timestamp' }).default(sql`(unixepoch())`).notNull(),
    updatedAt: integer('updated_at', { mode: 'timestamp' }).default(sql`(unixepoch())`).notNull(),
  },
  (t) => ({
    stateIdx: index('districts_state_idx').on(t.stateId),
    stateNameUnique: uniqueIndex('districts_state_name_unique').on(t.name, t.stateId),
  })
);

// ── CITIES ───────────────────────────────────────────────────────────
export const cities = sqliteTable(
  'cities',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    districtId: integer('district_id').references(() => districts.id, { onDelete: 'restrict' }),
    stateId: integer('state_id').notNull().references(() => states.id, { onDelete: 'restrict' }),
    name: text('name').notNull(),
    createdAt: integer('created_at', { mode: 'timestamp' }).default(sql`(unixepoch())`).notNull(),
    updatedAt: integer('updated_at', { mode: 'timestamp' }).default(sql`(unixepoch())`).notNull(),
  },
  (t) => ({
    districtIdx: index('cities_district_idx').on(t.districtId),
    stateIdx: index('cities_state_idx').on(t.stateId),
    stateNameUnique: uniqueIndex('cities_state_name_unique').on(t.name, t.stateId),
  })
);

// ── SOURCE GROUPS ────────────────────────────────────────────────────
export const sourceGroups = sqliteTable(
  'source_groups',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    name: text('name').notNull(),
    description: text('description'),
    totalRecords: integer('total_records').default(0).notNull(),
    createdAt: integer('created_at', { mode: 'timestamp' }).default(sql`(unixepoch())`).notNull(),
    updatedAt: integer('updated_at', { mode: 'timestamp' }).default(sql`(unixepoch())`).notNull(),
  },
  (t) => ({
    nameIdx: uniqueIndex('source_groups_name_idx').on(t.name),
  })
);

// ── USERS ────────────────────────────────────────────────────────────
export const users = sqliteTable(
  'users',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    email: text('email').notNull(),
    passwordHash: text('password_hash').notNull(),
    name: text('name').notNull(),
    role: text('role', { enum: ['super_admin', 'admin', 'viewer', 'member'] }).default('member').notNull(),
    sourceGroupId: integer('source_group_id').references(() => sourceGroups.id, { onDelete: 'set null' }),
    isActive: integer('is_active', { mode: 'boolean' }).default(true).notNull(),
    lastLoginAt: integer('last_login_at', { mode: 'timestamp' }),
    createdAt: integer('created_at', { mode: 'timestamp' }).default(sql`(unixepoch())`).notNull(),
    updatedAt: integer('updated_at', { mode: 'timestamp' }).default(sql`(unixepoch())`).$onUpdate(() => new Date()).notNull(),
  },
  (t) => ({
    emailIdx: uniqueIndex('users_email_idx').on(t.email),
    roleIdx: index('users_role_idx').on(t.role),
  })
);

// ── DEVOTEES ─────────────────────────────────────────────────────────
export const devotees = sqliteTable(
  'devotees',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    serialNo: integer('serial_no'),
    sourceGroupId: integer('source_group_id').notNull().references(() => sourceGroups.id, { onDelete: 'restrict' }),
    linkedUserId: integer('linked_user_id').references(() => users.id, { onDelete: 'set null' }),
    fullName: text('full_name').notNull(),
    addressLine1: text('address_line1'),
    addressLine2: text('address_line2'),
    addressLine3: text('address_line3'),
    rawAddressText: text('raw_address_text'),
    cityId: integer('city_id').references(() => cities.id, { onDelete: 'set null' }),
    districtId: integer('district_id').references(() => districts.id, { onDelete: 'set null' }),
    stateId: integer('state_id').references(() => states.id, { onDelete: 'set null' }),
    countryId: integer('country_id').references(() => countries.id, { onDelete: 'set null' }),
    postalCode: text('postal_code'),
    recordStatus: text('record_status', { enum: ['clean', 'needs_review', 'duplicate'] }).default('needs_review').notNull(),
    duplicateGroup: text('duplicate_group'),
    duplicateReason: text('duplicate_reason'),
    whatsappOptedOut: integer('whatsapp_opted_out', { mode: 'boolean' }).default(false).notNull(),
    notes: text('notes'),
    rowStart: integer('row_start'),
    rowEnd: integer('row_end'),
    createdBy: integer('created_by').references(() => users.id, { onDelete: 'set null' }),
    updatedBy: integer('updated_by').references(() => users.id, { onDelete: 'set null' }),
    deletedAt: integer('deleted_at', { mode: 'timestamp' }),
    createdAt: integer('created_at', { mode: 'timestamp' }).default(sql`(unixepoch())`).notNull(),
    updatedAt: integer('updated_at', { mode: 'timestamp' }).default(sql`(unixepoch())`).$onUpdate(() => new Date()).notNull(),
  },
  (t) => ({
    nameIdx: index('devotees_name_idx').on(t.fullName),
    recordStatusIdx: index('devotees_record_status_idx').on(t.recordStatus),
    cityIdx: index('devotees_city_idx').on(t.cityId),
    districtIdx: index('devotees_district_idx').on(t.districtId),
    stateIdx: index('devotees_state_idx').on(t.stateId),
    countryIdx: index('devotees_country_idx').on(t.countryId),
    sourceGroupIdx: index('devotees_source_group_idx').on(t.sourceGroupId),
    whatsappOptedOutIdx: index('devotees_whatsapp_opted_out_idx').on(t.whatsappOptedOut),
    linkedUserIdx: index('devotees_linked_user_idx').on(t.linkedUserId),
    deletedAtIdx: index('devotees_deleted_at_idx').on(t.deletedAt),
  })
);

// ── DEVOTEE PHONES ───────────────────────────────────────────────────
export const devoteePhones = sqliteTable(
  'devotee_phones',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    devoteeId: integer('devotee_id').notNull().references(() => devotees.id, { onDelete: 'cascade' }),
    phoneNumber: text('phone_number').notNull(),
    isPrimary: integer('is_primary', { mode: 'boolean' }).default(false).notNull(),
    countryCode: text('country_code').default('+91').notNull(),
    createdAt: integer('created_at', { mode: 'timestamp' }).default(sql`(unixepoch())`).notNull(),
    updatedAt: integer('updated_at', { mode: 'timestamp' }).default(sql`(unixepoch())`).$onUpdate(() => new Date()).notNull(),
  },
  (t) => ({
    devoteeIdx: index('devotee_phones_devotee_idx').on(t.devoteeId),
    phoneNumberIdx: uniqueIndex('devotee_phones_number_idx').on(t.phoneNumber),
  })
);

// ── REVIEW FLAGS ─────────────────────────────────────────────────────
export const reviewFlags = sqliteTable(
  'review_flags',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    devoteeId: integer('devotee_id').notNull().references(() => devotees.id, { onDelete: 'cascade' }),
    flag: text('flag', {
      enum: ['state_not_certain', 'city_not_certain', 'postal_missing', 'missing_mobile', 'district_not_certain'],
    }).notNull(),
    resolvedAt: integer('resolved_at', { mode: 'timestamp' }),
    resolvedBy: integer('resolved_by').references(() => users.id, { onDelete: 'set null' }),
    createdAt: integer('created_at', { mode: 'timestamp' }).default(sql`(unixepoch())`).notNull(),
  },
  (t) => ({
    devoteeIdx: index('review_flags_devotee_idx').on(t.devoteeId),
    devoteeFlagUnique: uniqueIndex('review_flags_devotee_flag_unique').on(t.devoteeId, t.flag),
  })
);

// ── AUDIT LOGS ───────────────────────────────────────────────────────
export const auditLogs = sqliteTable(
  'audit_logs',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    devoteeId: integer('devotee_id').references(() => devotees.id, { onDelete: 'set null' }),
    actorId: integer('actor_id').references(() => users.id, { onDelete: 'set null' }),
    action: text('action', { enum: ['create', 'update', 'delete', 'export', 'bulk_upload', 'status_change'] }).notNull(),
    fieldName: text('field_name'),
    oldValue: text('old_value'),
    newValue: text('new_value'),
    createdAt: integer('created_at', { mode: 'timestamp' }).default(sql`(unixepoch())`).notNull(),
  },
  (t) => ({
    devoteeIdx: index('audit_logs_devotee_idx').on(t.devoteeId),
    actorIdx: index('audit_logs_actor_idx').on(t.actorId),
    createdAtIdx: index('audit_logs_created_at_idx').on(t.createdAt),
  })
);

// ── CAMPAIGNS ────────────────────────────────────────────────────────
export const campaigns = sqliteTable(
  'campaigns',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    name: text('name').notNull(),
    templateName: text('template_name').notNull(),
    templateLanguage: text('template_language').default('en').notNull(),
    templateVariables: text('template_variables', { mode: 'json' }),
    audienceFilters: text('audience_filters', { mode: 'json' }),
    status: text('status', { enum: ['draft', 'queued', 'running', 'completed', 'failed', 'scheduled'] }).default('draft').notNull(),
    scheduledAt: integer('scheduled_at', { mode: 'timestamp' }),
    startedAt: integer('started_at', { mode: 'timestamp' }),
    completedAt: integer('completed_at', { mode: 'timestamp' }),
    totalRecipients: integer('total_recipients').default(0).notNull(),
    sentCount: integer('sent_count').default(0).notNull(),
    deliveredCount: integer('delivered_count').default(0).notNull(),
    readCount: integer('read_count').default(0).notNull(),
    failedCount: integer('failed_count').default(0).notNull(),
    createdBy: integer('created_by').notNull().references(() => users.id, { onDelete: 'restrict' }),
    createdAt: integer('created_at', { mode: 'timestamp' }).default(sql`(unixepoch())`).notNull(),
    updatedAt: integer('updated_at', { mode: 'timestamp' }).default(sql`(unixepoch())`).$onUpdate(() => new Date()).notNull(),
  },
  (t) => ({
    statusIdx: index('campaigns_status_idx').on(t.status),
    createdByIdx: index('campaigns_created_by_idx').on(t.createdBy),
  })
);

// ── CAMPAIGN DELIVERIES ──────────────────────────────────────────────
export const campaignDeliveries = sqliteTable(
  'campaign_deliveries',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    campaignId: integer('campaign_id').notNull().references(() => campaigns.id, { onDelete: 'cascade' }),
    devoteeId: integer('devotee_id').references(() => devotees.id, { onDelete: 'set null' }),
    phoneNumber: text('phone_number').notNull(),
    whatsappMessageId: text('whatsapp_message_id'),
    status: text('status', {
      enum: ['queued', 'sent', 'delivered', 'read', 'failed', 'skipped_opted_out', 'skipped_no_phone'],
    }).default('queued').notNull(),
    failureReason: text('failure_reason'),
    sentAt: integer('sent_at', { mode: 'timestamp' }),
    deliveredAt: integer('delivered_at', { mode: 'timestamp' }),
    readAt: integer('read_at', { mode: 'timestamp' }),
    createdAt: integer('created_at', { mode: 'timestamp' }).default(sql`(unixepoch())`).notNull(),
    updatedAt: integer('updated_at', { mode: 'timestamp' }).default(sql`(unixepoch())`).$onUpdate(() => new Date()).notNull(),
  },
  (t) => ({
    campaignIdx: index('campaign_deliveries_campaign_idx').on(t.campaignId),
    statusIdx: index('campaign_deliveries_status_idx').on(t.status),
    waMessageIdx: index('campaign_deliveries_wa_msg_idx').on(t.whatsappMessageId),
  })
);

// ── BULK UPLOAD JOBS ─────────────────────────────────────────────────
export const bulkUploadJobs = sqliteTable(
  'bulk_upload_jobs',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    filename: text('filename').notNull(),
    uploadedBy: integer('uploaded_by').references(() => users.id, { onDelete: 'set null' }),
    totalRows: integer('total_rows').default(0).notNull(),
    validRows: integer('valid_rows').default(0).notNull(),
    invalidRows: integer('invalid_rows').default(0).notNull(),
    duplicateRows: integer('duplicate_rows').default(0).notNull(),
    savedRows: integer('saved_rows').default(0).notNull(),
    failedRows: integer('failed_rows').default(0).notNull(),
    status: text('status', {
      enum: ['pending', 'validating', 'preview_ready', 'processing', 'completed', 'failed'],
    }).default('pending').notNull(),
    errorReportUrl: text('error_report_url'),
    createdAt: integer('created_at', { mode: 'timestamp' }).default(sql`(unixepoch())`).notNull(),
    updatedAt: integer('updated_at', { mode: 'timestamp' }).default(sql`(unixepoch())`).$onUpdate(() => new Date()).notNull(),
  },
  (t) => ({
    uploadedByIdx: index('bulk_upload_jobs_uploaded_by_idx').on(t.uploadedBy),
    statusIdx: index('bulk_upload_jobs_status_idx').on(t.status),
  })
);

// ── BULK UPLOAD ERRORS ───────────────────────────────────────────────
export const bulkUploadErrors = sqliteTable(
  'bulk_upload_errors',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    jobId: integer('job_id').notNull().references(() => bulkUploadJobs.id, { onDelete: 'cascade' }),
    rowNumber: integer('row_number').notNull(),
    fieldName: text('field_name'),
    errorType: text('error_type', {
      enum: ['missing_required', 'invalid_format', 'invalid_location', 'duplicate', 'invalid_phone', 'value_too_long', 'invalid_date'],
    }).notNull(),
    errorMessage: text('error_message').notNull(),
    rawValue: text('raw_value'),
    createdAt: integer('created_at', { mode: 'timestamp' }).default(sql`(unixepoch())`).notNull(),
  },
  (t) => ({
    jobIdx: index('bulk_upload_errors_job_idx').on(t.jobId),
  })
);

// ── TYPE EXPORTS ─────────────────────────────────────────────────────
export type Country = typeof countries.$inferSelect;
export type NewCountry = typeof countries.$inferInsert;
export type State = typeof states.$inferSelect;
export type NewState = typeof states.$inferInsert;
export type District = typeof districts.$inferSelect;
export type NewDistrict = typeof districts.$inferInsert;
export type City = typeof cities.$inferSelect;
export type NewCity = typeof cities.$inferInsert;
export type SourceGroup = typeof sourceGroups.$inferSelect;
export type NewSourceGroup = typeof sourceGroups.$inferInsert;
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Devotee = typeof devotees.$inferSelect;
export type NewDevotee = typeof devotees.$inferInsert;
export type DevoteePhone = typeof devoteePhones.$inferSelect;
export type NewDevoteePhone = typeof devoteePhones.$inferInsert;
export type ReviewFlag = typeof reviewFlags.$inferSelect;
export type NewReviewFlag = typeof reviewFlags.$inferInsert;
export type AuditLog = typeof auditLogs.$inferSelect;
export type NewAuditLog = typeof auditLogs.$inferInsert;
export type Campaign = typeof campaigns.$inferSelect;
export type NewCampaign = typeof campaigns.$inferInsert;
export type CampaignDelivery = typeof campaignDeliveries.$inferSelect;
export type NewCampaignDelivery = typeof campaignDeliveries.$inferInsert;
export type BulkUploadJob = typeof bulkUploadJobs.$inferSelect;
export type NewBulkUploadJob = typeof bulkUploadJobs.$inferInsert;
export type BulkUploadError = typeof bulkUploadErrors.$inferSelect;
export type NewBulkUploadError = typeof bulkUploadErrors.$inferInsert;
