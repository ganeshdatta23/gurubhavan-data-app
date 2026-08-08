# Devotee Registry — Product & Implementation Plan

**Purpose:** A dependable, mobile-friendly registry that lets an organization maintain accurate member records, lets members submit and correct their own details, and lets authorized staff send consent-aware WhatsApp campaigns to precisely selected audiences.

## 1. Product overview

The Devotee Registry is the organization’s single source of truth for people, households, locations, communication preferences, and outreach activity. It replaces fragmented spreadsheets and ad-hoc WhatsApp lists with a simple workflow: find a record, register or correct it, review sensitive changes when needed, and communicate with the right people.

### Product goals

- Make registration approachable on a phone for people with varying digital confidence.
- Keep records accurate through validation, duplicate detection, correction history, and review.
- Let staff find and select a meaningful audience quickly without accidentally messaging everyone.
- Support future filtering by country, state, and city without data migration.
- Make broadcasts traceable, consent-aware, and safe to operate.

### Success measures

- Registration completion rate and median time to complete.
- Percentage of records with verified mobile number and complete location.
- Duplicate rate and correction approval turnaround time.
- Search-to-record-open time and search zero-result rate.
- Campaign delivery/read/failure rates, opt-out rate, and time to build an audience.

### Scope boundaries

The first release manages registration, corrections, search, filtering, selection, and WhatsApp campaigns. It does not attempt donations, event booking, or a full CRM; integrations can be added later through stable APIs.

## 2. User roles and personas

| Role | Primary needs | Permissions |
|---|---|---|
| Visitor / prospective member | Register quickly and understand why data is requested | Create own registration; view privacy notice |
| Registered member | Correct a phone number, address, or personal detail without calling staff | Sign in/verify OTP; view and submit corrections to own record |
| Data steward | Add people, resolve duplicates, validate corrections | Search, create, edit, merge, review changes; no campaign approval by default |
| Regional coordinator | Find people in an assigned geography and communicate locally | View assigned scope, create audiences/drafts, limited export |
| Campaign manager | Send approved announcements safely | Create, test, schedule, pause campaigns; see delivery metrics |
| Administrator | Maintain trusted data and access | All records, approvals, roles, locations, audit logs, campaign approval |
| Super administrator | Govern the system | Organization settings, retention, integrations, role administration |

Use least-privilege access. Regional scopes must be enforced in APIs as well as hidden in the interface.

## 3. Core user journeys

### A. Self-registration

1. A visitor opens a short, mobile-first registration page from a QR code or shared link.
2. They enter their mobile number; an OTP verifies ownership before personal data is saved.
3. The form collects required identity, contact, and location details in small sections with clear progress.
4. Inline validation explains fixes in plain language. Address suggestions and dependent location dropdowns reduce typing.
5. Before submission, the visitor reviews the details and chooses WhatsApp communication consent.
6. The system checks potential duplicates. A likely match offers “This may be you” with masked data and a correction/recovery route; it never exposes another person’s full record.
7. The visitor receives a confirmation and can later use OTP to view or request changes.

### B. Staff-assisted registration

1. Staff search first to avoid creating a duplicate.
2. If no matching person is found, they create a record using the same validation rules.
3. Staff records source and consent evidence; an unverified number is clearly labelled.
4. The new record appears immediately or awaits review according to policy.

### C. Correcting previously submitted details

1. A member verifies via OTP and sees a read-only profile summary.
2. They select “Correct details,” change only the needed fields, and provide a reason when required.
3. The system validates the change and shows exactly what will change.
4. Low-risk edits (for example spelling or address line) apply immediately; high-risk edits (mobile number, identity, consent, or merge-like conflicts) become a pending correction.
5. The member receives status updates. A reviewer sees old value, new value, source, timestamps, and conflict warnings before approving or rejecting.
6. Every applied edit is retained in the audit trail; records are never silently overwritten.

### D. Building and sending a broadcast

