# Admin Data Management Web Application

**Product:** Guru Bhavan Devotee Registry (admin-only data management)  
**UI mode:** **Simple but polished**, very easy for non-technical staff (“noobs”)  
**Priority:** **Mobile-first** — phone must work great; desktop is an enhancement of the same layout  
**Goal:** Register devotees quickly, view/filter/edit/delete, import Excel, export filtered data.

Build on the existing Next.js codebase under `src/` where practical. Prefer **simplifying** current UI over adding more chrome. Domain language: **Devotee**.

---

## 0. Decisions locked in

| Topic | Decision |
|---|---|
| Roles | **Admin only** — no Super Admin, Viewer, or Member |
| Auth | **3 seeded accounts** only; no user-management UI |
| Entity | Devotee |
| Org / source group | **Removed** |
| WhatsApp / comms fields | **Removed** |
| Primary UI | **Three tabs** — Overview, Add person, and People; no sidebar app |
| Default list sort | **City A–Z**, then name A–Z |
| Soft delete | **Yes** |
| Design priority | **Mobile-first**, then desktop |
| Design quality | **Simple but polished** — calm, clear, not bare/ugly and not “enterprise CRM” |
| Audience | Volunteers / staff with little computer experience |

---

## 1. Authentication (simple)

### 1.1 Login page (mobile-first)

Full-width friendly card; on phone it nearly fills the width with comfortable padding; on desktop it stays a centered card (~400px).

- Large labels: **Username**, **Password**
- Large tap targets (inputs ~48px tall)
- One primary button: **Log in** (full width on mobile)
- Friendly error under the form: “Wrong username or password. Try again.”
- No register link, no forgot-password for v1
- After success → two-tab admin shell
- Session: httpOnly cookie + JWT (existing pattern)

### 1.2 Seeded admin accounts

| # | Username | Password | Display name |
|---|---|---|---|
| 1 | `lakshminarayana` | `Gurubhavan@1942` | Lakshminarayana |
| 2 | `volunteer` | `sdhsVol@1942` | Volunteer |
| 3 | `admin` | `admin@1942` | Admin |

- Prefer a real `username` column (or map cleanly if schema still uses email)
- Role: `admin` for all three; `isActive = true`
- bcrypt hashes only; bootstrap credentials — rotate for real production

### 1.3 Permissions

Every admin can: add, view, filter, edit, soft-delete, import, export.  
No admin-user screens.

---

## 2. Devotee data model

### 2.1 Fields

| Field | Required | Notes |
|---|---|---|
| `fullName` | **Yes** | Trim; 2–120 chars |
| `mobile` | **Yes** | One number; normalize digits |
| `address` | **Yes** | Single text field |
| `countryId` | **Yes** | Default **India** on Tab 1 |
| `stateId` | **Yes** | Cascade from country |
| `cityId` | **Yes** | Cascade from state |
| `postalCode` (PIN) | **Conditional** | **Required for India.** Not asked / not required for foreign countries |
| `email` | **No** | Optional; lowercase + format check if present |
| `createdAt` / `updatedAt` | System | |
| `createdBy` / `updatedBy` | System | |
| `deletedAt` | System | Soft delete |

**PIN / city helper (nice, if free API is easy):**

- For India: optional free PIN lookup to suggest city; if entered PIN conflicts with selected city, show a clear error/warning
- Foreign countries: **skip PIN field and PIN validation**

**Removed from product:** source group, multi-phone, multi-line address, notes, district in the form, WhatsApp fields, record-status badges as first-class UI.

### 2.2 Table (conceptual)

```
devotees
  id, full_name, mobile, email,
  address, city_id, state_id, country_id, postal_code,
  created_at, updated_at, created_by, updated_by, deleted_at
```

Indexes: name, mobile, city, state, country, deleted_at.

### 2.3 Validation

- Required fields as above; empty submit blocked
- Mobile shape after normalize
- Location FKs must be valid
- PIN required only when country is India (6 digits)
- Duplicate mobile → warn or block with clear message

