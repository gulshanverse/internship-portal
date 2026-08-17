import { prisma } from './db';

export type InternshipFilters = { search?: string; domainSlug?: string; includeDrafts?: boolean };

export async function listDomains(includeInactive = false) {
  return prisma.domain.findMany({ where: includeInactive ? undefined : { active: true }, orderBy: { name: 'asc' }, include: { _count: { select: { internships: true } } } });
}

export async function getDomainBySlug(slug: string, includeDrafts = false) {
  return prisma.domain.findUnique({ where: { slug }, include: { internships: { where: includeDrafts ? { archived: false } : { published: true, archived: false }, orderBy: { title: 'asc' } } } });
}

export async function listInternships(filters: InternshipFilters = {}) {
  const where = {
    archived: false,
    ...(filters.includeDrafts ? {} : { published: true }),
    ...(filters.domainSlug ? { domain: { slug: filters.domainSlug } } : {}),
    ...(filters.search ? { OR: [{ title: { contains: filters.search, mode: 'insensitive' as const } }, { description: { contains: filters.search, mode: 'insensitive' as const } }] } : {}),
  };
  return prisma.internship.findMany({ where, orderBy: [{ published: 'desc' }, { createdAt: 'desc' }], include: { domain: true, assessments: { where: { active: true }, select: { id: true, title: true, durationMinutes: true, passingScore: true } } } });
}

export async function getInternshipBySlug(slug: string, includeDrafts = false) {
  return prisma.internship.findFirst({ where: { slug, archived: false, ...(includeDrafts ? {} : { published: true }) }, include: { domain: true, assessments: { where: { active: true }, select: { id: true, title: true, durationMinutes: true, passingScore: true } } } });
}

export async function createDomain(input: { name: string; slug: string; description: string; accent?: string; icon?: string }) {
  return prisma.domain.create({ data: input });
}

export async function updateDomain(id: string, input: Partial<{ name: string; slug: string; description: string; accent: string; icon: string; active: boolean }>) {
  return prisma.domain.update({ where: { id }, data: input });
}

export async function createInternship(input: Parameters<typeof prisma.internship.create>[0]['data']) {
  return prisma.internship.create({ data: input, include: { domain: true } });
}

export async function updateInternship(id: string, input: Parameters<typeof prisma.internship.update>[0]['data']) {
  return prisma.internship.update({ where: { id }, data: input, include: { domain: true } });
}

export async function archiveInternship(id: string) {
  return prisma.internship.update({ where: { id }, data: { archived: true, published: false } });
}
