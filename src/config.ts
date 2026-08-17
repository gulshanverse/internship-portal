export type Domain = { name: string; slug: string; description: string; roles: string[]; accent: string; count: string };

export const domains: Domain[] = [
  { name: 'Software Development', slug: 'software', description: 'Ship useful products with a thoughtful engineering team.', roles: ['Frontend Engineer', 'Backend Engineer'], accent: '#c6a15b', count: '04 roles' },
  { name: 'AI / ML', slug: 'ai', description: 'Turn ambitious questions into practical intelligent systems.', roles: ['ML Research Intern', 'Applied AI Intern'], accent: '#879f91', count: '03 roles' },
  { name: 'Data', slug: 'data', description: 'Find the signal, frame the story, and make better decisions.', roles: ['Data Analyst', 'Analytics Engineer'], accent: '#b48f7a', count: '03 roles' },
  { name: 'Cybersecurity', slug: 'cyber', description: 'Build trust into every layer of the digital experience.', roles: ['Security Analyst', 'AppSec Intern'], accent: '#8b8fa6', count: '02 roles' },
  { name: 'Cloud & DevOps', slug: 'cloud', description: 'Make reliable infrastructure feel effortless for every team.', roles: ['Cloud Engineer', 'DevOps Intern'], accent: '#7f9da1', count: '02 roles' },
  { name: 'Design', slug: 'design', description: 'Shape clear, considered experiences from first sketch to final detail.', roles: ['Product Designer', 'UX Research Intern'], accent: '#c498a2', count: '03 roles' },
  { name: 'Marketing', slug: 'marketing', description: 'Create momentum through insight, clarity, and a sharp point of view.', roles: ['Content Strategist', 'Growth Marketing Intern'], accent: '#b69e71', count: '03 roles' },
  { name: 'Business Development', slug: 'business', description: 'Open the right conversations and build durable partnerships.', roles: ['Partnerships Intern', 'Market Research Intern'], accent: '#9a9f83', count: '02 roles' },
];

export const journey = ['Explore', 'Role details', 'Apply', 'Assessment', 'Review', 'Selection', 'Onboarding', 'Project'];
