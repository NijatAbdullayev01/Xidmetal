import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const ioMock = vi.fn();

vi.mock('socket.io-client', () => ({
  io: (...args: unknown[]) => ioMock(...args),
}));

type Handler = (...args: unknown[]) => void;

function createMockSocket(connected = true) {
  const listeners = new Map<string, Set<Handler>>();
  const reconnection = vi.fn();
  const socket = {
    connected,
    io: { reconnection },
    on: vi.fn((event: string, handler: Handler) => {
      const set = listeners.get(event) ?? new Set();
      set.add(handler);
      listeners.set(event, set);
      return socket;
    }),
    once: vi.fn((event: string, handler: Handler) => {
      const wrap: Handler = (...args) => {
        socket.off(event, wrap);
        handler(...args);
      };
      return socket.on(event, wrap);
    }),
    off: vi.fn((event: string, handler?: Handler) => {
      if (!handler) {
        listeners.delete(event);
        return socket;
      }
      listeners.get(event)?.delete(handler);
      return socket;
    }),
    disconnect: vi.fn(() => {
      socket.connected = false;
      return socket;
    }),
    removeAllListeners: vi.fn(),
  };
  return socket;
}

describe('resolveWsUrl / shared socket', () => {
  beforeEach(() => {
    ioMock.mockReset();
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  afterEach(async () => {
    const { disconnectSharedSocket } = await import('./use-socket');
    disconnectSharedSocket();
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it('explicit NEXT_PUBLIC_WS_URL üstünlük təşkil edir', async () => {
    vi.stubEnv('NEXT_PUBLIC_WS_URL', 'https://ws.example.com/');
    vi.stubEnv('NEXT_PUBLIC_API_URL', 'https://ignored.example.com');
    const { resolveWsUrl } = await import('./use-socket');
    expect(resolveWsUrl()).toBe('https://ws.example.com');
  });

  it('WS boşdursa NEXT_PUBLIC_API_URL istifadə olunur', async () => {
    vi.stubEnv('NEXT_PUBLIC_WS_URL', '');
    vi.stubEnv('NEXT_PUBLIC_API_URL', 'https://api.example.com/');
    const { resolveWsUrl } = await import('./use-socket');
    expect(resolveWsUrl()).toBe('https://api.example.com');
  });

  it('public URL-lər boşdursa eyni origin (Cloudflare edge)', async () => {
    vi.stubEnv('NEXT_PUBLIC_WS_URL', '');
    vi.stubEnv('NEXT_PUBLIC_API_URL', '');
    vi.stubGlobal('window', { location: { origin: 'https://app.example.com' } });
    const { resolveWsUrl } = await import('./use-socket');
    expect(resolveWsUrl()).toBe('https://app.example.com');
  });

  it('brauzer yoxdursa localhost-a düşür', async () => {
    vi.stubEnv('NEXT_PUBLIC_WS_URL', '');
    vi.stubEnv('NEXT_PUBLIC_API_URL', '');
    const { resolveWsUrl } = await import('./use-socket');
    expect(resolveWsUrl()).toBe('http://localhost:4100');
  });

  it('paralel ensureSharedSocket eyni client-i paylaşır (reconnect fırtınası yoxdur)', async () => {
    const mock = createMockSocket(true);
    ioMock.mockReturnValue(mock);
    const { ensureSharedSocket, getSharedSocket } = await import('./use-socket');

    const [a, b, c] = await Promise.all([
      ensureSharedSocket('user-1'),
      ensureSharedSocket('user-1'),
      ensureSharedSocket('user-1'),
    ]);

    expect(ioMock).toHaveBeenCalledTimes(1);
    expect(a).toBe(mock);
    expect(b).toBe(mock);
    expect(c).toBe(mock);
    expect(getSharedSocket()).toBe(mock);
    expect(ioMock.mock.calls[0]?.[1]).toMatchObject({ forceNew: true });
  });

  it('socket bağlı olmasa belə eyni sessiya üçün yeni client açmır', async () => {
    const mock = createMockSocket(true);
    ioMock.mockReturnValue(mock);
    const { ensureSharedSocket } = await import('./use-socket');

    await ensureSharedSocket('user-1');
    mock.connected = false;
    await ensureSharedSocket('user-1');

    expect(ioMock).toHaveBeenCalledTimes(1);
    expect(mock.disconnect).not.toHaveBeenCalled();
  });

  it('token dəyişəndə köhnə socket-i reconnect-siz bağlayır', async () => {
    const first = createMockSocket(true);
    const second = createMockSocket(true);
    ioMock.mockReturnValueOnce(first).mockReturnValueOnce(second);
    const { ensureSharedSocket, getSharedSocket } = await import('./use-socket');

    await ensureSharedSocket('user-1');
    await ensureSharedSocket('user-2');

    expect(ioMock).toHaveBeenCalledTimes(2);
    expect(first.io.reconnection).toHaveBeenCalledWith(false);
    expect(first.disconnect).toHaveBeenCalled();
    expect(getSharedSocket()).toBe(second);
  });
});
