import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export function normalizePublicSiteUrl(value) {
  if (!value) throw new Error('PUBLIC_SITE_URL is required to generate SEO assets.');
  let url;
  try { url = new URL(value); } catch { throw new Error('PUBLIC_SITE_URL must be an absolute HTTP or HTTPS URL.'); }
  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password || url.search || url.hash) throw new Error('PUBLIC_SITE_URL must be an absolute HTTP or HTTPS URL without credentials, query, or hash.');
  return url.toString().replace(/\/$/, '');
}

export function renderRobots(siteUrl) {
  return `User-agent: *\nAllow: /\nDisallow: /api/\nDisallow: /workspace\nSitemap: ${siteUrl}/sitemap.xml\n`;
}

export function renderSitemap(siteUrl) {
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n  <url>\n    <loc>${siteUrl}/</loc>\n  </url>\n</urlset>\n`;
}

export async function writeSeoAssets(siteUrl, outputDirectory) {
  const normalized = normalizePublicSiteUrl(siteUrl);
  await fs.mkdir(outputDirectory, { recursive: true });
  await Promise.all([
    fs.writeFile(path.join(outputDirectory, 'robots.txt'), renderRobots(normalized), 'utf8'),
    fs.writeFile(path.join(outputDirectory, 'sitemap.xml'), renderSitemap(normalized), 'utf8'),
  ]);
  return normalized;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const outputDirectory = path.resolve(process.cwd(), 'public');
  await writeSeoAssets(process.env.PUBLIC_SITE_URL, outputDirectory);
  console.log(`Generated SEO assets for ${normalizePublicSiteUrl(process.env.PUBLIC_SITE_URL)}`);
}
