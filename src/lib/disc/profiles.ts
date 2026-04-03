/**
 * DISC Profile Descriptions - Zion Recruit
 * 
 * Detailed descriptions for each DISC profile (D, I, S, C)
 * Includes strengths, weaknesses, work preferences, and more
 */

import { DISCFactor } from './questions';

// ============================================
// Types
// ============================================

export interface DISCProfileDescription {
  factor: DISCFactor;
  name: string;
  title: string;
  color: string;
  description: string;
  strengths: string[];
  weaknesses: string[];
  workPreferences: string[];
  communicationStyle: string;
  idealEnvironment: string[];
  leadershipStyle: string;
  decisionMaking: string;
  stressors: string[];
  motivators: string[];
  teamContribution: string;
}

export interface DISCComboProfile {
  code: string;
  name: string;
  description: string;
  characteristics: string[];
  idealRoles: string[];
}

// ============================================
// Individual Profile Descriptions
// ============================================

export const DISC_PROFILES: Record<DISCFactor, DISCProfileDescription> = {
  D: {
    factor: 'D',
    name: 'Dominance',
    title: 'The Driver',
    color: '#EF4444', // Red
    description: 'People with high D scores are direct, decisive, and driven by results. They take charge, make quick decisions, and are comfortable with authority. They thrive on challenges and are motivated by power and control.',
    strengths: [
      'Decisive and action-oriented',
      'Natural leader who takes initiative',
      'Efficient at problem-solving',
      'Comfortable with authority and responsibility',
      'Thrives under pressure',
      'Direct and straightforward communication',
      'Goal-driven and results-focused',
      'Willing to take calculated risks',
    ],
    weaknesses: [
      'Can be impatient with delays',
      'May overlook details in pursuit of speed',
      'Can appear blunt or insensitive',
      'Might dominate conversations',
      'May struggle with routine tasks',
      'Can be overly competitive',
      'Might ignore others\' feelings',
      'May have difficulty delegating',
    ],
    workPreferences: [
      'Prefers varied and challenging work',
      'Enjoys positions of authority',
      'Likes to make independent decisions',
      'Prefers direct communication',
      'Thrives in fast-paced environments',
      'Wants measurable results and achievements',
      'Dislikes micromanagement',
      'Prefers brief, focused meetings',
    ],
    communicationStyle: 'Direct, concise, and results-focused. Prefers to get straight to the point and discuss outcomes. May become impatient with lengthy explanations.',
    idealEnvironment: [
      'Fast-paced and results-oriented',
      'Opportunities for advancement',
      'Authority to make decisions',
      'Challenging goals and projects',
      'Minimal bureaucracy',
      'Recognition for achievements',
    ],
    leadershipStyle: 'Authoritative and directive. Sets clear expectations, makes quick decisions, and drives team toward results. Delegates effectively but maintains control.',
    decisionMaking: 'Quick and decisive. Relies on intuition and past experience. Willing to make decisions with limited information.',
    stressors: [
      'Slow decision-making processes',
      'Lack of control or authority',
      'Routine, repetitive tasks',
      'Micromanagement',
      'Inefficiency and delays',
    ],
    motivators: [
      'Power and authority',
      'Achievement and recognition',
      'Challenges and competition',
      'Direct feedback',
      'Opportunities for advancement',
    ],
    teamContribution: 'Drives action and results. Keeps the team focused on goals and ensures progress. Excels at making tough decisions.',
  },
  I: {
    factor: 'I',
    name: 'Influence',
    title: 'The Persuader',
    color: '#F59E0B', // Amber
    description: 'People with high I scores are enthusiastic, optimistic, and sociable. They excel at building relationships, inspiring others, and creating a positive atmosphere. They are motivated by recognition and social interaction.',
    strengths: [
      'Excellent communication skills',
      'Natural networker and relationship builder',
      'Enthusiastic and motivating',
      'Creative and innovative thinker',
      'Optimistic and positive attitude',
      'Persuasive and influential',
      'Adaptable and flexible',
      'Creates a fun work environment',
    ],
    weaknesses: [
      'Can be disorganized',
      'May struggle with follow-through',
      'Sometimes overcommits',
      'Can be impulsive in decisions',
      'May avoid conflict',
      'Can talk too much',
      'Might overlook details',
      'May have difficulty with routine tasks',
    ],
    workPreferences: [
      'Enjoys collaborative environments',
      'Prefers social interaction at work',
      'Likes recognition and praise',
      'Thrives with variety and change',
      'Enjoys brainstorming and ideation',
      'Prefers informal communication',
      'Values friendly relationships with colleagues',
      'Dislikes isolated work for long periods',
    ],
    communicationStyle: 'Enthusiastic, expressive, and storytelling. Uses gestures and varied vocal tones. Enjoys discussing ideas and possibilities.',
    idealEnvironment: [
      'Social and collaborative culture',
      'Recognition for contributions',
      'Opportunities for creativity',
      'Variety in work tasks',
      'Informal and friendly atmosphere',
      'Freedom from tight controls',
    ],
    leadershipStyle: 'Inspirational and charismatic. Motivates through enthusiasm and vision. Creates an engaging team atmosphere and encourages participation.',
    decisionMaking: 'Intuitive and collaborative. Seeks input from others and considers the impact on relationships. May delay decisions to maintain harmony.',
    stressors: [
      'Isolation or lack of social interaction',
      'Detailed, routine work',
      'Critical or negative environments',
      'Rejection or lack of recognition',
      'Strict rules and procedures',
    ],
    motivators: [
      'Recognition and praise',
      'Social interaction',
      'Opportunities to influence',
      'Creative freedom',
      'Friendly relationships',
    ],
    teamContribution: 'Brings energy and enthusiasm. Builds team morale and facilitates communication. Excels at generating ideas and inspiring others.',
  },
  S: {
    factor: 'S',
    name: 'Steadiness',
    title: 'The Supporter',
    color: '#22C55E', // Green
    description: 'People with high S scores are patient, reliable, and supportive. They value stability, harmony, and consistency. They are excellent listeners, team players, and are motivated by security and helping others.',
    strengths: [
      'Patient and good listener',
      'Reliable and dependable',
      'Supportive and helpful',
      'Creates harmony in teams',
      'Excellent at follow-through',
      'Loyal and committed',
      'Calm under pressure',
      'Works well in teams',
    ],
    weaknesses: [
      'Can resist change',
      'May avoid conflict',
      'Sometimes too accommodating',
      'Can be indecisive',
      'May struggle with confrontation',
      'Can be overly cautious',
      'Might suppress own needs',
      'May have difficulty saying no',
    ],
    workPreferences: [
      'Prefers stable, predictable work',
      'Values clear expectations',
      'Likes supportive team environments',
      'Prefers structured processes',
      'Enjoys helping others succeed',
      'Values work-life balance',
      'Prefers consensus-based decisions',
      'Dislikes sudden changes',
    ],
    communicationStyle: 'Warm, patient, and supportive. Listens carefully and responds thoughtfully. Prefers one-on-one or small group interactions.',
    idealEnvironment: [
      'Stable and predictable',
      'Supportive team culture',
      'Clear processes and expectations',
      'Harmonious relationships',
      'Opportunity to help others',
      'Recognition for loyalty and commitment',
    ],
    leadershipStyle: 'Supportive and inclusive. Builds strong relationships with team members. Values consensus and ensures everyone feels heard.',
    decisionMaking: 'Careful and consultative. Takes time to gather input and considers the impact on people. Prefers consensus over quick decisions.',
    stressors: [
      'Sudden or frequent changes',
      'Conflict and confrontation',
      'Pressure to make quick decisions',
      'Lack of clear direction',
      'Unfairness or injustice',
    ],
    motivators: [
      'Security and stability',
      'Appreciation for contributions',
      'Harmonious relationships',
      'Opportunities to help others',
      'Clear expectations and support',
    ],
    teamContribution: 'Provides stability and support. Ensures team harmony and follows through on commitments. Excellent at building lasting relationships.',
  },
  C: {
    factor: 'C',
    name: 'Conscientiousness',
    title: 'The Analyst',
    color: '#3B82F6', // Blue
    description: 'People with high C scores are analytical, precise, and systematic. They value accuracy, quality, and following procedures. They are motivated by accuracy and have high standards for themselves and others.',
    strengths: [
      'Analytical and detail-oriented',
      'High standards for quality',
      'Systematic and organized',
      'Excellent at research and analysis',
      'Accurate and thorough',
      'Follows procedures correctly',
      'Objective and fair',
      'Strong problem-solving skills',
    ],
    weaknesses: [
      'Can be overly critical',
      'May be perfectionistic',
      'Sometimes overanalyzes',
      'Can be risk-averse',
      'May struggle with ambiguity',
      'Can appear detached or cold',
      'Might get lost in details',
      'May delay decisions for more information',
    ],
    workPreferences: [
      'Prefers clearly defined tasks',
      'Values accuracy over speed',
      'Likes structured work environments',
      'Prefers written communication',
      'Enjoys independent work',
      'Values logical processes',
      'Prefers detailed instructions',
      'Disallows vague expectations',
    ],
    communicationStyle: 'Precise, factual, and analytical. Provides detailed information and expects the same. Prefers written communication for clarity.',
    idealEnvironment: [
      'Structured and organized',
      'Clear procedures and standards',
      'Opportunity to specialize',
      'Minimal interruptions',
      'Recognition for quality work',
      'Access to information and resources',
    ],
    leadershipStyle: 'Analytical and systematic. Sets high standards and provides detailed guidance. Values accuracy and quality over speed.',
    decisionMaking: 'Analytical and data-driven. Gathers extensive information before deciding. Prefers proven methods over new approaches.',
    stressors: [
      'Vague or incomplete information',
      'Criticism of their work',
      'Rushed deadlines',
      'Frequent changes to procedures',
      'Being wrong or making mistakes',
    ],
    motivators: [
      'Accuracy and quality',
      'Recognition for expertise',
      'Opportunities to learn',
      'Clear procedures and standards',
      'Being right and correct',
    ],
    teamContribution: 'Ensures quality and accuracy. Provides detailed analysis and maintains standards. Excellent at identifying potential problems.',
  },
};

