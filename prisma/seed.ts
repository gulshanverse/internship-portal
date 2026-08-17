import 'dotenv/config';
import { PrismaClient, UserRole, UserStatus, InternshipMode, InternshipLevel } from '@prisma/client';

const prisma = new PrismaClient();

const domains = [
  ['Software Development', 'software-development', 'Ship useful products with a thoughtful engineering team.', '#c6a15b'],
  ['AI / Machine Learning', 'ai-machine-learning', 'Turn ambitious questions into practical intelligent systems.', '#879f91'],
  ['Data', 'data', 'Find the signal, frame the story, and make better decisions.', '#b48f7a'],
  ['Cybersecurity', 'cybersecurity', 'Build trust into every layer of the digital experience.', '#8b8fa6'],
  ['Cloud & DevOps', 'cloud-devops', 'Make reliable infrastructure feel effortless for every team.', '#7f9da1'],
  ['Design', 'design', 'Shape clear, considered experiences from first sketch to final detail.', '#c498a2'],
  ['Marketing', 'marketing', 'Create momentum through insight, clarity, and a sharp point of view.', '#b69e71'],
  ['Business Development', 'business-development', 'Open the right conversations and build durable partnerships.', '#9a9f83'],
] as const;

const internships = [
  ['software-development', 'Full Stack Development Intern', 'Build a useful product slice from brief to review.', ['React', 'TypeScript', 'APIs']],
  ['software-development', 'Frontend Development Intern', 'Shape a clear, accessible interface for a real user need.', ['React', 'CSS', 'Accessibility']],
  ['software-development', 'Backend Development Intern', 'Design a reliable service with clean contracts and persistence.', ['Node.js', 'PostgreSQL', 'Testing']],
  ['ai-machine-learning', 'AI/ML Intern', 'Explore a practical intelligent workflow with measurable outcomes.', ['Python', 'ML', 'Evaluation']],
  ['ai-machine-learning', 'Generative AI Intern', 'Prototype a responsible generative AI experience.', ['Python', 'LLMs', 'Prompt design']],
  ['ai-machine-learning', 'Computer Vision Intern', 'Turn visual data into a useful product signal.', ['Python', 'Vision', 'Data']],
  ['data', 'Data Analytics Intern', 'Build a decision-ready view from a messy dataset.', ['SQL', 'Dashboards', 'Analysis']],
  ['data', 'Data Science Intern', 'Frame a question, test a hypothesis, and communicate the result.', ['Python', 'Statistics', 'Storytelling']],
  ['data', 'Data Engineering Intern', 'Create a dependable path from source data to insight.', ['SQL', 'Pipelines', 'Data quality']],
  ['cybersecurity', 'Cybersecurity Intern', 'Map risk and make a product or process more resilient.', ['Threat modelling', 'Security', 'Documentation']],
  ['cybersecurity', 'Security Testing Intern', 'Find and explain weaknesses through an ethical testing workflow.', ['OWASP', 'Testing', 'Reporting']],
  ['cloud-devops', 'Cloud Engineering Intern', 'Make a service easier to deploy, observe, and operate.', ['Cloud', 'Linux', 'Monitoring']],
  ['cloud-devops', 'DevOps Intern', 'Improve the path from commit to reliable release.', ['CI/CD', 'Containers', 'Automation']],
  ['design', 'UI/UX Design Intern', 'Turn a user need into a considered, testable experience.', ['Figma', 'Research', 'Prototyping']],
  ['design', 'Product Design Intern', 'Balance clarity, craft, and outcomes in a product flow.', ['Systems thinking', 'UI', 'Interaction']],
  ['marketing', 'Digital Marketing Intern', 'Create a focused campaign from insight to measurement.', ['Content', 'Analytics', 'Campaigns']],
  ['marketing', 'SEO & Content Intern', 'Build useful content that earns attention through clarity.', ['SEO', 'Writing', 'Research']],
  ['business-development', 'Business Development Intern', 'Research a market and create a thoughtful outreach plan.', ['Research', 'Communication', 'Strategy']],
  ['business-development', 'Sales & Partnerships Intern', 'Find the right conversations and build a clear partnership case.', ['Outreach', 'Partnerships', 'Presentations']],
] as const;

async function main() {
  for (const [name, slug, description, accent] of domains) {
    const domain = await prisma.domain.upsert({
      where: { slug },
      update: { name, description, accent, active: true },
      create: { name, slug, description, accent, active: true },
    });

    for (const [internshipSlug, title, descriptionText, skills] of internships.filter(item => item[0] === slug)) {
      await prisma.internship.upsert({
        where: { slug: internshipSlug + '-' + title.toLowerCase().replace(/[^a-z0-9]+/g, '-') },
        update: { title, description: descriptionText, skills: [...skills], published: false, archived: false },
        create: {
          domainId: domain.id,
          title,
          slug: internshipSlug + '-' + title.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
          description: descriptionText,
          duration: '8–12 weeks',
          mode: InternshipMode.REMOTE,
          level: InternshipLevel.BEGINNER,
          eligibility: ['Currently enrolled student or recent graduate'],
          responsibilities: ['Own a scoped project', 'Share progress in weekly reviews'],
          learningOutcomes: ['Build practical confidence', 'Communicate work clearly'],
          skills: [...skills],
          projectDescription: 'A project-based brief with a clear outcome and mentor support.',
          capacity: 5,
          published: false,
        },
      });
    }
  }

  const demoUsers = [
    { email: 'demo.student@example.test', role: UserRole.STUDENT, fullName: 'Demo Student' },
    { email: 'demo.mentor@example.test', role: UserRole.MENTOR, fullName: 'Demo Mentor' },
    { email: 'demo.admin@example.test', role: UserRole.ADMIN, fullName: 'Demo Admin' },
  ];

  for (const demo of demoUsers) {
    const user = await prisma.user.upsert({
      where: { email: demo.email },
      update: { role: demo.role, status: UserStatus.ACTIVE },
      create: { email: demo.email, role: demo.role, status: UserStatus.ACTIVE },
    });
    if (demo.role === UserRole.STUDENT) {
      await prisma.studentProfile.upsert({ where: { userId: user.id }, update: {}, create: { userId: user.id, fullName: demo.fullName } });
    }
    if (demo.role === UserRole.MENTOR) {
      await prisma.mentorProfile.upsert({ where: { userId: user.id }, update: {}, create: { userId: user.id, name: demo.fullName, expertise: ['Product', 'Engineering'] } });
    }
  }

  console.log(`Seeded ${domains.length} domains, ${internships.length} unpublished internships, and ${demoUsers.length} development-only users.`);
}

main().catch(error => { console.error(error); process.exitCode = 1; }).finally(async () => { await prisma.$disconnect(); });
