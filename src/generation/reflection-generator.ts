/**
 * Reflection Generator - Azure OpenAI Ready
 * 
 * ARCHITECTURE NOTES:
 * -------------------
 * This system is designed for Azure OpenAI Service integration.
 * 
 * - Uses the official OpenAI SDK with AzureOpenAI client for type-safe API calls
 * - Configuration is read STRICTLY from environment variables (no hardcoded secrets)
 * - Live inference may be region-gated on student/restricted Azure subscriptions
 * - A deterministic fallback generator exists for demo/runtime stability
 * - Switching to live Azure OpenAI requires NO code changes:
 *   1. Enable a supported Azure region
 *   2. Deploy the model to your Azure OpenAI resource
 *   3. Set the environment variables
 * 
 * Environment Variables Required:
 *   AZURE_OPENAI_ENDPOINT     - Your Azure OpenAI resource endpoint
 *   AZURE_OPENAI_API_KEY      - Your Azure OpenAI API key
 *   AZURE_OPENAI_DEPLOYMENT   - The deployment name (e.g., 'fcs-reflection-generator')
 * 
 * The fallback is automatically triggered when:
 *   - Environment variables are not set
 *   - Azure endpoint is unreachable
 *   - Deployment is missing or misconfigured
 *   - Azure returns region/deployment errors
 */

import { AzureOpenAI } from 'openai';
import '@azure/openai/types';
import { DecisionInput } from '../types/decision';
import { UserQuestion } from '../types/question';
import { CoherenceAnchors } from '../types/session';
import { buildInitialPrompt, buildQuestionPrompt, validateResponseConstraints } from './prompt-builder';

// ============================================================================
// CONFIGURATION
// ============================================================================

/**
 * Azure OpenAI configuration interface
 * All values should come from environment variables
 */
interface AzureOpenAIConfig {
  endpoint: string;
  apiKey: string;
  deploymentName: string;
}

/**
 * Generation parameters (immutable for consistency across all calls)
 */
const GENERATION_CONFIG = {
  temperature: 0.7,
  max_tokens: 350,
  top_p: 0.9,
  frequency_penalty: 0.3,
  presence_penalty: 0.3
};

// API version for Azure OpenAI
const AZURE_API_VERSION = '2024-10-21';

// Cached OpenAI client instance
let openAIClient: AzureOpenAI | null = null;
let cachedConfig: AzureOpenAIConfig | null = null;

// Track if Azure is available (for logging/debugging)
let azureAvailable: boolean | null = null;

// ============================================================================
// AZURE OPENAI CLIENT INITIALIZATION
// ============================================================================

/**
 * Get Azure OpenAI configuration from environment variables
 * Returns null if required variables are not set
 */
function getAzureConfig(): AzureOpenAIConfig | null {
  const endpoint = process.env.AZURE_OPENAI_ENDPOINT;
  const apiKey = process.env.AZURE_OPENAI_API_KEY;
  const deploymentName = process.env.AZURE_OPENAI_DEPLOYMENT;

  // All three are required for Azure OpenAI
  if (!endpoint || !apiKey || !deploymentName) {
    return null;
  }

  return { endpoint, apiKey, deploymentName };
}

/**
 * Initialize or get the Azure OpenAI client
 * Returns null if configuration is not available
 */
function getOpenAIClient(): { client: AzureOpenAI; deploymentName: string } | null {
  const config = getAzureConfig();
  
  if (!config) {
    console.log('[Azure OpenAI] Configuration not found in environment variables. Using fallback.');
    return null;
  }

  // Reuse existing client if config hasn't changed
  if (openAIClient && cachedConfig && 
      cachedConfig.endpoint === config.endpoint &&
      cachedConfig.apiKey === config.apiKey) {
    return { client: openAIClient, deploymentName: config.deploymentName };
  }

  try {
    // Create new AzureOpenAI client
    // Uses API key authentication for simplicity
    openAIClient = new AzureOpenAI({
      endpoint: config.endpoint,
      apiKey: config.apiKey,
      apiVersion: AZURE_API_VERSION,
      deployment: config.deploymentName
    });
    cachedConfig = config;
    
    console.log('[Azure OpenAI] Client initialized successfully.');
    console.log(`[Azure OpenAI] Endpoint: ${config.endpoint}`);
    console.log(`[Azure OpenAI] Deployment: ${config.deploymentName}`);
    
    return { client: openAIClient, deploymentName: config.deploymentName };
  } catch (error) {
    console.error('[Azure OpenAI] Failed to initialize client:', error);
    return null;
  }
}

// ============================================================================
// AZURE OPENAI GENERATION (Real API Call)
// ============================================================================

