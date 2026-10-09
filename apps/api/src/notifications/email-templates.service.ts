import { Injectable } from '@nestjs/common';

export interface ConfirmationTemplateData {
  customerName: string;
  businessName: string;
  serviceName: string;
  providerName: string;
  dateTime: string;
  durationMinutes: number;
  bookingReference: string;
}

export interface StatusUpdateTemplateData {
  customerName: string;
  businessName: string;
  serviceName: string;
  providerName: string;
  dateTime: string;
  bookingReference: string;
  newStatus: 'cancelled' | 'completed' | 'no_show';
}

function esc(value: string): string {
  return value.replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c] ?? c,
  );
}

const STATUS_COPY: Record<
  StatusUpdateTemplateData['newStatus'],
  { heading: string; color: string; body: string }
> = {
  cancelled: {
    heading: 'Appointment cancelled',
    color:   '#8e3e2d',
    body:    'Your appointment has been cancelled. If you have any questions, please contact us directly.',
  },
  completed: {
    heading: 'Appointment completed',
    color:   '#2e4494',
    body:    'Thank you for visiting us. We hope to see you again soon.',
  },
  no_show: {
    heading: 'Appointment marked as no-show',
    color:   '#795b14',
    body:    'We missed you today. Please contact us to reschedule your appointment.',
  },
};

@Injectable()
export class EmailTemplatesService {
  // ── Confirmation ─────────────────────────────────────────────────

  confirmationSubject(businessName: string): string {
    return `Appointment confirmed — ${businessName}`;
  }

  confirmationText(d: ConfirmationTemplateData): string {
    return [
      `Hello ${d.customerName},`,
      '',
      `Your appointment has been confirmed.`,
      '',
      `Business : ${d.businessName}`,
      `Service  : ${d.serviceName}`,
      `Provider : ${d.providerName}`,
      `When     : ${d.dateTime}`,
      `Duration : ${d.durationMinutes} minutes`,
      `Reference: ${d.bookingReference}`,
      '',
      `We look forward to seeing you.`,
      '',
      `— ${d.businessName}`,
    ].join('\n');
  }

  confirmationHtml(d: ConfirmationTemplateData): string {
    const name     = esc(d.customerName);
    const biz      = esc(d.businessName);
    const service  = esc(d.serviceName);
    const provider = esc(d.providerName);
    const when     = esc(d.dateTime);
    const ref      = esc(d.bookingReference);
    const duration = String(d.durationMinutes);

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>Appointment Confirmed</title>
  <style>
    body{font-family:Inter,Arial,sans-serif;background:#f6f7f4;margin:0;padding:0}
    .wrap{max-width:520px;margin:32px auto;background:#fff;border:1px solid #e0e6de}
    .header{background:#214b35;padding:24px 32px}
    .header h1{color:#fff;font-family:Georgia,serif;font-size:22px;margin:0;font-weight:500}
    .body{padding:28px 32px}
    .body p{color:#3a4a3d;font-size:15px;line-height:1.65;margin:0 0 16px}
    table{width:100%;border-collapse:collapse;margin:20px 0}
    td{padding:9px 0;border-bottom:1px solid #edf0eb;font-size:14px;color:#3a4a3d;vertical-align:top}
    td:first-child{color:#657567;font-weight:600;width:110px}
    .ref{background:#f3f5f1;padding:2px 7px;font-family:monospace;font-size:13px;letter-spacing:.06em}
    .footer{padding:16px 32px;border-top:1px solid #edf0eb;font-size:11px;color:#a0a8a2}
  </style>
</head>
<body>
<div class="wrap">
  <div class="header"><h1>Booking confirmed ✓</h1></div>
  <div class="body">
    <p>Hello <strong>${name}</strong>,</p>
    <p>Your appointment at <strong>${biz}</strong> is confirmed.</p>
    <table>
      <tr><td>Service</td><td>${service}</td></tr>
      <tr><td>Provider</td><td>${provider}</td></tr>
      <tr><td>When</td><td>${when}</td></tr>
      <tr><td>Duration</td><td>${duration} minutes</td></tr>
      <tr><td>Reference</td><td><span class="ref">${ref}</span></td></tr>
    </table>
    <p>We look forward to seeing you.</p>
  </div>
  <div class="footer">This message was sent by ${biz}. Please do not reply to this email.</div>
</div>
</body>
</html>`;
  }

  // ── Status update (cancelled / completed / no_show) ──────────────

  statusUpdateSubject(businessName: string, newStatus: StatusUpdateTemplateData['newStatus']): string {
    const labels: Record<StatusUpdateTemplateData['newStatus'], string> = {
      cancelled: 'Appointment cancelled',
      completed: 'Thank you for your visit',
      no_show:   'We missed you',
    };
    return `${labels[newStatus]} — ${businessName}`;
  }

  statusUpdateText(d: StatusUpdateTemplateData): string {
    const copy = STATUS_COPY[d.newStatus];
    return [
      `Hello ${d.customerName},`,
      '',
      copy.body,
      '',
      `Business : ${d.businessName}`,
      `Service  : ${d.serviceName}`,
      `Provider : ${d.providerName}`,
      `When     : ${d.dateTime}`,
      `Reference: ${d.bookingReference}`,
      '',
      `— ${d.businessName}`,
    ].join('\n');
  }

  statusUpdateHtml(d: StatusUpdateTemplateData): string {
    const copy     = STATUS_COPY[d.newStatus];
    const name     = esc(d.customerName);
    const biz      = esc(d.businessName);
    const service  = esc(d.serviceName);
    const provider = esc(d.providerName);
    const when     = esc(d.dateTime);
    const ref      = esc(d.bookingReference);

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>${esc(copy.heading)}</title>
  <style>
    body{font-family:Inter,Arial,sans-serif;background:#f6f7f4;margin:0;padding:0}
    .wrap{max-width:520px;margin:32px auto;background:#fff;border:1px solid #e0e6de}
    .header{background:${copy.color};padding:24px 32px}
    .header h1{color:#fff;font-family:Georgia,serif;font-size:22px;margin:0;font-weight:500}
    .body{padding:28px 32px}
    .body p{color:#3a4a3d;font-size:15px;line-height:1.65;margin:0 0 16px}
    table{width:100%;border-collapse:collapse;margin:20px 0}
    td{padding:9px 0;border-bottom:1px solid #edf0eb;font-size:14px;color:#3a4a3d;vertical-align:top}
    td:first-child{color:#657567;font-weight:600;width:110px}
    .ref{background:#f3f5f1;padding:2px 7px;font-family:monospace;font-size:13px;letter-spacing:.06em}
    .footer{padding:16px 32px;border-top:1px solid #edf0eb;font-size:11px;color:#a0a8a2}
  </style>
</head>
<body>
<div class="wrap">
  <div class="header"><h1>${esc(copy.heading)}</h1></div>
  <div class="body">
    <p>Hello <strong>${name}</strong>,</p>
    <p>${esc(copy.body)}</p>
    <table>
      <tr><td>Service</td><td>${service}</td></tr>
      <tr><td>Provider</td><td>${provider}</td></tr>
      <tr><td>When</td><td>${when}</td></tr>
      <tr><td>Reference</td><td><span class="ref">${ref}</span></td></tr>
    </table>
  </div>
  <div class="footer">This message was sent by ${biz}. Please do not reply to this email.</div>
</div>
</body>
</html>`;
  }
}
