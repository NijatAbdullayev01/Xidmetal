/**
 * Brauzer tab başlığında oxunmamış bildiriş mövzusu.
 * Format: `(Sifariş təsdiqləndi) Xidmətal` — gizlidə yanıb-sönür.
 */

/** `(mövzu) orijinal başlıq` — Next.js title ilə toqquşmasın deyə strip edilir */
const TAB_ATTENTION_PREFIX_RE = /^\([^)]{1,120}\)\s+/u;
const LEGACY_COUNT_RE = /^\(\d+\)\s+/;

export const TAB_ATTENTION_BLINK_MS = 1_600;
export const TAB_ATTENTION_MAX_LABELS = 2;
export const TAB_ATTENTION_TITLE_MAX = 36;

export interface TabAttentionChannel {
  id: string;
  count: number;
  /** ISO — yenisi tab-da əvvəl göstərilir */
  at?: string | null;
  latestTitle?: string | null;
  singular: string;
  plural: string;
}

export function truncateTabLabel(text: string, max = TAB_ATTENTION_TITLE_MAX): string {
  const normalized = text.trim().replace(/\s+/g, ' ').replace(/[()]/g, '').trim();
  if (normalized.length <= max) return normalized;
  return `${normalized.slice(0, Math.max(1, max - 1)).trimEnd()}…`;
}

export function stripTabAttentionPrefix(title: string): string {
  return title.replace(TAB_ATTENTION_PREFIX_RE, '').replace(LEGACY_COUNT_RE, '').trim();
}

export function applyTabAttentionTitle(baseTitle: string, prefix: string | null): string {
  const base = stripTabAttentionPrefix(baseTitle);
  const clean = prefix?.replace(/[()]/g, '').replace(/\s+/g, ' ').trim() ?? '';
  return clean ? `(${clean}) ${base}` : base;
}

export function formatCountedLabel(
  count: number,
  singular: string,
  plural: string,
): string | null {
  if (count <= 0) return null;
  if (count === 1) return singular;
  return `${count} ${plural}`;
}

/**
 * Kanal üçün qısa tab mətni.
 * Ən son bildirişin title-ı varsa onu göstərir (nə gəldiyi); çoxdursa `+N`.
 */
export function channelTabLabel(channel: TabAttentionChannel): string | null {
  if (channel.count <= 0) return null;
  const headline = channel.latestTitle?.trim();
  if (headline) {
    const short = truncateTabLabel(headline);
    return channel.count === 1 ? short : `${short} +${channel.count - 1}`;
  }
  return formatCountedLabel(channel.count, channel.singular, channel.plural);
}

export function tabLabelsFromChannels(channels: readonly TabAttentionChannel[]): string[] {
  const ranked = channels
    .filter((channel) => channel.count > 0)
    .slice()
    .sort((a, b) => {
      const ta = a.at ? Date.parse(a.at) : 0;
      const tb = b.at ? Date.parse(b.at) : 0;
      if (Number.isNaN(ta) && Number.isNaN(tb)) return 0;
      if (Number.isNaN(ta)) return 1;
      if (Number.isNaN(tb)) return -1;
      return tb - ta;
    });

  const labels: string[] = [];
  for (const channel of ranked) {
    const label = channelTabLabel(channel);
    if (label) labels.push(label);
  }
  return labels;
}

/** Tab-da görünəcək prefiks (mötərizəsiz). Boşdursa `null`. */
export function formatTabAttentionPrefix(labels: readonly string[]): string | null {
  const active = labels
    .map((label) => label.replace(/[()]/g, '').replace(/\s+/g, ' ').trim())
    .filter(Boolean);
  if (active.length === 0) return null;
  if (active.length <= TAB_ATTENTION_MAX_LABELS) return active.join(', ');
  return `${active[0]}, ${active[1]} +${active.length - TAB_ATTENTION_MAX_LABELS}`;
}
