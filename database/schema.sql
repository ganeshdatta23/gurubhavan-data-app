-- Devotee Registry: canonical Turso / LibSQL schema
-- Apply this file once to a new database. It is intentionally idempotent.
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS countries (
  id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, iso2 TEXT NOT NULL,
  phone_code TEXT NOT NULL, created_at INTEGER NOT NULL DEFAULT (unixepoch())
);
CREATE UNIQUE INDEX IF NOT EXISTS countries_name_idx ON countries(name);
CREATE UNIQUE INDEX IF NOT EXISTS countries_iso2_idx ON countries(iso2);

CREATE TABLE IF NOT EXISTS states (
  id INTEGER PRIMARY KEY AUTOINCREMENT, country_id INTEGER NOT NULL REFERENCES countries(id) ON DELETE RESTRICT,
  name TEXT NOT NULL, code TEXT, created_at INTEGER NOT NULL DEFAULT (unixepoch())
);
CREATE INDEX IF NOT EXISTS states_country_idx ON states(country_id);
CREATE UNIQUE INDEX IF NOT EXISTS states_country_name_unique ON states(name, country_id);

CREATE TABLE IF NOT EXISTS districts (
  id INTEGER PRIMARY KEY AUTOINCREMENT, state_id INTEGER NOT NULL REFERENCES states(id) ON DELETE RESTRICT,
  name TEXT NOT NULL, created_at INTEGER NOT NULL DEFAULT (unixepoch())
);
CREATE INDEX IF NOT EXISTS districts_state_idx ON districts(state_id);
CREATE UNIQUE INDEX IF NOT EXISTS districts_state_name_unique ON districts(name, state_id);

CREATE TABLE IF NOT EXISTS cities (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  district_id INTEGER REFERENCES districts(id) ON DELETE RESTRICT,
  state_id INTEGER NOT NULL REFERENCES states(id) ON DELETE RESTRICT,
  name TEXT NOT NULL, created_at INTEGER NOT NULL DEFAULT (unixepoch())
);
CREATE INDEX IF NOT EXISTS cities_district_idx ON cities(district_id);
CREATE INDEX IF NOT EXISTS cities_state_idx ON cities(state_id);
CREATE UNIQUE INDEX IF NOT EXISTS cities_state_name_unique ON cities(name, state_id);

CREATE TABLE IF NOT EXISTS source_groups (
  id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, description TEXT,
  created_at INTEGER NOT NULL DEFAULT (unixepoch())
);
CREATE UNIQUE INDEX IF NOT EXISTS source_groups_name_idx ON source_groups(name);

CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT, email TEXT NOT NULL, password_hash TEXT NOT NULL,
  name TEXT NOT NULL, role TEXT NOT NULL DEFAULT 'member' CHECK(role IN ('super_admin','admin','viewer','member')),
  source_group_id INTEGER REFERENCES source_groups(id) ON DELETE SET NULL,
  is_active INTEGER NOT NULL DEFAULT 1, last_login_at INTEGER,
  created_at INTEGER NOT NULL DEFAULT (unixepoch()), updated_at INTEGER NOT NULL DEFAULT (unixepoch())
);
CREATE UNIQUE INDEX IF NOT EXISTS users_email_idx ON users(email);
CREATE INDEX IF NOT EXISTS users_role_idx ON users(role);

CREATE TABLE IF NOT EXISTS devotees (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  source_group_id INTEGER NOT NULL REFERENCES source_groups(id) ON DELETE RESTRICT,
  linked_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  full_name TEXT NOT NULL, address_line1 TEXT, address_line2 TEXT, address_line3 TEXT,
  city_id INTEGER REFERENCES cities(id) ON DELETE SET NULL,
  district_id INTEGER REFERENCES districts(id) ON DELETE SET NULL,
  state_id INTEGER REFERENCES states(id) ON DELETE SET NULL,
  country_id INTEGER REFERENCES countries(id) ON DELETE SET NULL,
  postal_code TEXT,
  record_status TEXT NOT NULL DEFAULT 'needs_review' CHECK(record_status IN ('clean','needs_review','duplicate')),
  whatsapp_opted_out INTEGER NOT NULL DEFAULT 0, notes TEXT,
  created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  updated_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  deleted_at INTEGER, created_at INTEGER NOT NULL DEFAULT (unixepoch()), updated_at INTEGER NOT NULL DEFAULT (unixepoch())
);
CREATE INDEX IF NOT EXISTS devotees_name_idx ON devotees(full_name);
CREATE INDEX IF NOT EXISTS devotees_record_status_idx ON devotees(record_status);
CREATE INDEX IF NOT EXISTS devotees_city_idx ON devotees(city_id);
CREATE INDEX IF NOT EXISTS devotees_district_idx ON devotees(district_id);
CREATE INDEX IF NOT EXISTS devotees_state_idx ON devotees(state_id);
CREATE INDEX IF NOT EXISTS devotees_country_idx ON devotees(country_id);
CREATE INDEX IF NOT EXISTS devotees_source_group_idx ON devotees(source_group_id);
CREATE INDEX IF NOT EXISTS devotees_whatsapp_opted_out_idx ON devotees(whatsapp_opted_out);
CREATE INDEX IF NOT EXISTS devotees_linked_user_idx ON devotees(linked_user_id);
CREATE INDEX IF NOT EXISTS devotees_deleted_at_idx ON devotees(deleted_at);

