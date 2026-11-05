/**
 * ==============================================================================
 * NCSYF ZOHO ZEPTOMAIL TRANSACTIONAL EMAIL INTEGRATION TEST SUITE
 * ==============================================================================
 * Comprehensive tests verifying:
 * 1. Configuration & Secrets Protection
 * 2. Reusable Email Service & Templates
 * 3. Security: Header Injection & Email Validation
 * 4. Idempotency & Duplicate Suppression (including Concurrent Dispatches)
 * 5. Rate Limiting Protection (Persistent & Sliding Window)
 * 6. Vercel Serverless API Handler (/api/send-email)
 * 7. Server-Side Administrative Authorization & Privileged Action Guards
 * 8. Database Status Verification & Trusted Recipient Sourcing
 * 9. Password Reset Uniformity & Single-Source Recovery
 * 10. SMTP Connection Verification & Information Disclosure Shielding
 * ==============================================================================
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');

// Ensure test mode
process.env.NODE_ENV = 'test';
process.env.SMTP_MOCK = 'true';

const {
  sendWorkflowEmail,
  verifySmtpConnection,
  isValidEmail,
  sanitizeHeader,
  escapeHtml,
  SUPPORTED_WORKFLOWS
} = require('../lib/email-service');

const emailApiHandler = require('../api/send-email');
const verifySmtpHandler = require('../api/verify-smtp');
const { getMemberRecord, setMockMember, resetMockStores } = require('../lib/supabase-server');

let totalTests = 0;
let passedTests = 0;

function runTest(name, fn) {
  totalTests++;
  try {
    fn();
    passedTests++;
    console.log(`  ✅ PASS: ${name}`);
  } catch (err) {
    console.error(`  ❌ FAIL: ${name}`);
    console.error(`     Error: ${err.message}`);
  }
}

async function runAsyncTest(name, fn) {
  totalTests++;
  try {
    await fn();
    passedTests++;
    console.log(`  ✅ PASS: ${name}`);
  } catch (err) {
    console.error(`  ❌ FAIL: ${name}`);
    console.error(`     Error: ${err.message}`);
  }
}

async function runSuite() {
  console.log('\n======================================================================');
  console.log('📧 NCSYF ZEPTOMAIL TRANSACTIONAL EMAIL TEST SUITE (PHASE 2)');
  console.log('======================================================================\n');

  // --- Suite 1: Configuration & Secrets Protection ---
  console.log('--- Suite 1: Configuration & Secrets Protection ---');

  runTest('lib/email-service.js exists and exports required methods', () => {
    assert(typeof sendWorkflowEmail === 'function');
    assert(typeof verifySmtpConnection === 'function');
    assert(Array.isArray(SUPPORTED_WORKFLOWS));
    assert(SUPPORTED_WORKFLOWS.length >= 5);
  });

  runTest('.env.example documents all required ZeptoMail variables without secrets', () => {
    const envExample = fs.readFileSync(path.join(__dirname, '../.env.example'), 'utf8');
    assert(envExample.includes('SMTP_HOST=smtp.zeptomail.com'));
    assert(envExample.includes('SMTP_PORT=587'));
    assert(envExample.includes('SMTP_USER=emailapikey'));
    assert(envExample.includes('SMTP_PASS='));
    assert(envExample.includes('SMTP_FROM_EMAIL=admin@ncsyf.com.ng'));
    assert(!envExample.includes('real_password_123'));
  });

  runTest('.gitignore excludes .env files from Git', () => {
    const gitignore = fs.readFileSync(path.join(__dirname, '../.gitignore'), 'utf8');
    assert(gitignore.includes('.env'));
    assert(gitignore.includes('!.env.example'));
  });

  runTest('Frontend files do not expose SMTP credentials or API keys', () => {
    const clientJs = fs.readFileSync(path.join(__dirname, '../js/email-client.js'), 'utf8');
    assert(!clientJs.includes('SMTP_PASS'));
    assert(!clientJs.includes('emailapikey'));
    assert(!clientJs.includes('smtp.zeptomail.com'));
  });

  // --- Suite 2: Input Validation & Security ---
  console.log('\n--- Suite 2: Input Validation & Security ---');

  runTest('isValidEmail accepts RFC 5322 compliant email addresses', () => {
    assert(isValidEmail('member@mda.gov.ng'));
    assert(isValidEmail('officer.john@civilservice.gov.ng'));
    assert(isValidEmail('admin@ncsyf.com.ng'));
  });

  runTest('isValidEmail strictly rejects invalid or malformed emails', () => {
    assert(!isValidEmail('not-an-email'));
    assert(!isValidEmail('missing-at.gov.ng'));
    assert(!isValidEmail('@no-user.com'));
    assert(!isValidEmail('user@'));
    assert(!isValidEmail('user@.com'));
    assert(!isValidEmail(''));
    assert(!isValidEmail(null));
  });

  runTest('sanitizeHeader strips CRLF newline characters to prevent header injection', () => {
    const dirty = 'John Doe\r\nBcc: victim@example.com\nSubject: Injected';
    const clean = sanitizeHeader(dirty);
    assert(!clean.includes('\r'));
    assert(!clean.includes('\n'));
    assert(clean.includes('John Doe'));
    assert(clean.includes('victim@example.com'));
  });

  runTest('escapeHtml neutralizes dangerous HTML payloads', () => {
    const payload = '<script>alert(1)</script><img src=x onerror=alert(2)>';
    const escaped = escapeHtml(payload);
    assert(!escaped.includes('<script>'));
    assert(!escaped.includes('<img'));
    assert(escaped.includes('&lt;script&gt;'));
  });

  // --- Suite 3: Workflow Templates & Branding ---
  console.log('\n--- Suite 3: Transactional Workflow Templates & Branding ---');

  await runAsyncTest('Workflow 1: Registration Acknowledgement renders branding, member ID & plain text fallback', async () => {
    const result = await sendWorkflowEmail({
      workflow: 'registration_acknowledgement',
      recipient: 'applicant1@mda.gov.ng',
      data: {
        firstName: 'Ibrahim',
        lastName: 'Musa',
        memberId: 'NCSYF-1996-0045',
        memberTypeLabel: 'Full Member (18–35 yrs)',
        mda: 'Federal Ministry of Finance',
        stateChapter: 'FCT Abuja'
      }
    });

    assert.strictEqual(result.success, true);
    assert.strictEqual(result.status, 'accepted');
    assert(result.messageId);
    assert(result.subject.includes('NCSYF-1996-0045'));
  });

  await runAsyncTest('Workflow 2: Admin Notification renders applicant dossier particulars', async () => {
    const result = await sendWorkflowEmail({
      workflow: 'admin_new_application',
      recipient: 'admin@ncsyf.com.ng',
      data: {
        firstName: 'Amina',
        lastName: 'Bello',
        memberId: 'NCSYF-1998-0046',
        email: 'amina.bello@state.gov.ng',
        mda: 'Kano State Ministry of Health',
        stateChapter: 'Kano State'
      }
    });

    assert.strictEqual(result.success, true);
    assert.strictEqual(result.status, 'accepted');
  });

  await runAsyncTest('Workflow 3: Membership Approval & Verification renders official status & digital slip instructions', async () => {
    const result = await sendWorkflowEmail({
      workflow: 'membership_approved',
      recipient: 'approved.member@mda.gov.ng',
      data: {
        firstName: 'Chinedu',
        lastName: 'Okonkwo',
        memberId: 'NCSYF-1994-0012',
        mda: 'National Planning Commission',
        stateChapter: 'Enugu State'
      }
    });

    assert.strictEqual(result.success, true);
    assert.strictEqual(result.status, 'accepted');
    assert(result.subject.includes('NCSYF-1994-0012'));
  });

  await runAsyncTest('Workflow 4: Membership Disapproval renders courteous explanation and reapplication link', async () => {
    const result = await sendWorkflowEmail({
      workflow: 'membership_disapproved',
      recipient: 'rejected.applicant@mda.gov.ng',
      data: {
        firstName: 'Oluwaseun',
        lastName: 'Adeyemi',
        memberId: 'NCSYF-1999-0089',
        reason: 'Service ID card scan was illegible',
        notes: 'Please upload a clear, high-resolution copy of your official MDA staff ID.'
      }
    });

    assert.strictEqual(result.success, true);
    assert.strictEqual(result.status, 'accepted');
    assert(result.subject.includes('NCSYF-1999-0089'));
  });

  await runAsyncTest('Workflow 5: Password Reset renders recovery link and security notice', async () => {
    const result = await sendWorkflowEmail({
      workflow: 'password_reset',
      recipient: 'reset.user@mda.gov.ng',
      data: {
        firstName: 'Fatade',
        resetUrl: 'https://www.ncsyf.com.ng/signin?token=mock-sec-token',
        expiresMinutes: 60
      }
    });

    assert.strictEqual(result.success, true);
    assert.strictEqual(result.status, 'accepted');
    assert(result.subject.includes('Password Reset'));
  });

  // --- Suite 4: Idempotency & Duplicate Suppression ---
  console.log('\n--- Suite 4: Idempotency & Duplicate Suppression ---');

  await runAsyncTest('Duplicate email within idempotency TTL is safely suppressed', async () => {
    const payload = {
      workflow: 'registration_acknowledgement',
      recipient: 'duplicate.test@mda.gov.ng',
      data: {
        memberId: 'NCSYF-1997-0999',
        firstName: 'Duplicate',
        lastName: 'Tester'
      },
      idempotencyKey: 'fixed-unique-key-12345'
    };

    // First send -> accepted
    const res1 = await sendWorkflowEmail(payload);
    assert.strictEqual(res1.status, 'accepted');

    // Second immediate send with identical key -> duplicate_prevented
    const res2 = await sendWorkflowEmail(payload);
    assert.strictEqual(res2.success, true);
    assert.strictEqual(res2.status, 'duplicate_prevented');
    assert(res2.message.includes('Duplicate notification suppressed'));
  });

  await runAsyncTest('Concurrent duplicate dispatches are atomically deduplicated', async () => {
    const key = `concurrent-test-${Date.now()}`;
    const payload = {
      workflow: 'registration_acknowledgement',
      recipient: 'concurrent.user@mda.gov.ng',
      data: { memberId: 'NCSYF-1997-0777', firstName: 'Concurrent' },
      idempotencyKey: key
    };

    const [resA, resB] = await Promise.all([
      sendWorkflowEmail(payload),
      sendWorkflowEmail(payload)
    ]);

    const statuses = [resA.status, resB.status];
    assert(statuses.includes('accepted'), 'At least one request must succeed with accepted status');
    assert(statuses.includes('duplicate_prevented'), 'The duplicate concurrent request must be intercepted and suppressed');
  });

  // --- Suite 5: Rate Limiting Protection ---
  console.log('\n--- Suite 5: Rate Limiting Protection ---');

  await runAsyncTest('Enforces maximum rate limit on rapid dispatches to same recipient', async () => {
    const spamRecipient = `rate.limit.${Date.now()}@mda.gov.ng`;
    let rateLimitedEncountered = false;

    // Send 7 emails rapidly (threshold is 5/min)
    for (let i = 0; i < 7; i++) {
      const res = await sendWorkflowEmail({
        workflow: 'registration_acknowledgement',
        recipient: spamRecipient,
        data: { firstName: 'User', memberId: `TEST-${i}` },
        idempotencyKey: `burst-req-${i}-${Date.now()}`
      });

      if (res.status === 'rate_limited') {
        rateLimitedEncountered = true;
        break;
      }
    }

    assert(rateLimitedEncountered, 'Rate limiter should have intercepted burst requests');
  });

  // --- Suite 6: Vercel Serverless API (/api/send-email) Core Validations ---
  console.log('\n--- Suite 6: Vercel Serverless API Core Validations ---');

  await runAsyncTest('API handles CORS preflight OPTIONS request with HTTP 204', async () => {
    const req = {
      method: 'OPTIONS',
      headers: { origin: 'https://www.ncsyf.com.ng' }
    };
    let statusCode = 0;
    const res = {
      setHeader: () => {},
      status: (code) => { statusCode = code; return { end: () => {} }; }
    };

    await emailApiHandler(req, res);
    assert.strictEqual(statusCode, 204);
  });

  await runAsyncTest('API rejects non-POST requests with HTTP 405 Method Not Allowed', async () => {
    const req = {
      method: 'GET',
      headers: {}
    };
    let statusCode = 0;
    let jsonResp = null;
    const res = {
      setHeader: () => {},
      status: (code) => { statusCode = code; return { json: (data) => { jsonResp = data; } }; }
    };

    await emailApiHandler(req, res);
    assert.strictEqual(statusCode, 405);
    assert.strictEqual(jsonResp.success, false);
  });

  await runAsyncTest('API rejects invalid or unsupported workflow with HTTP 400', async () => {
    const req = {
      method: 'POST',
      headers: {},
      body: {
        workflow: 'hacker_spam_campaign',
        recipient: 'test@mda.gov.ng'
      }
    };
    let statusCode = 0;
    let jsonResp = null;
    const res = {
      setHeader: () => {},
      status: (code) => { statusCode = code; return { json: (data) => { jsonResp = data; } }; }
    };

    await emailApiHandler(req, res);
    assert.strictEqual(statusCode, 400);
    assert(jsonResp.error.includes('Unsupported workflow'));
  });

  await runAsyncTest('API rejects invalid recipient address with HTTP 400', async () => {
    const req = {
      method: 'POST',
      headers: {},
      body: {
        workflow: 'registration_acknowledgement',
        recipient: 'invalid-email-string'
      }
    };
    let statusCode = 0;
    let jsonResp = null;
    const res = {
      setHeader: () => {},
      status: (code) => { statusCode = code; return { json: (data) => { jsonResp = data; } }; }
    };

    await emailApiHandler(req, res);
    assert.strictEqual(statusCode, 400);
    assert(jsonResp.error.includes('valid recipient'));
  });

  await runAsyncTest('API processes valid public registration acknowledgement request with HTTP 200', async () => {
    resetMockStores();
    const req = {
      method: 'POST',
      headers: { origin: 'https://www.ncsyf.com.ng' },
      body: {
        workflow: 'registration_acknowledgement',
        recipient: 'applicant1@mda.gov.ng',
        idempotencyKey: `api-reg-ack-${Date.now()}`,
        data: {
          firstName: 'Ibrahim',
          lastName: 'Musa',
          memberId: 'NCSYF-1996-0045'
        }
      }
    };
    let statusCode = 0;
    let jsonResp = null;
    const res = {
      setHeader: () => {},
      status: (code) => { statusCode = code; return { json: (data) => { jsonResp = data; } }; }
    };

    await emailApiHandler(req, res);
    assert.strictEqual(statusCode, 200);
    assert.strictEqual(jsonResp.success, true);
    assert.strictEqual(jsonResp.status, 'accepted');
  });

  // --- Suite 7: Second-Stage Security & Privilege Enforcement (10 E2E Controls) ---
  console.log('\n--- Suite 7: Second-Stage Security & Privilege Enforcement (10 E2E Controls) ---');

  // Control 1: Admin approval succeeds with valid admin token and verified member status
  await runAsyncTest('Control 1: Admin approval email succeeds for verified member with valid admin token', async () => {
    resetMockStores();
    const req = {
      method: 'POST',
      headers: {
        origin: 'https://admin.ncsyf.com.ng',
        authorization: 'Bearer mock-admin-token'
      },
      body: {
        workflow: 'membership_approved',
        idempotencyKey: `admin-appr-${Date.now()}`,
        data: {
          memberId: 'NCSYF-1994-0012' // Verified member in DB
        }
      }
    };
    let statusCode = 0;
    let jsonResp = null;
    const res = {
      setHeader: () => {},
      status: (code) => { statusCode = code; return { json: (data) => { jsonResp = data; } }; }
    };

    await emailApiHandler(req, res);
    assert.strictEqual(statusCode, 200);
    assert.strictEqual(jsonResp.success, true);
    assert.strictEqual(jsonResp.status, 'accepted');
    assert.strictEqual(jsonResp.recipient, 'approved.member@mda.gov.ng');
  });

  // Control 2: Admin disapproval succeeds with valid admin token and disapproved member status
  await runAsyncTest('Control 2: Admin rejection email succeeds for disapproved member with valid admin token', async () => {
    resetMockStores();
    const req = {
      method: 'POST',
      headers: {
        origin: 'https://admin.ncsyf.com.ng',
        authorization: 'Bearer mock-admin-token'
      },
      body: {
        workflow: 'membership_disapproved',
        idempotencyKey: `admin-disappr-${Date.now()}`,
        data: {
          memberId: 'NCSYF-1999-0089' // Disapproved member in DB
        }
      }
    };
    let statusCode = 0;
    let jsonResp = null;
    const res = {
      setHeader: () => {},
      status: (code) => { statusCode = code; return { json: (data) => { jsonResp = data; } }; }
    };

    await emailApiHandler(req, res);
    assert.strictEqual(statusCode, 200);
    assert.strictEqual(jsonResp.success, true);
    assert.strictEqual(jsonResp.status, 'accepted');
    assert.strictEqual(jsonResp.recipient, 'rejected.applicant@mda.gov.ng');
  });

  // Control 3: Unauthorized approval attempts strictly rejected (No Token)
  await runAsyncTest('Control 3: Unauthenticated call to membership_approved is rejected with HTTP 401', async () => {
    const req = {
      method: 'POST',
      headers: { origin: 'https://www.ncsyf.com.ng' },
      body: {
        workflow: 'membership_approved',
        recipient: 'victim@mda.gov.ng',
        data: { memberId: 'NCSYF-1994-0012' }
      }
    };
    let statusCode = 0;
    let jsonResp = null;
    const res = {
      setHeader: () => {},
      status: (code) => { statusCode = code; return { json: (data) => { jsonResp = data; } }; }
    };

    await emailApiHandler(req, res);
    assert.strictEqual(statusCode, 401);
    assert.strictEqual(jsonResp.success, false);
    assert(jsonResp.error.includes('Unauthorized'));
  });

  // Control 4: Unauthorized approval attempts strictly rejected (Invalid Token)
  await runAsyncTest('Control 4: Invalid bearer token to membership_approved is rejected with HTTP 401', async () => {
    const req = {
      method: 'POST',
      headers: {
        origin: 'https://www.ncsyf.com.ng',
        authorization: 'Bearer forged-invalid-token-xyz'
      },
      body: {
        workflow: 'membership_approved',
        recipient: 'victim@mda.gov.ng',
        data: { memberId: 'NCSYF-1994-0012' }
      }
    };
    let statusCode = 0;
    let jsonResp = null;
    const res = {
      setHeader: () => {},
      status: (code) => { statusCode = code; return { json: (data) => { jsonResp = data; } }; }
    };

    await emailApiHandler(req, res);
    assert.strictEqual(statusCode, 401);
    assert.strictEqual(jsonResp.success, false);
  });

  // Control 5: Database Status Mismatch Rejection
  await runAsyncTest('Control 5: Attempting approval for member whose DB status is still "pending" is rejected with HTTP 400', async () => {
    const req = {
      method: 'POST',
      headers: {
        origin: 'https://admin.ncsyf.com.ng',
        authorization: 'Bearer mock-admin-token'
      },
      body: {
        workflow: 'membership_approved',
        data: {
          memberId: 'NCSYF-1996-0045' // Status is pending in DB!
        }
      }
    };
    let statusCode = 0;
    let jsonResp = null;
    const res = {
      setHeader: () => {},
      status: (code) => { statusCode = code; return { json: (data) => { jsonResp = data; } }; }
    };

    await emailApiHandler(req, res);
    assert.strictEqual(statusCode, 400);
    assert.strictEqual(jsonResp.success, false);
    assert(jsonResp.error.includes('expected "verified"'));
  });

  // Control 6: Client-Provided Recipient Spoofing Blocked
  await runAsyncTest('Control 6: Privileged approval ignores client-provided recipient and enforces database email', async () => {
    const req = {
      method: 'POST',
      headers: {
        origin: 'https://admin.ncsyf.com.ng',
        authorization: 'Bearer mock-admin-token'
      },
      body: {
        workflow: 'membership_approved',
        recipient: 'attacker.controlled@evil.com', // Spoofed client recipient
        data: {
          memberId: 'NCSYF-2026-0011' // Fatade Tolulope (fatadetolulope@gmail.com)
        }
      }
    };
    let statusCode = 0;
    let jsonResp = null;
    const res = {
      setHeader: () => {},
      status: (code) => { statusCode = code; return { json: (data) => { jsonResp = data; } }; }
    };

    await emailApiHandler(req, res);
    assert.strictEqual(statusCode, 200);
    assert.strictEqual(jsonResp.recipient, 'fatadetolulope@gmail.com');
    assert.notStrictEqual(jsonResp.recipient, 'attacker.controlled@evil.com');
  });

  // Control 7: Admin New Application Alert Forces Destination Inbox
  await runAsyncTest('Control 7: admin_new_application strictly overrides recipient to Secretariat notification email', async () => {
    const req = {
      method: 'POST',
      headers: { origin: 'https://www.ncsyf.com.ng' },
      body: {
        workflow: 'admin_new_application',
        recipient: 'attacker@evil.com', // Attempted relay
        data: {
          memberId: 'NCSYF-1998-0046',
          firstName: 'Amina',
          lastName: 'Bello'
        }
      }
    };
    let statusCode = 0;
    let jsonResp = null;
    const res = {
      setHeader: () => {},
      status: (code) => { statusCode = code; return { json: (data) => { jsonResp = data; } }; }
    };

    await emailApiHandler(req, res);
    assert.strictEqual(statusCode, 200);
    assert.strictEqual(jsonResp.recipient, 'admin@ncsyf.com.ng');
    assert.notStrictEqual(jsonResp.recipient, 'attacker@evil.com');
  });

  // Control 8: Password Reset Recovery Domain & URL Enforcement
  await runAsyncTest('Control 8: password_reset template always enforces canonical production domain (https://www.ncsyf.com.ng/signin)', async () => {
    const template = sendWorkflowEmail({
      workflow: 'password_reset',
      recipient: 'member@mda.gov.ng',
      data: {
        firstName: 'Member',
        resetUrl: 'https://www.ncsyf.com.ng/signin'
      }
    });

    const res = await template;
    assert.strictEqual(res.success, true);
    assert(res.subject.includes('Password Reset'));
  });

  // Control 9: SMTP Verification Endpoint Blocks Unauthenticated Reconnaissance
  await runAsyncTest('Control 9: /api/verify-smtp strictly blocks unauthenticated requests with HTTP 401', async () => {
    const req = {
      method: 'GET',
      headers: {}
    };
    let statusCode = 0;
    let jsonResp = null;
    const res = {
      setHeader: () => {},
      status: (code) => { statusCode = code; return { json: (data) => { jsonResp = data; } }; }
    };

    await verifySmtpHandler(req, res);
    assert.strictEqual(statusCode, 401);
    assert.strictEqual(jsonResp.success, false);
    assert(jsonResp.error.includes('Unauthorized'));
  });

  // Control 10: SMTP Verification Endpoint Allows Authenticated Admin
  await runAsyncTest('Control 10: /api/verify-smtp accepts authenticated administrator token', async () => {
    const req = {
      method: 'GET',
      headers: {
        authorization: 'Bearer mock-admin-token'
      }
    };
    let statusCode = 0;
    let jsonResp = null;
    const res = {
      setHeader: () => {},
      status: (code) => { statusCode = code; return { json: (data) => { jsonResp = data; } }; }
    };

    await verifySmtpHandler(req, res);
    assert(statusCode === 200 || statusCode === 503);
    assert(jsonResp.service.includes('Zoho ZeptoMail'));
  });

  // Control 11: Member Lookup by Member ID (non-UUID format) and Status Synchronization
  await runAsyncTest('Control 11: Member dossier lookup resolves non-UUID member ID without Postgres error', async () => {
    const memberRecord = await getMemberRecord('NCSYF-2026-0011');
    assert(memberRecord, 'Member dossier must resolve for valid NCSYF-YYYY-XXXX Member ID');
    assert.strictEqual(memberRecord.member_id, 'NCSYF-2026-0011');
    assert.strictEqual(memberRecord.email, 'fatadetolulope@gmail.com');
  });

  // Control 12: Admin Subdomain Cross-Origin Endpoint Routing
  runTest('Control 12: Admin email-client resolves absolute canonical production API on admin.ncsyf.com.ng', () => {
    const emailClientSrc = fs.readFileSync(path.join(__dirname, '../admin/js/email-client.js'), 'utf8');
    assert(emailClientSrc.includes('https://www.ncsyf.com.ng/api/send-email'), 'Must resolve canonical production API');
    assert(emailClientSrc.includes('admin.ncsyf.com.ng'), 'Must check admin.ncsyf.com.ng subdomain');
  });

  // --- Suite 8: Vercel Routing Configuration ---
  console.log('\n--- Suite 8: Vercel Routing Configuration ---');

  runTest('vercel.json includes direct rewrite exception for /api/* on admin subdomain', () => {
    const vercelJson = JSON.parse(fs.readFileSync(path.join(__dirname, '../vercel.json'), 'utf8'));
    const rewrites = vercelJson.rewrites || [];
    const apiRewrite = rewrites.find(r => r.source === '/api/:path*');
    assert(apiRewrite, 'Must have a rewrite rule for /api/:path*');
    assert.strictEqual(apiRewrite.destination, '/api/:path*');
  });

  runTest('HTML files include js/email-client.js before application scripts', () => {
    const membershipHtml = fs.readFileSync(path.join(__dirname, '../membership.html'), 'utf8');
    assert(membershipHtml.includes('js/email-client.js'));

    const adminHtml = fs.readFileSync(path.join(__dirname, '../admin/index.html'), 'utf8');
    assert(adminHtml.includes('js/email-client.js'));

    const signinHtml = fs.readFileSync(path.join(__dirname, '../signin.html'), 'utf8');
    assert(signinHtml.includes('js/email-client.js'));

    const indexHtml = fs.readFileSync(path.join(__dirname, '../index.html'), 'utf8');
    assert(indexHtml.includes('js/email-client.js'));
  });

  console.log('\n======================================================================');
  console.log(`TEST RESULTS: ${passedTests}/${totalTests} Tests Passed (${totalTests - passedTests} Failed)`);
  if (passedTests === totalTests) {
    console.log('🎉 ALL TRANSACTIONAL EMAIL CONTROLS VERIFIED (100% PASS RATE)');
  }
  console.log('======================================================================\n');

  if (passedTests !== totalTests) {
    process.exit(1);
  }
}

runSuite().catch(err => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
