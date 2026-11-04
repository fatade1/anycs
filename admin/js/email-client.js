/**
 * ==========================================================================
 * NCSYF CLIENT-SIDE TRANSACTIONAL EMAIL DISPATCHER
 * Nigeria Civil Service Youths' Forum (NCSYF)
 * ==========================================================================
 * Sends asynchronous transactional email requests to the secure /api/send-email endpoint.
 * Non-blocking: Email delivery attempts never halt or rollback successful database transactions.
 */

(function (global) {
  'use strict';

  const API_ENDPOINT = '/api/send-email';
  const REQUEST_TIMEOUT_MS = 8000;

  const EmailClient = {
    /**
     * Dispatch a transactional email notification via the serverless ZeptoMail gateway
     * @param {Object} params
     * @param {string} params.workflow - e.g. 'registration_acknowledgement', 'admin_new_application', 'membership_approved', 'membership_disapproved', 'password_reset'
     * @param {string} params.recipient - Destination email address
     * @param {Object} params.data - Template interpolation variables
     * @param {string} [params.idempotencyKey] - Optional unique deduplication key
     * @returns {Promise<{success: boolean, status?: string, error?: string}>}
     */
    async send({ workflow, recipient, data = {}, idempotencyKey = null }) {
      if (!workflow || !recipient) {
        console.warn('[NCSYF Email Client] Skipped: workflow and recipient are required.');
        return { success: false, error: 'workflow and recipient are required' };
      }

      // Generate client-side idempotency key if omitted
      const idKey = idempotencyKey || `${workflow}_${recipient}_${data.memberId || ''}_${Date.now()}`;

      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

        const response = await fetch(API_ENDPOINT, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            workflow,
            recipient,
            data,
            idempotencyKey: idKey
          }),
          signal: controller.signal
        });

        clearTimeout(timeoutId);

        let result = {};
        try {
          result = await response.json();
        } catch (jsonErr) {
          result = { success: false, error: 'Invalid JSON response from email gateway' };
        }

        if (response.ok && result.success) {
          console.log(`[NCSYF Email Client] Email accepted for [${workflow}] to [${recipient}] (Status: ${result.status})`);
          return { success: true, status: result.status, messageId: result.messageId };
        } else {
          console.warn(`[NCSYF Email Client] Gateway returned notice for [${workflow}]:`, result.error || response.statusText);
          return { success: false, status: result.status || 'failed', error: result.error || response.statusText };
        }
      } catch (err) {
        // Handle abort / network timeout gracefully without breaking user flow
        const isTimeout = err.name === 'AbortError';
        const msg = isTimeout ? 'Email request timed out after 8s (dispatched in background).' : err.message;
        console.warn(`[NCSYF Email Client] Non-blocking dispatch warning for [${workflow}]:`, msg);
        return { success: false, status: isTimeout ? 'timeout' : 'network_error', error: msg };
      }
    },

    /**
     * Send Registration Acknowledgement to applicant
     */
    async sendRegistrationAcknowledgement(memberRecord) {
      if (!memberRecord || !memberRecord.email) return;
      return this.send({
        workflow: 'registration_acknowledgement',
        recipient: memberRecord.email,
        data: {
          firstName: memberRecord.firstName || '',
          lastName: memberRecord.lastName || '',
          memberId: memberRecord.memberId || memberRecord.id || '',
          memberTypeLabel: memberRecord.memberTypeLabel || memberRecord.category || 'Full Member',
          mda: memberRecord.mda || '',
          stateChapter: memberRecord.stateChapter || 'FCT Abuja',
          submissionDate: memberRecord.registeredAt || new Date().toISOString()
        }
      });
    },

    /**
     * Send New Application Notification to Secretariat Administrators
     */
    async sendAdminNewApplicationAlert(memberRecord) {
      if (!memberRecord) return;
      return this.send({
        workflow: 'admin_new_application',
        recipient: 'admin@ncsyf.com.ng',
        data: {
          firstName: memberRecord.firstName || '',
          lastName: memberRecord.lastName || '',
          memberId: memberRecord.memberId || memberRecord.id || '',
          email: memberRecord.email || 'N/A',
          phone: memberRecord.phone || 'N/A',
          category: memberRecord.category || 'full',
          memberTypeLabel: memberRecord.memberTypeLabel || 'Full Member',
          tier: memberRecord.tier || 'federal',
          tierLabel: memberRecord.tierLabel || 'Federal MDA',
          mda: memberRecord.mda || '',
          staffId: memberRecord.staffId || 'N/A',
          stateChapter: memberRecord.stateChapter || 'FCT Abuja',
          submissionDate: memberRecord.registeredAt || new Date().toISOString()
        }
      });
    },

    /**
     * Send Approval Notification to applicant
     */
    async sendMembershipApprovalNotification(memberRecord) {
      if (!memberRecord || !memberRecord.email) return;
      return this.send({
        workflow: 'membership_approved',
        recipient: memberRecord.email,
        data: {
          firstName: memberRecord.firstName || '',
          lastName: memberRecord.lastName || '',
          memberId: memberRecord.memberId || memberRecord.id || '',
          memberTypeLabel: memberRecord.memberTypeLabel || memberRecord.category || 'Full Member',
          mda: memberRecord.mda || '',
          stateChapter: memberRecord.stateChapter || 'FCT Abuja',
          verifiedDate: new Date().toLocaleDateString('en-GB')
        }
      });
    },

    /**
     * Send Disapproval / Reapplication Notification to applicant
     */
    async sendMembershipDisapprovalNotification(memberRecord, reason, notes) {
      if (!memberRecord || !memberRecord.email) return;
      return this.send({
        workflow: 'membership_disapproved',
        recipient: memberRecord.email,
        data: {
          firstName: memberRecord.firstName || '',
          lastName: memberRecord.lastName || '',
          memberId: memberRecord.memberId || memberRecord.id || '',
          reason: reason || memberRecord.disapprovedReason || 'Documentation could not be verified',
          notes: notes || memberRecord.disapprovedNotes || ''
        }
      });
    },

    /**
     * Send Password Reset Instructions to member
     */
    async sendPasswordResetNotification(email, firstName, resetUrl) {
      if (!email) return;
      return this.send({
        workflow: 'password_reset',
        recipient: email,
        data: {
          firstName: firstName || 'Member',
          resetUrl: resetUrl || 'https://www.ncsyf.com.ng/signin',
          expiresMinutes: 60,
          requestTime: new Date().toLocaleString('en-GB', { timeZone: 'Africa/Lagos' })
        }
      });
    }
  };

  global.NCSYF_EMAIL = EmailClient;
})(typeof window !== 'undefined' ? window : this);
