import { describe, expect, it } from 'vitest';
import { findCategorySlugById } from './category-redirect';

describe('findCategorySlugById', () => {
  it('id-yə görə slug tapır', () => {
    expect(
      findCategorySlugById(
        [
          { id: 'a', slug: 'temizlik' },
          { id: 'b', slug: 'temir' },
        ],
        'b',
      ),
    ).toBe('temir');
  });

  it('tapılmayanda null qaytarır', () => {
    expect(findCategorySlugById([{ id: 'a', slug: 'temizlik' }], 'x')).toBeNull();
  });
});
