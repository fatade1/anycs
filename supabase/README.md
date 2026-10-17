# NCSYF Supabase Cloud Database & Storage Architecture
### Nigeria Civil Service Youths' Forum (NCSYF)

This directory contains the production-grade PostgreSQL database schema, migrations, access control policies, storage buckets, and seed data for the **Nigeria Civil Service Youths' Forum (NCSYF)** portal.

---

## 1. Architecture & Entity Overview

The system strictly structures all application entities with PostgreSQL types, Row Level Security (RLS), and automatic update triggers:

```
┌────────────────────────────────────────────────────────────────────────┐
│                        SUPABASE CLOUD POSTGRESQL                       │
├────────────────────────────────────────────────────────────────────────┤
│  auth.users             ◄── Member Authentication & Passwords          │
│  public.member_profiles ◄── Member KYC, MDAs, Status, Registration IDs │
│  public.projects        ◄── Track A/B National Thematic Initiatives    │
│  public.resources       ◄── Official Circulars, PSR Handbook & Laws    │
│  public.gallery_albums  ◄── Summits, Workshops & Induction Photos     │
│  public.admin_users     ◄── Secretariat Super Admin & Officers         │
├────────────────────────────────────────────────────────────────────────┤
│  STORAGE BUCKETS:                                                      │
│  • member-documents    (Private KYC upload bucket)                     │
│  • resource-circulars  (Public PDF/DOCX publications bucket)           │
│  • gallery-media       (Public event media & albums bucket)            │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Fast 1-Click Database Setup

### Option A: Via Supabase Dashboard SQL Editor (Fastest)
1. Open your [Supabase Dashboard](https://app.supabase.com) and select your project.
2. In the left sidebar, click **SQL Editor** -> **New query**.
3. Copy the entire content of [`supabase/complete_setup.sql`](file:///Users/ffh/Documents/Designs/anycs/supabase/complete_setup.sql) and paste it into the editor.
4. Click **Run**.
5. All extensions, enum types, tables, indexes, RLS security policies, storage buckets, and initial seeds are created instantly and idempotently.

### Option B: Via Modular Migrations (CLI)
If using the Supabase CLI:
```bash
npx supabase login
npx supabase link --project-ref <your-project-id>
npx supabase db push
```

---

## 3. Connecting the Website to Supabase

You can connect Supabase using either the **Admin Portal UI** or by configuring `window.NCSYF_CONFIG`:

### Method 1: Via Admin Settings Panel (Recommended)
1. Open the Admin Console: `http://localhost:5501/admin/index.html`.
2. Sign in as Super Admin (`admin@ncsyf.com.ng` / `Secretariat@2026`).
3. Click **System Settings** in the left sidebar.
4. Enter your **Supabase Project URL** (e.g. `https://xyz.supabase.co`) and **Anon Public API Key**.
5. Click **Test Connection** to verify reachability.
6. Click **Save & Connect**.
7. Click **Push All Local Data to Supabase** to populate your cloud database with all local members, projects, resources, gallery albums, and administrator accounts!

### Method 2: Via Frontend Configuration
In your HTML or environment configuration, define `window.NCSYF_CONFIG`:
```javascript
window.NCSYF_CONFIG = {
  SUPABASE_URL: 'https://<your-project-id>.supabase.co',
  SUPABASE_ANON_KEY: '<your-anon-key>'
};
```

---

## 4. Zero-Downtime Resilience
- **Online Mode**: When credentials are provided and the database is reachable, all registration submissions, approvals, project updates, downloads, and logins interact directly with Supabase.
- **Offline / Local Fallback**: If working offline, developing without network, or before credentials are entered, the portal automatically falls back to its built-in local store without breaking any workflows or tests.
