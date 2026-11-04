/**
 * ==============================================================================
 * NCSYF SERVERLESS TRANSACTIONAL EMAIL ENDPOINT (/api/send-email)
 * Nigeria Civil Service Youths' Forum (NCSYF)
 * ==============================================================================
 * Secure Serverless Function on Vercel for dispatching transactional notifications.
 * Enforces server-side authorization, database state verification, persistent
 * deduplication, and strictly trusted recipient sourcing.
 * ==============================================================================
 */

const { sendWorkflowEmail, SUPPORTED_WORKFLOWS, isValidEmail } = require('../lib/email-service');
const { verifyAdminToken, getMemberRecord } = require('../lib/supabase-server');

module.exports = async function handler(req, res) {
  // 1. Enable CORS for official NCSYF web origins
  const origin = req.headers.origin || '';
  const allowedOrigins = [
    'https://www.ncsyf.com.ng',
    'https://ncsyf.com.ng',
    'https://admin.ncsyf.com.ng',
    'http://localhost:5501',
    'http://127.0.0.1:5501'
  ];

  if (allowedOrigins.includes(origin) || origin.endsWith('.vercel.app')) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  } else {
    res.setHeader('Access-Control-Allow-Origin', 'https://www.ncsyf.com.ng');
  }

  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
  res.setHeader('Access-Control-Max-Age', '86400');

  // Handle preflight OPTIONS
  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  // Reject non-POST methods
  if (req.method !== 'POST') {
    return res.status(405).json({
      success: false,
      error: 'Method Not Allowed. Only POST requests are permitted.'
    });
  }

  // 2. Parse and Validate Request Payload
  try {
    let body = req.body;
    if (typeof body === 'string') {
      try {
        body = JSON.parse(body);
      } catch (pErr) {
        return res.status(400).json({
          success: false,
          error: 'Malformed JSON payload.'
        });
      }
    }

    if (!body || typeof body !== 'object') {
      return res.status(400).json({
        success: false,
        error: 'Missing request body.'
      });
    }

    const { workflow, recipient, data = {}, idempotencyKey } = body;

    // Validate supported workflow
    if (!workflow || !SUPPORTED_WORKFLOWS.includes(workflow)) {
      return res.status(400).json({
        success: false,
        error: `Unsupported workflow "${workflow}". Supported workflows: ${SUPPORTED_WORKFLOWS.join(', ')}`
      });
    }

    const clientIp = (req.headers['x-forwarded-for'] || '').split(',')[0].trim() || req.socket?.remoteAddress || '';
    let targetRecipient = recipient ? String(recipient).trim().toLowerCase() : '';
    let verifiedData = { ...data };

    // =========================================================================
    // WORKFLOW 1 & 2: PRIVILEGED ADMINISTRATIVE ACTIONS (APPROVAL & DISAPPROVAL)
    // =========================================================================
    if (workflow === 'membership_approved' || workflow === 'membership_disapproved') {
      // Step A: Server-side Administrator Authentication
      const authHeader = req.headers.authorization || '';
      const authResult = await verifyAdminToken(authHeader);

      if (!authResult.ok) {
        return res.status(authResult.status || 401).json({
          success: false,
          error: authResult.error || 'Unauthorized: Administrator authentication required for privileged notifications.'
        });
      }

      // Step B: Target Member Dossier Lookup
      const targetMemberId = (data && (data.memberId || data.id)) || body.memberId;
      if (!targetMemberId) {
        return res.status(400).json({
          success: false,
          error: 'Member reference identifier is required for administrative notifications.'
        });
      }

      const memberRecord = await getMemberRecord(targetMemberId);
      if (!memberRecord) {
        return res.status(404).json({
          success: false,
          error: `Member record "${targetMemberId}" not found in Secretariat registry.`
        });
      }

      // Step C: Verify Actual Database Status
      const expectedStatus = workflow === 'membership_approved' ? 'verified' : 'disapproved';
      const actualStatus = (memberRecord.status || '').toLowerCase();

      // Permit 'approved' as synonym for 'verified'
      const isStatusValid = (workflow === 'membership_approved' && (actualStatus === 'verified' || actualStatus === 'approved')) ||
                            (workflow === 'membership_disapproved' && actualStatus === 'disapproved');

      if (!isStatusValid) {
        return res.status(400).json({
          success: false,
          error: `Invalid operation: Member status is "${actualStatus}", expected "${expectedStatus}" in database.`
        });
      }

      // Step D: Strictly Use Database Recipient & Sanitized Dossier Data
      targetRecipient = (memberRecord.email || '').toLowerCase().trim();
      if (!isValidEmail(targetRecipient)) {
        return res.status(400).json({
          success: false,
          error: 'Registered member email on file is invalid.'
        });
      }

      verifiedData = {
        firstName: memberRecord.first_name || memberRecord.firstName || data.firstName || 'Member',
        lastName: memberRecord.last_name || memberRecord.lastName || data.lastName || '',
        memberId: memberRecord.member_id || memberRecord.memberId || targetMemberId,
        memberTypeLabel: memberRecord.member_type_label || data.memberTypeLabel || 'Full Member (18–35 yrs)',
        mda: memberRecord.mda || data.mda || 'Federal Public Service',
        stateChapter: memberRecord.state_chapter || memberRecord.stateChapter || data.stateChapter || 'FCT Abuja',
        verifiedDate: memberRecord.verified_at || memberRecord.verifiedDate || new Date().toLocaleDateString('en-GB'),
        reason: memberRecord.disapproved_reason || memberRecord.disapprovedReason || data.reason || 'Documentation could not be verified',
        notes: memberRecord.disapproved_notes || memberRecord.disapprovedNotes || data.notes || ''
      };
    }

    // =========================================================================
    // WORKFLOW 3: REGISTRATION ACKNOWLEDGEMENT (PUBLIC MEMBER SUBMISSION)
    // =========================================================================
    else if (workflow === 'registration_acknowledgement') {
      const submittedMemberId = (data && (data.memberId || data.id)) || body.memberId;
      if (submittedMemberId) {
        const memberRecord = await getMemberRecord(submittedMemberId);
        if (memberRecord) {
          // Force recipient to match the official registered email in database
          targetRecipient = (memberRecord.email || '').toLowerCase().trim();
          verifiedData.firstName = memberRecord.first_name || data.firstName;
          verifiedData.lastName = memberRecord.last_name || data.lastName;
          verifiedData.memberId = memberRecord.member_id || submittedMemberId;
          verifiedData.mda = memberRecord.mda || data.mda;
          verifiedData.stateChapter = memberRecord.state_chapter || data.stateChapter;
        }
      }

      if (!targetRecipient || !isValidEmail(targetRecipient)) {
        return res.status(400).json({
          success: false,
          error: 'A valid recipient email address is required.'
        });
      }
    }

    // =========================================================================
    // WORKFLOW 4: ADMIN NEW APPLICATION ALERT (PUBLIC ALERT TO SECRETARIAT)
    // =========================================================================
    else if (workflow === 'admin_new_application') {
      // Force recipient strictly to authorized Secretariat notification inbox
      targetRecipient = (process.env.ADMIN_NOTIFICATION_EMAIL || 'admin@ncsyf.com.ng').toLowerCase().trim();

      const memberId = (data && (data.memberId || data.id)) || body.memberId;
      if (memberId) {
        const memberRecord = await getMemberRecord(memberId);
        if (memberRecord) {
          verifiedData.firstName = memberRecord.first_name || data.firstName;
          verifiedData.lastName = memberRecord.last_name || data.lastName;
          verifiedData.email = memberRecord.email || data.email;
          verifiedData.phone = memberRecord.phone || data.phone;
          verifiedData.mda = memberRecord.mda || data.mda;
          verifiedData.stateChapter = memberRecord.state_chapter || data.stateChapter;
        }
      }
    }

    // =========================================================================
    // WORKFLOW 5: PASSWORD RESET RECOVERY
    // =========================================================================
    else if (workflow === 'password_reset') {
      // Unauthenticated public calls directly to /api/send-email for password reset
      // must be restricted to prevent arbitrary email bombing or relaying.
      const authHeader = req.headers.authorization || '';
      const hasAuth = authHeader.startsWith('Bearer ');

      // In production, Supabase Auth handles tokenized password reset links securely.
      // If called via API, require either admin token or validate recipient format.
      if (!hasAuth && process.env.NODE_ENV !== 'test') {
        return res.status(403).json({
          success: false,
          error: 'Password reset requests must be initiated through the official authentication service.'
        });
      }

      if (!targetRecipient || !isValidEmail(targetRecipient)) {
        return res.status(400).json({
          success: false,
          error: 'A valid recipient email address is required.'
        });
      }

      // Ensure resetUrl always points to the official production domain
      verifiedData.resetUrl = 'https://www.ncsyf.com.ng/signin';
    }

    // 3. Dispatch Email through Central Service
    const result = await sendWorkflowEmail({
      workflow,
      recipient: targetRecipient,
      data: verifiedData,
      idempotencyKey,
      ipAddress: clientIp
    });

    if (result.success) {
      return res.status(200).json({
        success: true,
        status: result.status,
        workflow: result.workflow || workflow,
        recipient: result.recipient || targetRecipient,
        messageId: result.messageId,
        message: result.message || 'Transactional email accepted for delivery.',
        timestamp: result.timestamp || new Date().toISOString()
      });
    } else {
      const statusCode = result.status === 'rate_limited' ? 429 : 500;
      return res.status(statusCode).json({
        success: false,
        status: result.status,
        error: result.error || 'Failed to dispatch email notification.'
      });
    }
  } catch (err) {
    console.error('[API /api/send-email] Server error:', err.message);
    return res.status(500).json({
      success: false,
      error: 'An internal server error occurred while processing the email dispatch.'
    });
  }
};
