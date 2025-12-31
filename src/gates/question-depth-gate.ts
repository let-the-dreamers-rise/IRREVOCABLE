/**
 * Question Depth Gate
 * ML-powered gate that evaluates question quality
 * Rejects shallow questions (score < 0.6) with specific guidance
 */

import { UserQuestion, QuestionDepthScore, QuestionRejection } from '../types/question';

// Threshold for accepting questions (lowered for better UX)
const DEPTH_THRESHOLD = 0.4;

/**
 * Score a question for depth/quality
 * Dimensions: specificity, introspective_depth, non_leading
 */
export async function scoreQuestionDepth(
  question: UserQuestion
): Promise<QuestionDepthScore> {
  const text = question.question_text.toLowerCase();
  
  // Score each dimension (0.0 - 1.0)
  const specificity = scoreSpecificity(text);
  const introspectiveDepth = scoreIntrospectiveDepth(text);
  const nonLeading = scoreNonLeading(text);
  
  // Combined score (weighted average)
  const combinedScore = (
    specificity * 0.35 +
    introspectiveDepth * 0.4 +
    nonLeading * 0.25
  );
  
  return {
    score: Math.round(combinedScore * 100) / 100,
    dimensions: {
      specificity: Math.round(specificity * 100) / 100,
      introspective_depth: Math.round(introspectiveDepth * 100) / 100,
      non_leading: Math.round(nonLeading * 100) / 100
    },
    threshold: DEPTH_THRESHOLD,
    passed: combinedScore >= DEPTH_THRESHOLD
  };
}

/**
 * Gate check - returns acceptance or rejection with guidance
 */
export async function checkQuestionDepthGate(
  question: UserQuestion
): Promise<{ passed: true; score: QuestionDepthScore } | { passed: false; rejection: QuestionRejection }> {
  const score = await scoreQuestionDepth(question);
  
  if (score.passed) {
    return { passed: true, score };
  }
  
  // Question rejected - determine reason and provide guidance
  const rejectionType = determineRejectionType(question.question_text, score);
  
  const rejection: QuestionRejection = {
    rejected: true,
    reason: rejectionType.reason,
    message: rejectionType.message,
    guidance: rejectionType.guidance,
    example_reframe: rejectionType.example,
    depth_score: score.score,
    threshold: DEPTH_THRESHOLD
  };
  
  return { passed: false, rejection };
}

// --- Scoring Functions ---

function scoreSpecificity(text: string): number {
  let score = 0.5; // Base score (increased)
  
  // Vague/generic indicators (reduce score - less penalty)
  const vaguePatterns = [
    /^will i be/i,
    /^am i going to be/i,
    /^what will happen/i,
    /everything|anything/i,
    /in general|overall|basically/i
  ];
  
  // Specific indicators (increase score)
  const specificPatterns = [
    /what might i feel/i,
    /how might i experience/i,
    /what could i miss/i,
    /what tension might i feel/i,
    /what part of me/i,
    /in moments when/i,
    /on days when/i,
    /when i think about/i,
    /how do i/i,
    /what do i/i,
    /how will i/i,
    /what will i/i
  ];
  
  // Concrete details
  const concretePatterns = [
    /morning|evening|night|day/i,
    /work|home|office|family|career|job/i,
    /specific|particular|certain/i,
    /first|initial|early|later/i,
    /feel|think|experience|remember/i,
    /decision|choice|path|future/i
  ];
  
  for (const pattern of vaguePatterns) {
    if (pattern.test(text)) score -= 0.08;
  }
  
  for (const pattern of specificPatterns) {
    if (pattern.test(text)) score += 0.15;
  }
  
  for (const pattern of concretePatterns) {
    if (pattern.test(text)) score += 0.1;
  }
  
  return Math.max(0.2, Math.min(1, score));
}

function scoreIntrospectiveDepth(text: string): number {
  let score = 0.5; // Increased base score
  
  // Surface-level questions (reduce score - less penalty)
  const surfacePatterns = [
    /should i|do you think/i
  ];
  
  // Introspective indicators (increase score)
  const introspectivePatterns = [
    /what might i feel/i,
    /how might i experience/i,
    /what part of me/i,
    /what tension/i,
    /what conflict/i,
    /what might i miss/i,
    /what might i gain/i,
    /what might i lose/i,
    /how might i see myself/i,
    /what might i tell myself/i,
    /what might i remember/i,
    /what might i regret/i,
    /what might i appreciate/i,
    /how do i feel/i,
    /what do i think/i,
    /how will i feel/i,
    /what will i think/i,
    /how will i cope/i,
    /what will i remember/i,
    /how will i look back/i
  ];
  
  // Deep emotional probing
  const deepPatterns = [
    /grief|loss|mourning/i,
    /identity|who i am|sense of self/i,
    /meaning|purpose|fulfillment/i,
    /fear|anxiety|worry/i,
    /hope|aspiration|dream/i,
    /relationship/i,
    /regret|proud|grateful/i,
    /happy|sad|content|peace/i,
    /miss|remember|forget/i,
    /change|different|same/i
  ];
  
  for (const pattern of surfacePatterns) {
    if (pattern.test(text)) score -= 0.08;
  }
  
  for (const pattern of introspectivePatterns) {
    if (pattern.test(text)) score += 0.15;
  }
  
  for (const pattern of deepPatterns) {
    if (pattern.test(text)) score += 0.1;
  }
  
  return Math.max(0.2, Math.min(1, score));
}

