import { Resend } from 'resend';

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;
const NOTIFY_EMAIL = 'hello@p402.dev';

export const Notifications = {
    /**
     * Notify about a new waitlist/access request.
     */
    async notifyAccessRequest(data: { email: string; company?: string; role?: string; rpd?: string }) {
        if (!resend) {
            console.warn('RESEND_API_KEY not set. Skipping email notification.');
            return;
        }

        try {
            await resend.emails.send({
                from: 'P402 Notifications <system@p402.io>',
                to: NOTIFY_EMAIL,
                subject: `🚀 New Access Request: ${data.email}`,
                html: `
                    <div style="font-family: sans-serif; padding: 20px; border: 2px solid #000;">
                        <h2 style="text-transform: uppercase;">New Access Request</h2>
                        <hr style="border: 1px solid #000;" />
                        <p><strong>Email:</strong> ${data.email}</p>
                        <p><strong>Company:</strong> ${data.company || 'N/A'}</p>
                        <p><strong>Role:</strong> ${data.role || 'N/A'}</p>
                        <p><strong>Estimated Volume (RPD):</strong> ${data.rpd || 'N/A'}</p>
                        <br />
                        <p style="font-size: 0.875rem; color: #666;">This request was captured via the P402 Router landing page.</p>
                    </div>
                `
            });
            console.log(`Notification sent for access request: ${data.email}`);
        } catch (error) {
            console.error('Failed to send access request notification:', error);
        }
    },

    /**
     * Notify about a new tenant provisioning (first sign-in).
     */
    async notifyNewSignup(user: { email: string; name?: string | null }) {
        if (!resend) {
            console.warn('RESEND_API_KEY not set. Skipping email notification.');
            return;
        }

        try {
            await resend.emails.send({
                from: 'P402 Notifications <system@p402.io>',
                to: NOTIFY_EMAIL,
                subject: `🎉 New User Signup: ${user.email}`,
                html: `
                    <div style="font-family: sans-serif; padding: 20px; border: 2px solid #000;">
                        <h2 style="text-transform: uppercase;">New Tenant Provisioned</h2>
                        <hr style="border: 1px solid #000;" />
                        <p><strong>Name:</strong> ${user.name || 'N/A'}</p>
                        <p><strong>Email:</strong> ${user.email}</p>
                        <br />
                        <p style="font-size: 0.875rem; color: #666;">The user has successfully authenticated via Google and an automated tenant shell has been provisioned.</p>
                    </div>
                `
            });
            console.log(`Notification sent for new signup: ${user.email}`);
        } catch (error) {
            console.error('Failed to send signup notification:', error);
        }
    }
};