---

## 3. UI design contract — simple, polished, mobile-first, noob-friendly

### 3.0 Product feel (north star)

This is a tool for **volunteers who may not be computer-confident**. The UI must feel:

- **Simple** — only two places to go; short labels in plain English  
- **Polished** — consistent spacing, clear hierarchy, calm colors, smooth feedback (not a raw HTML prototype)  
- **Forgiving** — big buttons, clear errors, confirm before delete, no hidden gestures  
- **Mobile-first** — designed for one-hand use on a phone first; desktop gets more width, not a different product  

If a volunteer cannot add a person in under a minute on their phone without training, the UI is too hard.

### 3.1 Design principles

1. **Mobile-first layout** — single column by default; enhance to 2 columns only from `md`/`lg` up  
2. **One job per tab** — Tab 1 = add people; Tab 2 = find / edit / import / download  
3. **No sidebar, no broadcasts nav**
4. **One shared form** for create + edit — no multi-step wizard, no draft autosave  
5. **Plain language** — “Save devotee”, “Search people”, “Delete”, “Download Excel” (not “Submit entity”, “Query”, “Archive”, “Export payload”)  
6. **Native controls first** — large inputs + native selects; type-ahead only if city list is huge  
7. **Obvious feedback** — success banner/toast, field errors in red under the field, loading text on buttons  
8. **Few screens** — login + 2 tabs + small modals only  
9. **Touch-first targets** — minimum ~44–48px height for inputs, buttons, tabs, row actions  
10. **Accessible by default** — visible labels (not placeholder-only), good contrast, focus rings, readable font size (16px+ body on mobile)

### 3.2 Visual language (polished, not fancy)

| Token | Choice |
|---|---|
| Background | Soft light gray page |
| Surface | White cards, 1px light border, subtle shadow only if it helps depth |
| Text | Dark slate body; muted gray for hints |
| Accent | One warm accent (amber/gold is fine) for primary buttons + active tab |
| Radius | 10–12px cards; 8–10px inputs/buttons |
| Type | Inter or system UI; **base 16px on mobile**; clear hierarchy (title → section → label → help) |
| Density | Comfortable — more padding on phone, slightly tighter on desktop |
| Icons | Optional small icons next to text (never icon-only for main actions) |

**Do use:** consistent vertical rhythm, sticky save bar on mobile forms if needed, skeleton/loading text, empty states with a short next step.

**Do not use:** dark mode, heavy glassmorphism, decorative charts, hamburger menus, icon-only nav, tiny table text, hover-only actions (breaks mobile).

### 3.3 Mobile-first breakpoints

Design and implement in this order:

| Stage | Width | Behavior |
|---|---|---|
| **Base (phone)** | &lt; 640px | Single column; card list for devotees; full-width buttons; stacked filters; sticky bottom primary action on forms if helpful |
| **Tablet** | ≥ 640px | Form can go 2 columns; filters in a row; cards or compact table |
| **Desktop** | ≥ 1024px | Wider content (~1040–1120px); data **table** OK; header shows username + logout in one row |

**Priority order when trading off:** phone usability &gt; tablet &gt; desktop polish.

### 3.4 Layout shell

**Phone**

```
┌─────────────────────────┐
│ Guru Bhavan      Logout │
│ (username smaller)      │
├─────────────────────────┤
│ [ Add person ] [ People ]│  ← large equal tabs, full width
├─────────────────────────┤
│                         │
│   tab content           │
│   (padding 16px)        │
│                         │
└─────────────────────────┘
```

**Desktop**

```
┌──────────────────────────────────────────────────────┐
│  Guru Bhavan Registry     logged in as X    Logout   │
├──────────────────────────────────────────────────────┤
│  [ Add person ]   [ People ]                         │
├──────────────────────────────────────────────────────┤
│              max-width content, padded               │
└──────────────────────────────────────────────────────┘
```

**Tab labels (noob-friendly, locked):**

