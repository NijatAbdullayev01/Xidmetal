import { AnalyticsEventType, type AnalyticsBeaconEventInput } from '@xidmetal/shared';

const AID_KEY = 'xidmetal_aid';
const SID_KEY = 'xidmetal_sid';
const SID_STARTED_KEY = 'xidmetal_sid_started';
const SESSION_TIMEOUT_MS = 30 * 60 * 1000;
const FLUSH_INTERVAL_MS = 8_000;
const HEARTBEAT_INTERVAL_MS = 30_000;
const MAX_QUEUE = 40;

type QueuedEvent = AnalyticsBeaconEventInput;

function resolveApiBaseUrl(): string {
  const fromPublic = process.env.NEXT_PUBLIC_API_URL?.trim();
  if (fromPublic) return fromPublic.replace(/\/$/, '');
  if (typeof window !== 'undefined') return '';
  return '';
}

function isBrowser(): boolean {
  return typeof window !== 'undefined';
}

function shouldTrack(): boolean {
  if (!isBrowser()) return false;
  if (navigator.doNotTrack === '1') return false;
  try {
    if (window.localStorage.getItem('xidmetal_analytics_opt_out') === '1') {
      return false;
    }
  } catch {
    /* private mode */
  }
  return true;
}

function readStorage(storage: Storage, key: string): string | null {
  try {
    return storage.getItem(key);
  } catch {
    return null;
  }
}

function writeStorage(storage: Storage, key: string, value: string): void {
  try {
    storage.setItem(key, value);
  } catch {
    /* ignore */
  }
}

function getOrCreateAnonymousId(): string {
  const existing = readStorage(localStorage, AID_KEY);
  if (existing) return existing;
  const id = crypto.randomUUID();
  writeStorage(localStorage, AID_KEY, id);
  return id;
}

function getSessionStartedAt(): number {
  const raw = readStorage(sessionStorage, SID_STARTED_KEY);
  const parsed = raw ? Number(raw) : NaN;
  if (!Number.isNaN(parsed) && parsed > 0) return parsed;
  const now = Date.now();
  writeStorage(sessionStorage, SID_STARTED_KEY, String(now));
  return now;
}

function getOrCreateSessionId(): string {
  const existing = readStorage(sessionStorage, SID_KEY);
  const startedRaw = readStorage(sessionStorage, SID_STARTED_KEY);
  const started = startedRaw ? Number(startedRaw) : NaN;
  const expired =
    !existing ||
    Number.isNaN(started) ||
    Date.now() - started > SESSION_TIMEOUT_MS;

  if (!expired && existing) return existing;

  const id = crypto.randomUUID();
  writeStorage(sessionStorage, SID_KEY, id);
  writeStorage(sessionStorage, SID_STARTED_KEY, String(Date.now()));
  return id;
}

function normalizePath(pathname: string): string {
  if (!pathname) return '/';
  const clean = pathname.split('?')[0]?.split('#')[0] || '/';
  return clean.startsWith('/') ? clean.slice(0, 500) : `/${clean}`.slice(0, 500);
}

function clickNameFromTarget(el: Element): string | null {
  const explicit = el.closest('[data-analytics]') as HTMLElement | null;
  if (explicit?.dataset.analytics) {
    return explicit.dataset.analytics.slice(0, 200);
  }

  const section = el.closest('[data-analytics-section]') as HTMLElement | null;
  const sectionName = section?.dataset.analyticsSection;

  const anchor = el.closest('a[href]') as HTMLAnchorElement | null;
  if (anchor?.href) {
    try {
      const url = new URL(anchor.href, window.location.origin);
      if (url.origin === window.location.origin) {
        const path = normalizePath(url.pathname);
        return (sectionName ? `${sectionName}:nav:${path}` : `nav:${path}`).slice(0, 200);
      }
      return (sectionName ? `${sectionName}:ext` : 'ext_link').slice(0, 200);
    } catch {
      return null;
    }
  }

  const button = el.closest('button, [role="button"]') as HTMLElement | null;
  if (button) {
    const label =
      button.getAttribute('aria-label') ||
      button.dataset.analytics ||
      button.textContent?.trim().replace(/\s+/g, ' ').slice(0, 80);
    if (!label) return sectionName ? `${sectionName}:button` : null;
    return (sectionName ? `${sectionName}:${label}` : `btn:${label}`).slice(0, 200);
  }

  return null;
}

class AnalyticsClient {
  private queue: QueuedEvent[] = [];
  private flushTimer: ReturnType<typeof setTimeout> | null = null;
  private heartbeatTimer: ReturnType<typeof setInterval> | null = null;
  private landingPath: string | null = null;
  private lastPath: string | null = null;
  private started = false;
  private userId: string | undefined;
  private flushing = false;

