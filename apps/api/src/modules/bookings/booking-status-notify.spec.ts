import { describe, expect, it } from 'vitest';
import { shouldNotifyCustomerOnConfirmOrReject } from './booking-status-notify';

describe('shouldNotifyCustomerOnConfirmOrReject', () => {
  it('provider təsdiq/rədd → bildiriş var', () => {
    expect(shouldNotifyCustomerOnConfirmOrReject(true, false)).toBe(true);
  });

  it('admin təsdiq/rədd → bildiriş var', () => {
    expect(shouldNotifyCustomerOnConfirmOrReject(false, true)).toBe(true);
  });

  it('nə provider nə admin → bildiriş yox', () => {
    expect(shouldNotifyCustomerOnConfirmOrReject(false, false)).toBe(false);
  });
});