| Tab | Label on UI | Meaning |
|---|---|---|
| 1 | **Add person** | Registration / data entry |
| 2 | **People** | Search, edit, delete, upload, download |

(Internal docs may still say Registration / Devotee data.)

- Active tab: accent underline or filled pill — very obvious which tab is open  
- Tabs are large enough to tap with a thumb  
- No 4-item bottom nav; no left sidebar  

### 3.5 Noob-friendly copy & guidance

| Place | Copy style |
|---|---|
| Tab 1 title | “Add a person” |
| Tab 1 help | One line: “Fill the form and tap Save. You can add the next person right away.” |
| Required | Mark with * and short “Required” on first error if needed |
| Optional email | Label: “Email (optional)” |
| Empty People list | “No people yet. Go to Add person to register someone.” |
| No search hits | “No one matches. Clear filters or try another name.” |
| Delete confirm | “Remove {name} from the list? You can ask an admin if this was a mistake.” (or shorter: “Delete {name}?”) |
| Save success | “Saved. You can add another person.” |
| Import | “Upload Excel” → “Check the list” → “Import good rows” |

Avoid jargon: no “CRUD”, “entity”, “payload”, “soft delete”, “cascade”, “registry” in primary UI strings (app title may still say Registry).

### 3.6 Forms (easy + polished)

- **Always-visible labels** above fields (not floating-only, not placeholder-as-label)  
- Helper text only when needed (e.g. mobile: “10-digit mobile number”)  
- Errors: red text **under** the field; scroll first error into view on submit  
- `inputMode="tel"` for mobile; `inputMode="numeric"` for PIN  
- Autocomplete attributes where useful (`name`, `tel`, `email`)  
- Primary button full width on mobile; right-aligned on desktop  
- Disable button + show “Saving…” while request runs  
- Success: green/soft banner at top of card **and/or** toast — visible without hunting  

### 3.7 People list — mobile vs desktop

**Mobile (default — priority):**

- Each devotee = **card** (not a tiny table)  
- Card shows: **Name** (bold) → mobile (large, tappable `tel:` link optional) → city, state → short address line  
- Actions: two clear buttons **Edit** | **Delete** (not a ⋮ menu)  
- Filters: search on top; country/state/city as full-width selects stacked or in a “Filters” disclosure if space is tight  
- Actions row: **Upload** and **Download** as full-width or 50/50 buttons  

**Desktop:**

- Same data as a clean **table** with row actions  
- Filters in one horizontal row  
- Same buttons, not a different workflow  

Do **not** ship a desktop-only table that is unusable on phones (horizontal micro-scroll of 8 columns with no cards).

### 3.8 Touch, motion, polish checklist

- Tap targets ≥ 44px  
- Safe padding from screen edges (16px+)  
- No hover-only Edit/Delete  
- Soft transitions OK (150–200ms); no flashy animation  
- Sticky header optional; don’t hide tabs off-screen  
- Keyboard: forms work with Next/Done on mobile keyboards  
- Offline-ish honesty: if save fails, show “Could not save. Check internet and try again.”  

### 3.9 What we remove from the current UI

| Current | Action |
|---|---|
| Sidebar: Dashboard / Registry / Import / Broadcasts | **Remove** → Overview, Add person, and People tabs |
| Dashboard welcome cards | **Remove** |
| Multi-step wizard + draft save | **Replace** with one flat form |
| Duplicate registration modal | **Merge** into shared form |
| District in location UI | **Drop from form** |
| Chapter, status badges, multi-select checkboxes | **Remove** |
| Broadcasts in this shell | **Out of scope** |
| Separate Import page as main entry | **Upload inside People tab** |
| Desktop-first dense tables only | **Card list on mobile** |

### 3.10 Component / stack choices (thin + polished)