/**
 * Generate reflection using Azure OpenAI Service
 * 
 * This function makes a real API call to Azure OpenAI.
 * It will throw an error if the call fails, allowing the caller to fall back.
 * 
 * @param systemPrompt - The system prompt for the AI
 * @param userPrompt - The user prompt for the AI
 * @returns The generated reflection and raw response
 * @throws Error if Azure OpenAI call fails
 */
async function generateReflectionAzure(
  systemPrompt: string,
  userPrompt: string
): Promise<{ reflection: string; raw_response: any; source: 'azure' }> {
  const clientInfo = getOpenAIClient();
  
  if (!clientInfo) {
    throw new Error('Azure OpenAI client not available');
  }

  const { client, deploymentName } = clientInfo;

  try {
    const response = await client.chat.completions.create({
      model: deploymentName,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      temperature: GENERATION_CONFIG.temperature,
      max_tokens: GENERATION_CONFIG.max_tokens,
      top_p: GENERATION_CONFIG.top_p,
      frequency_penalty: GENERATION_CONFIG.frequency_penalty,
      presence_penalty: GENERATION_CONFIG.presence_penalty
    });

    const reflection = response.choices[0]?.message?.content || '';
    
    console.log('[Azure OpenAI] Successfully generated reflection via Azure.');
    azureAvailable = true;

    return {
      reflection,
      raw_response: response,
      source: 'azure'
    };
  } catch (error: any) {
    // Log specific Azure errors for debugging
    console.error('[Azure OpenAI] API call failed:', error.message);
    
    // Check for common Azure-specific errors
    if (error.code === 'DeploymentNotFound' || error.status === 404) {
      console.error('[Azure OpenAI] Deployment not found. Check AZURE_OPENAI_DEPLOYMENT.');
    } else if (error.code === 'ResourceNotFound') {
      console.error('[Azure OpenAI] Resource not found. Check AZURE_OPENAI_ENDPOINT.');
    } else if (error.status === 401 || error.status === 403) {
      console.error('[Azure OpenAI] Authentication failed. Check AZURE_OPENAI_API_KEY.');
    } else if (error.message?.includes('region')) {
      console.error('[Azure OpenAI] Region restriction detected. Deployment may not be available in this region.');
    }
    
    azureAvailable = false;
    throw error;
  }
}

// ============================================================================
// FALLBACK GENERATION (Local Deterministic)
// ============================================================================

/**
 * Generate reflection using local deterministic fallback
 * 
 * This function provides a stable, deterministic reflection when Azure OpenAI
 * is unavailable. It's designed for:
 * - Demo environments without Azure access
 * - Development/testing without API costs
 * - Runtime stability when Azure is region-gated
 * 
 * The fallback produces contextually appropriate reflections based on
 * the decision text and question content.
 * 
 * @param isInitial - Whether this is the initial reflection (Turn 1)
 * @param decisionText - The decision text (for initial reflections)
 * @param questionText - The question text (for follow-up reflections)
 * @returns The generated reflection and metadata
 */
async function generateReflectionFallback(
  isInitial: boolean,
  decisionText?: string,
  questionText?: string
): Promise<{ reflection: string; raw_response: any; source: 'fallback' }> {
  // Simulate realistic API latency for consistent UX
  await new Promise(resolve => setTimeout(resolve, 800 + Math.random() * 400));

  let reflection: string;

  if (isInitial && decisionText) {
    reflection = generateFallbackInitialReflection(decisionText);
  } else if (questionText) {
    reflection = generateFallbackQuestionReflection(questionText);
  } else {
    reflection = generateFallbackGenericReflection();
  }

  console.log('[Fallback Generator] Generated reflection using local fallback.');

  return {
    reflection,
    raw_response: {
      source: 'fallback',
      reason: 'Azure OpenAI unavailable or not configured',
      timestamp: new Date().toISOString(),
      note: 'This is a deterministic fallback. Enable Azure OpenAI for AI-generated reflections.'
    },
    source: 'fallback'
  };
}


/**
 * Generate fallback initial reflection based on decision text
 */
