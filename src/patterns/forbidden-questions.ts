/**
 * Forbidden Question Patterns
 * Patterns that indicate shallow, advice-seeking, or predictive questions
 * These are used by the Question Depth gate to reject low-quality questions
 */

export const FORBIDDEN_QUESTION_PATTERNS = {
  /**
   * Advice-seeking patterns - user is asking for recommendations
   * Made less strict - only block explicit advice requests
   */
  adviceSeeking: [
    /\b(what do you think I should|what would you recommend)\b/i,
    /\b(give me advice|tell me what to do)\b/i
  ],

  /**
   * Predictive patterns - user is asking for predictions
   * Made less strict - allow "will I feel" type questions
   */
  predictive: [
    /\b(predict|forecast|foresee)\b/i,
    /\b(guarantee|certain|definitely will)\b/i
  ],

  /**
   * Leading patterns - user is seeking validation
   */
  leading: [
    /\b(won't I|won't this|isn't it true)\b/i,
    /\b(don't you think|wouldn't you agree)\b/i,
    /\b(obviously|clearly|of course) I/i
  ],

  /**
   * Binary patterns - oversimplified yes/no questions
   * Made less strict
   */
  binary: [
    /^(yes or no|true or false)\b/i
  ],

  /**
   * Comparison patterns - asking about alternative futures (forbidden)
   * Made less strict
   */
  comparison: [
    /\b(what if I had chosen|what if I didn't choose)\b/i,
    /\b(the other option|the alternative path)\b/i
  ]
} as const;

export type ForbiddenQuestionCategory = keyof typeof FORBIDDEN_QUESTION_PATTERNS;


/**
 * Guidance messages for rejected questions
 * Help users understand how to ask better questions
 */
export const QUESTION_REJECTION_GUIDANCE: Record<ForbiddenQuestionCategory, string> = {
  adviceSeeking: 
    'This question seeks advice. Instead, ask about your future self\'s internal experience. Try: "What might I find myself thinking about?" or "How might my perspective have shifted?"',
  predictive: 
    'This question asks for predictions. The system reflects on one possible future, not certainties. Try: "What might I notice about my daily life?" or "What feelings might surface?"',
  leading: 
    'This question seems to seek validation. Ask open questions about your future self\'s experience. Try: "What tensions might I still carry?" or "What might I have learned about myself?"',
  binary: 
    'This question is too simple. Explore specific dimensions of your future experience. Try: "What might I miss most?" or "How might my relationships have changed?"',
  comparison: 
    'This system explores ONE future, not alternatives. Ask about this future specifically. Try: "What might I have discovered about this path?" or "What unexpected aspects might I notice?"'
};

/**
 * Check if question contains forbidden patterns
 * @returns Object with rejection status and guidance
 */
export function checkForbiddenQuestionPatterns(question: string): {
  isRejected: boolean;
  category?: ForbiddenQuestionCategory;
  guidance?: string;
} {
  const categories: ForbiddenQuestionCategory[] = [
    'adviceSeeking',
    'predictive',
    'leading',
    'binary',
    'comparison'
  ];

  for (const category of categories) {
    for (const pattern of FORBIDDEN_QUESTION_PATTERNS[category]) {
      if (pattern.test(question)) {
        return {
          isRejected: true,
          category,
          guidance: QUESTION_REJECTION_GUIDANCE[category]
        };
      }
    }
  }

  return {
    isRejected: false
  };
}

/**
 * Examples of good questions (for UI hints)
 */
export const GOOD_QUESTION_EXAMPLES = [
  'What might I find myself thinking about in quiet moments?',
  'How might my sense of identity have shifted?',
  'What tensions might I still carry from this decision?',
  'What might I have discovered about what matters to me?',
  'How might my daily routines reflect this choice?',
  'What might I miss that I didn\'t expect to miss?',
  'What might I have learned about my own resilience?',
  'How might my relationships have been affected?'
];
