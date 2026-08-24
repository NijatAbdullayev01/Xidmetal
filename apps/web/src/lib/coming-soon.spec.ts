import { describe, expect, it } from 'vitest';
import { isComingSoonExemptPath } from './coming-soon';

describe('isComingSoonExemptPath', () => {
  it('dashboard və auth açıq qalır', () => {
    expect(isComingSoonExemptPath('/dashboard/provider')).toBe(true);
    expect(isComingSoonExemptPath('/login')).toBe(true);
    expect(isComingSoonExemptPath('/register')).toBe(true);
  });

  it('açıq marketplace səhifələri bağlanır', () => {
    expect(isComingSoonExemptPath('/')).toBe(false);
    expect(isComingSoonExemptPath('/services')).toBe(false);
    expect(isComingSoonExemptPath('/categories/temizlik')).toBe(false);
  });
});
