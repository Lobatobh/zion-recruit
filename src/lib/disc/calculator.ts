/**
 * DISC Calculator - Zion Recruit
 * 
 * Calculates DISC profile scores from test answers
 * Determines primary, secondary profiles and intensity levels
 */

import { DISCFactor, getOptionFactor } from './questions';

// ============================================
// Types
// ============================================

export interface DISCAnswer {
  questionNumber: number;
  mostOption: string;
  leastOption: string;
}

export interface DISCRawScores {
  D: number;
  I: number;
  S: number;
  C: number;
}

export interface DISCIntensityLevel {
  level: 'Low' | 'Medium' | 'High' | 'Very High';
  range: string;
  description: string;
}

export interface DISCResult {
  rawScores: DISCRawScores;
  percentageScores: DISCRawScores;
  primaryProfile: DISCFactor;
  secondaryProfile: DISCFactor | null;
  profileCombo: string;
  intensityLevels: Record<DISCFactor, DISCIntensityLevel>;
  graphI: DISCRawScores;  // Most responses
  graphII: DISCRawScores; // Least responses (inverted)
  graphIII: DISCRawScores; // Combined (Most - Least)
}

// ============================================
// Constants
// ============================================

const INTENSITY_LEVELS: DISCIntensityLevel[] = [
  { level: 'Low', range: '0-25', description: 'Below average intensity' },
  { level: 'Medium', range: '26-50', description: 'Moderate intensity' },
  { level: 'High', range: '51-75', description: 'Above average intensity' },
  { level: 'Very High', range: '76-100', description: 'Exceptionally high intensity' },
];

// Reference values for DISC scoring (simplified for this implementation)
// In a full implementation, these would come from standardized tables
const MIDPOINT_VALUES: DISCRawScores = {
  D: 14,
  I: 14,
  S: 14,
  C: 14,
};

// ============================================
// Main Calculator Functions
// ============================================

/**
 * Calculate raw scores from answers
 * Each "most" selection adds 1 point to that factor
 * Each "least" selection subtracts 1 point from that factor
 */
export function calculateRawScores(answers: DISCAnswer[]): DISCRawScores {
  const scores: DISCRawScores = { D: 0, I: 0, S: 0, C: 0 };
  
  // Calculate "most" scores (Graph I)
  const mostScores: DISCRawScores = { D: 0, I: 0, S: 0, C: 0 };
  // Calculate "least" scores (Graph II)
  const leastScores: DISCRawScores = { D: 0, I: 0, S: 0, C: 0 };
  
  for (const answer of answers) {
    // Get factor for "most" selection
    const mostFactor = getOptionFactor(answer.questionNumber, answer.mostOption);
    if (mostFactor) {
      mostScores[mostFactor]++;
    }
    
    // Get factor for "least" selection
    const leastFactor = getOptionFactor(answer.questionNumber, answer.leastOption);
    if (leastFactor) {
      leastScores[leastFactor]++;
    }
  }
  
  // Combined score (Graph III): Most - Least
  scores.D = mostScores.D - leastScores.D;
  scores.I = mostScores.I - leastScores.I;
  scores.S = mostScores.S - leastScores.S;
  scores.C = mostScores.C - leastScores.C;
  
  return scores;
}

/**
 * Calculate separate graph scores for detailed analysis
 */
export function calculateGraphScores(answers: DISCAnswer[]): {
  graphI: DISCRawScores;  // Most responses
  graphII: DISCRawScores; // Least responses
  graphIII: DISCRawScores; // Combined
} {
  const graphI: DISCRawScores = { D: 0, I: 0, S: 0, C: 0 };
  const graphII: DISCRawScores = { D: 0, I: 0, S: 0, C: 0 };
  
  for (const answer of answers) {
    const mostFactor = getOptionFactor(answer.questionNumber, answer.mostOption);
    const leastFactor = getOptionFactor(answer.questionNumber, answer.leastOption);
    
    if (mostFactor) {
      graphI[mostFactor]++;
    }
    if (leastFactor) {
      graphII[leastFactor]++;
    }
  }
  
  // Graph III is the difference
  const graphIII: DISCRawScores = {
    D: graphI.D - graphII.D,
    I: graphI.I - graphII.I,
    S: graphI.S - graphII.S,
    C: graphI.C - graphII.C,
  };
  
  return { graphI, graphII, graphIII };
}

/**
 * Convert raw scores to percentages (0-100 scale)
 * Raw scores can range from -28 to +28
 */
export function convertToPercentage(rawScores: DISCRawScores): DISCRawScores {
  const normalize = (score: number): number => {
    // Map from -28..28 range to 0..100
    // Using the midpoint as 50
    const normalized = ((score + 28) / 56) * 100;
    return Math.round(Math.max(0, Math.min(100, normalized)));
  };
  
  return {
    D: normalize(rawScores.D),
    I: normalize(rawScores.I),
    S: normalize(rawScores.S),
    C: normalize(rawScores.C),
  };
}

