import { describe, expect, it } from 'vitest';
import { visiblePageNumbers } from './pagination';

describe('visiblePageNumbers', () => {
  it('qısa siyahını tam göstərir', () => {
    expect(visiblePageNumbers(2, 4)).toEqual([1, 2, 3, 4]);
  });

  it('uzun siyahıda ellipsis qoyur', () => {
    expect(visiblePageNumbers(1, 12)).toEqual([1, 2, 3, 'ellipsis', 12]);
    expect(visiblePageNumbers(12, 12)).toEqual([1, 'ellipsis', 10, 11, 12]);
    expect(visiblePageNumbers(6, 12)).toContain('ellipsis');
    expect(visiblePageNumbers(6, 12)).toContain(6);
  });
});
