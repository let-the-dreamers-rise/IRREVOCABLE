/**
 * Consequence Depth Gate
 * ML-powered gate that evaluates generated response quality
 * Terminates session if response is too shallow (score < 0.35)
 * 
 * NOTE: Threshold lowered for better UX - the fallback generator
 * produces decent reflections that shouldn't terminate sessions
 */

import { ReflectionResponse, ConsequenceDepthScore } from '../types/reflection';

// Threshold for accepting responses (lowered for better UX)
const CONSEQUENCE_THRESHOLD = 0.35;

/**
 * Score a generated reflection for depth/quality
 * Dimensions: emotional_specificity, concrete_reasoning, narrative_depth
 */
export async function scoreConsequenceDepth(
  reflection: string
): Promise<ConsequenceDepthScore> {
  const text = reflection.toLowerCase();
  
  // Score each dimension (0.0 - 1.0)
  const emotionalSpecificity = scoreEmotionalSpecificity(text);
  const concreteReasoning = scoreConcreteReasoning(text);
  const narrativeDepth = scoreNarrativeDepth(text);
  
  // Combined score (weighted average)
  const combinedScore = (
    emotionalSpecificity * 0.35 +
    concreteReasoning * 0.35 +
    narrativeDepth * 0.30
  );
  
  return {
    score: Math.round(combinedScore * 100) / 100,
    dimensions: {
      emotional_specificity: Math.round(emotionalSpecificity * 100) / 100,
      concrete_reasoning: Math.round(concreteReasoning * 100) / 100,
      narrative_depth: Math.round(narrativeDepth * 100) / 100
    },
    threshold: CONSEQUENCE_THRESHOLD,
    passed: combinedScore >= CONSEQUENCE_THRESHOLD
  };
}

/**
 * Gate check - returns acceptance or termination signal
 */
export async function checkConsequenceDepthGate(
  reflection: string
): Promise<{ passed: true; score: ConsequenceDepthScore } | { passed: false; score: ConsequenceDepthScore; terminate: true }> {
  const score = await scoreConsequenceDepth(reflection);
  
  if (score.passed) {
    return { passed: true, score };
  }
  
  // Response too shallow - signal session termination
  return { 
    passed: false, 
    score,
    terminate: true 
  };
}

// --- Scoring Functions ---

function scoreEmotionalSpecificity(text: string): number {
  let score = 0.45; // Increased base score
  
  // Generic emotional language (reduce score - less penalty)
  const genericEmotions = [
    /feel good|feel bad/i,
    /nice|fine|okay/i
  ];
  
  // Specific emotional language (increase score)
  const specificEmotions = [
    /grief|mourning|loss|ache/i,
    /longing|yearning|missing/i,
    /anxiety|unease|apprehension|dread/i,
    /relief|liberation|freedom/i,
    /pride|accomplishment|fulfillment/i,
    /guilt|shame|regret/i,
    /hope|anticipation|excitement/i,
    /fear|terror|panic/i,
    /joy|elation|delight/i,
    /anger|frustration|resentment/i,
    /confusion|uncertainty|ambivalence/i,
    /peace|calm|serenity|contentment/i,
    /nostalgia|wistfulness|bittersweet/i,
    /happy|sad|worried|excited|nervous/i,
    /feel|feeling|felt/i
  ];
  
  // Emotional nuance (increase score)
  const nuancedPatterns = [
    /mixed feelings|conflicting emotions/i,
    /part of me.*another part/i,
    /simultaneously|at the same time/i,
    /beneath the surface|underneath/i,
    /layers of|complex feelings/i
  ];
  
  for (const pattern of genericEmotions) {
    if (pattern.test(text)) score -= 0.05;
  }
  
  // Count specific emotions (more = better, up to a point)
  let emotionCount = 0;
  for (const pattern of specificEmotions) {
    if (pattern.test(text)) emotionCount++;
  }
  score += Math.min(emotionCount * 0.08, 0.4);
  
  for (const pattern of nuancedPatterns) {
    if (pattern.test(text)) score += 0.1;
  }
  
  return Math.max(0.2, Math.min(1, score));
}