| Need | Use |
|---|---|
| Styling | Tailwind, mobile-first utilities (`flex`, `grid`, `md:`) |
| Controls | Consistent input/button classes; reuse existing primitives lightly |
| Toasts / banners | Clear success + error (sonner OK if messages are plain language) |
| Forms | **One** pattern + Zod |
| Location | Cascading native selects; search-select only if cities are huge |
| List | **Cards on mobile**, table from `md`/`lg` up |
| Modals | Full-screen sheet on mobile for Edit/Import; centered dialog on desktop |

**Do not introduce:** new UI kits, data-grid libraries, command palettes, theme switchers, complex side drawers.

---

## 4. Tab 1 — Add person (registration)

**Purpose:** Fast entry when people arrive — especially on a phone.

### 4.1 Layout (mobile-first)

One polished white card: title **Add a person**, short help line under it.

```
Full name *
Mobile number *
Address *              (textarea, 2–3 rows)
Country *              (default India)
State *
City *
PIN code *             (only if country = India)
Email (optional)

[     Save person     ]   ← full width on phone
```

- **Phone:** single column, large fields, generous gaps  
- **Desktop (`md+`):** 2-column grid for pairs (name/mobile, country/state, city/PIN); address + email full width  
- Optional **sticky bottom bar on mobile** with Save so the thumb always finds it after scrolling  
- Required `*`; errors under fields; button shows **Saving…** and is disabled while in flight  

### 4.2 Behavior

1. Validate → POST → success: “Saved. You can add another person.”  
2. **Stay on Add person**  
3. **Clear** name, mobile, address, email, city, PIN  
4. **Keep** country (and state if useful) for the next person from the same place  
5. Record shows up under **People** when they open that tab  

No wizard. No review step. No draft autosave.

---

## 5. Location model (mandatory, simple UI)

### 5.1 Data

- Normalized: **countries → states → cities** (district table may remain in DB unused by UI)  
- Store FKs: `countryId`, `stateId`, `cityId`  
- PIN separate field  

### 5.2 Form controls

1. Country select → loads states  
2. State select → loads cities; clears city when state changes  
3. City select  
4. Changing country clears state + city (+ PIN if leaving India)  

Prefer **native `<select>`** for country and state.  
Use type-ahead combobox **only if** city options are large and slow to scan.

### 5.3 Filters (Tab 2)

Same cascade as filters (Country → State → City), plus free-text search.

- AND across levels  
- Parent change clears child filters  
- Server-side only  

Multi-select filters are **optional / not required for v1** — single country, single state, single city is enough.

### 5.4 Missing city

v1 optional: small “City not listed?” → add city under current state. Skip pending-queue UX unless needed later.

---

## 6. Tab 2 — People (manage)

**Purpose:** Find people, edit, delete, import, download — easy on phone and desktop.

### 6.1 Layout (top → bottom, mobile-first)

```
Search people (name or mobile)
Country / State / City   [Clear filters]

[ Upload Excel ]  [ Download ]

Showing 1–20 of 5,240 · by city

── list (cards on phone / table on desktop) ──

[ Previous ]   Page 1 of N   [ Next ]
```

### 6.2 Default sort

1. City name A–Z  
2. Full name A–Z  

### 6.3 List presentation

**Mobile — person cards (required):**

```
┌──────────────────────────────┐
│  Ramesh Kumar                │
│  98765 43210                 │
│  Mysore · Karnataka          │
│  12 Main Road…               │
│  [ Edit ]      [ Delete ]    │
└──────────────────────────────┘
```

**Desktop — table:**

| Name | Mobile | Address | City | State | PIN | Country | Email | Edit | Delete |

No checkboxes, chapter, or status badges.

### 6.4 Search & filters

- One search box with clear placeholder: “Search name or mobile”  
- Country → State → City (native selects; full width on phone)  
- **Clear filters** as a text button when any filter is active  
- Count in plain words: “Showing 1–20 of 5,240 people”  
- All server-side  

### 6.5 Pagination

- Large Previous / Next buttons (easy thumbs)  
- “Page X of Y”  
- Page size: 10 / 20 / 50 (100 OK on desktop); default 20  
- Applies to filtered set  

