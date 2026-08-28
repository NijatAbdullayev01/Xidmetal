import { describe, expect, it } from 'vitest';
import { CLIENT_APP } from '@xidmetal/shared';
import { WsAuthService } from './ws-auth.service';

describe('WsAuthService.extractToken', () => {
  const service = new WsAuthService({} as never, {} as never, {} as never, {} as never);

  it('httpOnly cookie tokeninə üstünlük verir', () => {
    const token = service.extractToken(
      {
        handshake: {
          auth: { token: 'js-token', clientApp: CLIENT_APP.MARKETPLACE },
          headers: {
            cookie: 'xidmetal_access_marketplace=cookie-token',
          },
        },
      } as never,
      CLIENT_APP.MARKETPLACE,
    );

    expect(token).toBe('cookie-token');
  });

  it('cookie yoxdursa auth.token fallback edir', () => {
    const token = service.extractToken(
      {
        handshake: {
          auth: { token: 'js-token', clientApp: CLIENT_APP.MARKETPLACE },
          headers: {},
        },
      } as never,
      CLIENT_APP.MARKETPLACE,
    );

    expect(token).toBe('js-token');
  });
});
