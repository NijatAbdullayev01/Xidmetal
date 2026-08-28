import { describe, expect, it } from 'vitest';
import { redactBookingPiiForOffer } from './booking-pii';

describe('redactBookingPiiForOffer', () => {
  it('qapı/mərtəbə və notes gizlədir, şəhər saxlayır', () => {
    const redacted = redactBookingPiiForOffer({
      address: 'Bakı, Nəsimi, Küçə 1, Blok 4, Mərtəbə 2, Qapı 8',
      destLat: 40.40931234,
      destLng: 49.86719876,
      originLat: 40.4,
      originLng: 49.8,
      notes: 'Zəng vurmayın',
      customerFirstName: 'Əli',
      customerLastName: 'Məmmədov',
    });

    expect(redacted.address).toBeTruthy();
    expect(redacted.address).not.toMatch(/Blok|Mərtəbə|Qapı/i);
    expect(redacted.destLat).toBe(40.409);
    expect(redacted.destLng).toBe(49.867);
    expect(redacted.originLat).toBeNull();
    expect(redacted.originLng).toBeNull();
    expect(redacted.notes).toBeNull();
    expect(redacted.customerName).toBe('Əli');
    expect(redacted.customerName).not.toContain('Məmmədov');
  });
});
