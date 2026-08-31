import { describe, expect, it } from 'vitest';
import { isComingSoonExemptPath } from './coming-soon';

describe('isComingSoonExemptPath', () => {
  it('dashboard və auth açıq qalır', () => {
    expect(isComingSoonExemptPath('/dashboard/provider')).toBe(true);
    expect(isComingSoonExemptPath('/login')).toBe(true);
    expect(isComingSoonExemptPath('/register')).toBe(true);
    expect(isComingSoonExemptPath('/mail/unsubscribe')).toBe(true);
    expect(isComingSoonExemptPath('/logo.png')).toBe(true);
    expect(isComingSoonExemptPath('/google3ca31a5fa705ff79.html')).toBe(true);
    expect(isComingSoonExemptPath('/opengraph-image')).toBe(true);
    expect(isComingSoonExemptPath('/twitter-image')).toBe(true);
  });

  it('açıq marketplace səhifələri bağlanır', () => {
    expect(isComingSoonExemptPath('/')).toBe(false);
    expect(isComingSoonExemptPath('/services')).toBe(false);
    expect(isComingSoonExemptPath('/categories/temizlik')).toBe(false);
    expect(isComingSoonExemptPath('/providers/abc')).toBe(false);
  });
});
