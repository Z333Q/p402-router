/**
 * lib/partner/notifications.ts
 * Partner program email notifications via Resend.
 *
 * All emails are fail-open — a send failure is logged but never throws.
 * All emails use the Neo-Brutalist brand voice: no emoji, direct, uppercase labels.
 */

import { Resend } from 'resend'

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null
const FROM = 'P402 Partner Program <partners@p402.io>'
const ADMIN_EMAIL = process.env.PARTNER_ADMIN_EMAIL ?? 'partners@p402.io'
const BASE_URL = process.env.NEXTAUTH_URL ?? 'https://p402.io'

// ---------------------------------------------------------------------------
// HTML template base
// ---------------------------------------------------------------------------

function baseTemplate(title: string, bodyHtml: string): string {
    return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>${title}</title></head>
<body style="margin:0;padding:0;background:#f5f5f5;font-family:'IBM Plex Sans',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0">
    <tr>
      <td align="center" style="padding:40px 16px;">
        <table width="600" cellpadding="0" cellspacing="0" style="background:#fff;border:2px solid #000;">
          <!-- Header -->
          <tr>
            <td style="background:#000;padding:16px 28px;">
              <span style="color:#B6FF2E;font-size:20px;font-weight:900;letter-spacing:-0.04em;text-transform:uppercase;">
                P402<span style="color:#fff;">.io</span>
              </span>
              <span style="color:#666;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.15em;margin-left:12px;">
                Partner Program
              </span>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding:32px 28px;">
              ${bodyHtml}
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="border-top:2px solid #000;padding:16px 28px;background:#f5f5f5;">
              <p style="margin:0;font-size:10px;color:#888;text-transform:uppercase;letter-spacing:0.1em;font-weight:700;">
                P402.io · Partner Program · ${BASE_URL}/partner
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
}

function label(text: string) {
    return `<p style="margin:0 0 4px;font-size:10px;font-weight:900;text-transform:uppercase;letter-spacing:0.15em;color:#888;">${text}</p>`
}

function value(text: string) {
    return `<p style="margin:0 0 20px;font-size:14px;font-weight:700;color:#000;">${text}</p>`
}

function ctaButton(href: string, text: string) {
    return `<a href="${href}"
        style="display:inline-block;margin-top:8px;padding:12px 24px;background:#B6FF2E;color:#000;font-size:11px;font-weight:900;text-transform:uppercase;letter-spacing:0.15em;text-decoration:none;border:2px solid #000;">
        ${text} →
    </a>`
}

// ---------------------------------------------------------------------------
// Notification functions
// ---------------------------------------------------------------------------

/**
 * Notify partner their application was approved and account is live.
 */
export async function notifyPartnerApproved(opts: {
    partnerEmail: string
    partnerName: string
    partnerType: string
    referralCode: string
}) {
    if (!resend) return

    const html = baseTemplate('Welcome to the P402 Partner Program', `
        <h2 style="margin:0 0 8px;font-size:22px;font-weight:900;text-transform:uppercase;letter-spacing:-0.02em;">
            You're in.
        </h2>
        <p style="margin:0 0 28px;font-size:14px;color:#444;line-height:1.6;">
            Your P402 partner application has been approved.
            Your account is live and your referral link is active.
        </p>
        ${label('Partner Type')}
        ${value(opts.partnerType.replace('_', ' ').toUpperCase())}
        ${label('Your Referral Code')}
        ${value(opts.referralCode)}
        ${label('Your Partner Dashboard')}
        ${value(`${BASE_URL}/partner`)}
        <p style="margin:0 0 20px;font-size:13px;color:#555;line-height:1.6;">
            Every signup via your referral link is tracked automatically.
            Log in to your partner dashboard to copy your link, view conversions, and monitor commissions.
        </p>
        ${ctaButton(`${BASE_URL}/partner`, 'Go to Partner Dashboard')}
    `)

    await send({
        to: opts.partnerEmail,
        subject: `Partner application approved — welcome to P402`,
        html,
    })
}

/**
 * Notify partner a new commission entry was created (post-hold, pending review).
 */
