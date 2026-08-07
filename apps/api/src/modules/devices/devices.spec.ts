import { describe, expect, it } from 'vitest';
import {
  isValidDeviceTokenShape,
  maskDeviceToken,
} from './device-token.helpers';

describe('device-token helpers', () => {
  it('qısa token etibarsızdır', () => {
    expect(isValidDeviceTokenShape('short')).toBe(false);
  });

  it('uzun ASCII token keçərlidir', () => {
    const token = 'a'.repeat(152);
    expect(isValidDeviceTokenShape(token)).toBe(true);
  });

  it('whitespace olan token keçərsizdir', () => {
    expect(isValidDeviceTokenShape(`abc ${'x'.repeat(40)}`)).toBe(false);
  });

  it('maskDeviceToken preview verir', () => {
    const token = 'abcdefghijklmnop';
    expect(maskDeviceToken(token)).toBe('abcdef…mnop');
  });
});