### 6.6 Edit

- **Phone:** full-screen sheet / almost full-screen panel with same form as Add person  
- **Desktop:** centered modal  
- Prefill; same validation  
- Save → “Updated.” → close → refresh list  
- Cancel always visible  

### 6.7 Delete (soft)

- Confirm dialog with person’s name  
- Soft-delete (`deletedAt`); hide from list and downloads  
- “Show deleted” later — not required for v1  

### 6.8 Upload / Download (noob-friendly)

- Labels: **Upload Excel**, **Download**  
- Download: if no filters → all people; if filters on → only matching people; **never only this page**  
- Confirm: “Download 243 people as Excel?”  
- Prefer Excel first; CSV optional secondary  
- On mobile, stack Upload/Download as full-width buttons so they are hard to miss

---

## 7. Excel import (Tab 2 only)

### 7.1 Entry

Button **Upload Excel** on Tab 2 actions row.  
Opens a simple panel/modal — not a separate app page.

### 7.2 Template columns

| Full Name | Mobile | Address | City | State | PIN | Country | Email |

Provide **Download template**.

Accept `.xlsx` only if possible.

### 7.3 Pipeline

1. Validate type/size  
2. Read + map headers  
3. Auto-clean: trim, collapse spaces, normalize mobile, lowercase email, clean PIN digits, match location names to FKs when confident  
4. Validate rows  
5. Flag duplicates (in-file + vs DB)  
6. **Preview** counts + invalid reasons  
7. Confirm → insert **valid rows only**  

### 7.4 Preview UI (simple + clear for noobs)

```
We checked your file:
  Total rows: 1000
  Ready to import: 970
  Problems: 20
  Already in list: 10

[ short list of problem rows: Row · Name · Mobile · What’s wrong ]

[ Cancel ]   [ Import 970 good rows ]   [ Download problem list ]
```

- Full-screen sheet on mobile; modal on desktop  
- Plain language; big primary button for import  
- No multi-step wizard chrome

---

## 8. Export / download (Tab 2)

- **No filters** → download **all active** devotees  
- **Filters on** → download **only filtered** active rows  
- **Not limited to current page**  
- Confirm with count: `Download 2,431 devotees as Excel?`  
- Formats: **Excel primary**, CSV secondary  
- PDF/Word only if already free to keep; not required for simple UI  

---

## 9. Soft delete & timestamps

- Soft delete via `deletedAt`  
- `createdAt` / `updatedAt` / `createdBy` / `updatedBy` always maintained  
- No need to show audit columns in the main table for v1  

---

## 10. Screens summary (only these)

| Screen | Route idea | UI |
|---|---|---|
| Login | `/login` | Mobile-first centered card |
| Admin shell | `/admin` | Header + **Add person** / **People** tabs |
| Tab 1 | same page | Add-person form card |
| Tab 2 | same page | Search, filters, cards/table, upload/download |
| Edit | sheet (mobile) / modal (desktop) | Same form |
| Import | sheet / modal on People | Upload + plain-language preview |

**No** broadcasts shell, **no** separate import page as the main path. Overview is the default admin home and uses only real registry data.

### Locked UX defaults

| Topic | Choice |
|---|---|
| Tab labels | **Add person** \| **People** |
| After save | Stay on Add person; clear person fields; keep country |
| Upload / download | People tab only |
| List on phone | **Cards** (required) |
| List on desktop | Table OK |
| Deleted rows | Hidden in v1 |
| KPIs / dashboard | Overview uses real aggregated registry data |
| Default country | **India** |
| District in UI | No |
| Multi-select filters | No |
| Row selection for campaigns | No |
| Design priority | **Mobile first**, then desktop |

---

## 11. API sketch

Prefer existing `/api/devotees`, `/api/imports`, `/api/export/*`, `/api/lookup/*`.

### Auth

- `POST /api/auth/login` — username + password  
- `POST /api/auth/logout`  
- `GET /api/auth/me`  

