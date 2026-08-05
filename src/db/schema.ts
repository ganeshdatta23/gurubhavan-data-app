import {
  sqliteTable,
  text,
  integer,
  uniqueIndex,
  index,
} from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';

// ============================================
// COUNTRIES
// ============================================
export const countries = sqliteTable(
  'countries',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    name: text('name').notNull(),
    iso2: text('iso2').notNull(),
    phoneCode: text('phone_code').notNull(),
    createdAt: integer('created_at', { mode: 'timestamp' })
      .default(sql`(unixepoch())`)
      .notNull(),
  },
  (t) => ({
    nameIdx: uniqueIndex('countries_name_idx').on(t.name),
    iso2Idx: uniqueIndex('countries_iso2_idx').on(t.iso2),
  })
);

// ============================================
// STATES
// ============================================
export const states = sqliteTable(
  'states',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    countryId: integer('country_id')
      .notNull()
      .references(() => countries.id, { onDelete: 'restrict' }),
    name: text('name').notNull(),
    code: text('code'),
    createdAt: integer('created_at', { mode: 'timestamp' })
      .default(sql`(unixepoch())`)
      .notNull(),
  },
  (t) => ({
    countryIdx: index('states_country_idx').on(t.countryId),
    countryNameUnique: uniqueIndex('states_country_name_unique').on(
      t.name,
      t.countryId
    ),
  })
);

// ============================================
// CITIES
// ============================================
export const cities = sqliteTable(
  'cities',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    stateId: integer('state_id')
      .notNull()
      .references(() => states.id, { onDelete: 'restrict' }),
    name: text('name').notNull(),
    createdAt: integer('created_at', { mode: 'timestamp' })
      .default(sql`(unixepoch())`)
      .notNull(),
  },
  (t) => ({
    stateIdx: index('cities_state_idx').on(t.stateId),
    stateNameUnique: uniqueIndex('cities_state_name_unique').on(
      t.name,
      t.stateId
    ),
  })
);

// ============================================
// SOURCE GROUPS (54 regional chapters)
// ============================================
export const sourceGroups = sqliteTable(
  'source_groups',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    name: text('name').notNull(),
    description: text('description'),
    createdAt: integer('created_at', { mode: 'timestamp' })
      .default(sql`(unixepoch())`)
      .notNull(),
  },
  (t) => ({
    nameIdx: uniqueIndex('source_groups_name_idx').on(t.name),
  })
);

// ============================================
// USERS
// ============================================
export const users = sqliteTable(
  'users',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    email: text('email').notNull(),
    passwordHash: text('password_hash').notNull(),
    name: text('name').notNull(),
    role: text('role', {
      enum: ['super_admin', 'admin', 'viewer', 'member'],
    })
      .default('member')
      .notNull(),
    sourceGroupId: integer('source_group_id').references(
      () => sourceGroups.id,
      { onDelete: 'set null' }
    ),
    isActive: integer('is_active', { mode: 'boolean' }).default(true).notNull(),
    lastLoginAt: integer('last_login_at', { mode: 'timestamp' }),
    createdAt: integer('created_at', { mode: 'timestamp' })
      .default(sql`(unixepoch())`)
      .notNull(),
    updatedAt: integer('updated_at', { mode: 'timestamp' })
      .default(sql`(unixepoch())`)
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (t) => ({
    emailIdx: uniqueIndex('users_email_idx').on(t.email),
    roleIdx: index('users_role_idx').on(t.role),
  })
);