1. A campaign manager selects a saved audience or starts with filters.
2. They can search and include/exclude specific records, inspect the recipient count, and see excluded recipients with reasons.
3. They compose an approved WhatsApp template, preview it with merge fields, send a test to permitted internal numbers, and submit for approval if required.
4. On sending/scheduling, the platform creates an immutable recipient snapshot and sends through the approved WhatsApp provider in controlled batches.
5. The dashboard reports queued, sent, delivered, read, failed, and opted-out counts. Staff can pause an active campaign; retries follow provider rules.

## 4. Detailed feature list

### Registration and profile management

- Public, authenticated, and staff-assisted registration flows.
- Field-level help, autosave for authenticated forms, review-before-submit, and confirmation receipt.
- OTP authentication by WhatsApp/SMS; session expiry and rate limits.
- Profile view with verified/pending badges and correction history visible only to authorized people.
- Duplicate detection, merge queue, and soft archive rather than destructive delete.

### Record operations

- Server-paginated directory with columns, sorting, saved views, bulk-safe selection, and scoped export.
- Individual create, view, edit, archive, restore, merge, and correction approval.
- Audit log for every create, change, approval, export, login-sensitive event, and campaign action.
- Import wizard for legacy spreadsheets: mapping, preview, validation report, deduplication, dry run, and rollbackable import batch.

### Audience and campaigns

- Saved segments, dynamic filters, manual inclusions/exclusions, recipient preview, and recipient snapshotting.
- Template library, variables, test send, approval, scheduling, pausing, cancellation, and delivery webhooks.
- Consent and opt-out suppression enforced automatically.

## 5. Registration and correction data fields

Use `required` only where operationally necessary. Mark optional fields clearly and explain the purpose of sensitive fields.

| Group | Fields | Rules |
|---|---|---|
| Identity | Preferred name*, legal/full name*, date of birth (optional), gender (optional), profile photo (optional) | Names 2–120 characters; do not require gender/DOB unless a defined use exists |
| Contact | Mobile number*, alternate phone, email | Store country code; mobile verified by OTP; email normalized and validated |
| Address | Address line 1*, line 2, landmark, postal code, city*, state/province*, country* | Controlled location IDs plus display text; postal code format is country-aware |
| Household | Household name, relationship, guardian/spouse, household members | Relationships reference records; do not duplicate a shared address unnecessarily |
| Organization | Region/centre, membership status, registration source, notes | Staff-only fields are not shown publicly |
| Communication | WhatsApp consent*, language preference, opt-out status, consent source/time | Consent is explicit, versioned, and independently reversible |
| Record control | Status, created by, verification state, review state, timestamps | System-managed only |

For correction submissions, store `field`, `old_value`, `proposed_value`, `reason`, `evidence/reference` (if policy requires), `submitted_by`, `submitted_at`, `reviewer`, `decision`, and `decision_note`.

## 6. Search and selection UX

### Fuzzy search

Provide one prominent search box in the directory and compact search on mobile. Search across preferred/full name, mobile (digits normalized), email, member ID, city, and household name. Match case-insensitively, ignore punctuation/spacing in phone numbers, tolerate common transliteration and spelling errors, and rank exact member ID/mobile matches first.

- Begin showing debounced results after 2 characters; require 3 characters for broad name search if the dataset is large.
- Show result name, masked mobile, city/state, status, and match highlight—not sensitive fields.
- Support keyboard navigation, Enter to open, Escape to clear, and a useful empty state with “Create new record” only when authorized.
- Explain active filters and provide one-click clear. Search is never limited to only the loaded page.
- Use database full-text/trigram search or a dedicated search index; log zero-result searches without logging raw sensitive values in analytics.

### Selection and “Select all”

The selection checkbox in a table header has three states: unchecked, indeterminate, checked.

1. Clicking it selects all records **on the current page** and shows: “50 records on this page selected. Select all 2,431 matching records.”
2. The explicit secondary action selects every record matching the current query and filters, across pages.
3. The bulk action bar states the exact scope: “2,431 matching records selected,” with “Clear selection” and an option to return to page-only selection.
4. Changing search/filters after global selection requires confirmation: update selection to the new result set, or keep the existing snapshot.
5. Manual exclusions remain visible as a count. For broadcasts, the final eligible count excludes duplicates, invalid numbers, opt-outs, and inaccessible records, with reason breakdowns.

