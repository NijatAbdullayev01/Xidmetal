import { formatAttentionCount } from '@/lib/nav-attention';

export function NavAttentionIndicator({ count }: { count: number }) {
  if (count <= 0) return null;

  return (
    <span className="ml-auto flex shrink-0 items-center gap-1.5" aria-hidden>
      <span className="nav-attention-light h-3 w-3 shrink-0 rounded-full bg-destructive" />
      <span className="min-w-[1.1rem] text-right text-xs font-bold tabular-nums text-destructive">
        {formatAttentionCount(count)}
      </span>
    </span>
  );
}
