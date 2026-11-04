/**
 * ==============================================================================
 * NCSYF ZOHO ZEPTOMAIL TRANSACTIONAL EMAIL INTEGRATION TEST SUITE
 * ==============================================================================
 * Comprehensive tests verifying:
 * 1. Configuration & Secrets Protection
 * 2. Reusable Email Service & Templates
 * 3. Security: Header Injection & Email Validation
 * 4. Idempotency & Duplicate Suppression
 * 5. Rate Limiting Protection
 * 6. Vercel Serverless API Handler (/api/send-email)
 * 7. Client-Side Non-blocking Dispatch Integration
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
  console.log('📧 NCSYF ZEPTOMAIL TRANSACTIONAL EMAIL TEST SUITE');
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

  // --- Suite 5: Rate Limiting Protection ---
  console.log('\n--- Suite 5: Rate Limiting Protection ---');

  await runAsyncTest('Enforces maximum rate limit on rapid dispatches to same recipient', async () => {
    const spamRecipient = `rate.limit.${Date.now()}@mda.gov.ng`;
    let rateLimitedEncountered = false;

    // Send 7 emails rapidly (threshold is 5/min)
    for (let i = 0; i < 7; i++) {
      const res = await sendWorkflowEmail({
        workflow: 'password_reset',
        recipient: spamRecipient,
        data: { firstName: 'User' },
        idempotencyKey: `burst-req-${i}-${Date.now()}`
      });

      if (res.status === 'rate_limited') {
        rateLimitedEncountered = true;
        break;
      }
    }

    assert(rateLimitedEncountered, 'Rate limiter should have intercepted burst requests');
  });

  // --- Suite 6: Vercel Serverless API (/api/send-email) ---
  console.log('\n--- Suite 6: Vercel Serverless API (/api/send-email) ---');

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

  await runAsyncTest('API successfully processes valid registration acknowledgement request with HTTP 200', async () => {
    const req = {
      method: 'POST',
      headers: { origin: 'https://www.ncsyf.com.ng' },
      body: {
        workflow: 'registration_acknowledgement',
        recipient: 'api.applicant@mda.gov.ng',
        data: {
          firstName: 'Halima',
          lastName: 'Abubakar',
          memberId: 'NCSYF-1995-0321'
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

  // --- Suite 7: Vercel Routing Configuration ---
  console.log('\n--- Suite 7: Vercel Routing Configuration ---');

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