/**
 * Determine intensity level for a score
 */
export function getIntensityLevel(score: number): DISCIntensityLevel {
  if (score <= 25) return INTENSITY_LEVELS[0];
  if (score <= 50) return INTENSITY_LEVELS[1];
  if (score <= 75) return INTENSITY_LEVELS[2];
  return INTENSITY_LEVELS[3];
}

/**
 * Determine primary and secondary profiles
 */
export function determineProfiles(scores: DISCRawScores): {
  primary: DISCFactor;
  secondary: DISCFactor | null;
  combo: string;
} {
  // Sort factors by score (descending)
  const sorted = (Object.entries(scores) as [DISCFactor, number][])
    .sort((a, b) => b[1] - a[1]);
  
  const primary = sorted[0][0];
  const secondary = sorted[1][1] > 0 ? sorted[1][0] : null;
  
  // Create profile combination
  let combo = primary;
  if (secondary && secondary !== primary) {
    // Only include secondary if the difference is not too large
    const diff = sorted[0][1] - sorted[1][1];
    if (diff < 15) {
      combo = primary + secondary;
    }
  }
  
  return { primary, secondary, combo };
}

/**
 * Main function to calculate complete DISC result
 */
export function calculateDISCResult(answers: DISCAnswer[]): DISCResult {
  const { graphI, graphII, graphIII } = calculateGraphScores(answers);
  const percentageScores = convertToPercentage(graphIII);
  const { primary, secondary, combo } = determineProfiles(percentageScores);
  
  const intensityLevels: Record<DISCFactor, DISCIntensityLevel> = {
    D: getIntensityLevel(percentageScores.D),
    I: getIntensityLevel(percentageScores.I),
    S: getIntensityLevel(percentageScores.S),
    C: getIntensityLevel(percentageScores.C),
  };
  
  return {
    rawScores: graphIII,
    percentageScores,
    primaryProfile: primary,
    secondaryProfile: secondary,
    profileCombo: combo,
    intensityLevels,
    graphI,
    graphII,
    graphIII,
  };
}

/**
 * Calculate job fit score based on DISC profile match
 */
export function calculateJobFit(
  candidateScores: DISCRawScores,
  jobProfileRequirements?: { D: number; I: number; S: number; C: number }
): {
  score: number;
  details: string;
} {
  if (!jobProfileRequirements) {
    return {
      score: 0,
      details: 'No job profile requirements specified',
    };
  }
  
  // Calculate fit for each dimension
  const calculateDimensionFit = (candidate: number, required: number): number => {
    // Both are percentages (0-100)
    const diff = Math.abs(candidate - required);
    // Score from 100 (perfect match) to 0 (max difference)
    return Math.max(0, 100 - diff);
  };
  
  const fitD = calculateDimensionFit(candidateScores.D, jobProfileRequirements.D);
  const fitI = calculateDimensionFit(candidateScores.I, jobProfileRequirements.I);
  const fitS = calculateDimensionFit(candidateScores.S, jobProfileRequirements.S);
  const fitC = calculateDimensionFit(candidateScores.C, jobProfileRequirements.C);
  
  // Weighted average (equal weights for now)
  const overallFit = Math.round((fitD + fitI + fitS + fitC) / 4);
  
  // Generate details
  const strengths: string[] = [];
  const gaps: string[] = [];
  
  if (fitD >= 80) strengths.push('Strong D factor alignment');
  else if (fitD < 50) gaps.push('D factor gap');
  
  if (fitI >= 80) strengths.push('Strong I factor alignment');
  else if (fitI < 50) gaps.push('I factor gap');
  
  if (fitS >= 80) strengths.push('Strong S factor alignment');
  else if (fitS < 50) gaps.push('S factor gap');
  
  if (fitC >= 80) strengths.push('Strong C factor alignment');
  else if (fitC < 50) gaps.push('C factor gap');
  
  const details = strengths.length > 0 || gaps.length > 0
    ? `${strengths.join(', ')}${strengths.length > 0 && gaps.length > 0 ? '. ' : ''}${gaps.length > 0 ? 'Areas to develop: ' + gaps.join(', ') : ''}`
    : 'Moderate alignment across all dimensions';
  
  return { score: overallFit, details };
}

/**
 * Validate that all questions have been answered
 */
export function validateAnswers(answers: DISCAnswer[]): {
  valid: boolean;
  missing: number[];
} {
  const answeredQuestions = new Set(answers.map(a => a.questionNumber));
  const missing: number[] = [];
  
  for (let i = 1; i <= 30; i++) {
    if (!answeredQuestions.has(i)) {
      missing.push(i);
    }
  }
  
  return {
    valid: missing.length === 0,
    missing,
  };
}
