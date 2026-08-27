import { APP } from '@xidmetal/shared';

export const DEFAULT_MAIL_DOMAIN = 'xidmetal.com';
export const DEFAULT_MAIL_FROM = `mail@${DEFAULT_MAIL_DOMAIN}`;

const NOREPLY_LOCAL = /^(no-?reply|donotreply|do-not-reply)$/i;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export type MailKind = 'auth' | 'transactional' | 'internal';

/** From sətrindən ünvanı çıxar (`Name <a@b>` və ya `a@b`). */
export function extractMailAddress(from: string): string | null {
  const trimmed = from.trim();
  if (!trimmed) return null;
  const angled = trimmed.match(/<([^>]+)>/);
  const raw = (angled?.[1] ?? trimmed).trim().toLowerCase();
  return EMAIL_RE.test(raw) ? raw : null;
}

export function extractMailDomain(from: string): string | null {
  const address = extractMailAddress(from);
  if (!address) return null;
  const domain = address.slice(address.lastIndexOf('@') + 1);
  return domain || null;
}

export function isNoreplyAddress(from: string): boolean {
  const address = extractMailAddress(from);
  if (!address) return false;
  const local = address.slice(0, address.lastIndexOf('@'));
  return NOREPLY_LOCAL.test(local);
}

/**
 * `noreply@` inbox yerləşməsini zəiflədir — eyni domenin `mail@` ünvanına çevir.
 * Domen doğrulaması (Resend və s.) bütöv zona üçündürsə göndərmə işləyir.
 */
export function rewriteNoreplyAddress(address: string): string {
  const at = address.lastIndexOf('@');
  if (at <= 0) return address;
  const local = address.slice(0, at);
  const domain = address.slice(at + 1);
  if (!domain || !NOREPLY_LOCAL.test(local)) return address;
  return `mail@${domain.toLowerCase()}`;
}

export function formatMailFrom(
  from: string,
  displayName = APP.name,
): string {
  const trimmed = from.trim();
  if (!trimmed) return `"${displayName}" <${DEFAULT_MAIL_FROM}>`;
  if (trimmed.includes('<')) {
    const address = extractMailAddress(trimmed);
    if (!address) return trimmed;
    const next = rewriteNoreplyAddress(address);
    const nameMatch = trimmed.match(/^(.*)<[^>]+>\s*$/);
    const existingName = nameMatch?.[1]?.trim().replace(/^["']|["']$/g, '');
    const name = existingName || displayName;
    return `"${name}" <${next}>`;
  }
  return `"${displayName}" <${rewriteNoreplyAddress(trimmed)}>`;
}

export function buildMailMessageId(domain: string, unique?: string): string {
  const d =
    domain.replace(/[^a-zA-Z0-9.-]/g, '').replace(/^\.+|\.+$/g, '') ||
    DEFAULT_MAIL_DOMAIN;
  const token =
    (unique ??
      `${Date.now().toString(36)}.${Math.random().toString(36).slice(2, 12)}`).replace(
      /[^A-Za-z0-9._-]/g,
      '',
    ) || 'm';
  return `<${token}@${d}>`;
}

export function buildUnsubscribeUrl(appUrl?: string | null): string | null {
  const base = appUrl?.trim();
  if (!base) return null;
  try {
    const parsed = new URL(base);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return null;
    return `${parsed.origin}/mail/unsubscribe`;
  } catch {
    return null;
  }
}

/** Gmail/Mail.ru inbox — auth kodlarına List-Unsubscribe qoyma. */
export function buildDeliverabilityHeaders(input: {
  kind: MailKind;
  unsubscribeMailto?: string | null;
  unsubscribeUrl?: string | null;
}): Record<string, string> {
  const headers: Record<string, string> = {
    'Auto-Submitted': 'auto-generated',
    'X-Auto-Response-Suppress': 'All',
  };
  if (input.kind !== 'transactional') return headers;

  const parts: string[] = [];
  if (input.unsubscribeUrl) parts.push(`<${input.unsubscribeUrl}>`);
  if (input.unsubscribeMailto) {
    parts.push(
      `<mailto:${input.unsubscribeMailto}?subject=${encodeURIComponent('Abunəlik')}>`,
    );
  }
  if (parts.length > 0) {
    headers['List-Unsubscribe'] = parts.join(', ');
  }
  return headers;
}