Never label page selection simply as “Select all,” and never permit a high-impact bulk action without a count and confirmation.

## 7. Location filtering logic

Store locations as normalized entities with stable IDs: `country_id`, `state_id`, and `city_id`; retain address text separately. Seed countries using ISO 3166 codes, support states/provinces under a country, and cities under a state. Allow an administrator-managed “Other/unlisted” option with a pending normalization queue.

- Country filter is independent; choosing it limits available states and cities.
- State filter requires/selects a country first; changing country clears incompatible state and city selections with an accessible explanation.
- City filter is available only after a compatible country/state selection, except global city search where the state/country is displayed to disambiguate.
- Multiple values within a level use OR; across levels use AND. Example: country=India AND state in {Tamil Nadu, Kerala} AND city in {Chennai, Kochi}.
- “No location recorded” is a first-class filter. Filter labels use human-readable names and selected IDs are stored in saved views.
- Future-ready geography fields include region/centre and latitude/longitude only when there is a justified use and consent basis.

## 8. WhatsApp broadcast workflow

Use the official WhatsApp Business Platform through a provider such as Meta Cloud API, Twilio, or an approved BSP. Use only approved templates when required by WhatsApp policy, and validate template variables before sending.

1. **Create:** name campaign, purpose, owner, language, approved template, and optional schedule/time zone.
2. **Audience:** choose saved segment or filters; optionally include/exclude selected records. Show estimated and final eligible counts.
3. **Compliance check:** automatically suppress missing/invalid numbers, WhatsApp opt-outs, revoked/no consent, duplicate mobile numbers, archived records, and records outside the user’s scope.
4. **Preview and test:** preview on a phone-shaped view with sample data; send a test only to verified internal test recipients.
5. **Approval:** require a second authorized approver for campaigns above a configurable threshold or for organization-wide audiences. Approval binds to template version and recipient snapshot.
6. **Send:** queue rate-limited batches, record provider message IDs, respect quiet hours and recipient time zones where known, and support pause/cancel before queued messages send.
7. **Measure and recover:** process signed webhooks idempotently; show delivery events and failure reasons. Retry only transient failures; never retry opt-outs or policy failures.
8. **Opt out:** every appropriate message provides a simple opt-out path (for example, reply STOP). Update suppression immediately and retain evidence.

Campaign content must not expose sensitive personal data in message bodies. Retain recipient snapshots and delivery logs for the defined policy period.

## 9. Dashboard ideas

### Member dashboard

- Profile completeness card, verification state, and “Correct details” primary action.
- Communication preferences and clear opt-out controls.
- Recent correction requests with pending/approved/rejected status and helpful next steps.

### Admin dashboard

- At-a-glance totals: active records, verified contacts, incomplete locations, pending corrections, possible duplicates, and recent registrations.
- Data-quality work queue prioritized by age/risk: unverified mobile, incomplete required fields, unresolved duplicate candidates.
- Geography overview with drill-down by country/state/city, respecting administrator scope.
- Campaign cards: drafts awaiting approval, scheduled sends, recent delivery health, and failed webhook alerts.
- Action-oriented empty states; avoid decorative charts that do not lead to a next action.

## 10. Edge cases and validation rules

- Normalize names, emails, phone digits, and whitespace before comparison; display users’ preferred formatting.
- A mobile number may belong to a household only with an explicit shared-number flag. Do not reject it blindly; flag it for staff context.
- Detect likely duplicates using mobile exact match, email exact match, and scored name + location similarity. Require human review before merging uncertain matches.
- Do not overwrite a verified phone with an unverified proposal. Require OTP or review.
- Keep historical location labels when an administrator renames a place; do not break existing filters.
- Support international addresses, state-less countries, city-states, missing postal codes, and non-Latin names.
- If an OTP is expired, limit resend attempts and present a clear retry time. Do not reveal whether a phone number belongs to an existing member beyond the safe recovery flow.
- Handle concurrent edits with record versioning: warn on stale data, show a field-by-field comparison, and require the editor to resolve conflicts.
- Failed imports and broadcasts must be resumable/idempotent with row/message-level error reports.
- Empty search/filter results should preserve the query and offer clear/filter actions, not imply data loss.
- Confirmation is required for archive, merge, bulk edit, export, and sending a campaign. Archive is reversible; audit data is immutable.