  start(userId?: string | null): void {
    if (!shouldTrack() || this.started) {
      this.userId = userId ?? undefined;
      return;
    }
    this.started = true;
    this.userId = userId ?? undefined;
    this.landingPath = normalizePath(window.location.pathname);

    document.addEventListener('click', this.onClick, { capture: true, passive: true });
    document.addEventListener('visibilitychange', this.onVisibility);
    window.addEventListener('pagehide', this.onPageHide);

    this.trackPageView(window.location.pathname);
    this.scheduleFlush();
    this.startHeartbeat();
  }

  setUserId(userId: string | null | undefined): void {
    this.userId = userId ?? undefined;
  }

  stop(): void {
    if (!this.started) return;
    document.removeEventListener('click', this.onClick, true);
    document.removeEventListener('visibilitychange', this.onVisibility);
    window.removeEventListener('pagehide', this.onPageHide);
    if (this.flushTimer) clearTimeout(this.flushTimer);
    if (this.heartbeatTimer) clearInterval(this.heartbeatTimer);
    this.started = false;
  }

  trackPageView(pathname: string): void {
    if (!shouldTrack() || !this.started) return;
    const path = normalizePath(pathname);
    if (path === this.lastPath) return;
    this.lastPath = path;
    this.enqueue({
      type: AnalyticsEventType.PAGE_VIEW,
      path,
      ts: Date.now(),
    });
  }

  private onClick = (event: MouseEvent): void => {
    if (!shouldTrack() || !this.started) return;
    const target = event.target;
    if (!(target instanceof Element)) return;
    const name = clickNameFromTarget(target);
    if (!name) return;
    this.enqueue({
      type: AnalyticsEventType.CLICK,
      path: normalizePath(window.location.pathname),
      name,
      ts: Date.now(),
    });
  };

  private onVisibility = (): void => {
    if (document.visibilityState === 'hidden') {
      this.enqueue({
        type: AnalyticsEventType.HEARTBEAT,
        path: normalizePath(window.location.pathname),
        ts: Date.now(),
      });
      void this.flush(true);
    }
  };

  private onPageHide = (): void => {
    this.enqueue({
      type: AnalyticsEventType.SESSION_END,
      path: normalizePath(window.location.pathname),
      ts: Date.now(),
    });
    void this.flush(true);
  };

  private startHeartbeat(): void {
    if (this.heartbeatTimer) clearInterval(this.heartbeatTimer);
    this.heartbeatTimer = setInterval(() => {
      if (document.visibilityState !== 'visible') return;
      this.enqueue({
        type: AnalyticsEventType.HEARTBEAT,
        path: normalizePath(window.location.pathname),
        ts: Date.now(),
      });
      void this.flush();
    }, HEARTBEAT_INTERVAL_MS);
  }

  private enqueue(event: QueuedEvent): void {
    if (this.queue.length >= MAX_QUEUE) {
      this.queue.shift();
    }
    this.queue.push(event);
    this.scheduleFlush();
  }

  private scheduleFlush(): void {
    if (this.flushTimer) return;
    this.flushTimer = setTimeout(() => {
      this.flushTimer = null;
      void this.flush();
    }, FLUSH_INTERVAL_MS);
  }

  private durationMs(): number {
    return Math.max(0, Date.now() - getSessionStartedAt());
  }

  async flush(useBeacon = false): Promise<void> {
    if (!shouldTrack() || this.flushing || this.queue.length === 0) return;

    const events = this.queue.splice(0, 50);
    this.flushing = true;

    const body = JSON.stringify({
      anonymousId: getOrCreateAnonymousId(),
      sessionId: getOrCreateSessionId(),
      userId: this.userId,
      landingPath: this.landingPath ?? normalizePath(window.location.pathname),
      referrer: document.referrer ? document.referrer.slice(0, 1000) : undefined,
      language: navigator.language?.slice(0, 32),
      screenWidth: window.screen?.width,
      durationMs: this.durationMs(),
      events,
    });

    const url = `${resolveApiBaseUrl()}/api/v1/analytics/beacon`;

    try {
      if (useBeacon && typeof navigator.sendBeacon === 'function') {
        const blob = new Blob([body], { type: 'application/json' });
        const ok = navigator.sendBeacon(url, blob);
        if (!ok) {
          this.queue.unshift(...events);
        }
      } else {
        const response = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body,
          credentials: 'omit',
          keepalive: true,
        });
        if (!response.ok) {
          this.queue.unshift(...events);
        }
      }
    } catch {
      this.queue.unshift(...events);
    } finally {
      this.flushing = false;
    }
  }
}

export const analytics = new AnalyticsClient();
