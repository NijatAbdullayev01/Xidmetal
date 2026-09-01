import { describe, expect, it } from 'vitest';
import { NOINDEX, NOINDEX_FOLLOW, pageMetadata, pageTitle, toCanonicalUrl, truncateMetaDescription } from './seo';

describe('truncateMetaDescription', () => {
  it('qısa mətni olduğu kimi saxlayır', () => {
    expect(truncateMetaDescription('Qısa təsvir')).toBe('Qısa təsvir');
  });

  it('uzun mətni söz sərhədində kəsir', () => {
    const text =
      'Bakıda professional ev təmizliyi xidməti. Dərin təmizlik, pəncərə yuma və müntəzəm qulluq üçün etibarlı xidmət verənləri müqayisə edin və sifariş verin.';
    const result = truncateMetaDescription(text, 80);
    expect(result.endsWith('…')).toBe(true);
    expect(result.length).toBeLessThanOrEqual(80);
    expect(result).not.toContain('  ');
  });
});

describe('pageTitle', () => {
  it('birinci səhifədə suffiks qoymur', () => {
    expect(pageTitle('Xidmətlər', 1)).toBe('Xidmətlər');
  });

  it('sonrakı səhifələrdə nömrə əlavə edir', () => {
    expect(pageTitle('Xidmətlər', 3)).toBe('Xidmətlər — səhifə 3');
  });
});

describe('toCanonicalUrl', () => {
  it('kökü trailing slashsız absolute edir', () => {
    expect(toCanonicalUrl('/', 'https://xidmetal.com')).toBe('https://xidmetal.com');
    expect(toCanonicalUrl('/contact', 'https://xidmetal.com')).toBe(
      'https://xidmetal.com/contact',
    );
  });
});

describe('pageMetadata', () => {
  it('OG locale və hreflang əlavə edir, root title kilidini pozur', () => {
    const meta = pageMetadata({
      title: 'Əlaqə',
      description: 'Bizə yazın',
      canonical: '/contact',
      siteUrl: 'https://xidmetal.com',
    });
    expect(meta.openGraph).toMatchObject({
      title: 'Əlaqə',
      description: 'Bizə yazın',
      locale: 'az_AZ',
      siteName: 'Xidmətal',
      url: 'https://xidmetal.com/contact',
    });
    expect(meta.alternates).toMatchObject({
      canonical: 'https://xidmetal.com/contact',
      languages: {
        az: 'https://xidmetal.com/contact',
        'x-default': 'https://xidmetal.com/contact',
      },
    });
    expect(meta.twitter).toMatchObject({
      title: 'Əlaqə',
      description: 'Bizə yazın',
    });
  });
});

describe('NOINDEX', () => {
  it('googleBot-u da bağlayır ki, layout merge əzməsin', () => {
    expect(NOINDEX).toMatchObject({
      index: false,
      follow: false,
      googleBot: { index: false, follow: false },
    });
    expect(NOINDEX_FOLLOW).toMatchObject({
      index: false,
      follow: true,
      googleBot: { index: false, follow: true },
    });
  });
});
