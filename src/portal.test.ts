import { describe, expect, it } from 'vitest';
import { domains, journey } from './config';

describe('Internship Portal configuration', () => {
  it('defines all eight required internship domains', () => {
    expect(domains).toHaveLength(8);
    expect(domains.map(domain => domain.name)).toEqual([
      'Software Development', 'AI / ML', 'Data', 'Cybersecurity',
      'Cloud & DevOps', 'Design', 'Marketing', 'Business Development'
    ]);
  });

  it('keeps the student journey in the intended order', () => {
    expect(journey).toEqual([
      'Explore', 'Role details', 'Apply', 'Assessment',
      'Review', 'Selection', 'Onboarding', 'Project'
    ]);
  });

  it('provides at least one role for every domain', () => {
    expect(domains.every(domain => domain.roles.length > 0)).toBe(true);
  });
});