// ============================================
// DEVOTEES
// ============================================
export const devotees = sqliteTable(
  'devotees',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    sourceGroupId: integer('source_group_id')
      .notNull()
      .references(() => sourceGroups.id, { onDelete: 'restrict' }),
    // Linked auth account (optional — set when member registers)
    linkedUserId: integer('linked_user_id').references(() => users.id, {
      onDelete: 'set null',
    }),
    fullName: text('full_name').notNull(),
    addressLine1: text('address_line1'),
    addressLine2: text('address_line2'),
    addressLine3: text('address_line3'),
    cityId: integer('city_id').references(() => cities.id, {
      onDelete: 'set null',
    }),
    stateId: integer('state_id').references(() => states.id, {
      onDelete: 'set null',
    }),
    countryId: integer('country_id').references(() => countries.id, {
      onDelete: 'set null',
    }),
    postalCode: text('postal_code'),
    // 'clean' | 'needs_review' | 'duplicate'
    recordStatus: text('record_status', {
      enum: ['clean', 'needs_review', 'duplicate'],
    })
      .default('needs_review')
      .notNull(),
    whatsappOptedOut: integer('whatsapp_opted_out', { mode: 'boolean' })
      .default(false)
      .notNull(),
    notes: text('notes'),
    createdBy: integer('created_by').references(() => users.id, {
      onDelete: 'set null',
    }),
    updatedBy: integer('updated_by').references(() => users.id, {
      onDelete: 'set null',
    }),
    deletedAt: integer('deleted_at', { mode: 'timestamp' }),
    createdAt: integer('created_at', { mode: 'timestamp' })
      .default(sql`(unixepoch())`)
      .notNull(),
    updatedAt: integer('updated_at', { mode: 'timestamp' })
      .default(sql`(unixepoch())`)
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (t) => ({
    nameIdx: index('devotees_name_idx').on(t.fullName),
    recordStatusIdx: index('devotees_record_status_idx').on(t.recordStatus),
    cityIdx: index('devotees_city_idx').on(t.cityId),
    stateIdx: index('devotees_state_idx').on(t.stateId),
    countryIdx: index('devotees_country_idx').on(t.countryId),
    sourceGroupIdx: index('devotees_source_group_idx').on(t.sourceGroupId),
    whatsappOptedOutIdx: index('devotees_whatsapp_opted_out_idx').on(
      t.whatsappOptedOut
    ),
    linkedUserIdx: index('devotees_linked_user_idx').on(t.linkedUserId),
    deletedAtIdx: index('devotees_deleted_at_idx').on(t.deletedAt),
  })
);

// ============================================
// DEVOTEE PHONES (1:N — one primary + N secondary)
// ============================================
export const devoteePhones = sqliteTable(
  'devotee_phones',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    devoteeId: integer('devotee_id')
      .notNull()
      .references(() => devotees.id, { onDelete: 'cascade' }),
    phoneNumber: text('phone_number').notNull(),
    isPrimary: integer('is_primary', { mode: 'boolean' })
      .default(false)
      .notNull(),
    countryCode: text('country_code').default('+91').notNull(),
    createdAt: integer('created_at', { mode: 'timestamp' })
      .default(sql`(unixepoch())`)
      .notNull(),
    updatedAt: integer('updated_at', { mode: 'timestamp' })
      .default(sql`(unixepoch())`)
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (t) => ({
    devoteeIdx: index('devotee_phones_devotee_idx').on(t.devoteeId),
    phoneNumberIdx: uniqueIndex('devotee_phones_number_idx').on(t.phoneNumber),
  })
);

// ============================================
// REVIEW FLAGS (normalized from semicolon-separated notes)
// ============================================
export const reviewFlags = sqliteTable(
  'review_flags',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    devoteeId: integer('devotee_id')
      .notNull()
      .references(() => devotees.id, { onDelete: 'cascade' }),
    flag: text('flag').notNull(),
    resolvedAt: integer('resolved_at', { mode: 'timestamp' }),
    resolvedBy: integer('resolved_by').references(() => users.id, {
      onDelete: 'set null',
    }),
    createdAt: integer('created_at', { mode: 'timestamp' })
      .default(sql`(unixepoch())`)
      .notNull(),
  },
  (t) => ({
    devoteeIdx: index('review_flags_devotee_idx').on(t.devoteeId),
    devoteeFlagUnique: uniqueIndex('review_flags_devotee_flag_unique').on(
      t.devoteeId,
      t.flag
    ),
  })
);

// ============================================
// AUDIT LOGS (append-only)
// ============================================
export const auditLogs = sqliteTable(
  'audit_logs',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    userId: integer('user_id').references(() => users.id, {
      onDelete: 'set null',
    }),
    entityType: text('entity_type', {
      enum: ['devotee', 'devotee_phone', 'review_flag', 'campaign', 'user'],
    }).notNull(),
    entityId: integer('entity_id').notNull(),
    action: text('action', {
      enum: ['create', 'update', 'delete', 'export'],
    }).notNull(),
    oldValues: text('old_values', { mode: 'json' }),
    newValues: text('new_values', { mode: 'json' }),
    ipAddress: text('ip_address'),
    createdAt: integer('created_at', { mode: 'timestamp' })
      .default(sql`(unixepoch())`)
      .notNull(),
  },
  (t) => ({
    userIdx: index('audit_logs_user_idx').on(t.userId),
    entityIdx: index('audit_logs_entity_idx').on(t.entityType, t.entityId),
    createdAtIdx: index('audit_logs_created_at_idx').on(t.createdAt),
  })
);

