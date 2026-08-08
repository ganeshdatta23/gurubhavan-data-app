# Guru Bhavan Devotee Registry

An admin-only, mobile-first Next.js application for adding, finding, editing, deleting, importing, and downloading devotee records.

## Local setup

1. Install Node.js 20 or newer and run `npm install`.
2. Copy `.env.example` to `.env.local` and fill in the Turso URL, Turso token, and a random JWT secret of at least 32 characters.
3. Run `npm run db:bootstrap`.
4. Run `npm run dev` and open `http://localhost:3000`.

`db:bootstrap` is safe to rerun. It creates the current tables, seeds India → Tamil Nadu → Chennai when a database has no location data, and creates or refreshes the three bootstrap admin accounts. When it finds the old chapter/multi-phone schema, it copies existing devotee data into the new schema and retains the source tables with `_legacy_v1` names as a backup.

## Bootstrap logins

| Username | Password | Display name |
|---|---|---|
| `lakshminarayana` | `Gurubhavan@1942` | Lakshminarayana |
| `volunteer` | `sdhsVol@1942` | Volunteer |
| `admin` | `admin@1942` | Admin |

These are bootstrap credentials. Change the passwords before a public production rollout.

## Locations

The form and People filters use the normalized hierarchy `countries → states → cities`. India is selected by default, and Indian records require a six-digit PIN.

### Seed cities / states from the devotee address workbook

After bootstrap, load the full location list (from `~/Downloads/Devotees Addressess List.xlsx` sheet names + canonical mappings):

```bash
npm run db:seed-locations
# or: node scripts/seed-locations.mjs "/path/to/Devotees Addressess List.xlsx"
```

This is safe to rerun. It creates countries/states/cities used by the Add person form (Andhra Pradesh, Telangana, Karnataka, Tamil Nadu, etc.).

## Excel upload and download

- Open **People** and choose **Upload Excel**.
- Download the in-app template. Its headings are: Full Name, Mobile, Address, City, State, PIN, Country, Email.
- Upload an `.xlsx` file up to 5 MB or 2,000 rows. The preview separates ready rows, problems, and duplicate mobiles. Only ready rows are imported.
- **Download** exports all active people or only the current search/location filters. It is never limited to the visible page. Excel and CSV are supported.

## Send WhatsApp messages

- Tick people in the People list. The checkbox in the header row selects everyone on the current page; ticks stay as you page through, and reset when the search or location filters change.
- **Send messages** opens a box for the message body. Type `{name}` (or `{first_name}`) to include the person's name.
- Messages go out through the WhatsApp Cloud API one person at a time. The route streams a result per person, so the progress bar and the per-person failure list update as each message is sent. You can stop mid-run — the message already in flight may still be delivered — and retry the ones that did not go out.
- Set `WHATSAPP_PHONE_NUMBER_ID` and `WHATSAPP_ACCESS_TOKEN` in `.env.local` first (`WHATSAPP_API_VERSION` is optional and defaults to `v23.0`). Without them the send request returns a clear setup message.
- WhatsApp accepts a plain text message only for people who wrote to your number in the last 24 hours. Anyone else needs an approved template, and those attempts appear as failures with the reason from WhatsApp.

## Commands

```bash
npm run dev          # local development
npm run build        # production compile and type check
npm start            # run the production build
npm run db:bootstrap # create/migrate tables and seed admins
```

Public registration, dashboards, chapters/source groups, user management, and scheduled/approval-based campaigns are intentionally not part of this application. Messaging is limited to the ad-hoc WhatsApp send described above.
