/**
 * Pattern Exports
 * Central export for all forbidden pattern registries
 */

// Input patterns (decision validation)
export {
  FORBIDDEN_INPUT_PATTERNS,
  FORBIDDEN_INPUT_MESSAGES,
  ForbiddenInputCategory,
  checkForbiddenInputPatterns
} from './forbidden-input';

// Output patterns (response validation)
export {
  FORBIDDEN_OUTPUT_PATTERNS,
  REQUIRED_HEDGING_PATTERNS,
  ForbiddenOutputCategory,
  checkForbiddenOutputPatterns,
  checkHedgingPresence
} from './forbidden-output';

// Question patterns (user question validation)
export {
  FORBIDDEN_QUESTION_PATTERNS,
  QUESTION_REJECTION_GUIDANCE,
  GOOD_QUESTION_EXAMPLES,
  ForbiddenQuestionCategory,
  checkForbiddenQuestionPatterns
} from './forbidden-questions';
