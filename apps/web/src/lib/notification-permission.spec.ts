import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import {
  blockedNotificationSteps,
  detectBrowserFamily,
  notificationPromptCopy,
  openNotificationPermissionUi,
  readNotificationPromptMode,
} from './notification-permission';

describe('notification-permission', () => {
  beforeEach(() => {
    const NotificationMock = vi.fn() as unknown as typeof Notification & {
      permission: NotificationPermission;
      requestPermission: ReturnType<typeof vi.fn>;
    };
    NotificationMock.permission = 'default';
    NotificationMock.requestPermission = vi.fn(async () => 'granted' as NotificationPermission);
    vi.stubGlobal('Notification', NotificationMock);
    vi.stubGlobal('window', globalThis);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('readNotificationPromptMode maps permission states', () => {
    (Notification as unknown as { permission: NotificationPermission }).permission = 'default';
    expect(readNotificationPromptMode()).toBe('ask');

    (Notification as unknown as { permission: NotificationPermission }).permission = 'denied';
    expect(readNotificationPromptMode()).toBe('blocked');

    (Notification as unknown as { permission: NotificationPermission }).permission = 'granted';
    expect(readNotificationPromptMode()).toBe('granted');
  });

  it('openNotificationPermissionUi opens native prompt when default', async () => {
    (Notification as unknown as { permission: NotificationPermission }).permission = 'default';
    const result = await openNotificationPermissionUi();
    expect(Notification.requestPermission).toHaveBeenCalledOnce();
    expect(result).toEqual({ permission: 'granted', opened: 'native-prompt' });
  });

  it('openNotificationPermissionUi does not re-prompt when denied', async () => {
    (Notification as unknown as { permission: NotificationPermission }).permission = 'denied';
    const result = await openNotificationPermissionUi();
    expect(Notification.requestPermission).not.toHaveBeenCalled();
    expect(result.permission).toBe('denied');
    expect(result.opened).toBe('none');
  });

  it('blocked copy includes concrete steps', () => {
    const copy = notificationPromptCopy('blocked');
    expect(copy.title).toBe('Bildirişlər bloklanıb');
    expect(copy.description).toContain('Bildirişlər');
    expect(copy.primaryLabel).toBe('İcazə ver');
  });

  it('ask copy explains native dialog', () => {
    const copy = notificationPromptCopy('ask');
    expect(copy.title).toBe('Bildirişlərə icazə verin');
    expect(copy.description).toContain('icazə pəncərəsini');
  });

  it('detectBrowserFamily and steps are stable', () => {
    expect(typeof detectBrowserFamily()).toBe('string');
    expect(blockedNotificationSteps('chrome').length).toBeGreaterThan(20);
    expect(blockedNotificationSteps('firefox')).toContain('Bildirişlər');
    expect(blockedNotificationSteps('safari')).toContain('Safari');
  });
});