// ============================================
// CAMPAIGNS
// ============================================
export const campaigns = sqliteTable(
  'campaigns',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    name: text('name').notNull(),
    templateName: text('template_name').notNull(),
    templateLanguage: text('template_language').default('en').notNull(),
    // JSON array of variable mappings: [{placeholder: "1", source: "fullName" | "free", value?: "..."}]
    templateVariables: text('template_variables', { mode: 'json' }),
    // JSON object of audience filters applied when campaign was created
    audienceFilters: text('audience_filters', { mode: 'json' }),
    status: text('status', {
      enum: ['draft', 'queued', 'running', 'completed', 'failed', 'scheduled'],
    })
      .default('draft')
      .notNull(),
    scheduledAt: integer('scheduled_at', { mode: 'timestamp' }),
    startedAt: integer('started_at', { mode: 'timestamp' }),
    completedAt: integer('completed_at', { mode: 'timestamp' }),
    totalRecipients: integer('total_recipients').default(0).notNull(),
    sentCount: integer('sent_count').default(0).notNull(),
    deliveredCount: integer('delivered_count').default(0).notNull(),
    readCount: integer('read_count').default(0).notNull(),
    failedCount: integer('failed_count').default(0).notNull(),
    createdBy: integer('created_by')
      .notNull()
      .references(() => users.id, { onDelete: 'restrict' }),
    createdAt: integer('created_at', { mode: 'timestamp' })
      .default(sql`(unixepoch())`)
      .notNull(),
    updatedAt: integer('updated_at', { mode: 'timestamp' })
      .default(sql`(unixepoch())`)
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (t) => ({
    statusIdx: index('campaigns_status_idx').on(t.status),
    createdByIdx: index('campaigns_created_by_idx').on(t.createdBy),
    scheduledAtIdx: index('campaigns_scheduled_at_idx').on(t.scheduledAt),
  })
);

// ============================================
// CAMPAIGN DELIVERIES
// ============================================
export const campaignDeliveries = sqliteTable(
  'campaign_deliveries',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    campaignId: integer('campaign_id')
      .notNull()
      .references(() => campaigns.id, { onDelete: 'cascade' }),
    devoteeId: integer('devotee_id')
      .notNull()
      .references(() => devotees.id, { onDelete: 'cascade' }),
    phoneNumber: text('phone_number').notNull(),
    // whatsapp_message_id returned by Meta API — used for webhook matching
    whatsappMessageId: text('whatsapp_message_id'),
    status: text('status', {
      enum: [
        'queued',
        'sent',
        'delivered',
        'read',
        'failed',
        'skipped_opted_out',
        'skipped_no_phone',
      ],
    })
      .default('queued')
      .notNull(),
    errorCode: text('error_code'),
    errorMessage: text('error_message'),
    sentAt: integer('sent_at', { mode: 'timestamp' }),
    deliveredAt: integer('delivered_at', { mode: 'timestamp' }),
    readAt: integer('read_at', { mode: 'timestamp' }),
    createdAt: integer('created_at', { mode: 'timestamp' })
      .default(sql`(unixepoch())`)
      .notNull(),
    updatedAt: integer('updated_at', { mode: 'timestamp' })
      .default(sql`(unixepoch())`)
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (t) => ({
    campaignIdx: index('campaign_deliveries_campaign_idx').on(t.campaignId),
    devoteeIdx: index('campaign_deliveries_devotee_idx').on(t.devoteeId),
    statusIdx: index('campaign_deliveries_status_idx').on(t.status),
    whatsappMsgIdx: index('campaign_deliveries_wa_msg_idx').on(
      t.whatsappMessageId
    ),
    campaignDevoteeUnique: uniqueIndex(
      'campaign_deliveries_campaign_devotee_unique'
    ).on(t.campaignId, t.devoteeId),
  })
);

// ============================================
// TYPE EXPORTS
// ============================================
export type Country = typeof countries.$inferSelect;
export type NewCountry = typeof countries.$inferInsert;

export type State = typeof states.$inferSelect;
export type NewState = typeof states.$inferInsert;

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