## 11. Non-functional requirements

- **Accessibility:** WCAG 2.2 AA; semantic controls, visible focus, keyboard operation, labels/instructions, error summaries, 44px touch targets, contrast-safe status colors, and screen-reader announcements for selection/result changes.
- **Performance:** common searches respond in under 500 ms at p95; directory initial load under 2.5 s on typical mobile networks; server-side pagination and indexed filtering.
- **Security/privacy:** TLS, encryption at rest, secret vault, RBAC and scoped authorization, CSRF protection, rate limiting, secure OTP handling, immutable audit logging, data minimization, and consent records. Follow applicable privacy law and WhatsApp policy with legal review.
- **Reliability:** daily backups, tested restore procedure, webhook retry/dead-letter handling, idempotency keys, monitoring, alerting, and a documented incident process.
- **Scalability:** stateless web/API tier, asynchronous campaign worker, queue-based sends, indexed relational data, and no client-side loading of the entire directory.
- **Observability:** structured logs with PII redaction, metrics, tracing, campaign/provider health, and auditable administrator activity.
- **Localization:** Unicode throughout, configurable languages/date formats/time zones, and translated template/form content.

## 12. Suggested tech stack

| Layer | Recommendation | Rationale |
|---|---|---|
| Web app | Next.js (TypeScript) | Server rendering, secure route handlers, strong ecosystem |
| UI | Tailwind CSS + shadcn/ui + React Hook Form + Zod | Accessible, consistent components and shared client/server validation |
| Database | PostgreSQL + Drizzle ORM | Relational integrity, full-text/trigram search, reliable filtering |
| Auth | Auth.js or managed provider + OTP service | Role support and secure authenticated member access |
| Jobs | Trigger.dev, Inngest, BullMQ, or cloud queue | Scheduled/batched broadcasts and webhook retry workflows |
| Messaging | Official Meta WhatsApp Cloud API or approved BSP | Policy-compliant templates and delivery webhooks |
| Storage | S3-compatible private object storage | Import files/evidence with signed URLs and retention rules |
| Hosting/monitoring | Vercel/Cloud Run + managed Postgres + Sentry/OpenTelemetry | Practical deployment, error monitoring, and scale path |

Use PostgreSQL rather than SQLite for the production multi-user/campaign workload. A local SQLite database may still be used for development.

## 13. Database schema outline

| Table | Key columns / purpose |
|---|---|
| `users` | id, auth subject, role, active, last_login_at |
| `people` | id, public/member ID, preferred/full name, normalized name, status, source, version, timestamps |
| `contact_methods` | id, person_id, type, value encrypted, normalized value/hash, verified_at, primary, shared flag |
| `addresses` | id, person_id/household_id, lines, postal code, city_id, state_id, country_id, primary |
| `households`, `household_members` | shared household/address and relationship mapping |
| `countries`, `states`, `cities` | stable code/name hierarchy, active flag, aliases |
| `consents` | person_id, channel, status, policy version, source, evidence, captured/revoked times |
| `correction_requests`, `correction_items` | request state and immutable field-level old/proposed values |
| `duplicate_candidates`, `merge_events` | score/reason, resolution, source/target, audit references |
| `saved_segments` | owner/scope and validated filter JSON/version |
| `campaigns`, `campaign_recipients` | template/version, audience snapshot, schedule/status; per-recipient outcome/provider ID |
| `message_events` | idempotent webhook event records and delivery timestamps |
| `audit_logs` | actor, action, entity, before/after redacted JSON, IP/request ID, timestamp |
| `imports`, `import_rows` | source file, mapping/version, validation result, row state |

