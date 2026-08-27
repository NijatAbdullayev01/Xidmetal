import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { API, APP, BRAND } from '@xidmetal/shared';
import { formatMailFrom as formatMailFromIdentity } from './mail-identity';

export const MAIL_LOGO_CID = 'xidmetal-logo';

export interface MailLogo {
  src: string | null;
  attachment: {
    filename: string;
    path: string;
    cid: string;
    contentDisposition: 'inline';
    contentType: 'image/png';
  } | null;
}

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** SMTP_FROM ünvanına brend göstəriş adı əlavə et; noreply → mail@. */
export const formatMailFrom = formatMailFromIdentity;

export function publicMailLogoUrl(appUrl?: string | null): string | null {
  const base = appUrl?.trim().replace(/\/$/, '');
  if (!base) return null;
  try {
    const parsed = new URL(base);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return null;
    return `${parsed.origin}${API.prefix}/mail/logo.png`;
  } catch {
    return null;
  }
}

export function findMailLogoFile(): string | null {
  const candidates = [
    join(__dirname, 'assets', 'logo.png'),
    join(process.cwd(), 'src', 'common', 'mail', 'assets', 'logo.png'),
    join(process.cwd(), 'apps', 'api', 'src', 'common', 'mail', 'assets', 'logo.png'),
    join(process.cwd(), 'dist', 'common', 'mail', 'assets', 'logo.png'),
    join(process.cwd(), 'apps', 'api', 'dist', 'common', 'mail', 'assets', 'logo.png'),
  ];
  for (const candidate of candidates) {
    if (existsSync(candidate)) return candidate;
  }
  return null;
}

/**
 * Loqo məktubun içinə (CID) gömülür — poçt klientləri uzaq URL-i bloklayır
 * və marketplace «Tezliklə» səhifəsi /logo.png-i HTML-ə çevirə bilər.
 * Fayl yoxdursa API-nin ictimai PNG ünvanı.
 */
export function buildMailLogo(appUrl?: string | null): MailLogo {
  const filePath = findMailLogoFile();
  if (filePath) {
    return {
      src: `cid:${MAIL_LOGO_CID}`,
      attachment: {
        filename: 'logo.png',
        path: filePath,
        cid: MAIL_LOGO_CID,
        contentDisposition: 'inline',
        contentType: 'image/png',
      },
    };
  }
  return { src: publicMailLogoUrl(appUrl), attachment: null };
}

export const DEFAULT_MAIL_REASON =
  `Bu mesajı ${APP.name} hesabınızdakı əməliyyata görə aldınız. Reklam məktubu deyil.`;

export function buildMailText(input: {
  intro: string;
  body: string;
  reason?: string;
  appUrl?: string | null;
  footerText?: string;
}): string {
  const lines = [input.intro, '', input.body];
  const footer = input.footerText?.trim();
  if (footer) lines.push('', footer);
  const reason = (input.reason ?? DEFAULT_MAIL_REASON).trim();
  if (reason) lines.push('', reason);
  return lines.join('\n');
}

export function wrapBrandedMailHtml(input: {
  intro: string;
  innerHtml: string;
  logoSrc?: string | null;
  appUrl?: string | null;
  preheader?: string;
  reason?: string;
  footerHtml?: string;
}): string {
  const brand = BRAND.primary;
  const ink = BRAND.primaryForeground;
  const intro = escapeHtml(input.intro);
  const logo = renderMailLogo(input.logoSrc ?? null, ink);
  const reason = escapeHtml((input.reason ?? DEFAULT_MAIL_REASON).trim());
  const preheader = escapeHtml((input.preheader ?? input.intro).trim());
  const footerHtml = input.footerHtml?.trim() ?? '';

  return (
    `<!DOCTYPE html>` +
    `<html lang="az"><head><meta charset="utf-8"/>` +
    `<meta name="viewport" content="width=device-width,initial-scale=1"/>` +
    `<title>${intro}</title></head>` +
    `<body style="margin:0;padding:0;background:#f4f4f5;font-family:Arial,Helvetica,sans-serif;">` +
    `<div style="display:none;font-size:1px;color:#f4f4f5;line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;">` +
    `${preheader}</div>` +
    `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:24px 12px;">` +
    `<tr><td align="center">` +
    `<table role="presentation" width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #ececec;">` +
    `<tr><td align="center" style="background:${brand};padding:20px 24px;text-align:center;">${logo}</td></tr>` +
    `<tr><td style="padding:28px 24px 8px;color:${ink};">` +
    `<p style="margin:0 0 12px;font-size:18px;font-weight:bold;line-height:1.35;">${intro}</p>` +
    `<div style="margin:0;font-size:15px;line-height:1.55;color:#333333;">${input.innerHtml}</div>` +
    `</td></tr>` +
    `<tr><td style="padding:16px 24px 24px;color:#666666;font-size:12px;line-height:1.45;">` +
    `${footerHtml}` +
    `<p style="margin:${footerHtml ? '16px 0 0' : '0'};color:#888888;">${reason}</p>` +
    `</td></tr>` +
    `</table></td></tr></table></body></html>`
  );
}

