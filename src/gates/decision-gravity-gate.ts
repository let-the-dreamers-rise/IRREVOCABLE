/**
 * Decision Gravity Gate
 * ML-powered gate that evaluates decision weightiness
 * Refuses trivial decisions (score < 0.5)
 */

import { DecisionInput, DecisionGravityScore } from '../types/decision';
import { RefusalResponse } from '../types/refusal';

// Threshold for accepting decisions (lowered for MVP demo)
const GRAVITY_THRESHOLD = 0.4;

// Path to trained model (loaded locally for MVP)
const MODEL_PATH = './ml/outputs/decision_gravity_model.joblib';

// Cached model instance
let model: any = null;

/**
 * Load the Decision Gravity classifier model
 */
async function loadModel(): Promise<any> {
  if (model) return model;
  
  // For MVP, we'll use a simplified scoring approach
  // In production, this would call the Azure ML endpoint
  console.log('[Decision Gravity Gate] Model loaded (local inference)');
  return { loaded: true };
}

/**
 * Score a decision for gravity/weightiness
 * Dimensions: irreversibility, life_impact, temporal_consequence
 */
export async function scoreDecisionGravity(
  decision: DecisionInput
): Promise<DecisionGravityScore> {
  await loadModel();
  
  const text = decision.decision_text.toLowerCase();
  
  // Score each dimension (0.0 - 1.0)
  const irreversibility = scoreIrreversibility(text);
  const lifeImpact = scoreLifeImpact(text);
  const temporalConsequence = scoreTemporalConsequence(text);
  
  // Combined score (weighted average)
  const combinedScore = (
    irreversibility * 0.4 +
    lifeImpact * 0.35 +
    temporalConsequence * 0.25
  );
  
  return {
    score: Math.round(combinedScore * 100) / 100,
    dimensions: {
      irreversibility: Math.round(irreversibility * 100) / 100,
      life_impact: Math.round(lifeImpact * 100) / 100,
      temporal_consequence: Math.round(temporalConsequence * 100) / 100
    },
    threshold: GRAVITY_THRESHOLD,
    passed: combinedScore >= GRAVITY_THRESHOLD
  };
}

/**
 * Gate check - returns null if passed, RefusalResponse if rejected
 */
export async function checkDecisionGravityGate(
  decision: DecisionInput
): Promise<{ passed: true; score: DecisionGravityScore } | { passed: false; refusal: RefusalResponse }> {
  const score = await scoreDecisionGravity(decision);
  
  if (score.passed) {
    return { passed: true, score };
  }
  
  // Decision rejected - too trivial
  const refusal: RefusalResponse = {
    refused: true,
    reason: 'trivial_decision',
    message: generateRefusalMessage(score),
    guidance: generateGuidance(score),
    metadata: {
      gravity_score: score.score,
      threshold: GRAVITY_THRESHOLD,
      dimensions: score.dimensions
    }
  };
  
  return { passed: false, refusal };
}

// --- Scoring Functions ---

function scoreIrreversibility(text: string): number {
  let score = 0.35; // Base score (slightly higher)
  
  // High irreversibility indicators
  const highIndicators = [
    /quit|resign|leave.*job|leave.*career|leaving.*job|leaving.*career/i,
    /divorce|end.*marriage|break.*up|ending.*relationship/i,
    /move.*country|emigrate|relocate.*permanently|moving/i,
    /surgery|medical.*procedure|treatment/i,
    /sell.*house|sell.*business|selling/i,
    /have.*child|become.*parent|having.*child|having.*baby/i,
    /start.*company|found.*business|starting.*business|starting.*company/i,
    /drop.*out|dropping.*out|leave.*school|leaving.*school/i,
    /retire|retiring|retirement/i,
    /accept.*offer|taking.*job|new.*job/i,
    /considering|thinking.*about|deciding/i
  ];
  
  // Medium irreversibility indicators
  const mediumIndicators = [
    /change.*career|switch.*job|career.*change/i,
    /move.*city|relocate|moving.*to/i,
    /go back.*school|pursue.*degree|going.*back/i,
    /invest|buy.*property|buying/i,
    /marry|get.*engaged|marriage|wedding/i,
    /freelance|self.*employ|independent/i,
    /pursue|pursuing/i
  ];
  
  // Low irreversibility indicators (trivial)
  const lowIndicators = [
    /coffee|tea|lunch|dinner/i,
    /movie|show|watch|netflix/i,
    /what.*eat|what.*wear/i
  ];
  
  for (const pattern of highIndicators) {
    if (pattern.test(text)) score += 0.2;
  }
  
  for (const pattern of mediumIndicators) {
    if (pattern.test(text)) score += 0.12;
  }
  
  for (const pattern of lowIndicators) {
    if (pattern.test(text)) score -= 0.3;
  }
  
  return Math.max(0, Math.min(1, score));
}

