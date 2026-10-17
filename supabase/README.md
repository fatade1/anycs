# NCSYF Supabase Authentication & PostgreSQL Database Setup

This directory contains the production-grade database schema, migrations, and access control policies for the **Nigeria Civil Service Youths' Forum (NCSYF)** member authentication system.

---

## Architecture Overview

The system strictly decouples **Authentication Identities** (`auth.users`) from **Membership Records** (`public.member_profiles`):

```
┌───────────────────────────────────────┐
│        auth.users (Supabase)          │
├───────────────────────────────────────┤
│ id (UUID - Primary Key)               │
│ email (Unique Verified Email)         │
│ encrypted_password (Bcrypt/Argon2)    │
│ confirmed_at, last_sign_in_at         │
└──────────────────┬────────────────────┘
                   │ 1-to-1 Link (user_id)
                   ▼
┌───────────────────────────────────────┐
│     public.member_profiles            │
├───────────────────────────────────────┤
│ id (UUID - Primary Key)               │
│ user_id (UUID -> auth.users.id)       │
│ member_id (NCSYF-YYYY-XXXX, Unique)   │
│ email (Unique)                        │
│ first_name, last_name                 │
│ category (full / associate)           │
│ status (pending / verified / ...)     │
│ mda, state_chapter, staff_id          │
└───────────────────────────────────────┘
```

---

## 1. Prerequisites
- A [Supabase account](https://supabase.com).
- A newly created Supabase Project (e.g. `ncsyf-portal`).

---

## 2. Applying Database Migrations

You can apply the SQL migrations via the **Supabase Dashboard SQL Editor** or via the **Supabase CLI**:

### Option A: Via Supabase Dashboard (Recommended for quick setup)
1. Open your Supabase Dashboard: `https://app.supabase.com/project/<your-project-id>`.
2. Navigate to the **SQL Editor** in the left sidebar.
3. Open [`migrations/20261017000000_member_auth_schema.sql`](file:///Users/ffh/Documents/Designs/anycs/supabase/migrations/20261017000000_member_auth_schema.sql) and click **Run**.
4. Open [`migrations/20261017000001_seed_members.sql`](file:///Users/ffh/Documents/Designs/anycs/supabase/migrations/20261017000001_seed_members.sql) and click **Run** to load initial member profiles.

### Option B: Via Supabase CLI
```bash
npx supabase login
npx supabase link --project-ref <your-project-id>
npx supabase db push
```

---

## 3. Row Level Security (RLS) Rules

All member tables have Row Level Security enabled:
1. **`Members can view own profile`**: Authenticated members can only read their own profile (`auth.uid() = user_id`).
2. **`Members can update permitted own profile fields`**: Members can update contact info, but **cannot** alter `status`, `member_id`, or `category`.
3. **`Protect sensitive fields trigger`**: Database trigger `protect_member_sensitive_fields()` blocks any attempt by members to self-verify or elevate their permissions.
4. **`Service role has full management access`**: Secretariat Admin operations run with administrative oversight.

---

## 4. Connecting the Frontend Application

Open or configure your frontend configuration in `js/auth-service.js` or define `window.NCSYF_CONFIG`:

```javascript
window.NCSYF_CONFIG = {
  SUPABASE_URL: 'https://<your-project-id>.supabase.co',
  SUPABASE_ANON_KEY: '<your-anon-key>'
};
```

When `SUPABASE_URL` and `SUPABASE_ANON_KEY` are provided, the application automatically uses live Supabase Auth and database queries.
When in local development or offline mode without live credentials, the built-in compliant local auth provider seamlessly simulates session management, password hashing, and profile isolation.
