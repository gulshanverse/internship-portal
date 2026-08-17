import { describe, expect, it } from 'vitest';
import { normalizePublicSiteUrl, renderRobots, renderSitemap } from './generate-seo-assets.mjs';

describe('build-time SEO asset generation', () => {
  it('normalizes a configured staging URL and generates only public routes', () => {
    const siteUrl = normalizePublicSiteUrl('https://staging.test.example/');
    const robots = renderRobots(siteUrl);
    const sitemap = renderSitemap(siteUrl);
    expect(robots).toContain('Sitemap: https://staging.test.example/sitemap.xml');
    expect(sitemap).toContain('<loc>https://staging.test.example/</loc>');
    expect(robots).toContain('Disallow: /api/');
    expect(robots).toContain('Disallow: /workspace');
    expect(sitemap).not.toContain('/api/');
    expect(sitemap).not.toContain('/workspace');
    expect(`${robots}${sitemap}`).not.toContain('https://staging.example.com/');
  });

  it('supports a different configured production host without source hard-coding', () => {
    expect(renderSitemap(normalizePublicSiteUrl('https://portal.company.test'))).toContain('<loc>https://portal.company.test/</loc>');
  });

  it('rejects non-HTTP URLs and credentials', () => {
    expect(() => normalizePublicSiteUrl('javascript:alert(1)')).toThrow();
    expect(() => normalizePublicSiteUrl('https://user:pass@example.com')).toThrow();
  });
});