// ============================================
// Profile Combinations
// ============================================

export const DISC_COMBOS: Record<string, DISCComboProfile> = {
  DI: {
    code: 'DI',
    name: 'The Initiator',
    description: 'A dynamic combination of drive and enthusiasm. Initiators are action-oriented leaders who inspire others while pursuing ambitious goals.',
    characteristics: [
      'High energy and action-driven',
      'Inspirational leadership style',
      'Quick decision-making',
      'Excellent at motivating teams',
    ],
    idealRoles: ['Sales Director', 'Entrepreneur', 'Marketing Executive', 'Project Leader'],
  },
  DS: {
    code: 'DS',
    name: 'The Achiever',
    description: 'Combines drive with reliability. Achievers are determined leaders who maintain stability while pursuing results.',
    characteristics: [
      'Balanced approach to goals',
      'Reliable and persistent',
      'Good at follow-through',
      'Supportive leadership style',
    ],
    idealRoles: ['Operations Manager', 'Program Manager', 'Team Lead', 'Quality Director'],
  },
  DC: {
    code: 'DC',
    name: 'The Challenger',
    description: 'Combines drive with precision. Challengers are analytical leaders who push for results with careful planning.',
    characteristics: [
      'Strategic and analytical',
      'High standards for results',
      'Decisive with attention to detail',
      'Problem-solving focused',
    ],
    idealRoles: ['Strategic Director', 'Consultant', 'Engineering Manager', 'Business Analyst'],
  },
  ID: {
    code: 'ID',
    name: 'The Promoter',
    description: 'Enthusiastic and results-driven. Promoters excel at networking and driving initiatives through influence.',
    characteristics: [
      'Persuasive and influential',
      'Relationship-focused achiever',
      'Energetic and optimistic',
      'Strong networking skills',
    ],
    idealRoles: ['Sales Executive', 'Business Developer', 'Public Relations', 'Brand Manager'],
  },
  IS: {
    code: 'IS',
    name: 'The Counselor',
    description: 'Combines warmth with stability. Counselors are supportive communicators who build lasting relationships.',
    characteristics: [
      'Empathetic and supportive',
      'Excellent listener',
      'Relationship-focused',
      'Creates team harmony',
    ],
    idealRoles: ['HR Manager', 'Customer Success', 'Trainer', 'Account Manager'],
  },
  IC: {
    code: 'IC',
    name: 'The Assessor',
    description: 'Combines enthusiasm with analysis. Assessors are creative problem-solvers who bring innovative solutions.',
    characteristics: [
      'Creative yet analytical',
      'Detail-oriented innovator',
      'Good at explaining complex ideas',
      'Balanced approach to decisions',
    ],
    idealRoles: ['UX Designer', 'Product Manager', 'Marketing Analyst', 'Technical Writer'],
  },
  SD: {
    code: 'SD',
    name: 'The Coordinator',
    description: 'Combines stability with drive. Coordinators are reliable leaders who ensure consistent team performance.',
    characteristics: [
      'Reliable and goal-oriented',
      'Balanced leadership style',
      'Good at managing processes',
      'Supportive yet decisive',
    ],
    idealRoles: ['Project Manager', 'Team Coordinator', 'Operations Supervisor', 'Account Manager'],
  },
  SI: {
    code: 'SI',
    name: 'The Harmonizer',
    description: 'Combines supportiveness with enthusiasm. Harmonizers create positive team environments and build strong relationships.',
    characteristics: [
      'Warm and supportive',
      'Team-oriented',
      'Good at building consensus',
      'Creates positive atmosphere',
    ],
    idealRoles: ['Team Lead', 'Customer Service Manager', 'Community Manager', 'Training Coordinator'],
  },
  SC: {
    code: 'SC',
    name: 'The Specialist',
    description: 'Combines stability with precision. Specialists are reliable experts who maintain high standards in their work.',
    characteristics: [
      'Reliable and accurate',
      'Process-oriented',
      'Detail-focused',
      'Consistent performer',
    ],
    idealRoles: ['Quality Assurance', 'Compliance Officer', 'Data Analyst', 'Research Specialist'],
  },
  CD: {
    code: 'CD',
    name: 'The Perfectionist',
    description: 'Combines precision with drive. Perfectionists are results-oriented analysts who demand excellence.',
    characteristics: [
      'High standards and drive',
      'Quality-focused achiever',
      'Systematic problem-solver',
      'Exacting standards',
    ],
    idealRoles: ['Quality Manager', 'Systems Analyst', 'Technical Lead', 'Auditor'],
  },
  CI: {
    code: 'CI',
    name: 'The Practitioner',
    description: 'Combines precision with influence. Practitioners are detailed communicators who excel at specialized work.',
    characteristics: [
      'Detailed and communicative',
      'Expert in their field',
      'Good at explaining technical concepts',
      'Quality-focused collaborator',
    ],
    idealRoles: ['Technical Consultant', 'Systems Architect', 'Healthcare Professional', 'Educator'],
  },
  CS: {
    code: 'CS',
    name: 'The Perfectionist',
    description: 'Combines precision with stability. This profile is highly accurate, patient, and reliable in specialized work.',
    characteristics: [
      'Extremely accurate and patient',
      'Methodical worker',
      'High quality standards',
      'Reliable performer',
    ],
    idealRoles: ['Financial Analyst', 'Accountant', 'Data Entry Specialist', 'Librarian'],
  },
};

// ============================================
// Helper Functions
// ============================================

/**
 * Get profile description by factor
 */
export function getProfileDescription(factor: DISCFactor): DISCProfileDescription {
  return DISC_PROFILES[factor];
}

/**
 * Get combo profile by code
 */
export function getComboProfile(code: string): DISCComboProfile | undefined {
  return DISC_COMBOS[code];
}

/**
 * Get color for a factor
 */
export function getFactorColor(factor: DISCFactor): string {
  return DISC_PROFILES[factor].color;
}

/**
 * Get all factor colors
 */
export function getFactorColors(): Record<DISCFactor, string> {
  return {
    D: DISC_PROFILES.D.color,
    I: DISC_PROFILES.I.color,
    S: DISC_PROFILES.S.color,
    C: DISC_PROFILES.C.color,
  };
}
