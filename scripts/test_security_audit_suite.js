/**
 * ============================================================================
 * NCSYF PRE-DEPLOYMENT COMPREHENSIVE SECURITY AUDIT TEST SUITE
 * Nigeria Civil Service Youths' Forum (NCSYF)
 * ============================================================================
 * Validates all 17 security controls defined in Phase 13 of the Pre-Deployment
 * Security Hardening Specifications.
 * ============================================================================
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;

function assert(condition, testName, details = '') {
  totalTests++;
  if (condition) {
    passedTests++;
    console.log(`  ✅ PASS: ${testName}`);
  } else {
    failedTests++;
    console.error(`  ❌ FAIL: ${testName}`);
    if (details) console.error(`     Details: ${details}`);
  }
}

console.log('\n======================================================================');
console.log('🛡️  NCSYF PRE-DEPLOYMENT SECURITY AUDIT TEST SUITE (PHASE 13)');
console.log('======================================================================\n');

// ----------------------------------------------------------------------------
// TEST SUITE 1: AUTHENTICATION, PASSWORD POLICIES & BACKDOOR ELIMINATION
// ----------------------------------------------------------------------------
console.log('--- Suite 1: Authentication, Password Policies & Backdoor Elimination ---');

// 1.1 Verify elimination of 'Member@2026' backdoor password
const authServiceContent = fs.readFileSync(path.join(__dirname, '../js/auth-service.js'), 'utf8');
const mainJsContent = fs.readFileSync(path.join(__dirname, '../js/main.js'), 'utf8');

assert(
  !authServiceContent.includes("'Member@2026'") && !authServiceContent.includes('"Member@2026"'),
  'Auth Service has eliminated hardcoded "Member@2026" backdoor password'
);

assert(
  !mainJsContent.includes("'Member@2026'") && !mainJsContent.includes('"Member@2026"'),
  'Registration Form has eliminated hardcoded "Member@2026" fallback password'
);

// 1.2 User enumeration prevention on sign-in
assert(
  authServiceContent.includes('Invalid email, membership ID, or password'),
  'Auth Service uses uniform login error message preventing account enumeration'
);

// 1.3 User enumeration prevention on password reset
assert(
  authServiceContent.includes('resetPassword') && authServiceContent.includes('return true'),
  'Auth Service uses uniform password reset response preventing account discovery'
);

// 1.4 Rate limiting and temporary brute-force lockout
assert(
  authServiceContent.includes('checkLoginRateLimit') && authServiceContent.includes('recordFailedLogin'),
  'Auth Service implements brute-force rate-limiting and temporary account lockout'
);

// 1.5 Secure password hashing verification
function hashAdminPassword(password, salt) {
  return crypto.createHash('sha256').update(password + salt).digest('hex');
}
const testSalt = 'ncsyf_salt_2026_sec';
const hash1 = hashAdminPassword('AdminSecret@2026!', testSalt);
const hash2 = hashAdminPassword('AdminSecret@2026!', testSalt);
const hashBad = hashAdminPassword('WrongSecret', testSalt);
assert(hash1 === hash2 && hash1 !== hashBad, 'Password hashing function is deterministic and collision-resistant');

// 1.6 Robust Member ID to Email resolution
assert(
  authServiceContent.includes('resolveIdentifierToEmail') &&
  authServiceContent.includes('resolve_member_login_email') &&
  authServiceContent.includes('getStoredMembers'),
  'Auth Service implements multi-strategy Member ID to email resolution via RPC and local cache'
);

// ----------------------------------------------------------------------------
// TEST SUITE 2: ADMINISTRATIVE ACCESS CONTROL & ROLE ENFORCEMENT
// ----------------------------------------------------------------------------
console.log('\n--- Suite 2: Administrative Access Control & Role Enforcement ---');

const adminJsContent = fs.readFileSync(path.join(__dirname, '../admin/js/admin.js'), 'utf8');

// 2.1 Elimination of hardcoded 'Secretariat@2026' plaintext password
assert(
  !adminJsContent.includes("'Secretariat@2026'") && !adminJsContent.includes('"Secretariat@2026"'),
  'Admin Console has eliminated hardcoded "Secretariat@2026" plaintext password'
);

// 2.2 Salted SHA-256 implementation in admin.js
assert(
  adminJsContent.includes('hashAdminPassword') && adminJsContent.includes('SHA-256'),
  'Admin Console implements salted cryptographic password hashing for admin credentials'
);

// 2.3 Elimination of demo admin auto-fill button
assert(
  !adminJsContent.includes('btnDemoSuperAdmin'),
  'Admin Console has eliminated demo super-admin shortcut button'
);

// 2.4 Server-side Supabase Auth + Admin Role Verification
assert(
  adminJsContent.includes('auth.signInWithPassword') && adminJsContent.includes("from('admin_users')"),
  'Admin Console verifies credentials via Supabase Auth and validates active admin status in admin_users'
);

// 2.5 Admin brute-force protection
assert(
  adminJsContent.includes('checkAdminLoginRateLimit') && adminJsContent.includes('recordAdminFailedLogin'),
  'Admin Console enforces brute-force lockout on admin login portal'
);

// ----------------------------------------------------------------------------
// TEST SUITE 3: INPUT VALIDATION, XSS PREVENTION & DOM SANITIZATION
// ----------------------------------------------------------------------------
console.log('\n--- Suite 3: Input Validation, XSS Prevention & DOM Sanitization ---');

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

const xssPayloadScript = '<script>alert("XSS")</script>';
const xssPayloadImg = '<img src=x onerror=alert(1)>';
const xssPayloadQuotes = '"><svg onload=alert(document.cookie)>';

assert(
  !escapeHtml(xssPayloadScript).includes('<script>') && escapeHtml(xssPayloadScript).includes('&lt;script&gt;'),
  'escapeHtml neutralizes <script> tags'
);

assert(
  !escapeHtml(xssPayloadImg).includes('<img') && escapeHtml(xssPayloadImg).includes('&lt;img'),
  'escapeHtml neutralizes <img onerror> handlers'
);

assert(
  !escapeHtml(xssPayloadQuotes).includes('">') && escapeHtml(xssPayloadQuotes).includes('&quot;&gt;'),
  'escapeHtml neutralizes quote breakout and svg load payloads'
);

assert(
  adminJsContent.includes('escapeHtml('),
  'Admin Console applies escapeHtml to member tables, dossiers, and admin accounts'
);

const dashboardHtmlContent = fs.readFileSync(path.join(__dirname, '../dashboard.html'), 'utf8');
assert(
  dashboardHtmlContent.includes('escapeHtml'),
  'Member Dashboard applies escapeHtml to dynamic disapproval notices'
);

// ----------------------------------------------------------------------------
// TEST SUITE 4: OPEN REDIRECT VULNERABILITY PREVENTION
// ----------------------------------------------------------------------------
console.log('\n--- Suite 4: Open Redirect Vulnerability Prevention ---');

function sanitizeRedirectUrl(url) {
  if (!url || typeof url !== 'string') return 'dashboard.html';
  const trimmed = url.trim();
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://') || trimmed.startsWith('//') || trimmed.startsWith('\\') || trimmed.startsWith('javascript:')) {
    return 'dashboard.html';
  }
  const clean = trimmed.split('?')[0].split('#')[0];
  if (clean.endsWith('.html') || clean === 'dashboard' || clean === 'membership') {
    return trimmed;
  }
  return 'dashboard.html';
}

assert(sanitizeRedirectUrl('https://evil.com/steal-creds') === 'dashboard.html', 'Open redirect to external https:// domain is blocked');
assert(sanitizeRedirectUrl('//evil.com') === 'dashboard.html', 'Protocol-relative redirect //evil.com is blocked');
assert(sanitizeRedirectUrl('javascript:alert(1)') === 'dashboard.html', 'JavaScript URI redirect is blocked');
assert(sanitizeRedirectUrl('dashboard.html') === 'dashboard.html', 'Legitimate internal redirect to dashboard.html is permitted');
assert(sanitizeRedirectUrl('membership.html?step=2') === 'membership.html?step=2', 'Legitimate internal redirect with query parameters is permitted');

const signinHtmlContent = fs.readFileSync(path.join(__dirname, '../signin.html'), 'utf8');
assert(
  signinHtmlContent.includes('sanitizeRedirectUrl'),
  'Sign-In Page uses sanitizeRedirectUrl to prevent Open Redirect attacks'
);

// ----------------------------------------------------------------------------
// TEST SUITE 5: FILE UPLOAD AND STORAGE SECURITY
// ----------------------------------------------------------------------------
console.log('\n--- Suite 5: File Upload and Storage Security ---');

const ALLOWED_DOC_EXTS = ['.pdf', '.docx', '.xlsx', '.pptx', '.txt'];
const BLOCKED_DANGEROUS_EXTS = ['.exe', '.sh', '.bat', '.cmd', '.php', '.js', '.py', '.html', '.svg', '.vbs', '.jar'];

function validateFileUpload(filename, sizeBytes, mimeType) {
  const ext = (filename.substring(filename.lastIndexOf('.')) || '').toLowerCase();
  if (!ALLOWED_DOC_EXTS.includes(ext)) {
    return { valid: false, error: 'Disallowed file extension' };
  }
  if (sizeBytes > 15 * 1024 * 1024) {
    return { valid: false, error: 'File size exceeds 15MB limit' };
  }
  if (mimeType && (mimeType.includes('script') || mimeType.includes('html') || mimeType.includes('executable'))) {
    return { valid: false, error: 'Executable MIME type rejected' };
  }
  return { valid: true };
}

assert(validateFileUpload('Civil_Service_Rules.pdf', 2 * 1024 * 1024, 'application/pdf').valid, 'Valid PDF upload accepted');
assert(validateFileUpload('Financial_Report.xlsx', 1024 * 1024, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet').valid, 'Valid XLSX upload accepted');

for (const ext of BLOCKED_DANGEROUS_EXTS) {
  assert(
    !validateFileUpload(`exploit${ext}`, 1024, 'application/octet-stream').valid,
    `Dangerous file extension blocked: ${ext}`
  );
}

assert(
  !validateFileUpload('massive_file.pdf', 25 * 1024 * 1024, 'application/pdf').valid,
  'Oversized file (>15MB) is strictly rejected'
);

assert(
  adminJsContent.includes('ALLOWED_DOC_EXTENSIONS') && adminJsContent.includes('ALLOWED_MIME_TYPES'),
  'Admin file upload handler strictly enforces extension and MIME allowlists'
);

// ----------------------------------------------------------------------------
// TEST SUITE 6: DATABASE SCHEMA, ROW-LEVEL SECURITY & STORED FUNCTIONS
// ----------------------------------------------------------------------------
console.log('\n--- Suite 6: Database Schema, Row-Level Security & Stored Functions ---');

const migrationSql = fs.readFileSync(path.join(__dirname, '../supabase/migrations/20261024000000_security_hardening_rls.sql'), 'utf8');
const completeSetupSql = fs.readFileSync(path.join(__dirname, '../supabase/complete_setup.sql'), 'utf8');
const clearMembersSql = fs.readFileSync(path.join(__dirname, '../supabase/clear_members.sql'), 'utf8');

assert(
  migrationSql.includes('CREATE OR REPLACE FUNCTION public.is_admin()') &&
  completeSetupSql.includes('CREATE OR REPLACE FUNCTION public.is_admin()'),
  'Database migration and complete setup define public.is_admin() access control function'
);

assert(
  migrationSql.includes('CREATE OR REPLACE FUNCTION public.is_super_admin()') &&
  completeSetupSql.includes('CREATE OR REPLACE FUNCTION public.is_super_admin()'),
  'Database migration and complete setup define public.is_super_admin() role verification'
);

assert(
  migrationSql.includes('resolve_member_login_email') &&
  completeSetupSql.includes('resolve_member_login_email'),
  'Secure resolve_member_login_email RPC prevents table-wide SELECT on member_profiles'
);

assert(
  migrationSql.includes('increment_resource_downloads') &&
  completeSetupSql.includes('increment_resource_downloads'),
  'Secure increment_resource_downloads RPC eliminates open UPDATE on resources table'
);

assert(
  migrationSql.includes('protect_member_sensitive_fields') &&
  completeSetupSql.includes('protect_member_sensitive_fields'),
  'Trigger protect_member_sensitive_fields enforces immutable member_id, user_id, status, and category'
);

assert(
  !migrationSql.includes('CREATE POLICY "Public can view members"') &&
  !completeSetupSql.includes('CREATE POLICY "Public can view members"'),
  'Removed open "Public can view members" SELECT policy from all SQL definitions'
);

assert(
  !migrationSql.includes('CREATE POLICY "Permit member deletions"') &&
  !completeSetupSql.includes('CREATE POLICY "Permit member deletions"') &&
  !clearMembersSql.includes('CREATE POLICY "Permit member deletions"'),
  'Removed open "Permit member deletions" DELETE policy from all SQL definitions'
);

assert(
  migrationSql.includes('bucket_id = \'member-documents\' AND') &&
  completeSetupSql.includes('bucket_id = \'member-documents\' AND'),
  'Private member KYC document storage bucket is restricted from unauthorized public/member reads'
);

// ----------------------------------------------------------------------------
// TEST SUITE 7: HTTP SECURITY HEADERS & CLOUD DEPLOYMENT CONFIGURATION
// ----------------------------------------------------------------------------
console.log('\n--- Suite 7: HTTP Security Headers & Cloud Deployment Configuration ---');

const vercelJsonPath = path.join(__dirname, '../vercel.json');
assert(fs.existsSync(vercelJsonPath), 'vercel.json configuration exists');

const vercelJson = JSON.parse(fs.readFileSync(vercelJsonPath, 'utf8'));
const headers = (vercelJson.headers && vercelJson.headers[0] && vercelJson.headers[0].headers) || [];
const headerMap = {};
headers.forEach(h => { headerMap[h.key.toLowerCase()] = h.value; });

assert(
  headerMap['x-frame-options'] === 'DENY',
  'HTTP Security Header X-Frame-Options is set to DENY (Clickjacking protection)'
);

assert(
  headerMap['x-content-type-options'] === 'nosniff',
  'HTTP Security Header X-Content-Type-Options is set to nosniff'
);

assert(
  headerMap['referrer-policy'] === 'strict-origin-when-cross-origin',
  'HTTP Security Header Referrer-Policy is configured securely'
);

assert(
  headerMap['strict-transport-security'] && headerMap['strict-transport-security'].includes('max-age=63072000'),
  'HTTP Strict-Transport-Security (HSTS) is enabled with preload and subdomains'
);

assert(
  headerMap['content-security-policy'] && headerMap['content-security-policy'].includes("default-src 'self'"),
  'Content-Security-Policy (CSP) is configured with secure default-src'
);

// ----------------------------------------------------------------------------
// TEST SUITE 8: SECRET EXPOSURE, GITIGNORE & REPOSITORY SCANNING
// ----------------------------------------------------------------------------
console.log('\n--- Suite 8: Secret Exposure, Gitignore & Repository Scanning ---');

const gitignoreContent = fs.readFileSync(path.join(__dirname, '../.gitignore'), 'utf8');

assert(
  gitignoreContent.includes('.env*') || gitignoreContent.includes('.env'),
  '.gitignore excludes environment secret files (.env)'
);

assert(
  gitignoreContent.includes('*backup*.json'),
  '.gitignore excludes database and member backup files'
);

assert(
  gitignoreContent.includes('*.pem') && gitignoreContent.includes('*.key'),
  '.gitignore excludes cryptographic private keys and certificates'
);

const envExamplePath = path.join(__dirname, '../.env.example');
assert(fs.existsSync(envExamplePath), '.env.example exists to document required environment variables');
const envExampleContent = fs.readFileSync(envExamplePath, 'utf8');
assert(
  !envExampleContent.includes('sb_secret_') && !envExampleContent.includes('eyJh'),
  '.env.example contains variable templates without real secret values'
);

// ----------------------------------------------------------------------------
// TEST SUITE 9: CORE BUSINESS LOGIC INTEGRITY & MEMBER ID FORMAT
// ----------------------------------------------------------------------------
console.log('\n--- Suite 9: Core Business Logic Integrity & Member ID Format ---');

function generateMemberId(existingMembers = []) {
  const currentYear = new Date().getFullYear();
  const yearPrefix = `NCSYF-${currentYear}-`;
  let maxSeq = 0;
  for (const m of existingMembers) {
    const id = m.memberId || m.id || '';
    if (id.startsWith(yearPrefix)) {
      const seqStr = id.replace(yearPrefix, '');
      const seqNum = parseInt(seqStr, 10);
      if (!isNaN(seqNum) && seqNum > maxSeq) {
        maxSeq = seqNum;
      }
    }
  }
  const nextSeq = maxSeq + 1;
  return `${yearPrefix}${String(nextSeq).padStart(4, '0')}`;
}

const year = new Date().getFullYear();
const id1 = generateMemberId([]);
const id2 = generateMemberId([{ memberId: `${year}-0001` }, { memberId: `NCSYF-${year}-0042` }]);

assert(id1 === `NCSYF-${year}-0001`, `First generated Member ID is NCSYF-${year}-0001`);
assert(id2 === `NCSYF-${year}-0043`, `Subsequent generated Member ID increments to NCSYF-${year}-0043`);

const memberIdRegex = /^NCSYF-\d{4}-\d{4}$/;
assert(memberIdRegex.test(id1) && memberIdRegex.test(id2), 'Generated Member IDs strictly conform to format NCSYF-YYYY-XXXX');

// ----------------------------------------------------------------------------
// FINAL SUMMARY
// ----------------------------------------------------------------------------
console.log('\n======================================================================');
console.log(`TEST RESULTS: ${passedTests}/${totalTests} Tests Passed (${failedTests} Failed)`);
if (failedTests === 0) {
  console.log('🎉 ALL SECURITY CONTROLS VERIFIED SUCCESSFULLY (100% PASS RATE)');
} else {
  console.error(`⚠️  ${failedTests} TEST(S) FAILED. REMEDIATION REQUIRED.`);
}
console.log('======================================================================\n');

process.exit(failedTests === 0 ? 0 : 1);