CREATE TABLE IF NOT EXISTS devotee_phones (
  id INTEGER PRIMARY KEY AUTOINCREMENT, devotee_id INTEGER NOT NULL REFERENCES devotees(id) ON DELETE CASCADE,
  phone_number TEXT NOT NULL, is_primary INTEGER NOT NULL DEFAULT 0, country_code TEXT NOT NULL DEFAULT '+91',
  created_at INTEGER NOT NULL DEFAULT (unixepoch()), updated_at INTEGER NOT NULL DEFAULT (unixepoch())
);
CREATE INDEX IF NOT EXISTS devotee_phones_devotee_idx ON devotee_phones(devotee_id);
CREATE UNIQUE INDEX IF NOT EXISTS devotee_phones_number_idx ON devotee_phones(phone_number);

CREATE TABLE IF NOT EXISTS review_flags (
  id INTEGER PRIMARY KEY AUTOINCREMENT, devotee_id INTEGER NOT NULL REFERENCES devotees(id) ON DELETE CASCADE,
  flag TEXT NOT NULL, resolved_at INTEGER, resolved_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at INTEGER NOT NULL DEFAULT (unixepoch())
);
CREATE INDEX IF NOT EXISTS review_flags_devotee_idx ON review_flags(devotee_id);
CREATE UNIQUE INDEX IF NOT EXISTS review_flags_devotee_flag_unique ON review_flags(devotee_id, flag);

CREATE TABLE IF NOT EXISTS audit_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  entity_type TEXT NOT NULL CHECK(entity_type IN ('devotee','devotee_phone','review_flag','campaign','user')),
  entity_id INTEGER NOT NULL, action TEXT NOT NULL CHECK(action IN ('create','update','delete','export')),
  old_values TEXT, new_values TEXT, ip_address TEXT, created_at INTEGER NOT NULL DEFAULT (unixepoch())
);
CREATE INDEX IF NOT EXISTS audit_logs_user_idx ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS audit_logs_entity_idx ON audit_logs(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS audit_logs_created_at_idx ON audit_logs(created_at);

CREATE TABLE IF NOT EXISTS campaigns (
  id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, template_name TEXT NOT NULL,
  template_language TEXT NOT NULL DEFAULT 'en', template_variables TEXT, audience_filters TEXT,
  status TEXT NOT NULL DEFAULT 'draft' CHECK(status IN ('draft','queued','running','completed','failed','scheduled')),
  scheduled_at INTEGER, started_at INTEGER, completed_at INTEGER,
  total_recipients INTEGER NOT NULL DEFAULT 0, sent_count INTEGER NOT NULL DEFAULT 0,
  delivered_count INTEGER NOT NULL DEFAULT 0, read_count INTEGER NOT NULL DEFAULT 0, failed_count INTEGER NOT NULL DEFAULT 0,
  created_by INTEGER NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  created_at INTEGER NOT NULL DEFAULT (unixepoch()), updated_at INTEGER NOT NULL DEFAULT (unixepoch())
);
CREATE INDEX IF NOT EXISTS campaigns_status_idx ON campaigns(status);
CREATE INDEX IF NOT EXISTS campaigns_created_by_idx ON campaigns(created_by);
CREATE INDEX IF NOT EXISTS campaigns_scheduled_at_idx ON campaigns(scheduled_at);

CREATE TABLE IF NOT EXISTS campaign_deliveries (
  id INTEGER PRIMARY KEY AUTOINCREMENT, campaign_id INTEGER NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  devotee_id INTEGER NOT NULL REFERENCES devotees(id) ON DELETE CASCADE, phone_number TEXT NOT NULL,
  whatsapp_message_id TEXT,
  status TEXT NOT NULL DEFAULT 'queued' CHECK(status IN ('queued','sent','delivered','read','failed','skipped_opted_out','skipped_no_phone')),
  error_code TEXT, error_message TEXT, sent_at INTEGER, delivered_at INTEGER, read_at INTEGER,
  created_at INTEGER NOT NULL DEFAULT (unixepoch()), updated_at INTEGER NOT NULL DEFAULT (unixepoch())
);
CREATE INDEX IF NOT EXISTS campaign_deliveries_campaign_idx ON campaign_deliveries(campaign_id);
CREATE INDEX IF NOT EXISTS campaign_deliveries_devotee_idx ON campaign_deliveries(devotee_id);
CREATE INDEX IF NOT EXISTS campaign_deliveries_status_idx ON campaign_deliveries(status);
CREATE INDEX IF NOT EXISTS campaign_deliveries_wa_msg_idx ON campaign_deliveries(whatsapp_message_id);
CREATE UNIQUE INDEX IF NOT EXISTS campaign_deliveries_campaign_devotee_unique ON campaign_deliveries(campaign_id, devotee_id);