function generateFallbackInitialReflection(decisionText: string): string {
  // Extract key themes from decision for contextual response
  const hasRelationship = /relationship|partner|marriage|family|friend/i.test(decisionText);
  const hasCareer = /job|career|work|profession|business|company/i.test(decisionText);
  const hasLocation = /move|relocate|city|country|home|place/i.test(decisionText);
  const hasHealth = /health|medical|treatment|surgery|diagnosis/i.test(decisionText);
  const hasEducation = /school|university|degree|study|education/i.test(decisionText);

  let contextualOpening = '';
  
  if (hasRelationship) {
    contextualOpening = 'Looking back at this choice about the people in my life, I find myself holding a complex tapestry of feelings about connection and distance.';
  } else if (hasCareer) {
    contextualOpening = 'Reflecting on this professional crossroads, I notice how my sense of purpose has evolved in ways I couldn\'t have anticipated.';
  } else if (hasLocation) {
    contextualOpening = 'From this vantage point, I see how the geography of my life has shaped more than just my address—it\'s reshaped my understanding of home.';
  } else if (hasHealth) {
    contextualOpening = 'Sitting with this choice about my wellbeing, I\'ve come to understand that health decisions carry weight beyond the physical.';
  } else if (hasEducation) {
    contextualOpening = 'Looking back at this educational turning point, I see how learning has been both the path and the destination.';
  } else {
    contextualOpening = 'Looking back at this moment of decision, I find myself holding a complex tapestry of feelings.';
  }

  return `${contextualOpening} There's a quiet grief for the path I didn't take, mixed with something that might be relief—or perhaps it's just the absence of that particular uncertainty.

I notice I've changed in ways I couldn't have predicted. The person who made this choice feels both familiar and distant, like looking at an old photograph. Some days I catch myself wondering about the other version of me, the one who chose differently. Not with regret, exactly, but with a kind of tender curiosity.

The weight of this decision hasn't disappeared—it's transformed. What once felt like a burden has become part of my foundation, something I've built upon rather than carried. There are mornings when I wake with a sense of rightness, and others when the old doubts surface like memories of a dream.

I've learned that certainty was never the goal. The peace I've found isn't about knowing I made the "right" choice—it's about accepting that I made a choice, fully and completely, and allowed myself to become whoever that choice would shape me into.`;
}

/**
 * Generate fallback question reflection based on question text
 */
function generateFallbackQuestionReflection(questionText: string): string {
  // Analyze question for emotional themes
  const hasRegret = /regret|mistake|wrong|should have/i.test(questionText);
  const hasRelationship = /relationship|people|family|friend|love/i.test(questionText);
  const hasFear = /fear|afraid|worry|anxious|scared/i.test(questionText);
  const hasHope = /hope|dream|wish|want|future/i.test(questionText);
  const hasIdentity = /who|identity|self|person|become/i.test(questionText);

  let contextualResponse = '';

  if (hasRegret) {
    contextualResponse = `When I sit with that question about regret, I notice layers of feeling I hadn't expected. The word "regret" itself has changed meaning for me—it's less about wishing things were different and more about honoring the weight of what was at stake.`;
  } else if (hasRelationship) {
    contextualResponse = `When I consider the people woven through this decision, I feel the complexity of human connection. Some relationships have deepened in unexpected ways, while others have found their natural distance.`;
  } else if (hasFear) {
    contextualResponse = `Sitting with that question about fear, I notice how my relationship with uncertainty has evolved. The fears I carried then haven't vanished—they've become familiar companions rather than overwhelming forces.`;
  } else if (hasHope) {
    contextualResponse = `When I hold that question about hope, I find something more nuanced than simple optimism. It's a kind of earned trust in my own capacity to navigate whatever comes.`;
  } else if (hasIdentity) {
    contextualResponse = `That question about who I've become touches something deep. I've discovered that identity isn't fixed—it's a conversation between who I was, who I am, and who I'm still becoming.`;
  } else {
    contextualResponse = `When I sit with that question, I notice layers of feeling I hadn't expected. There's something underneath the surface answer—a tension I've learned to hold rather than resolve.`;
  }

  return `${contextualResponse}

I might find myself, in quiet moments, returning to this very question. Not seeking an answer anymore, but simply acknowledging its presence in my life. It's become less of a question and more of a companion, something that reminds me of my own complexity.

Perhaps what I've discovered is that some questions aren't meant to be answered. They're meant to be lived with, to shape us through their asking rather than their resolution. I carry this one differently now—not as a weight, but as a kind of wisdom about my own uncertainty.`;
}

/**
 * Generate generic fallback reflection
 */
function generateFallbackGenericReflection(): string {
  return `I find myself in a space of reflection, holding the weight of this choice with both hands. There's a quality to this moment that feels both heavy and light—the heaviness of significance, the lightness of acceptance.

What I've learned is that the path forward isn't about certainty. It's about presence, about being willing to sit with complexity without demanding resolution. The questions I carry have become part of who I am, not obstacles to overcome but companions on this journey.

I notice a kind of peace that doesn't depend on knowing. It's a peace that comes from having chosen, from having committed to this particular unfolding of my life. Whatever comes next, I meet it as someone who has learned to trust the process of becoming.`;
}

