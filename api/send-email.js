/**
 * ==========================================================================
 * NCSYF SERVERLESS TRANSACTIONAL EMAIL ENDPOINT (/api/send-email)
 * Nigeria Civil Service Youths' Forum (NCSYF)
 * ==========================================================================
 * Dispatches transactional notifications via Zoho ZeptoMail SMTP.
 * Runs securely on Vercel Serverless Functions.
 */

const { sendWorkflowEmail, SUPPORTED_WORKFLOWS, isValidEmail } = require('../lib/email-service');

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

    const { workflow, recipient, data, idempotencyKey } = body;

    // Validate workflow
    if (!workflow || !SUPPORTED_WORKFLOWS.includes(workflow)) {
      return res.status(400).json({
        success: false,
        error: `Unsupported workflow "${workflow}". Supported workflows: ${SUPPORTED_WORKFLOWS.join(', ')}`
      });
    }

    // Determine target recipient
    let targetRecipient = recipient;
    if (workflow === 'admin_new_application' && (!targetRecipient || !isValidEmail(targetRecipient))) {
      targetRecipient = process.env.ADMIN_NOTIFICATION_EMAIL || 'admin@ncsyf.com.ng';
    }

    if (!targetRecipient || !isValidEmail(targetRecipient)) {
      return res.status(400).json({
        success: false,
        error: 'A valid recipient email address is required.'
      });
    }

    // Ensure payload data is an object
    const payloadData = (data && typeof data === 'object') ? data : {};

    // 3. Dispatch Email through Central Service
    const result = await sendWorkflowEmail({
      workflow,
      recipient: targetRecipient,
      data: payloadData,
      idempotencyKey
    });

    if (result.success) {
      return res.status(200).json({
        success: true,
        status: result.status,
        workflow: result.workflow,
        recipient: result.recipient,
        messageId: result.messageId,
        message: result.message || 'Transactional email accepted for delivery.',
        timestamp: result.timestamp
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
    console.error('[API /api/send-email] Unhandled error:', err.message);
    return res.status(500).json({
      success: false,
      error: 'An internal server error occurred while processing the email dispatch.'
    });
  }
};
