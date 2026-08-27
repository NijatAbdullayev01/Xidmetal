import {
  formatTabAttentionPrefix,
  tabLabelsFromChannels,
  type TabAttentionChannel,
} from '@xidmetal/shared';

export interface MarketplaceTabAttentionInput {
  messages: { count: number; at: string | null };
  bookings: { count: number; at: string | null; latestTitle: string | null };
  reviews: { count: number; at: string | null; latestTitle: string | null };
  announcements: { count: number; at: string | null; latestTitle: string | null };
  services?: { count: number; at: string | null; latestTitle: string | null };
}

function channel(
  id: string,
  count: number,
  at: string | null,
  singular: string,
  plural: string,
  latestTitle?: string | null,
): TabAttentionChannel {
  return { id, count, at, singular, plural, latestTitle: latestTitle ?? null };
}

/** Müştəri / xidmət verən tab prefiksi — ən son bildirişin mövzusu əvvəl. */
export function marketplaceTabPrefix(input: MarketplaceTabAttentionInput): string | null {
  return formatTabAttentionPrefix(
    tabLabelsFromChannels([
      channel(
        'message',
        input.messages.count,
        input.messages.at,
        'Yeni mesaj',
        'yeni mesaj',
      ),
      channel(
        'booking',
        input.bookings.count,
        input.bookings.at,
        'Yeni sifariş',
        'yeni sifariş',
        input.bookings.latestTitle,
      ),
      channel(
        'review',
        input.reviews.count,
        input.reviews.at,
        'Yeni rəy',
        'yeni rəy',
        input.reviews.latestTitle,
      ),
      channel(
        'announcement',
        input.announcements.count,
        input.announcements.at,
        'Yeni bildiriş',
        'yeni bildiriş',
        input.announcements.latestTitle,
      ),
      channel(
        'service',
        input.services?.count ?? 0,
        input.services?.at ?? null,
        'Xidmət yeniləməsi',
        'xidmət yeniləməsi',
        input.services?.latestTitle,
      ),
    ]),
  );
}
