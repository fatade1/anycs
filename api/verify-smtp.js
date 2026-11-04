/**
 * ==============================================================================
 * NCSYF SMTP VERIFICATION ENDPOINT (/api/verify-smtp)
 * Nigeria Civil Service Youths' Forum (NCSYF)
 * ==============================================================================
 * Verifies live SMTP connection to Zoho ZeptoMail.
 * Strictly protected: Requires Administrator authentication to prevent
 * information disclosure or unauthorized service reconnaissance.
 * ==============================================================================
 */

const { verifySmtpConnection } = require('../lib/email-service');
const { verifyAdminToken } = require('../lib/supabase-server');

module.exports = async function handler(req, res) {
  // Only allow GET requests
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  // Require administrator authorization to inspect SMTP configuration
  const authHeader = req.headers.authorization || '';
  const authResult = await verifyAdminToken(authHeader);

  if (!authResult.ok) {
    return res.status(authResult.status || 401).json({
      success: false,
      error: authResult.error || 'Unauthorized: Administrator privileges required to verify SMTP configuration.'
    });
  }

  try {
    const result = await verifySmtpConnection();
    const host = process.env.SMTP_HOST || 'smtp.zeptomail.com';
    const port = process.env.SMTP_PORT || '587';
    const from = process.env.SMTP_FROM_EMAIL || 'admin@ncsyf.com.ng';

    return res.status(result.connected ? 200 : 503).json({
      service: 'Zoho ZeptoMail SMTP Integration',
      host,
      port,
      from,
      configured: result.configured,
      connected: result.connected,
      message: result.message,
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    return res.status(500).json({
      configured: false,
      connected: false,
      error: 'Failed to verify SMTP connection.'
    });
  }
};
