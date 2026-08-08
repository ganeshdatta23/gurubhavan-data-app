import { index, integer, sqliteTable, text, uniqueIndex } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';

export const countries = sqliteTable(
  'countries',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    name: text('name').notNull(),
    iso2: text('iso2').notNull(),
    phoneCode: text('phone_code').notNull(),
    createdAt: integer('created_at', { mode: 'timestamp' }).default(sql`(unixepoch())`).notNull(),
  },
  (table) => ({
    nameIdx: uniqueIndex('countries_name_idx').on(table.name),
    iso2Idx: uniqueIndex('countries_iso2_idx').on(table.iso2),
  }),
);

export const states = sqliteTable(
  'states',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    countryId: integer('country_id').notNull().references(() => countries.id, { onDelete: 'restrict' }),
    name: text('name').notNull(),
    code: text('code'),
    createdAt: integer('created_at', { mode: 'timestamp' }).default(sql`(unixepoch())`).notNull(),
  },
  (table) => ({
    countryIdx: index('states_country_idx').on(table.countryId),
    countryNameIdx: uniqueIndex('states_country_name_unique').on(table.name, table.countryId),
  }),
);

export const cities = sqliteTable(
  'cities',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    stateId: integer('state_id').notNull().references(() => states.id, { onDelete: 'restrict' }),
    name: text('name').notNull(),
    createdAt: integer('created_at', { mode: 'timestamp' }).default(sql`(unixepoch())`).notNull(),
  },
  (table) => ({
    stateIdx: index('cities_state_idx').on(table.stateId),
    stateNameIdx: uniqueIndex('cities_state_name_unique').on(table.name, table.stateId),
  }),
);

export const users = sqliteTable(
  'users',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    username: text('username').notNull(),
    passwordHash: text('password_hash').notNull(),
    name: text('name').notNull(),
    role: text('role', { enum: ['admin'] }).default('admin').notNull(),
    isActive: integer('is_active', { mode: 'boolean' }).default(true).notNull(),
    lastLoginAt: integer('last_login_at', { mode: 'timestamp' }),
    createdAt: integer('created_at', { mode: 'timestamp' }).default(sql`(unixepoch())`).notNull(),
    updatedAt: integer('updated_at', { mode: 'timestamp' }).default(sql`(unixepoch())`).notNull(),
  },
  (table) => ({
    usernameIdx: uniqueIndex('users_username_idx').on(table.username),
  }),
);

export const devotees = sqliteTable(
  'devotees',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    fullName: text('full_name').notNull(),
    mobile: text('mobile').notNull(),
    email: text('email'),
    address: text('address').notNull(),
    cityId: integer('city_id').notNull().references(() => cities.id, { onDelete: 'restrict' }),
    stateId: integer('state_id').notNull().references(() => states.id, { onDelete: 'restrict' }),
    countryId: integer('country_id').notNull().references(() => countries.id, { onDelete: 'restrict' }),
    postalCode: text('postal_code'),
    createdBy: integer('created_by').references(() => users.id, { onDelete: 'set null' }),
    updatedBy: integer('updated_by').references(() => users.id, { onDelete: 'set null' }),
    deletedAt: integer('deleted_at', { mode: 'timestamp' }),
    createdAt: integer('created_at', { mode: 'timestamp' }).default(sql`(unixepoch())`).notNull(),
    updatedAt: integer('updated_at', { mode: 'timestamp' }).default(sql`(unixepoch())`).notNull(),
  },
  (table) => ({
    nameIdx: index('devotees_name_idx').on(table.fullName),
    mobileIdx: index('devotees_mobile_idx').on(table.mobile),
    cityIdx: index('devotees_city_idx').on(table.cityId),
    stateIdx: index('devotees_state_idx').on(table.stateId),
    countryIdx: index('devotees_country_idx').on(table.countryId),
    deletedAtIdx: index('devotees_deleted_at_idx').on(table.deletedAt),
  }),
);

export type Country = typeof countries.$inferSelect;
export type State = typeof states.$inferSelect;
export type City = typeof cities.$inferSelect;
export type User = typeof users.$inferSelect;
export type Devotee = typeof devotees.$inferSelect;
export type NewDevotee = typeof devotees.$inferInsert;