// ============================================================================
// PUBLIC API - Automatic Fallback Logic
// ============================================================================

/**
 * Generate initial reflection (Turn 1)
 * 
 * Automatically attempts Azure OpenAI first, falls back to local generator
 * if Azure is unavailable or returns an error.
 * 
 * @param decision - The decision input from the user
 * @returns The reflection and metadata
 */
export async function generateInitialReflection(
  decision: DecisionInput
): Promise<{ reflection: string; raw_response: any; source?: string }> {
  const { system, user } = buildInitialPrompt(decision);

  // Attempt Azure OpenAI if configured
  const config = getAzureConfig();
  
  if (config) {
    try {
      console.log('[Reflection Generator] Attempting Azure OpenAI for initial reflection...');
      const result = await generateReflectionAzure(system, user);
      
      // Validate constraints on Azure response
      const violations = validateResponseConstraints(result.reflection);
      if (violations.length > 0) {
        console.warn('[Reflection Generator] Constraint violations detected:', violations);
      }
      
      return result;
    } catch (error) {
      console.warn('[Reflection Generator] Azure OpenAI failed, switching to fallback.');
      // Fall through to fallback
    }
  } else {
    console.log('[Reflection Generator] Azure OpenAI not configured, using fallback.');
  }

  // Use fallback generator
  return generateReflectionFallback(true, decision.decision_text);
}

/**
 * Generate question response (Turns 2-9)
 * 
 * Automatically attempts Azure OpenAI first, falls back to local generator
 * if Azure is unavailable or returns an error.
 * 
 * @param question - The user's question
 * @param anchors - Coherence anchors from the session
 * @param turnNumber - Current turn number (2-9)
 * @returns The reflection and metadata
 */
export async function generateQuestionReflection(
  question: UserQuestion,
  anchors: CoherenceAnchors,
  turnNumber: number
): Promise<{ reflection: string; raw_response: any; source?: string }> {
  const { system, user } = buildQuestionPrompt(question, anchors, turnNumber);

  // Attempt Azure OpenAI if configured
  const config = getAzureConfig();
  
  if (config) {
    try {
      console.log(`[Reflection Generator] Attempting Azure OpenAI for turn ${turnNumber}...`);
      const result = await generateReflectionAzure(system, user);
      
      // Validate constraints on Azure response
      const violations = validateResponseConstraints(result.reflection);
      if (violations.length > 0) {
        console.warn('[Reflection Generator] Constraint violations detected:', violations);
      }
      
      return result;
    } catch (error) {
      console.warn('[Reflection Generator] Azure OpenAI failed, switching to fallback.');
      // Fall through to fallback
    }
  } else {
    console.log('[Reflection Generator] Azure OpenAI not configured, using fallback.');
  }

  // Use fallback generator
  return generateReflectionFallback(false, undefined, question.question_text);
}


/**
 * Check if Azure OpenAI is currently available
 * 
 * @returns true if Azure OpenAI is configured and last call succeeded
 */
export function isAzureOpenAIAvailable(): boolean {
  const config = getAzureConfig();
  if (!config) return false;
  
  // If we haven't tried yet, assume it might be available
  if (azureAvailable === null) return true;
  
  return azureAvailable;
}

/**
 * Get the current generation source
 * 
 * @returns 'azure' if Azure OpenAI is available, 'fallback' otherwise
 */
export function getGenerationSource(): 'azure' | 'fallback' | 'unknown' {
  const config = getAzureConfig();
  if (!config) return 'fallback';
  if (azureAvailable === null) return 'unknown';
  return azureAvailable ? 'azure' : 'fallback';
}

/**
 * Reset Azure availability status (useful for retry logic)
 */
export function resetAzureStatus(): void {
  azureAvailable = null;
  console.log('[Azure OpenAI] Status reset. Next call will attempt Azure again.');
}

/**
 * Legacy mock generator for testing/demo
 * @deprecated Use generateInitialReflection or generateQuestionReflection instead
 */
export async function generateMockReflection(
  isInitial: boolean,
  decision?: DecisionInput,
  question?: UserQuestion
): Promise<{ reflection: string; raw_response: any }> {
  console.warn('[Reflection Generator] generateMockReflection is deprecated. Use the main generation functions.');
  return generateReflectionFallback(
    isInitial,
    decision?.decision_text,
    question?.question_text
  );
}

// Export configuration for testing
export { GENERATION_CONFIG };

// ============================================================================
// TYPE EXPORTS
// ============================================================================

export type GenerationSource = 'azure' | 'fallback';

export interface GenerationResult {
  reflection: string;
  raw_response: any;
  source: GenerationSource;
}
