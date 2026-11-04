/**
 * ==========================================================================
 * NCSYF CENTRAL TRANSACTIONAL EMAIL SERVICE (Zoho ZeptoMail Integration)
 * Nigeria Civil Service Youths' Forum (NCSYF)
 * ==========================================================================
 * Centralized, secure server-side email service for transactional notifications.
 * Never expose SMTP credentials or API keys to browser clients.
 * ==========================================================================
 */

const nodemailer = require('nodemailer');
const crypto = require('crypto');
const {
  claimPersistentDispatch,
  finalizePersistentDispatch
} = require('./supabase-server');

// In-memory cache for idempotency / duplicate prevention (TTL 5 mins fallback)
const recentDispatches = new Map();
const IDEMPOTENCY_TTL_MS = 5 * 60 * 1000;

// In-memory sliding window rate limiter per recipient (Max 5/min fallback)
const recipientRateLimits = new Map();
const RATE_LIMIT_WINDOW_MS = 60 * 1000;
const RATE_LIMIT_MAX = 5;

// Clean up expired in-memory entries every 10 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, timestamp] of recentDispatches.entries()) {
    if (now - timestamp > IDEMPOTENCY_TTL_MS) {
      recentDispatches.delete(key);
    }
  }
  for (const [email, records] of recipientRateLimits.entries()) {
    const valid = records.filter(t => now - t < RATE_LIMIT_WINDOW_MS);
    if (valid.length === 0) {
      recipientRateLimits.delete(email);
    } else {
      recipientRateLimits.set(email, valid);
    }
  }
}, 10 * 60 * 1000).unref();

/**
 * Sanitize header value to prevent CRLF injection attacks
 */
function sanitizeHeader(val) {
  if (!val || typeof val !== 'string') return '';
  return val.replace(/[\r\n\t\0]/g, ' ').trim();
}

/**
 * Validate email address format (RFC 5322 compliance)
 */
function isValidEmail(email) {
  if (!email || typeof email !== 'string') return false;
  const clean = email.trim();
  if (clean.length > 254) return false;
  // RFC 5322 standard email validation regex
  const re = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;
  return re.test(clean);
}

/**
 * Escape HTML to prevent injection in templates
 */
