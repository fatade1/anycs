/**
 * ==========================================================================
 * NCSYF SMTP VERIFICATION ENDPOINT (/api/verify-smtp)
 * Nigeria Civil Service Youths' Forum (NCSYF)
 * ==========================================================================
 * Verifies live SMTP connection to Zoho ZeptoMail.
 */

const { verifySmtpConnection } = require('../lib/email-service');

module.exports = async function handler(req, res) {
  // Only allow GET requests
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method Not Allowed' });
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
      error: err.message
    });
  }
};
