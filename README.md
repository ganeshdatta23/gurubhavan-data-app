# Devotee Registry

## Run locally

1. Copy `.env.example` to `.env.local` and set a Turso URL, auth token, and a strong `JWT_SECRET`.
2. Apply `database/schema.sql` to a fresh Turso/LibSQL database.
3. Add at least one country, state, city, source group, and an administrator user. The `users.password_hash` value must be a bcrypt hash and role must be `super_admin` or `admin`.
4. Run `npm.cmd run dev` on Windows, then open `http://localhost:3000`.

`WHATSAPP_MODE=mock` is the safe default. Campaign sends are fully recorded against eligible recipients but do not contact WhatsApp. A real provider adapter and approved Meta templates are required before setting it to `live`.

## Schema and imports

- `database/schema.sql` contains all create-table and index statements.
- `/admin/import` accepts `.xlsx`, validates the complete file before writing, lists every row/column/value/reason error, and allows correction in the browser before importing.