Use foreign keys, unique partial indexes (for active normalized contact values where appropriate), composite indexes for location/status filtering, and search indexes for normalized names. Encrypt raw phone/email values; use keyed hashes for lookup/deduplication where feasible.

## 14. API and module breakdown

### API surface

- `POST /api/auth/otp/request`, `POST /api/auth/otp/verify`
- `GET/POST /api/people`, `GET/PATCH /api/people/:id`, `POST /api/people/:id/archive`
- `GET /api/search/people?q=&filters=`
- `POST /api/corrections`, `GET /api/corrections`, `POST /api/corrections/:id/approve|reject`
- `GET /api/locations/countries|states|cities` and admin location management endpoints
- `POST /api/segments/preview`, CRUD `/api/segments`
- CRUD `/api/campaigns`, `POST /api/campaigns/:id/test|approve|schedule|send|pause|cancel`
- `POST /api/webhooks/whatsapp` with signature verification and idempotency
- Admin-only `/api/imports`, `/api/exports`, `/api/audit-logs`, `/api/users`

### Modules

- Identity and authorization; people/profile; contacts and consent; locations; search; corrections/review; duplicates/merge; segmentation; campaign orchestration; WhatsApp provider adapter; imports/exports; audit/observability; shared validation and design system.

Every mutation checks authorization on the server, validates with shared schemas, writes an audit event, and returns actionable field errors. Long-running work runs asynchronously and exposes a status endpoint/UI.

## 15. UI/UX guidelines

- Keep one primary action per screen: Register, Save correction, or Continue campaign.
- Use a calm, minimalist layout: generous whitespace, a restrained neutral palette with one accessible accent, simple icons paired with text, and no dashboard clutter.
- Favor progressive disclosure. Start with essential fields; group optional or staff-only fields in expandable sections.
- Make form state unmistakable: required marker explained once, inline validation after blur, error summary on submit, preserved input after any failure, and success states that describe what happens next.
- Use standard dropdowns/autocomplete for controlled states and locations; allow keyboard type-ahead, loading feedback, and an accessible unlisted option.
- Present destructive/high-impact actions in confirmation dialogs that name the consequence and affected count. Do not use color alone to convey urgency/status.
- Mobile first: sticky bottom action bar for long forms, responsive tables that become result cards, and no hover-only interactions.
- Avoid exposing private data in list views, notifications, URLs, analytics, or WhatsApp previews.

## 16. Development phases and roadmap

### Phase 0 — Discovery and foundation (1–2 weeks)

Confirm data policy, consent wording, regional ownership model, legacy data quality, WhatsApp provider/template approval, accessibility baseline, and measurable acceptance criteria. Define location taxonomy and migration strategy.

### Phase 1 — Trusted registry MVP (3–5 weeks)

Deliver authentication/roles, responsive registration, staff directory, normalized location dropdowns, validation, basic fuzzy search, profile editing, audit logs, and legacy import dry run. Test with real staff and a small member cohort.

### Phase 2 — Corrections and data quality (2–3 weeks)

Add OTP member access, correction submission/review, duplicate candidates/merge controls, scoped permissions, saved filters, data-quality queue, and export controls.

### Phase 3 — Broadcasts (3–4 weeks)

Integrate official WhatsApp provider; add consent/suppression, audience preview and explicit select-all, template/test/approval/scheduling workflows, job queue, webhooks, delivery reporting, and incident runbook. Pilot with a small opted-in segment before broad use.

### Phase 4 — Scale and optimization (ongoing)

Add advanced segmentation, localization, regional dashboards, bulk correction workflows, retention automation, richer reporting, integration APIs, load testing, accessibility audits, disaster-recovery exercises, and continuous user research.

### Release gates

Before each production release, verify role boundaries, consent enforcement, backup restore, error handling, accessibility-critical flows, search accuracy, campaign recipient counts, provider webhook signatures, and audit trail completeness. Roll out new high-impact capabilities behind feature flags with a support and rollback plan.
