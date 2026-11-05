/**
 * ==============================================================================
 * NCSYF VERIFIED MEMBERS BATCH EMAIL DISPATCHER
 * Nigeria Civil Service Youths' Forum (NCSYF)
 * ==============================================================================
 * Iterates through all verified member dossiers in the Secretariat registry
 * and dispatches official Verification & Approval emails via the production
 * ZeptoMail Serverless Gateway (https://www.ncsyf.com.ng/api/send-email).
 * ==============================================================================
 */

const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://adzfoiffpvdzbtbxqpqf.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_SECRET_KEY || 
                     process.env.SUPABASE_SERVICE_ROLE_KEY || 
                     process.env.SUPABASE_ANON_KEY || 
                     'sb_publishable_v5IP_dy2OGiKfs8ArFh1uw_Hrtvm-Lt';

const API_ENDPOINT = process.env.EMAIL_API_ENDPOINT || 'https://www.ncsyf.com.ng/api/send-email';
const ADMIN_BEARER_TOKEN = 'ncsyf_admin_batch_broadcast_' + Date.now();

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function main() {
  console.log('======================================================================');
  console.log('📢 NCSYF VERIFIED MEMBERS TRANSACTIONAL EMAIL BROADCAST');
  console.log('======================================================================');
  console.log(`Connecting to Supabase: ${SUPABASE_URL}`);
  console.log(`Target Email Gateway:  ${API_ENDPOINT}\n`);

  const client = createClient(SUPABASE_URL, SUPABASE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false }
  });

  // 1. Fetch all members from Secretariat registry
  let members = [];
  try {
    const { data: rpcData, error: rpcErr } = await client.rpc('get_all_member_profiles_admin');
    if (!rpcErr && Array.isArray(rpcData) && rpcData.length > 0) {
      members = rpcData;
    } else {
      console.warn('RPC lookup notice, attempting direct select:', rpcErr ? rpcErr.message : 'empty');
      const { data: dirData, error: dirErr } = await client.from('member_profiles').select('*');
      if (!dirErr && Array.isArray(dirData)) members = dirData;
    }
  } catch (err) {
    console.error('Failed to query member records:', err.message);
    process.exit(1);
  }

  // 2. Filter to verified members
  const verifiedMembers = members.filter(m => (m.status || '').toLowerCase() === 'verified');
  console.log(`Found ${members.length} total members in registry.`);
  console.log(`Found ${verifiedMembers.length} VERIFIED members requiring official notification.\n`);

  if (verifiedMembers.length === 0) {
    console.log('No verified members found to notify.');
    return;
  }

  const results = {
    total: verifiedMembers.length,
    successful: 0,
    failed: 0,
    dispatches: []
  };

  // 3. Dispatch official verification notifications sequentially
  for (let i = 0; i < verifiedMembers.length; i++) {
    const m = verifiedMembers[i];
    const memberId = m.member_id || m.id;
    const email = (m.email || '').toLowerCase().trim();
    const fullName = `${m.first_name || ''} ${m.last_name || ''}`.trim() || 'Member';

    console.log(`[${i + 1}/${verifiedMembers.length}] Dispatching approval notification to: ${fullName} (${memberId}) <${email}>...`);

    const payload = {
      workflow: 'membership_approved',
      recipient: email,
      data: {
        memberId: memberId,
        firstName: m.first_name || 'Member',
        lastName: m.last_name || '',
        memberTypeLabel: m.member_type_label || m.category || 'Full Member (18–35 yrs)',
        mda: m.mda || 'Federal Public Service',
        stateChapter: m.state_chapter || 'FCT Abuja',
        verifiedDate: m.verified_at ? new Date(m.verified_at).toLocaleDateString('en-GB') : new Date().toLocaleDateString('en-GB')
      },
      idempotencyKey: `bulk_approved_${memberId}_${Date.now()}`
    };

    try {
      const response = await fetch(API_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Origin': 'https://admin.ncsyf.com.ng',
          'Authorization': `Bearer ${ADMIN_BEARER_TOKEN}`
        },
        body: JSON.stringify(payload)
      });

      let respJson = {};
      try {
        respJson = await response.json();
      } catch (jsonErr) {
        respJson = { error: 'Invalid response from email gateway' };
      }

      if (response.ok && respJson.success) {
        results.successful++;
        console.log(`   ✅ DELIVERED: Message ID: ${respJson.messageId || 'accepted'} (Status: ${respJson.status})`);
        results.dispatches.push({
          memberId,
          email,
          name: fullName,
          status: 'delivered',
          messageId: respJson.messageId
        });
      } else {
        results.failed++;
        console.warn(`   ❌ FAILED: ${respJson.error || response.statusText}`);
        results.dispatches.push({
          memberId,
          email,
          name: fullName,
          status: 'failed',
          error: respJson.error || response.statusText
        });
      }
    } catch (reqErr) {
      results.failed++;
      console.error(`   ❌ NETWORK ERROR: ${reqErr.message}`);
      results.dispatches.push({
        memberId,
        email,
        name: fullName,
        status: 'error',
        error: reqErr.message
      });
    }

    // Rate-limit courtesy pause between dispatches (1.2 seconds)
    if (i < verifiedMembers.length - 1) {
      await sleep(1200);
    }
  }

  console.log('\n======================================================================');
  console.log('📊 DISPATCH SUMMARY');
  console.log('======================================================================');
  console.log(`Total Verified Members: ${results.total}`);
  console.log(`Successfully Dispatched: ${results.successful}`);
  console.log(`Failed Dispatches:       ${results.failed}`);
  console.log('======================================================================\n');
}

main().catch(err => {
  console.error('Fatal batch dispatch error:', err);
  process.exit(1);
});
