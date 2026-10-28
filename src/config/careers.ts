// Open roles on /join and their screening questions.
//
// Shared by the page (renders postings + the intake form) and by
// /api/careers/apply (validates that the role exists and every question was
// answered). Question ids are stored with each answer, so rewording a prompt is
// safe; removing an id only drops it from new applications.

export interface CareerQuestion {
  id: string;
  prompt: string;
}

export interface CareerRole {
  slug: string;
  title: string;
  type: string;
  location: string;
  summary: string;
  responsibilities: string[];
  lookingFor: string[];
  questions: CareerQuestion[];
}

export const CAREER_ROLES: CareerRole[] = [
  {
    slug: "fundraiser",
    title: "Fundraising & Investor Relations Lead",
    type: "Contract or part-time, with equity",
    location: "Remote · Coachella Valley a plus",
    summary:
      "Lead ChatRealty's $3M pre-seed community round — turning agents, their clients and the real estate community into investors, and keeping them informed after they are.",
    responsibilities: [
      "Plan and run the community round with our funding portal and securities counsel",
      "Build and work a pipeline of agents, clients, angels and proptech investors",
      "Own investor materials: summary, deck, updates and FAQs",
      "Keep every public message inside crowdfunding rules",
    ],
    lookingFor: [
      "A track record of closing raises, ideally including a Reg CF or other community round",
      "Relationships in real estate, proptech or angel networks",
      "Comfort working under securities-marketing constraints",
    ],
    questions: [
      {
        id: "largest-raise",
        prompt:
          "Describe the largest raise you personally led or closed: the amount, the company's stage, and exactly what your role was.",
      },
      {
        id: "community-round",
        prompt:
          "Have you worked on a Regulation Crowdfunding or other community round? Which platform, and what moved people from 'interested' to actually investing?",
      },
      {
        id: "pipeline-plan",
        prompt:
          "Our round targets real estate agents and their clients. How would you build a pipeline of 1,000+ potential investors from that audience in 90 days?",
      },
      {
        id: "network",
        prompt:
          "What kinds of investors, angel groups or real estate / proptech networks can you reach today? (Describe types if names are confidential.)",
      },
      {
        id: "compliance",
        prompt:
          "How do you promote a raise on social media and email while staying within securities rules (testing the waters, general solicitation, required disclosures)?",
      },
    ],
  },
  {
    slug: "data-engineer",
    title: "Data Engineer",
    type: "Full-time or contract",
    location: "Remote",
    summary:
      "Own the pipelines that feed ChatRealty — MLS listings, a million-plus closed sales, photos, market statistics and CMAs — so agents get fast, correct data on demand.",
    responsibilities: [
      "Run and harden the nightly MLS sync: fetch, status changes, CMA stats and photos",
      "Design indexes and pre-built aggregates that keep search and CMAs under a second",
      "Add new MLS feeds for agents who bring their own data",
      "Catch bad data before agents and clients see it",
    ],
    lookingFor: [
      "Production experience syncing third-party APIs at scale",
      "Strong MongoDB and/or Postgres; Python or TypeScript",
      "Real estate data (RESO Web API, MLS/IDX feeds) is a big plus",
    ],
    questions: [
      {
        id: "pipeline-built",
        prompt:
          "Describe a production pipeline you built that syncs from a third-party API. What was the volume and cadence, and how did it handle failures, retries and partial runs?",
      },
      {
        id: "re-data",
        prompt:
          "What experience do you have with real estate data — RESO Web API, MLS feeds (Spark, Trestle, Bridge, etc.), or IDX/VOW display rules?",
      },
      {
        id: "fast-cma",
        prompt:
          "We keep about 1.1 million closed sales in MongoDB. How would you serve neighborhood CMA statistics in under a second? Talk about indexes, pre-aggregation and freshness.",
      },
      {
        id: "silent-bug",
        prompt:
          "Tell us about a time bad data or a silent bug reached production. How was it found, and what did you put in place so it couldn't happen again?",
      },
      {
        id: "stack",
        prompt:
          "Which languages and databases are you strongest in? Link to code or a project you're proud of, and say what your part was.",
      },
    ],
  },
  {
    slug: "real-estate-attorney",
    title: "Real Estate Attorney — Data & Technology",
    type: "Fractional, retainer or in-house",
    location: "California license preferred",
    summary:
      "Be ChatRealty's counsel where real estate law meets data: MLS licensing, privacy, consumer communications and the agreements that let agents bring their own data to the platform.",
    responsibilities: [
      "Advise on MLS, IDX and VOW data licensing and display rules",
      "Own privacy and communications compliance: CCPA/CPRA, TCPA, CAN-SPAM",
      "Draft and review platform terms, agent agreements and data-sharing agreements",
      "Coordinate with securities counsel on the community round",
    ],
    lookingFor: [
      "Active bar license, ideally California",
      "Real estate practice with a focus on data, technology or privacy",
      "Ability to give clear, practical answers to a fast-moving startup",
    ],
    questions: [
      {
        id: "licensure",
        prompt:
          "Which state bars are you admitted to and in good standing with? How many years have you practiced real estate law?",
      },
      {
        id: "mls-licensing",
        prompt:
          "Describe your experience with MLS data licensing, IDX/VOW agreements, or broker data-sharing rules. What issues come up most often?",
      },
      {
        id: "privacy",
        prompt:
          "How have you advised technology or real estate companies on privacy and outreach laws — CCPA/CPRA, TCPA for calls and texts, CAN-SPAM?",
      },
      {
        id: "securities",
        prompt:
          "Do you have experience with securities offerings (Reg CF, Reg D), or with coordinating alongside securities counsel? Describe it briefly.",
      },
      {
        id: "engagement",
        prompt:
          "How would you prefer to work with us — fractional, monthly retainer, in-house, or partly for equity — and what are your rate expectations?",
      },
    ],
  },
  {
    slug: "operations-officer",
    title: "Operations Officer (COO)",
    type: "Full-time, equity-heavy",
    location: "Remote · Coachella Valley a plus",
    summary:
      "Turn a founder-built platform into a company: run day-to-day operations, agent onboarding and support, vendors, finance and the systems that let ChatRealty scale.",
    responsibilities: [
      "Own operations end to end: onboarding, support, billing and vendor management",
      "Set the weekly metrics and the cadence that keeps the team on them",
      "Build the processes and hiring plan for growth after the raise",
      "Partner with the founder on fundraising, budgets and priorities",
    ],
    lookingFor: [
      "Operating experience at a SaaS company, brokerage or both",
      "Comfort with ambiguity at a pre-seed stage",
      "A bias toward simple systems and measurable results",
    ],
    questions: [
      {
        id: "scope",
        prompt:
          "Describe the largest operation you've run or built: team size, revenue, and what you were personally accountable for.",
      },
      {
        id: "domain",
        prompt:
          "What is your experience with real estate brokerages, SaaS companies, or both? Which processes did you build or fix?",
      },
      {
        id: "first-90",
        prompt:
          "You join a small, founder-led pre-seed startup that builds with AI-assisted development. What do your first 90 days look like?",
      },
      {
        id: "metrics",
        prompt:
          "Our revenue comes from agent subscriptions and marketing spend. Which five metrics would you review every week, and why?",
      },
      {
        id: "hard-call",
        prompt:
          "Tell us about a time you cut a cost, ended a project or changed a process that wasn't working. How did you decide, and what happened?",
      },
    ],
  },
];

export function findRole(slug: string): CareerRole | undefined {
  return CAREER_ROLES.find((r) => r.slug === slug);
}

/** Vercel caps a request body at 4.5 MB, so the two files share 4 MB. */
export const RESUME_MAX_BYTES = 3 * 1024 * 1024;
export const COVER_FILE_MAX_BYTES = 1 * 1024 * 1024;
export const ANSWER_MAX_CHARS = 3000;
export const ACCEPTED_DOC_TYPES = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
];
export const ACCEPTED_DOC_EXT = ".pdf,.doc,.docx";