Disable/remove public register.

### Devotees

- `POST /api/devotees`  
- `GET /api/devotees` — `q`, filters, page, pageSize; sort city then name; active only by default  
- `GET /api/devotees/:id`  
- `PUT /api/devotees/:id`  
- `DELETE /api/devotees/:id` — soft delete  

### Import / export / lookup

- `POST /api/imports` + template download  
- `GET /api/export/excel?…` / `csv?…` — same filters as list  
- `GET /api/lookup/countries|states|cities`  

All require admin session.

---

## 12. Security

- bcrypt passwords  
- httpOnly session cookie; secure in production  
- Protect admin UI + APIs  
- Zod validation server-side  
- File type + size limits  
- ORM/parameterized queries only  
- No secrets or password hashes in client  

---

## 13. Performance

- Server-side pagination + filters  
- Indexes on filter/sort columns  
- Never ship full table to the browser  
- Export builds server-side from filtered query  
- Loading / empty states  

---

## 14. User flow

```
Login (3 seeded admins) — large phone-friendly form
    ↓
Header + two big tabs
    ├── Add person → fill → Save → “Saved” → clear → next person
    └── People
            ├── Search / filter (city-sorted)
            ├── Cards on phone / table on desktop
            ├── Edit (sheet/modal) / Delete (confirm)
            ├── Upload Excel → check → import good rows
            └── Download all or filtered
```

---

## 15. Tech constraints

| Layer | Choice |
|---|---|
| App | Next.js App Router + TypeScript |
| UI | **Tailwind, mobile-first** — simple but polished; not a full design-system app |
| Forms | One pattern + Zod shared validation |
| DB | Drizzle + Turso/LibSQL |
| Auth | Existing JWT cookie session; username login; admin only |
| Excel | ExcelJS |
| Export | Excel + CSV first |

Do not add a separate backend. Do not reintroduce Super Admin or sidebar modules in this plan.

---

## 16. Definition of Done

1. Login works for the three seeded admins (§1.2)  
2. No Super Admin, no open registration, no sidebar CRM  
3. **Mobile-first two-tab UI** matches §3–§6 (usable one-handed on a phone)  
4. **Desktop** looks polished and uses the same flows (table may replace cards)  
5. Add person: flat form; default country India; PIN only for India  
6. People: city-sorted list, search/filter, pagination; **cards on mobile**  
7. Edit + soft delete work with clear confirmations  
8. Excel template + upload + clean + plain-language preview + import valid rows  
9. Download all, or filtered only when filters applied  
10. Location cascade with FKs (simple selects)  
11. Noob copy: plain English labels, empty states, errors  
12. README: run, seed, env, template, credentials  
13. Quick manual check: add + search + edit + delete + download on a **phone-width** viewport

### Local credentials

```
lakshminarayana / Gurubhavan@1942
volunteer / sdhsVol@1942
admin / admin@1942
```

---

## 17. Explicit non-goals

- Super Admin / multi-role UI  
- Admin user management  
- Source groups / chapters  
- WhatsApp consent + broadcast UI in this shell  
- Member OTP / public registration  
- Multi-step registration wizard  
- Campaign dashboards / delivery charts
- Dark mode  
- Campaign-style multi-select rows  
- Hard delete as default  
- Desktop-only dense admin skins that break on phones  
- Icon-only navigation or hover-only actions  

---

## 18. Implementation notes for agents

- This document is the product + **UI** contract.  
- **Mobile-first:** build the phone layout first; then add `md`/`lg` enhancements.  
- **Simple but polished:** consistent spacing, hierarchy, and feedback — not a bare prototype and not a complex CRM.  
- **Noob-friendly:** plain English, big taps, obvious tabs, cards on mobile.  
- **Simplify** the existing app: two tabs, one form, thinner list; delete dashboard/broadcasts/wizard paths.  
- Wire features end-to-end; not a mock.  
- When unsure, choose the option a first-time volunteer would understand in 5 seconds.  