/** Tamamlanmış sifariş e-poçtundan rəy səhifəsinə keçid. */
export function buildCustomerBookingReviewUrl(
  appUrl: string | null | undefined,
  bookingId: string,
): string | null {
  const origin = safeHttpUrl(appUrl);
  const id = bookingId.trim();
  if (!origin || !id) return null;
  return `${origin}/dashboard/customer/bookings/${encodeURIComponent(id)}?review=1`;
}

export function renderMailReviewCta(reviewUrl: string | null): {
  html: string;
  text: string;
} {
  const heading = 'Rəy bildir';
  const blurb = reviewUrl
    ? 'Xidmətdən razı qaldınız? Təcrübənizi paylaşın.'
    : 'Xidmətdən razı qaldınız? Dashboard-da sifariş səhifəsindən rəy yaza bilərsiniz.';
  const button = reviewUrl
    ? `<a href="${escapeHtml(reviewUrl)}" style="display:inline-block;background:${BRAND.primary};color:${BRAND.primaryForeground};font-weight:bold;font-size:14px;text-decoration:none;padding:12px 22px;border-radius:8px;">${heading}</a>`
    : '';
  const html =
    `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0;">` +
    `<tr><td style="background:#fff8e1;border:1px solid #f0e0a0;border-radius:10px;padding:18px 16px;text-align:center;">` +
    `<p style="margin:0 0 6px;font-size:16px;font-weight:bold;color:${BRAND.primaryForeground};">${heading}</p>` +
    `<p style="margin:0${button ? ' 0 14px' : ''};font-size:13px;line-height:1.45;color:#555555;">${blurb}</p>` +
    `${button}` +
    `</td></tr></table>`;
  const text = reviewUrl
    ? [heading, blurb, reviewUrl].join('\n')
    : [heading, blurb].join('\n');
  return { html, text };
}

function renderMailLogo(logoSrc: string | null, ink: string): string {
  const name = escapeHtml(APP.name);
  const inner = logoSrc
    ? renderMailLogoImage(logoSrc, name)
    : `<span style="display:inline-block;font-size:22px;font-weight:bold;color:${ink};letter-spacing:-0.02em;">${name}</span>`;

  return (
    `<table role="presentation" align="center" cellpadding="0" cellspacing="0" style="margin:0 auto;">` +
    `<tr><td align="center" style="text-align:center;">${inner}</td></tr>` +
    `</table>`
  );
}

function renderMailLogoImage(logoSrc: string, name: string): string {
  // Loqonu <a> içində saxlama — şəkil yüklənməyəndə alt mətn mavi link olur.
  return (
    `<img src="${escapeHtml(logoSrc)}" alt="${name}" width="174" height="64" ` +
    `style="display:block;margin:0 auto;height:64px;width:auto;max-width:220px;border:0;outline:none;text-decoration:none;"/>`
  );
}

function safeHttpUrl(value?: string | null): string | null {
  const trimmed = value?.trim();
  if (!trimmed) return null;
  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return null;
    return parsed.origin;
  } catch {
    return null;
  }
}
