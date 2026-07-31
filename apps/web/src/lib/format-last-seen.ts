/**
 * WhatsApp tipli "onlayn" / "sonuncu dəfə..." mətni (az-AZ).
 */
export function formatPeerStatus(presence?: {
  isOnline: boolean;
  lastSeenAt: string | null;
} | null): string {
  if (!presence) return '';
  if (presence.isOnline) return 'onlayn';

  if (!presence.lastSeenAt) return 'sonuncu dəfə bilinmir';

  const last = new Date(presence.lastSeenAt);
  const now = new Date();
  const diffMs = now.getTime() - last.getTime();
  const diffMin = Math.floor(diffMs / 60_000);

  if (diffMin < 1) return 'indi aktiv idi';
  if (diffMin < 60) return `sonuncu dəfə ${diffMin} dəq əvvəl`;

  const sameDay =
    last.getFullYear() === now.getFullYear() &&
    last.getMonth() === now.getMonth() &&
    last.getDate() === now.getDate();

  const time = last.toLocaleTimeString('az-AZ', {
    hour: '2-digit',
    minute: '2-digit',
  });

  if (sameDay) return `sonuncu dəfə bu gün ${time}`;

  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  const isYesterday =
    last.getFullYear() === yesterday.getFullYear() &&
    last.getMonth() === yesterday.getMonth() &&
    last.getDate() === yesterday.getDate();

  if (isYesterday) return `sonuncu dəfə dünən ${time}`;

  const date = last.toLocaleDateString('az-AZ', {
    day: 'numeric',
    month: 'short',
  });
  return `sonuncu dəfə ${date} ${time}`;
}
