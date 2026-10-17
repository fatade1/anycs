/**
 * Helper script to auto-confirm all existing users in Supabase Auth
 * Run with: SUPABASE_SECRET_KEY=your_key node scripts/auto_confirm_users.js
 */
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://adzfoiffpvdzbtbxqpqf.supabase.co';
const SERVICE_ROLE_KEY = process.env.SUPABASE_SECRET_KEY || process.argv[2];

if (!SERVICE_ROLE_KEY) {
  console.error('Usage: SUPABASE_SECRET_KEY=sb_secret_... node scripts/auto_confirm_users.js');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false }
});

async function autoConfirmAllUsers() {
  console.log('Fetching all auth users from Supabase...');
  const { data, error } = await supabase.auth.admin.listUsers();
  
  if (error) {
    console.error('Error fetching users:', error.message);
    process.exit(1);
  }

  const users = data.users || [];
  console.log(`Found ${users.length} total user(s) in auth.`);

  let confirmedCount = 0;
  for (const user of users) {
    if (!user.email_confirmed_at) {
      console.log(`Auto-confirming user: ${user.email} (${user.id})...`);
      const { error: updateErr } = await supabase.auth.admin.updateUserById(user.id, {
        email_confirm: true
      });
      if (updateErr) {
        console.warn(`Failed to confirm ${user.email}:`, updateErr.message);
      } else {
        confirmedCount++;
        console.log(`Successfully confirmed: ${user.email}`);
      }
    } else {
      console.log(`Already confirmed: ${user.email}`);
    }
  }

  console.log(`Done! Confirmed ${confirmedCount} unconfirmed user(s).`);
}

autoConfirmAllUsers().catch(err => {
  console.error('Script failed:', err);
  process.exit(1);
});
