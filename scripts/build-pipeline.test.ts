import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

describe('production build pipeline', () => {
  it('generates Prisma Client before TypeScript and Vite compilation', async () => {
    const packageJsonPath = fileURLToPath(new URL('../package.json', import.meta.url));
    const packageJson = JSON.parse(await readFile(packageJsonPath, 'utf8')) as { scripts?: { build?: string } };
    const build = packageJson.scripts?.build ?? '';

    expect(build).toContain('pnpm run db:generate');
    expect(build.indexOf('pnpm run db:generate')).toBeLessThan(build.indexOf('tsc -b'));
    expect(build.indexOf('tsc -b')).toBeLessThan(build.indexOf('vite build'));
  });
});