export async function notifyCommissionCreated(opts: {
    partnerEmail: string
    partnerName: string
    commissionAmount: number
    currency: string
    offerName: string
    holdUntil: Date
    monthNumber: number
}) {
    if (!resend) return

    const holdStr = opts.holdUntil.toLocaleDateString('en-US', {
        year: 'numeric', month: 'long', day: 'numeric',
    })

    const html = baseTemplate('New Commission Earned', `
        <h2 style="margin:0 0 8px;font-size:22px;font-weight:900;text-transform:uppercase;letter-spacing:-0.02em;">
            New commission earned.
        </h2>
        <p style="margin:0 0 28px;font-size:14px;color:#444;line-height:1.6;">
            A new commission has been credited to your account and is now in the hold period.
        </p>
        ${label('Commission Amount')}
        <p style="margin:0 0 20px;font-size:32px;font-weight:900;color:#000;">
            $${opts.commissionAmount.toFixed(2)} <span style="font-size:14px;font-weight:700;color:#888;">${opts.currency}</span>
        </p>
        ${label('Offer')}
        ${value(opts.offerName)}
        ${label('Month')}
        ${value(`#${opts.monthNumber}`)}
        ${label('Hold Period Ends')}
        ${value(holdStr)}
        <p style="margin:0 0 20px;font-size:13px;color:#555;line-height:1.6;">
            After the hold period clears, P402 will review the commission.
            Approved commissions are included in the next payout batch.
        </p>
        ${ctaButton(`${BASE_URL}/partner/commissions`, 'View Commission Ledger')}
    `)

    await send({
        to: opts.partnerEmail,
        subject: `Commission earned: $${opts.commissionAmount.toFixed(2)} — ${opts.offerName}`,
        html,
    })
}

/**
 * Notify partner a payout has been released.
 */
export async function notifyPayoutReleased(opts: {
    partnerEmail: string
    partnerName: string
    payoutAmount: number
    currency: string
    provider: string
    providerReference?: string
}) {
    if (!resend) return

    const html = baseTemplate('Payout Released', `
        <h2 style="margin:0 0 8px;font-size:22px;font-weight:900;text-transform:uppercase;letter-spacing:-0.02em;">
            Payout on its way.
        </h2>
        <p style="margin:0 0 28px;font-size:14px;color:#444;line-height:1.6;">
            A payout has been released to your configured payout method.
        </p>
        ${label('Payout Amount')}
        <p style="margin:0 0 20px;font-size:32px;font-weight:900;color:#000;">
            $${opts.payoutAmount.toFixed(2)} <span style="font-size:14px;font-weight:700;color:#888;">${opts.currency}</span>
        </p>
        ${label('Payout Method')}
        ${value(opts.provider.replace('_', ' ').toUpperCase())}
        ${opts.providerReference ? `${label('Reference')}${value(opts.providerReference)}` : ''}
        <p style="margin:0 0 20px;font-size:13px;color:#555;line-height:1.6;">
            Allow 1-3 business days for bank/PayPal/Wise transfers.
            USDC transfers confirm within minutes.
            Contact partner support if you don't receive your payout.
        </p>
        ${ctaButton(`${BASE_URL}/partner/payouts`, 'View Payout History')}
    `)

    await send({
        to: opts.partnerEmail,
        subject: `Payout of $${opts.payoutAmount.toFixed(2)} released`,
        html,
    })
}

/**
 * Notify internal admin of new partner application.
 */
export async function notifyAdminNewApplication(opts: {
    applicantName: string
    applicantEmail: string
    partnerType: string
    applicationId: string
}) {
    if (!resend) return

    const html = baseTemplate('New Partner Application', `
        <h2 style="margin:0 0 8px;font-size:22px;font-weight:900;text-transform:uppercase;">
            New partner application
        </h2>
        ${label('Name')}${value(opts.applicantName)}
        ${label('Email')}${value(opts.applicantEmail)}
        ${label('Track')}${value(opts.partnerType)}
        ${ctaButton(`${BASE_URL}/partner-admin/applications`, 'Review Application')}
    `)

    await send({
        to: ADMIN_EMAIL,
        subject: `New partner application: ${opts.applicantName} (${opts.partnerType})`,
        html,
    })
}

/**
 * Notify partner their lead was accepted/rejected.
 */
export async function notifyLeadStageUpdate(opts: {
    partnerEmail: string
    companyName: string
    stage: string
    notes?: string
}) {
    if (!resend) return

    const accepted = opts.stage === 'accepted'
    const html = baseTemplate('Lead Update', `
        <h2 style="margin:0 0 8px;font-size:22px;font-weight:900;text-transform:uppercase;">
            Lead ${opts.stage.replace('_', ' ')}
        </h2>
        <p style="margin:0 0 28px;font-size:14px;color:#444;line-height:1.6;">
            ${accepted
                ? `Your lead for <strong>${opts.companyName}</strong> has been accepted. Attribution is locked to your account.`
                : `Your lead for <strong>${opts.companyName}</strong> could not be accepted at this time.`
            }
        </p>
        ${opts.notes ? `${label('Notes')}${value(opts.notes)}` : ''}
        ${ctaButton(`${BASE_URL}/partner/leads`, 'View Leads')}
    `)

    await send({
        to: opts.partnerEmail,
        subject: `Lead update: ${opts.companyName} — ${opts.stage}`,
        html,
    })
}

// ---------------------------------------------------------------------------
// Internal send helper — fail-open
// ---------------------------------------------------------------------------

async function send(opts: { to: string; subject: string; html: string }) {
    if (!resend) {
        console.warn('[PartnerNotifications] RESEND_API_KEY not set — email suppressed.')
        return
    }
    try {
        await resend.emails.send({ from: FROM, ...opts })
    } catch (err) {
        console.error('[PartnerNotifications] send failed (non-blocking):', err)
    }
}
