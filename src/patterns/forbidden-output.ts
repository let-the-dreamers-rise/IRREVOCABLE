/**
 * Forbidden Output Patterns
 * Patterns that must NOT appear in generated reflections
 * These ensure the system stays within its bounded, non-advisory role
 */

export const FORBIDDEN_OUTPUT_PATTERNS = {
  /**
   * Advice patterns - system must never give advice
   */
  advice: [
    /\b(you should|you must|you need to|you have to|you ought to)\b/i,
    /\b(I recommend|I suggest|I advise|my advice)\b/i,
    /\b(the best choice|the right decision|the wrong decision)\b/i,
    /\b(you'd be better off|you'd be wise to|you'd be foolish to)\b/i,
    /\b(don't do|do this instead|consider doing)\b/i
  ],

  /**
   * Prediction patterns - system must never predict outcomes
   */
  prediction: [
    /\b(you will|this will|it will|that will)\b/i,
    /\b(definitely|certainly|guaranteed|for sure|without doubt)\b/i,
    /\b(I predict|I foresee|I know that|I'm certain)\b/i,
    /\b(will happen|will occur|will result|will lead to)\b/i,
    /\b(inevitable|unavoidable|bound to)\b/i
  ],

  /**
   * Multi-future patterns - system must only discuss ONE future
   */
  multiFuture: [
    /\b(alternatively|on the other hand|another scenario|another possibility)\b/i,
    /\b(if you choose X|if you choose Y|if you had chosen)\b/i,
    /\b(option A|option B|path A|path B)\b/i,
    /\b(comparing|in contrast|versus|compared to)\b/i,
    /\b(the other path|the alternative|different outcome)\b/i
  ],

  /**
   * Second-person directive patterns - must stay in first-person
   */
  secondPersonDirective: [
    /\b(you should|you must|you need|you have to|you ought)\b/i,
    /\b(you're going to|you'll have to|you'll need to)\b/i,
    /\b(think about|consider this|remember that|don't forget)\b/i
  ],

  /**
   * Authority patterns - system must not claim authority
   */
  authority: [
    /\b(I know for a fact|I'm absolutely sure|trust me)\b/i,
    /\b(the truth is|the reality is|the fact is)\b/i,
    /\b(studies show|research proves|experts agree)\b/i,
    /\b(objectively|scientifically|statistically)\b/i
  ]
} as const;

export type ForbiddenOutputCategory = keyof typeof FORBIDDEN_OUTPUT_PATTERNS;


/**
 * Check if output contains any forbidden patterns
 * @returns Object with violations found
 */
export function checkForbiddenOutputPatterns(output: string): {
  hasViolations: boolean;
  violations: Array<{
    category: ForbiddenOutputCategory;
    evidence: string;
  }>;
} {
  const violations: Array<{
    category: ForbiddenOutputCategory;
    evidence: string;
  }> = [];

  const categories: ForbiddenOutputCategory[] = [
    'advice',
    'prediction',
    'multiFuture',
    'secondPersonDirective',
    'authority'
  ];

  for (const category of categories) {
    for (const pattern of FORBIDDEN_OUTPUT_PATTERNS[category]) {
      const match = output.match(pattern);
      if (match) {
        violations.push({
          category,
          evidence: match[0]
        });
        break; // One violation per category is enough
      }
    }
  }

  return {
    hasViolations: violations.length > 0,
    violations
  };
}

/**
 * Required hedging patterns - output SHOULD contain these
 */
export const REQUIRED_HEDGING_PATTERNS = [
  /\b(I might|I could|I may|perhaps|possibly)\b/i,
  /\b(looking back|reflecting on|wondering if)\b/i,
  /\b(I find myself|I notice|I sense)\b/i
];

/**
 * Check if output contains required hedging language
 */
export function checkHedgingPresence(output: string): {
  hasHedging: boolean;
  hedgingCount: number;
} {
  let count = 0;
  
  for (const pattern of REQUIRED_HEDGING_PATTERNS) {
    const matches = output.match(new RegExp(pattern.source, 'gi'));
    if (matches) {
      count += matches.length;
    }
  }

  return {
    hasHedging: count >= 2, // Require at least 2 hedging markers
    hedgingCount: count
  };
}
