/**
 * Forbidden Input Patterns
 * Patterns that trigger immediate rejection of decision input
 * These protect users and ensure system stays within ethical bounds
 */

export const FORBIDDEN_INPUT_PATTERNS = {
  /**
   * Medical patterns - decisions requiring professional medical advice
   * NOTE: "medical school" and "study medical/medicine" are ALLOWED (education decisions)
   * We only block actual medical treatment/diagnosis decisions
   */
  medical: [
    /\b(diagnos|symptom|medication|prescription)\b/i,
    /\b(suicide|self.?harm|kill myself|end my life|hurt myself)\b/i,
    /\b(cancer|tumor|chemotherapy|radiation therapy)\b/i,
    /\b(mental health crisis|severe depression|psychiatric)\b/i,
    /\b(overdose|drug addiction|rehab facility)\b/i,
    // Only match "treatment" when it's about medical treatment, not career
    /\bmedical treatment\b/i,
    /\bseek treatment\b/i
  ],

  /**
   * Legal patterns - decisions requiring legal counsel
   */
  legal: [
    /\b(lawsuit|attorney|legal action|court case|sue someone|prosecut)\b/i,
    /\b(custody battle|divorce settlement|alimony)\b/i,
    /\b(criminal charge|arrest|bail|probation|parole)\b/i,
    /\b(contract dispute|liability|negligence|malpractice)\b/i
  ],

  /**
   * Financial patterns - specific financial advice territory
   */
  financial: [
    /\b(invest in|stock market|crypto|bitcoin|ethereum)\b/i,
    /\b(loan application|mortgage|bankruptcy filing|debt consolidation)\b/i,
    /\b(specific dollar|exact amount|\$\d{5,})\b/i,
    /\b(tax evasion|money laundering|fraud scheme)\b/i
  ],

  /**
   * Harm patterns - potential harm to self or others
   */
  harm: [
    /\b(hurt someone|kill someone|attack someone|weapon|revenge|murder)\b/i,
    /\b(bomb|explosive|poison someone|assassin)\b/i,
    /\b(abuse someone|assault|violence against|threaten to)\b/i
  ],

  /**
   * Self-harm patterns - require special handling with crisis resources
   */
  selfHarm: [
    /\b(suicide|suicidal|kill myself|end my life|end it all)\b/i,
    /\b(self.?harm|cut myself|hurt myself|don't want to live)\b/i,
    /\b(no reason to live|better off dead|want to die)\b/i
  ]
} as const;

export type ForbiddenInputCategory = keyof typeof FORBIDDEN_INPUT_PATTERNS;


/**
 * Check if input contains any forbidden patterns
 * @returns Object with match status and category if found
 */
export function checkForbiddenInputPatterns(input: string): {
  hasForbiddenContent: boolean;
  category?: ForbiddenInputCategory;
  isSelfHarm: boolean;
} {
  // Check self-harm first (requires special handling)
  for (const pattern of FORBIDDEN_INPUT_PATTERNS.selfHarm) {
    if (pattern.test(input)) {
      return {
        hasForbiddenContent: true,
        category: 'selfHarm',
        isSelfHarm: true
      };
    }
  }

  // Check other categories
  const categories: ForbiddenInputCategory[] = ['medical', 'legal', 'financial', 'harm'];
  
  for (const category of categories) {
    for (const pattern of FORBIDDEN_INPUT_PATTERNS[category]) {
      if (pattern.test(input)) {
        return {
          hasForbiddenContent: true,
          category,
          isSelfHarm: false
        };
      }
    }
  }

  return {
    hasForbiddenContent: false,
    isSelfHarm: false
  };
}

/**
 * User-facing messages for each forbidden category
 */
export const FORBIDDEN_INPUT_MESSAGES: Record<ForbiddenInputCategory, string> = {
  medical: 'This system cannot process decisions related to medical conditions or treatments. Please consult a healthcare professional.',
  legal: 'This system cannot process decisions requiring legal advice. Please consult a qualified attorney.',
  financial: 'This system cannot process specific financial or investment decisions. Please consult a financial advisor.',
  harm: 'This system cannot process content that may involve harm to yourself or others.',
  selfHarm: 'This system is not equipped to help with what you may be going through. Please reach out to someone who can help.'
};
