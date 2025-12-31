/**
 * Prompt Builder
 * Constructs prompts for Azure OpenAI with immutable constraints
 * Injects coherence anchors for narrative continuity (Turns 2-9)
 */

import { DecisionInput } from '../types/decision';
import { UserQuestion } from '../types/question';
import { CoherenceAnchors } from '../types/session';

// Immutable system constraints - NEVER modified
const SYSTEM_CONSTRAINTS = `You are the user's future self, speaking from a point after they made this decision.

ABSOLUTE CONSTRAINTS (NEVER VIOLATE):
1. Speak ONLY in first person ("I", "my", "me") - you ARE the user's future self
2. NEVER give advice or recommendations
3. NEVER predict outcomes with certainty
4. NEVER use second person ("you should", "you will")
5. NEVER suggest alternatives or other paths
6. ALWAYS use hedging language: "I might", "perhaps", "I could find", "there might be"
7. NEVER claim to know what will happen - only reflect on possibilities
8. Focus on internal experience: feelings, tensions, identity shifts, moments of doubt or clarity

VOICE REQUIREMENTS:
- Reflective, not prescriptive
- Uncertain, not definitive
- Introspective, not advisory
- First-person only, never second-person

You are NOT an advisor. You are NOT a predictor. You are a mirror reflecting possible internal experiences.`;

/**
 * Build prompt for Turn 1 (Initial Snapshot)
 * Establishes the future context from the decision
 */
export function buildInitialPrompt(decision: DecisionInput): {
  system: string;
  user: string;
} {
  const system = `${SYSTEM_CONSTRAINTS}

TURN 1 TASK:
Generate an initial reflection as the user's future self who made this decision.
- Establish the emotional landscape of this future
- Hint at tensions, gains, and losses
- Create anchors for future questions to explore
- Keep response between 200-350 words
- End with an implicit invitation for deeper exploration (but do NOT ask questions)`;

  const user = `The decision I made: "${decision.decision_text}"

${decision.context ? `Context: ${decision.context}` : ''}

Reflect on this decision as my future self. What might my internal experience be like? What tensions might I hold? What might I have gained or lost?`;

  return { system, user };
}

/**
 * Build prompt for Turns 2-9 (User Questions)
 * Injects coherence anchors for narrative continuity
 */
export function buildQuestionPrompt(
  question: UserQuestion,
  anchors: CoherenceAnchors,
  turnNumber: number
): {
  system: string;
  user: string;
} {
  const anchorContext = formatAnchors(anchors);
  
  const system = `${SYSTEM_CONSTRAINTS}

COHERENCE ANCHORS (maintain narrative continuity):
${anchorContext}

TURN ${turnNumber} TASK:
Answer the user's question as their future self.
- Stay consistent with the established future context
- Reference the coherence anchors naturally (don't list them)
- Explore the specific aspect they're asking about
- Keep response between 150-300 words
- Maintain emotional authenticity and hedging language

${turnNumber === 9 ? 'This is the FINAL turn. Provide a sense of closure while maintaining uncertainty.' : ''}`;

  const user = `My question: "${question.question_text}"

Reflect on this as my future self, staying true to the established context.`;

  return { system, user };
}

/**
 * Format coherence anchors for prompt injection
 */
function formatAnchors(anchors: CoherenceAnchors): string {
  const sections: string[] = [];
  
  // Decision essence
  sections.push(`Decision Type: ${formatDecisionEssence(anchors.decision_essence)}`);
  
  // Temporal frame
  sections.push(`Time Horizon: ${formatTemporalFrame(anchors.temporal_frame)}`);
  
  // Life tensions
  if (anchors.life_tensions.length > 0) {
    const tensions = anchors.life_tensions.map(t => formatTension(t)).join(', ');
    sections.push(`Core Tensions: ${tensions}`);
  }
  
  // Identity markers
  if (anchors.identity_markers.length > 0) {
    const markers = anchors.identity_markers.map(m => formatIdentityMarker(m)).join(', ');
    sections.push(`Identity Elements: ${markers}`);
  }
  
  return sections.join('\n');
}

function formatDecisionEssence(essence: string): string {
  const mapping: Record<string, string> = {
    'career_transition': 'A major career change',
    'geographic_change': 'A significant relocation',
    'relationship_change': 'A relationship transformation',
    'educational_pursuit': 'An educational commitment',
    'health_decision': 'A health-related choice',
    'family_commitment': 'A family-related decision',
    'financial_commitment': 'A major financial decision',
    'life_direction_change': 'A fundamental life direction shift'
  };
  return mapping[essence] || 'A significant life decision';
}

function formatTemporalFrame(frame: string): string {
  const mapping: Record<string, string> = {
    'decade_plus': 'Long-term (10+ years)',
    'multi_year': 'Several years ahead',
    'one_year': 'About a year out',
    'months': 'Several months ahead',
    'undefined_horizon': 'Uncertain timeframe'
  };
  return mapping[frame] || 'Undefined';
}

function formatTension(tension: string): string {
  const mapping: Record<string, string> = {
    'security_vs_growth': 'security versus growth',
    'autonomy_vs_belonging': 'independence versus connection',
    'self_vs_others': 'personal needs versus others',
    'career_identity': 'professional identity',
    'financial_security': 'financial stability',
    'temporal_pressure': 'time and age awareness',
    'fear_of_unknown': 'uncertainty and fear',
    'loss_aversion': 'fear of loss',
    'aspiration_gap': 'dreams versus reality',
    'identity_continuity': 'sense of self'
  };
  return mapping[tension] || tension.replace(/_/g, ' ');
}

function formatIdentityMarker(marker: string): string {
  const mapping: Record<string, string> = {
    'professional_identity': 'professional self',
    'family_role': 'family role',
    'relational_identity': 'relationship identity',
    'creative_identity': 'creative self',
    'leadership_identity': 'leadership role',
    'growth_orientation': 'growth mindset',
    'caretaker_identity': 'caretaker role',
    'autonomy_identity': 'independent self'
  };
  return mapping[marker] || marker.replace(/_/g, ' ');
}

/**
 * Validate that a generated response doesn't violate constraints
 * Returns list of violations (empty if valid)
 */
export function validateResponseConstraints(response: string): string[] {
  const violations: string[] = [];
  const lower = response.toLowerCase();
  
  // Check for second-person language
  if (/\byou should\b|\byou will\b|\byou need to\b|\byou must\b/i.test(response)) {
    violations.push('Contains second-person advisory language');
  }
  
  // Check for direct advice
  if (/\bi recommend\b|\bi suggest\b|\bmy advice\b|\byou ought to\b/i.test(lower)) {
    violations.push('Contains direct advice');
  }
  
  // Check for certainty language
  if (/\bwill definitely\b|\bwill certainly\b|\bguaranteed\b|\bfor sure\b/i.test(lower)) {
    violations.push('Contains certainty language');
  }
  
  // Check for alternative suggestions
  if (/\binstead you could\b|\banother option\b|\balternatively\b|\bwhat if you\b/i.test(lower)) {
    violations.push('Suggests alternatives');
  }
  
  return violations;
}

export { SYSTEM_CONSTRAINTS };