function escapeHtml(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Create or reuse the Nodemailer SMTP Transporter
 */
let transporterInstance = null;

function getTransporter() {
  if (transporterInstance) {
    return transporterInstance;
  }

  const host = process.env.SMTP_HOST || 'smtp.zeptomail.com';
  const port = parseInt(process.env.SMTP_PORT || '587', 10);
  const secure = process.env.SMTP_SECURE === 'true'; // false for port 587 (uses STARTTLS)
  const user = process.env.SMTP_USER || 'emailapikey';
  const pass = process.env.SMTP_PASS || '';

  transporterInstance = nodemailer.createTransport({
    host: host,
    port: port,
    secure: secure,
    auth: {
      user: user,
      pass: pass
    },
    tls: {
      rejectUnauthorized: true,
      minVersion: 'TLSv1.2'
    },
    pool: true,
    maxConnections: 5,
    maxMessages: 100,
    connectionTimeout: 10000,
    greetingTimeout: 10000,
    socketTimeout: 15000
  });

  return transporterInstance;
}

/**
 * Test SMTP connection
 */
async function verifySmtpConnection() {
  if (!process.env.SMTP_PASS || process.env.SMTP_PASS === 'YOUR_ZEPTOMAIL_PASSWORD') {
    return {
      connected: false,
      configured: false,
      message: 'SMTP credentials not configured in environment variables (SMTP_PASS is required).'
    };
  }

  try {
    const transporter = getTransporter();
    await transporter.verify();
    return {
      connected: true,
      configured: true,
      message: 'Successfully established secure TLS connection to Zoho ZeptoMail SMTP server.'
    };
  } catch (err) {
    return {
      connected: false,
      configured: true,
      message: `SMTP Connection failed: ${err.message}`
    };
  }
}

/**
 * Base Responsive HTML Email Wrapper
 */
function renderBaseLayout({ title, contentHtml }) {
  const currentYear = new Date().getFullYear();
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(title)}</title>
  <style>
    body {
      margin: 0;
      padding: 0;
      background-color: #F8FAFC;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      color: #1E293B;
      line-height: 1.6;
      -webkit-font-smoothing: antialiased;
    }
    table {
      border-collapse: collapse;
      mso-table-lspace: 0pt;
      mso-table-rspace: 0pt;
    }
    td {
      padding: 0;
    }
    .email-container {
      max-width: 600px;
      margin: 30px auto;
      background-color: #FFFFFF;
      border-radius: 12px;
      overflow: hidden;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.06);
      border: 1px solid #E2E8F0;
    }
    .header-banner {
      background: linear-gradient(135deg, #08291C 0%, #0F4530 100%);
      padding: 28px 32px;
      text-align: center;
      border-bottom: 3px solid #E9CE74;
    }
    .header-logo {
      max-height: 52px;
      width: auto;
      margin-bottom: 12px;
    }
    .header-title {
      color: #FFFFFF;
      font-size: 18px;
      font-weight: 700;
      letter-spacing: 0.5px;
      margin: 0;
      text-transform: uppercase;
    }
    .header-subtitle {
      color: #E9CE74;
      font-size: 12px;
      font-weight: 600;
      letter-spacing: 1px;
      margin-top: 4px;
      text-transform: uppercase;
    }
    .content-body {
      padding: 36px 32px;
    }
    .badge {
      display: inline-block;
      padding: 6px 14px;
      border-radius: 20px;
      font-size: 12px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .badge-success {
      background-color: #ECFDF5;
      color: #065F46;
      border: 1px solid #A7F3D0;
    }
    .badge-pending {
      background-color: #FEF3C7;
      color: #92400E;
      border: 1px solid #FDE68A;
    }
    .badge-warning {
      background-color: #FEF2F2;
      color: #991B1B;
      border: 1px solid #FECACA;
    }
    .info-card {
      background-color: #F8FAFC;
      border-left: 4px solid #0F4530;
      border-radius: 6px;
      padding: 18px 20px;
      margin: 24px 0;
    }
    .info-row {
      margin-bottom: 8px;
      font-size: 14px;
    }
    .info-row:last-child {
      margin-bottom: 0;
    }
    .info-label {
      color: #64748B;
      font-weight: 600;
      display: inline-block;
      min-width: 130px;
    }
    .info-value {
      color: #0F172A;
      font-weight: 700;
    }
    .btn-action {
      display: inline-block;
      background: linear-gradient(135deg, #0F4530 0%, #176546 100%);
      color: #FFFFFF !important;
      text-decoration: none;
      padding: 14px 28px;
      border-radius: 8px;
      font-weight: 700;
      font-size: 14px;
      text-align: center;
      margin: 20px 0 10px 0;
      box-shadow: 0 4px 12px rgba(15, 69, 48, 0.25);
    }
    .footer {
      background-color: #F1F5F9;
      padding: 24px 32px;
      text-align: center;
      font-size: 12px;
      color: #64748B;
      border-top: 1px solid #E2E8F0;
    }
    .footer a {
      color: #0F4530;
      text-decoration: underline;
      font-weight: 600;
    }
    .footer-disclaimer {
      margin-top: 12px;
      font-size: 11px;
      color: #94A3B8;
      line-height: 1.4;
    }
    @media only screen and (max-width: 600px) {
      .email-container {
        margin: 10px auto;
        border-radius: 0;
      }
      .content-body {
        padding: 24px 18px;
      }
      .header-banner {
        padding: 20px 18px;
      }
      .info-label {
        display: block;
        margin-bottom: 2px;
      }
      .btn-action {
        display: block;
        width: auto;
      }
    }
  </style>
</head>
<body>
  <div style="background-color: #F8FAFC; padding: 20px 0;">
    <div class="email-container">
      <!-- Official Header -->
      <div class="header-banner">
        <img src="https://www.ncsyf.com.ng/images/logo.png" alt="NCSYF Logo" class="header-logo">
        <h1 class="header-title">Nigeria Civil Service Youths' Forum</h1>
        <div class="header-subtitle">Federal Republic of Nigeria • Non-Partisan Forum</div>
      </div>

      <!-- Main Body Content -->
      <div class="content-body">
        ${contentHtml}
      </div>

      <!-- Official Footer -->
      <div class="footer">
        <p style="margin: 0 0 6px 0; font-weight: 600; color: #334155;">
          National Secretariat • Nigeria Civil Service Youths' Forum (NCSYF)
        </p>
        <p style="margin: 0 0 8px 0;">
          Federal Secretariat Complex, Shehu Shagari Way, Central Business District, Abuja, FCT, Nigeria
        </p>
        <p style="margin: 0 0 12px 0;">
          Official Inquiries: <a href="mailto:admin@ncsyf.com.ng">admin@ncsyf.com.ng</a> • Portal: <a href="https://www.ncsyf.com.ng">www.ncsyf.com.ng</a>
        </p>
        <div class="footer-disclaimer">
          This is an official transactional notification sent by the NCSYF National Secretariat. If you received this email in error, please disregard it or notify the Secretariat.
        </div>
      </div>
    </div>
  </div>
</body>
</html>`;
}

/**
 * Template 1: Registration Acknowledgement (To Applicant)
 */
function buildRegistrationAcknowledgementTemplate(data) {
  const firstName = escapeHtml(data.firstName || 'Applicant');
  const lastName = escapeHtml(data.lastName || '');
  const memberId = escapeHtml(data.memberId || 'Pending Assignment');
  const category = escapeHtml(data.memberTypeLabel || 'Full Member (18–35 yrs)');
  const mda = escapeHtml(data.mda || 'Federal Public Service');
  const stateChapter = escapeHtml(data.stateChapter || 'FCT Abuja');
  const submissionDate = escapeHtml(data.submissionDate || new Date().toLocaleString('en-GB', { timeZone: 'Africa/Lagos' }));

  const contentHtml = `
    <div style="margin-bottom: 20px;">
      <span class="badge badge-pending">Application Logged • Pending Verification</span>
    </div>
    <h2 style="color: #0F4530; margin: 0 0 16px 0; font-size: 22px;">Membership Application Received</h2>
    <p>Dear <strong>${firstName} ${lastName}</strong>,</p>
    <p>Thank you for submitting your membership application to the <strong>Nigeria Civil Service Youths' Forum (NCSYF)</strong>. Your application has been logged into the National Secretariat Membership Registry.</p>
    
    <div class="info-card">
      <div class="info-row"><span class="info-label">Application Reference:</span> <span class="info-value" style="color: #0F4530;">${memberId}</span></div>
      <div class="info-row"><span class="info-label">Membership Category:</span> <span class="info-value">${category}</span></div>
      <div class="info-row"><span class="info-label">Primary MDA:</span> <span class="info-value">${mda}</span></div>
      <div class="info-row"><span class="info-label">Designated Chapter:</span> <span class="info-value">${stateChapter}</span></div>
      <div class="info-row"><span class="info-label">Date Submitted:</span> <span class="info-value">${submissionDate} (WAT)</span></div>
    </div>

    <h3 style="color: #0F4530; font-size: 16px; margin: 24px 0 10px 0;">What Happens Next?</h3>
    <ol style="padding-left: 20px; margin: 0 0 20px 0; color: #475569; font-size: 14px;">
      <li style="margin-bottom: 8px;"><strong>Credential Verification:</strong> The Secretariat Verification Committee verifies your MDA service status and eligibility criteria.</li>
      <li style="margin-bottom: 8px;"><strong>Official Authentication:</strong> Once cleared, you will receive an official verification confirmation email.</li>
      <li><strong>Member Workspace:</strong> You can log into your member account anytime using your registered email/Member ID to check your status.</li>
    </ol>

    <div style="text-align: center; margin: 28px 0 16px 0;">
      <a href="https://www.ncsyf.com.ng/signin" class="btn-action">Access Member Portal →</a>
    </div>

    <p style="font-size: 13px; color: #64748B; margin-top: 24px;">
      Need assistance? Reply directly to this email or contact the Secretariat at <a href="mailto:admin@ncsyf.com.ng" style="color: #0F4530;">admin@ncsyf.com.ng</a>.
    </p>
  `;

  const textFallback = `NIGERIA CIVIL SERVICE YOUTHS' FORUM (NCSYF)
MEMBERSHIP APPLICATION RECEIVED

Dear ${data.firstName || 'Applicant'} ${data.lastName || ''},

Thank you for applying for membership with the Nigeria Civil Service Youths' Forum (NCSYF). Your application has been received and logged in the National Secretariat Registry.

APPLICATION PARTICULARS:
- Application Reference: ${data.memberId || 'Pending'}
- Membership Category: ${data.memberTypeLabel || 'Full Member'}
- MDA: ${data.mda || 'Public Service'}
- Designated State Chapter: ${data.stateChapter || 'FCT Abuja'}
- Submission Date: ${data.submissionDate || new Date().toISOString()}

WHAT HAPPENS NEXT:
The Secretariat Verification Committee will review your credentials against Forum statutory requirements. You will receive an email update once your membership verification is completed.

You can log in to view your application status at: https://www.ncsyf.com.ng/signin

National Secretariat
Nigeria Civil Service Youths' Forum (NCSYF)
Federal Secretariat Complex, Shehu Shagari Way, Abuja, Nigeria
admin@ncsyf.com.ng | https://www.ncsyf.com.ng
`;

  return {
    subject: `[NCSYF] Membership Application Received — Reference: ${data.memberId || 'NCSYF'}`,
    html: renderBaseLayout({ title: 'Application Received', contentHtml }),
    text: textFallback
  };
}

/**
 * Template 2: Admin Notification (To Secretariat / Administrator)
 */
function buildAdminNotificationTemplate(data) {
  const memberId = escapeHtml(data.memberId || 'N/A');
  const fullName = escapeHtml(`${data.firstName || ''} ${data.lastName || ''}`.trim() || 'New Applicant');
  const email = escapeHtml(data.email || 'N/A');
  const phone = escapeHtml(data.phone || 'N/A');
  const category = escapeHtml(data.memberTypeLabel || data.category || 'Full Member');
  const tier = escapeHtml(data.tierLabel || data.tier || 'Federal MDA');
  const mda = escapeHtml(data.mda || 'Unspecified MDA');
  const staffId = escapeHtml(data.staffId || 'N/A');
  const stateChapter = escapeHtml(data.stateChapter || 'FCT Abuja');
  const submissionDate = escapeHtml(data.submissionDate || new Date().toLocaleString('en-GB', { timeZone: 'Africa/Lagos' }));

  const contentHtml = `
    <div style="margin-bottom: 20px;">
      <span class="badge badge-pending">Action Required • Secretariat Queue</span>
    </div>
    <h2 style="color: #0F4530; margin: 0 0 16px 0; font-size: 22px;">New Membership Application Submitted</h2>
    <p>A new civil service membership registration has been submitted and is awaiting credential review in the Administrative Portal.</p>
    
    <div class="info-card">
      <div class="info-row"><span class="info-label">Assigned Member ID:</span> <span class="info-value" style="color: #0F4530;">${memberId}</span></div>
      <div class="info-row"><span class="info-label">Applicant Name:</span> <span class="info-value">${fullName}</span></div>
      <div class="info-row"><span class="info-label">Registered Email:</span> <span class="info-value">${email}</span></div>
      <div class="info-row"><span class="info-label">Phone Number:</span> <span class="info-value">${phone}</span></div>
      <div class="info-row"><span class="info-label">Membership Class:</span> <span class="info-value">${category}</span></div>
      <div class="info-row"><span class="info-label">Tier &amp; MDA:</span> <span class="info-value">${tier} — ${mda}</span></div>
      <div class="info-row"><span class="info-label">Staff / Service ID:</span> <span class="info-value">${staffId}</span></div>
      <div class="info-row"><span class="info-label">Designated Chapter:</span> <span class="info-value">${stateChapter}</span></div>
      <div class="info-row"><span class="info-label">Date Submitted:</span> <span class="info-value">${submissionDate} (WAT)</span></div>
    </div>

    <div style="text-align: center; margin: 28px 0 16px 0;">
      <a href="https://admin.ncsyf.com.ng" class="btn-action">Review Dossier in Admin Portal →</a>
    </div>

    <p style="font-size: 12px; color: #64748B; margin-top: 20px;">
      This notification was generated automatically by the NCSYF Membership Gateway for authorized Secretariat officers.
    </p>
  `;

  const textFallback = `NCSYF ADMIN ALERT: NEW MEMBERSHIP APPLICATION

A new membership registration has been logged in the Secretariat Registry:

- Member ID: ${data.memberId || 'N/A'}
- Full Name: ${data.firstName || ''} ${data.lastName || ''}
- Email: ${data.email || 'N/A'}
- Phone: ${data.phone || 'N/A'}
- Class: ${data.memberTypeLabel || 'Full Member'}
- MDA: ${data.tierLabel || ''} — ${data.mda || 'N/A'}
- Staff ID: ${data.staffId || 'N/A'}
- State Chapter: ${data.stateChapter || 'FCT Abuja'}
- Submitted: ${data.submissionDate || new Date().toISOString()}

Please review and verify this applicant's service records in the Secretariat Admin Console:
https://admin.ncsyf.com.ng
`;

  return {
    subject: `[NCSYF Admin] New Application Logged — ${data.memberId || ''} (${data.firstName || ''} ${data.lastName || ''})`,
    html: renderBaseLayout({ title: 'New Application Submitted', contentHtml }),
    text: textFallback
  };
}

/**
 * Template 3: Membership Approval & Verification (To Applicant)
 */
function buildMembershipApprovedTemplate(data) {
  const firstName = escapeHtml(data.firstName || 'Member');
  const lastName = escapeHtml(data.lastName || '');
  const memberId = escapeHtml(data.memberId || 'NCSYF Member');
  const category = escapeHtml(data.memberTypeLabel || 'Full Member (18–35 yrs)');
  const mda = escapeHtml(data.mda || 'Federal Public Service');
  const stateChapter = escapeHtml(data.stateChapter || 'FCT Abuja');
  const verifiedDate = escapeHtml(data.verifiedDate || new Date().toLocaleDateString('en-GB'));

  const contentHtml = `
    <div style="margin-bottom: 20px;">
      <span class="badge badge-success">✓ Verified Active Member</span>
    </div>
    <h2 style="color: #0F4530; margin: 0 0 16px 0; font-size: 22px;">Congratulations! Your Membership is Verified</h2>
    <p>Dear <strong>${firstName} ${lastName}</strong>,</p>
    <p>We are delighted to inform you that your credentials have been verified by the National Secretariat. You are now chartered as a <strong>Verified Active Member</strong> of the <strong>Nigeria Civil Service Youths' Forum (NCSYF)</strong>.</p>
    
    <div class="info-card" style="border-left-color: #059669; background-color: #F0FDF4;">
      <div class="info-row"><span class="info-label">Official Member ID:</span> <span class="info-value" style="color: #065F46; font-size: 16px;">${memberId}</span></div>
      <div class="info-row"><span class="info-label">Membership Status:</span> <span class="info-value" style="color: #059669;">VERIFIED ACTIVE MEMBER</span></div>
      <div class="info-row"><span class="info-label">Membership Category:</span> <span class="info-value">${category}</span></div>
      <div class="info-row"><span class="info-label">MDA Affiliation:</span> <span class="info-value">${mda}</span></div>
      <div class="info-row"><span class="info-label">State Chapter:</span> <span class="info-value">${stateChapter}</span></div>
      <div class="info-row"><span class="info-label">Verification Date:</span> <span class="info-value">${verifiedDate}</span></div>
    </div>

    <h3 style="color: #0F4530; font-size: 16px; margin: 24px 0 12px 0;">Activated Privileges &amp; Next Steps</h3>
    <ul style="padding-left: 20px; margin: 0 0 24px 0; color: #475569; font-size: 14px;">
      <li style="margin-bottom: 8px;"><strong>Digital Credential Slip:</strong> Log in to your dashboard to view and print your tamper-evident Digital Membership Slip.</li>
      <li style="margin-bottom: 8px;"><strong>e-Library &amp; Training:</strong> Access official civil service circulars, governance whitepapers, and reform guides.</li>
      <li style="margin-bottom: 8px;"><strong>State Chapter Participation:</strong> Connect with your designated State Chapter Executive for regional activities and summits.</li>
      <li><strong>Projects Portfolio:</strong> Collaborate on Track A thematic initiatives and Track B state projects.</li>
    </ul>

    <div style="text-align: center; margin: 28px 0 16px 0;">
      <a href="https://www.ncsyf.com.ng/signin" class="btn-action">Open Member Dashboard →</a>
    </div>

    <p style="font-size: 13px; color: #64748B; margin-top: 24px;">
      Sign in using your <strong>Official Member ID (${memberId})</strong> or registered email address.
    </p>
  `;

  const textFallback = `NIGERIA CIVIL SERVICE YOUTHS' FORUM (NCSYF)
MEMBERSHIP VERIFICATION APPROVED

Dear ${data.firstName || 'Member'} ${data.lastName || ''},

Congratulations! Your credentials have been officially verified by the National Secretariat. You are now recognized as a Verified Active Member of the Nigeria Civil Service Youths' Forum (NCSYF).

VERIFIED PARTICULARS:
- Official Member ID: ${data.memberId || ''}
- Status: VERIFIED ACTIVE MEMBER
- Membership Class: ${data.memberTypeLabel || 'Full Member'}
- MDA: ${data.mda || ''}
- State Chapter: ${data.stateChapter || 'FCT Abuja'}
- Verification Date: ${data.verifiedDate || new Date().toISOString()}

ACTIVATED PRIVILEGES:
1. Print your official Digital Credential Slip from your dashboard.
2. Access the e-Library and training circulars.
3. Participate in your State Chapter events and leadership ballot.

Log into your dashboard now at:
https://www.ncsyf.com.ng/signin

National Secretariat
Nigeria Civil Service Youths' Forum (NCSYF)
admin@ncsyf.com.ng | https://www.ncsyf.com.ng
`;

  return {
    subject: `[NCSYF] Membership Approved & Verified — Welcome, Member ${data.memberId || ''}!`,
    html: renderBaseLayout({ title: 'Membership Approved', contentHtml }),
    text: textFallback
  };
}

/**
 * Template 4: Membership Disapproval / Reapplication (To Applicant)
 */
function buildMembershipDisapprovedTemplate(data) {
  const firstName = escapeHtml(data.firstName || 'Applicant');
  const lastName = escapeHtml(data.lastName || '');
  const memberId = escapeHtml(data.memberId || 'N/A');
  const reason = escapeHtml(data.reason || data.disapprovedReason || 'Documentation could not be verified');
  const notes = escapeHtml(data.notes || data.disapprovedNotes || 'Please ensure uploaded credentials accurately match your civil service staff identification.');

  const contentHtml = `
    <div style="margin-bottom: 20px;">
      <span class="badge badge-warning">Verification Update • Reapplication Permitted</span>
    </div>
    <h2 style="color: #991B1B; margin: 0 0 16px 0; font-size: 22px;">Notice Regarding Your Membership Application</h2>
    <p>Dear <strong>${firstName} ${lastName}</strong>,</p>
    <p>Thank you for your interest in joining the <strong>Nigeria Civil Service Youths' Forum (NCSYF)</strong>. During our credential audit, the Secretariat was unable to verify your application due to the following requirement:</p>
    
    <div class="info-card" style="border-left-color: #DC2626; background-color: #FEF2F2;">
      <div class="info-row"><span class="info-label">Application Reference:</span> <span class="info-value">${memberId}</span></div>
      <div class="info-row"><span class="info-label">Verification Finding:</span> <span class="info-value" style="color: #B91C1C;">${reason}</span></div>
      ${notes ? `<div class="info-row" style="margin-top: 10px;"><span class="info-label">Secretariat Notes:</span> <span class="info-value" style="font-weight: normal; color: #4B5563;">${notes}</span></div>` : ''}
    </div>

    <h3 style="color: #0F4530; font-size: 16px; margin: 24px 0 12px 0;">How to Reapply</h3>
    <p style="font-size: 14px; color: #475569;">
      You are fully eligible to re-apply with corrected information. Please visit our registration page, update the required fields, and re-submit your application for immediate re-examination.
    </p>

    <div style="text-align: center; margin: 28px 0 16px 0;">
      <a href="https://www.ncsyf.com.ng/membership#register" class="btn-action">Submit Corrected Application →</a>
    </div>

    <p style="font-size: 13px; color: #64748B; margin-top: 24px;">
      If you believe this finding is in error or have documentation questions, please reach out to the Secretariat Verification Desk at <a href="mailto:admin@ncsyf.com.ng" style="color: #0F4530;">admin@ncsyf.com.ng</a>.
    </p>
  `;

  const textFallback = `NIGERIA CIVIL SERVICE YOUTHS' FORUM (NCSYF)
MEMBERSHIP APPLICATION STATUS UPDATE

Dear ${data.firstName || 'Applicant'} ${data.lastName || ''},

Thank you for your application to the Nigeria Civil Service Youths' Forum (NCSYF). During our credential verification, the Secretariat could not verify your application at this time:

- Reference ID: ${data.memberId || 'N/A'}
- Finding: ${data.reason || data.disapprovedReason || 'Documentation requires correction'}
- Secretariat Notes: ${data.notes || data.disapprovedNotes || 'None specified'}

REAPPLICATION INSTRUCTIONS:
You are eligible to re-apply. Please submit your corrected details at:
https://www.ncsyf.com.ng/membership#register

For support, please contact admin@ncsyf.com.ng.

National Secretariat
Nigeria Civil Service Youths' Forum (NCSYF)
admin@ncsyf.com.ng | https://www.ncsyf.com.ng
`;

  return {
    subject: `[NCSYF] Update on Your Membership Application — Reference: ${data.memberId || 'NCSYF'}`,
    html: renderBaseLayout({ title: 'Application Status Update', contentHtml }),
    text: textFallback
  };
}

/**
 * Template 5: Password Reset & Account Recovery (To Member)
 */
function buildPasswordResetTemplate(data) {
  const firstName = escapeHtml(data.firstName || 'Member');
  const resetUrl = escapeHtml(data.resetUrl || 'https://www.ncsyf.com.ng/signin');
  const expiresMinutes = escapeHtml(String(data.expiresMinutes || '60'));
  const requestTime = escapeHtml(data.requestTime || new Date().toLocaleString('en-GB', { timeZone: 'Africa/Lagos' }));

  const contentHtml = `
    <div style="margin-bottom: 20px;">
      <span class="badge badge-warning">Security Notification • Password Recovery</span>
    </div>
    <h2 style="color: #0F4530; margin: 0 0 16px 0; font-size: 22px;">Reset Your Account Password</h2>
    <p>Dear <strong>${firstName}</strong>,</p>
    <p>A request was received to reset the password for your Nigeria Civil Service Youths' Forum member account on <strong>${requestTime} (WAT)</strong>.</p>
    
    <p style="font-size: 14px; color: #475569;">
      Click the button below to set a new password. For your security, this recovery link will expire in <strong>${expiresMinutes} minutes</strong>.
    </p>

    <div style="text-align: center; margin: 30px 0 20px 0;">
      <a href="${resetUrl}" class="btn-action">Reset My Password →</a>
    </div>

    <div class="info-card" style="border-left-color: #EAB308; background-color: #FEFCE8; margin-top: 24px;">
      <p style="margin: 0; font-size: 13px; color: #713F12;">
        <strong>Didn't make this request?</strong> If you did not initiate this password reset, you can safely ignore this email. Your current password remains active and secure.
      </p>
    </div>

    <p style="font-size: 12px; color: #64748B; margin-top: 24px; word-break: break-all;">
      If the button above does not work, copy and paste this link into your browser:<br>
      <a href="${resetUrl}" style="color: #0F4530;">${resetUrl}</a>
    </p>
  `;

  const textFallback = `NIGERIA CIVIL SERVICE YOUTHS' FORUM (NCSYF)
PASSWORD RESET REQUEST

Dear ${data.firstName || 'Member'},

A request was received to reset the password for your NCSYF member account on ${data.requestTime || new Date().toISOString()}.

To reset your password, visit the link below (valid for ${data.expiresMinutes || '60'} minutes):
${data.resetUrl || 'https://www.ncsyf.com.ng/signin'}

If you did not request this password reset, please disregard this email. Your account remains secure.

National Secretariat
Nigeria Civil Service Youths' Forum (NCSYF)
admin@ncsyf.com.ng | https://www.ncsyf.com.ng
`;

  return {
    subject: `[NCSYF Security] Password Reset Instructions for Your Account`,
    html: renderBaseLayout({ title: 'Password Reset', contentHtml }),
    text: textFallback
  };
}

/**
 * Template Registry
 */
const TEMPLATE_REGISTRY = {
  registration_acknowledgement: buildRegistrationAcknowledgementTemplate,
  admin_new_application: buildAdminNotificationTemplate,
  membership_approved: buildMembershipApprovedTemplate,
  membership_disapproved: buildMembershipDisapprovedTemplate,
  password_reset: buildPasswordResetTemplate
};

/**
 * Core Send Workflow Email Dispatcher
 */
async function sendWorkflowEmail({ workflow, recipient, data = {}, idempotencyKey = null, ipAddress = null }) {
  // 1. Validate Workflow
  if (!workflow || !TEMPLATE_REGISTRY[workflow]) {
    return {
      success: false,
      status: 'failed',
      error: `Invalid email workflow: "${workflow}". Supported workflows: ${Object.keys(TEMPLATE_REGISTRY).join(', ')}`
    };
  }

  // 2. Validate and Sanitize Recipient
  const cleanRecipient = sanitizeHeader(recipient).toLowerCase();
  if (!isValidEmail(cleanRecipient)) {
    return {
      success: false,
      status: 'failed',
      error: `Invalid recipient email address: "${recipient}".`
    };
  }

  const now = Date.now();
  const effectiveIdempKey = idempotencyKey || `${workflow}:${cleanRecipient}:${data.memberId || ''}:${Math.floor(now / (5 * 60 * 1000))}`;

  // 3. Persistent Storage Idempotency & Rate Limit Claim
  const claim = await claimPersistentDispatch({
    idempotencyKey: effectiveIdempKey,
    workflow,
    recipient: cleanRecipient,
    memberId: data.memberId || null,
    ipAddress,
    metadata: {
      category: data.category,
      mda: data.mda,
      stateChapter: data.stateChapter
    }
  });

  if (claim) {
    if (claim.rateLimited) {
      return {
        success: false,
        status: 'rate_limited',
        error: claim.error || `Rate limit exceeded for recipient ${cleanRecipient}.`
      };
    }
    if (claim.duplicate) {
      return {
        success: true,
        status: 'duplicate_prevented',
        message: claim.message || 'Duplicate notification suppressed: An identical transactional email was already processed recently.',
        idempotencyKey: effectiveIdempKey,
        originalTimestamp: claim.originalTimestamp
      };
    }
  }

  // 4. In-Memory Fallback Check (for local / offline environments)
  const recipientHistory = recipientRateLimits.get(cleanRecipient) || [];
  const recentCalls = recipientHistory.filter(t => now - t < RATE_LIMIT_WINDOW_MS);

  if (recentCalls.length >= RATE_LIMIT_MAX) {
    return {
      success: false,
      status: 'rate_limited',
      error: `Rate limit exceeded for recipient ${cleanRecipient}. Please wait a moment before sending another notification.`
    };
  }
  recentCalls.push(now);
  recipientRateLimits.set(cleanRecipient, recentCalls);

  if (recentDispatches.has(effectiveIdempKey)) {
    const existing = recentDispatches.get(effectiveIdempKey);
    return {
      success: true,
      status: 'duplicate_prevented',
      message: 'Duplicate notification suppressed: An identical transactional email was already processed recently.',
      idempotencyKey: effectiveIdempKey,
      originalTimestamp: new Date(existing).toISOString()
    };
  }

  // 5. Render Template
  const templateBuilder = TEMPLATE_REGISTRY[workflow];
  const { subject, html, text } = templateBuilder(data);

  // 6. Build Mail Options
  const fromName = sanitizeHeader(process.env.SMTP_FROM_NAME || 'NCSYF');
  const fromEmail = sanitizeHeader(process.env.SMTP_FROM_EMAIL || 'admin@ncsyf.com.ng');
  const fromHeader = `"${fromName}" <${fromEmail}>`;

  const mailOptions = {
    from: fromHeader,
    to: cleanRecipient,
    subject: sanitizeHeader(subject),
    html: html,
    text: text,
    headers: {
      'X-NCSYF-Workflow': workflow,
      'X-NCSYF-Recipient': cleanRecipient,
      'X-Auto-Response-Suppress': 'OOF, AutoReply'
    }
  };

  // 7. Check for Mock / Test Mode
  const smtpPass = process.env.SMTP_PASS;
  const isMock = !smtpPass || smtpPass === 'YOUR_ZEPTOMAIL_PASSWORD' || process.env.SMTP_MOCK === 'true' || process.env.NODE_ENV === 'test';

  if (isMock) {
    const mockMessageId = `<mock-${crypto.randomBytes(8).toString('hex')}@ncsyf.com.ng>`;
    recentDispatches.set(effectiveIdempKey, now);

    // Finalize in persistent store
    await finalizePersistentDispatch({
      idempotencyKey: effectiveIdempKey,
      status: 'accepted',
      messageId: mockMessageId,
      subject: subject
    });

    return {
      success: true,
      status: 'accepted',
      simulated: true,
      messageId: mockMessageId,
      recipient: cleanRecipient,
      workflow: workflow,
      subject: subject,
      timestamp: new Date().toISOString()
    };
  }

  // 8. Execute Live SMTP Transmission
  try {
    const transporter = getTransporter();
    const info = await transporter.sendMail(mailOptions);

    recentDispatches.set(effectiveIdempKey, now);

    // Finalize in persistent store
    await finalizePersistentDispatch({
      idempotencyKey: effectiveIdempKey,
      status: 'accepted',
      messageId: info.messageId,
      subject: subject
    });

    return {
      success: true,
      status: 'accepted',
      messageId: info.messageId,
      accepted: info.accepted || [cleanRecipient],
      rejected: info.rejected || [],
      recipient: cleanRecipient,
      workflow: workflow,
      timestamp: new Date().toISOString()
    };
  } catch (err) {
    // Log sanitized error without revealing credentials or tokens
    const sanitizedError = err.message || 'SMTP delivery encountered an error.';
    console.error(`[NCSYF Email Service] Delivery failed for [${workflow}] to [${cleanRecipient}]:`, sanitizedError);

    // Record failure in persistent store
    await finalizePersistentDispatch({
      idempotencyKey: effectiveIdempKey,
      status: 'failed',
      errorMessage: sanitizedError
    });

    return {
      success: false,
      status: 'failed',
      recipient: cleanRecipient,
      workflow: workflow,
      error: sanitizedError,
      code: err.code || 'SMTP_ERROR',
      timestamp: new Date().toISOString()
    };
  }
}

module.exports = {
  sendWorkflowEmail,
  verifySmtpConnection,
  isValidEmail,
  sanitizeHeader,
  escapeHtml,
  SUPPORTED_WORKFLOWS: Object.keys(TEMPLATE_REGISTRY)
};