function scoreNonLeading(text: string): number {
  let score = 0.8; // Start high, reduce for leading patterns
  
  // Advice-seeking patterns (penalize but less harshly)
  const advicePatterns = [
    /do you think i should/i,
    /what would you recommend/i,
    /what would you suggest/i
  ];
  
  // Predictive patterns (penalize but less harshly)
  const predictivePatterns = [
    /will i succeed/i,
    /will it work out/i,
    /what will happen/i,
    /is it going to/i
  ];
  
  // Leading patterns (penalize)
  const leadingPatterns = [
    /won't i be/i,
    /isn't it true/i,
    /don't you think/i,
    /wouldn't it be better/i,
    /isn't this the right/i
  ];
  
  // Comparison/alternative seeking (penalize less)
  const comparisonPatterns = [
    /which is better/i,
    /or should i/i
  ];
  
  for (const pattern of advicePatterns) {
    if (pattern.test(text)) score -= 0.2;
  }
  
  for (const pattern of predictivePatterns) {
    if (pattern.test(text)) score -= 0.15;
  }
  
  for (const pattern of leadingPatterns) {
    if (pattern.test(text)) score -= 0.2;
  }
  
  for (const pattern of comparisonPatterns) {
    if (pattern.test(text)) score -= 0.1;
  }
  
  return Math.max(0.2, Math.min(1, score));
}

// --- Rejection Type Determination ---

interface RejectionInfo {
  reason: QuestionRejection['reason'];
  message: string;
  guidance: string;
  example: string;
}

function determineRejectionType(text: string, score: QuestionDepthScore): RejectionInfo {
  const lower = text.toLowerCase();
  
  // Check for advice-seeking
  if (/should i|what should|recommend|suggest|good idea/i.test(lower)) {
    return {
      reason: 'advice_seeking',
      message: "This question seeks advice or recommendation. The Future Context Snapshot doesn't advise — it reflects.",
      guidance: "Reframe your question to explore your internal experience rather than seeking external guidance.",
      example: transformToIntrospective(text, 'advice')
    };
  }
  
  // Check for predictive
  if (/will i be|will it|what will happen|am i going to|is it going to/i.test(lower)) {
    return {
      reason: 'predictive',
      message: "This question asks for prediction. The future self cannot predict — only reflect on possibilities.",
      guidance: "Reframe your question to explore what you might feel or experience, not what will happen.",
      example: transformToIntrospective(text, 'predictive')
    };
  }
  
  // Check for leading
  if (/won't i|isn't it|don't you think|wouldn't it/i.test(lower)) {
    return {
      reason: 'leading',
      message: "This question contains an embedded assumption. Open questions yield deeper reflection.",
      guidance: "Remove the assumption and ask openly about your experience.",
      example: transformToIntrospective(text, 'leading')
    };
  }
  
  // Check for too generic
  if (score.dimensions.specificity < 0.4) {
    return {
      reason: 'too_generic',
      message: "This question is too broad to generate meaningful reflection.",
      guidance: "Add specificity: When? In what context? What aspect of your experience?",
      example: transformToIntrospective(text, 'generic')
    };
  }
  
  // Default: lacks introspective depth
  return {
    reason: 'lacks_depth',
    message: "This question doesn't probe deeply enough into your internal experience.",
    guidance: "Ask about feelings, tensions, identity shifts, or specific moments of experience.",
    example: transformToIntrospective(text, 'shallow')
  };
}

function transformToIntrospective(original: string, type: string): string {
  // Provide example reframes based on rejection type
  const examples: Record<string, string[]> = {
    advice: [
      "What tension might I feel when facing this choice?",
      "What part of me might resist this change?",
      "What might I tell myself in moments of doubt?"
    ],
    predictive: [
      "What might I feel in the quiet moments after this decision?",
      "How might I experience the first days of this new reality?",
      "What might I miss most about what I'm leaving behind?"
    ],
    leading: [
      "What conflicting feelings might I hold about this?",
      "What might I discover about myself through this experience?",
      "What unexpected emotions might surface?"
    ],
    generic: [
      "What might I feel on a typical morning in this new life?",
      "What specific aspect of my identity might shift?",
      "In what moments might I question this choice?"
    ],
    shallow: [
      "What might I grieve about the path not taken?",
      "How might my sense of self evolve through this transition?",
      "What might I learn about my deepest values?"
    ]
  };
  
  const options = examples[type] || examples.shallow;
  return options[Math.floor(Math.random() * options.length)];
}

export { DEPTH_THRESHOLD };