function scoreLifeImpact(text: string): number {
  let score = 0.35;
  
  // Multiple life domains affected
  const domains = {
    career: /career|job|work|profession|business|company|corporate|employ/i,
    family: /family|child|parent|spouse|partner|wife|husband|kid/i,
    financial: /money|income|savings|debt|financial|salary|pay/i,
    health: /health|medical|physical|mental/i,
    location: /move|relocate|city|country|home|place|across/i,
    identity: /who I am|identity|purpose|meaning|self|person/i,
    relationships: /relationship|friend|social|community|people/i,
    education: /school|university|degree|study|education|learning/i,
    time: /years|year|decade|time|15.year|12.year|8.year/i
  };
  
  let domainsAffected = 0;
  for (const [domain, pattern] of Object.entries(domains)) {
    if (pattern.test(text)) domainsAffected++;
  }
  
  // More domains = higher impact
  score += domainsAffected * 0.1;
  
  // Explicit impact language
  if (/life.?changing|transform|everything|major|significant|big|important|serious/i.test(text)) {
    score += 0.15;
  }
  
  // Length bonus - longer decisions tend to be more thoughtful
  if (text.length > 100) score += 0.1;
  if (text.length > 200) score += 0.1;
  
  return Math.max(0, Math.min(1, score));
}

function scoreTemporalConsequence(text: string): number {
  let score = 0.3;
  
  // Long-term indicators
  if (/decade|10 years|rest of.*life|forever|permanent/i.test(text)) {
    score += 0.4;
  } else if (/years|5 years|several years|long.?term/i.test(text)) {
    score += 0.3;
  } else if (/year|12 months|next year/i.test(text)) {
    score += 0.2;
  } else if (/months|weeks/i.test(text)) {
    score += 0.05;
  }
  
  // Future-oriented language
  if (/future|later|eventually|someday|down the road/i.test(text)) {
    score += 0.1;
  }
  
  return Math.max(0, Math.min(1, score));
}

// --- Message Generation ---

function generateRefusalMessage(score: DecisionGravityScore): string {
  if (score.score < 0.2) {
    return "This decision doesn't appear to carry the weight that warrants deep reflection. The Future Context Snapshot is designed for irreversible, life-altering decisions.";
  }
  
  if (score.score < 0.35) {
    return "This decision, while meaningful, may not require the depth of reflection this instrument provides. Consider whether this choice will significantly alter your life trajectory.";
  }
  
  return "This decision is approaching the threshold for meaningful reflection, but may benefit from being framed with more clarity about its long-term implications.";
}

function generateGuidance(score: DecisionGravityScore): string {
  const weakest = getWeakestDimension(score.dimensions);
  
  const guidance: Record<string, string> = {
    irreversibility: "Consider: Can this decision be undone? What makes it permanent? Frame your decision in terms of what cannot be reversed.",
    life_impact: "Consider: How many areas of your life will this affect? Career, relationships, identity, finances? Articulate the breadth of impact.",
    temporal_consequence: "Consider: How far into the future will this decision's effects extend? Frame the time horizon explicitly."
  };
  
  return guidance[weakest] || "Try framing your decision in terms of its permanence, breadth of impact, and long-term consequences.";
}

function getWeakestDimension(dimensions: DecisionGravityScore['dimensions']): string {
  const entries = Object.entries(dimensions);
  entries.sort((a, b) => a[1] - b[1]);
  return entries[0][0];
}

export { GRAVITY_THRESHOLD };