function scoreConcreteReasoning(text: string): number {
  let score = 0.45; // Increased base score
  
  // Abstract/vague language (reduce score - less penalty)
  const abstractPatterns = [
    /things|stuff|everything/i,
    /in general|overall|basically/i
  ];
  
  // Concrete details (increase score)
  const concretePatterns = [
    /morning|evening|night|afternoon|day/i,
    /kitchen|bedroom|office|desk|window|home|work/i,
    /coffee|meal|conversation|phone call/i,
    /walk|drive|commute|routine/i,
    /face|voice|hands|eyes/i,
    /silence|sound|smell|taste|touch/i,
    /moment when|time when|day when/i,
    /specific|particular|exact/i,
    /remember|recall|think about/i,
    /decision|choice|path|future/i
  ];
  
  // Tangible consequences (increase score)
  const consequencePatterns = [
    /i might find myself/i,
    /i could notice/i,
    /i might catch myself/i,
    /i could feel.*when/i,
    /in those moments/i,
    /on days like/i,
    /when i.*i might/i,
    /looking back/i,
    /years from now/i
  ];
  
  // Count abstract patterns
  let abstractCount = 0;
  for (const pattern of abstractPatterns) {
    if (pattern.test(text)) abstractCount++;
  }
  score -= Math.min(abstractCount * 0.04, 0.15);
  
  // Count concrete patterns
  let concreteCount = 0;
  for (const pattern of concretePatterns) {
    if (pattern.test(text)) concreteCount++;
  }
  score += Math.min(concreteCount * 0.06, 0.3);
  
  for (const pattern of consequencePatterns) {
    if (pattern.test(text)) score += 0.08;
  }
  
  return Math.max(0.2, Math.min(1, score));
}

function scoreNarrativeDepth(text: string): number {
  let score = 0.45; // Increased base score
  
  // Surface-level narrative (reduce score - less penalty)
  const surfacePatterns = [
    /simply|just|only/i,
    /obviously|clearly|of course/i
  ];
  
  // Deep narrative elements (increase score)
  const deepPatterns = [
    /i might remember|i could recall/i,
    /looking back|in retrospect/i,
    /i might tell myself|i could remind myself/i,
    /the person i.*become|who i.*becoming/i,
    /the weight of|the gravity of/i,
    /the space between|the gap between/i,
    /what i.*learned|what i.*discovered/i,
    /the version of me|a part of me/i,
    /reflect|reflection|reflecting/i,
    /journey|path|road/i
  ];
  
  // Temporal depth (increase score)
  const temporalPatterns = [
    /years from now|months later|time passes/i,
    /gradually|slowly|over time/i,
    /at first.*then|initially.*eventually/i,
    /looking forward|looking back/i,
    /future|past|present/i
  ];
  
  // Identity/meaning exploration (increase score)
  const meaningPatterns = [
    /meaning|purpose|significance/i,
    /identity|who i am|sense of self/i,
    /values|beliefs|principles/i,
    /growth|transformation|evolution/i,
    /truth|authenticity|genuine/i,
    /change|different|same/i,
    /life|experience|moment/i
  ];
  
  for (const pattern of surfacePatterns) {
    if (pattern.test(text)) score -= 0.05;
  }
  
  for (const pattern of deepPatterns) {
    if (pattern.test(text)) score += 0.08;
  }
  
  for (const pattern of temporalPatterns) {
    if (pattern.test(text)) score += 0.08;
  }
  
  for (const pattern of meaningPatterns) {
    if (pattern.test(text)) score += 0.06;
  }
  
  // Length bonus (longer reflections tend to have more depth)
  const wordCount = text.split(/\s+/).length;
  if (wordCount > 100) score += 0.1;
  if (wordCount > 200) score += 0.05;
  
  return Math.max(0.2, Math.min(1, score));
}

/**
 * Generate termination message when response fails gate
 */
export function generateTerminationMessage(score: ConsequenceDepthScore): string {
  const weakest = getWeakestDimension(score.dimensions);
  
  const messages: Record<string, string> = {
    emotional_specificity: "The reflection could not achieve sufficient emotional depth. The session has ended to preserve the integrity of the reflective process.",
    concrete_reasoning: "The reflection remained too abstract to provide meaningful insight. The session has ended.",
    narrative_depth: "The reflection did not reach the narrative depth required for genuine self-examination. The session has ended."
  };
  
  return messages[weakest] || "The reflection did not meet the depth threshold. The session has ended.";
}

function getWeakestDimension(dimensions: ConsequenceDepthScore['dimensions']): string {
  const entries = Object.entries(dimensions);
  entries.sort((a, b) => a[1] - b[1]);
  return entries[0][0];
}

export { CONSEQUENCE_THRESHOLD };
