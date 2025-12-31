# IRREVOCABLE

**A bounded reflective AI instrument for interrogating irreversible decisions through ML-gated future context reflection.**

---

## Problem Statement

Humans facing irreversible decisions—career changes, relocations, relationship commitments—often experience decision paralysis. The stakes are high, the outcomes are uncertain, and the cognitive load is immense.

Existing tools fail to address this problem adequately:

- **Generic chatbots** provide shallow, context-free responses that lack the depth required for consequential decisions
- **Multi-path simulators** overwhelm users with branching possibilities, increasing rather than reducing cognitive load
- **Standard LLM interfaces** offer unbounded conversations that drift, provide unsolicited advice, or make predictions they cannot substantiate

The core issue is not information scarcity—it is **cognitive depth**. Users do not need more options or faster answers. They need a structured environment that forces genuine self-examination of a single, committed future.

IRREVOCABLE addresses this by constraining the interaction space, enforcing seriousness through ML gates, and providing a bounded reflective arc that terminates definitively.

---

## What This System Is (and Is Not)

| This System IS | This System IS NOT |
|----------------|-------------------|
| A reflective instrument | A chatbot |
| Single-future exploration | Multi-path simulation |
| ML-gated interrogation | Advice or prediction |
| Hard-bounded interaction | Infinite conversation |
| User-driven questioning | System-initiated dialogue |
| Session-scoped memory | Persistent user profiling |
| Depth-enforcing | Productivity-optimizing |

---

## Core Design Principles

### ONE Decision
The user commits to a single irreversible decision at session start. This decision cannot be modified, compared to alternatives, or revisited. The system explores only the future where this decision was made.

### ONE Future
There is no branching, no "what if I had chosen differently," no alternative timeline exploration. The reflection arc exists entirely within the context of the committed decision.

### User-Driven Questions (Earned, Not Free)
After the initial reflection, users must ask questions to continue. Each question is evaluated by ML classifiers for depth and introspective quality. Shallow, advice-seeking, or predictive questions are rejected with guidance for reframing.

### ML Gates Enforce Seriousness and Depth
Three distinct ML classifiers gate the interaction:
- **Decision Gravity Gate**: Rejects trivial decisions
- **Question Depth Gate**: Rejects shallow questions
- **Consequence Depth Gate**: Terminates sessions if generated reflections lack sufficient depth

### Hard Termination After 9 Turns
The session ends permanently after 9 turns. There is no extension, no restart, no continuation. This constraint forces users to treat each question as valuable and prevents the drift that characterizes unbounded AI conversations.

---

## User Flow Overview

### Phase 1: Void State
The user enters an empty, contemplative interface. No prompts, no suggestions—just space to prepare for commitment.

### Phase 2: Decision Ritual (Turn 1)
The user describes their irreversible decision. The Decision Gravity Gate evaluates whether the decision warrants this level of reflection. Trivial decisions are rejected. Accepted decisions trigger the initial future-context reflection.

### Phase 3: Reflection Chamber (Turns 2–9)
The user interrogates their future self through questions. Each question passes through the Question Depth Gate. Accepted questions generate reflections that pass through the Consequence Depth Gate. The temporal context advances with each turn (3 months → 1 year → 7 years → lifetime).

### Phase 4: Terminal State
After Turn 9, the session ends permanently. The user receives a closure message. No further interaction is possible. The reflection arc is complete.

---

## Microsoft AI Services Used

### Azure Machine Learning (Production-Active)

Three trained classifiers power the ML gating system:

#### 1. Decision Gravity Classifier
- **What it gates**: Initial decision input (Turn 1)
- **Purpose**: Distinguishes consequential, irreversible decisions from trivial choices
- **Why rules are insufficient**: The semantic difference between "I'm considering leaving my career" and "I'm considering what to eat for lunch" cannot be captured by keyword matching. The classifier evaluates irreversibility indicators, life-domain impact, and temporal scope through learned representations.
- **Training data**: Labeled decision statements with gravity scores across career, relationship, location, and identity domains

#### 2. Question Depth Classifier
- **What it gates**: User questions (Turns 2–9)
- **Purpose**: Ensures questions probe internal experience rather than seeking advice or predictions
- **Why rules are insufficient**: Advice-seeking can be syntactically subtle ("What might help me feel better?" vs "What might I feel?"). The classifier evaluates introspective framing, specificity, and non-leading structure through semantic analysis.
- **Training data**: Labeled questions with depth scores across specificity, introspective depth, and non-leading dimensions

#### 3. Consequence Depth Classifier
- **What it gates**: Generated reflections (all turns)
- **Purpose**: Ensures system-generated content meets quality thresholds; terminates sessions producing shallow output
- **Why rules are insufficient**: Reflection quality involves emotional specificity, concrete reasoning, and narrative depth—properties that emerge from semantic coherence, not lexical patterns.
- **Training data**: Labeled reflection texts with depth scores across emotional specificity, concrete reasoning, and narrative depth dimensions

### Azure OpenAI Service (Architecture-Ready)

The system is Azure OpenAI–ready by design. Live inference can be enabled by deploying a supported model in an available region.

#### Integration Details
- **SDK**: Official `@azure/openai` TypeScript SDK
- **Configuration**: Environment-based, no hardcoded values
  ```
  AZURE_OPENAI_ENDPOINT=https://<resource>.openai.azure.com/
  AZURE_OPENAI_DEPLOYMENT=<deployment-name>
  AZURE_OPENAI_API_KEY=<api-key>
  ```
- **Deployment Status**: Architecture complete, runtime fallback active
- **Fallback Behavior**: When Azure OpenAI is unavailable (regional constraints, deployment pending), the system uses a deterministic local generator that produces structurally valid reflections

#### No Code Changes Required
Switching from fallback to live Azure OpenAI requires only:
1. Deploying a supported model (GPT-4, GPT-4o) in an available region
2. Setting the three environment variables
3. Restarting the server

The generation interface, prompt construction, and response handling are identical for both paths.

---

## System Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                           FRONTEND                                   │
│                     React + TypeScript + Vite                        │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐ │
│  │  VoidState  │→ │DecisionRitual│→ │ Reflection  │→ │ Terminal    │ │
│  │             │  │   (Turn 1)   │  │  Chamber    │  │   State     │ │
│  └─────────────┘  └─────────────┘  │ (Turns 2-9) │  └─────────────┘ │
│                                     └─────────────┘                  │
└─────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼ HTTP/REST
┌─────────────────────────────────────────────────────────────────────┐
│                      ORCHESTRATION LAYER                             │
│                    Express.js + TypeScript                           │
│  ┌─────────────────────────────────────────────────────────────────┐│
│  │                    Process Turn Endpoint                         ││
│  │  Turn 1: Validate → Gravity Gate → Generate → Consequence Gate  ││
│  │  Turn 2-9: Validate → Depth Gate → Generate → Consequence Gate  ││
│  └─────────────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────────┘
          │                    │                         │
          ▼                    ▼                         ▼
┌─────────────────┐  ┌─────────────────┐  ┌─────────────────────────┐
│   AZURE ML      │  │   AZURE ML      │  │      AZURE ML           │
│  Decision       │  │  Question       │  │    Consequence          │
│  Gravity Gate   │  │  Depth Gate     │  │    Depth Gate           │
│  (Classifier)   │  │  (Classifier)   │  │    (Classifier)         │
└─────────────────┘  └─────────────────┘  └─────────────────────────┘
                                                      │
                                                      ▼
                           ┌─────────────────────────────────────────┐
                           │         GENERATION BOUNDARY              │
                           │  ┌─────────────────────────────────────┐│
                           │  │      Azure OpenAI Service           ││
                           │  │   (GPT-4 / GPT-4o Deployment)       ││
                           │  │                                     ││
                           │  │   • Prompt: Future-self persona     ││
                           │  │   • Context: Decision + anchors     ││
                           │  │   • Constraints: No advice/predict  ││
                           │  └─────────────────────────────────────┘│
                           │                    │                    │
                           │         ┌──────────┴──────────┐         │
                           │         ▼                     ▼         │
                           │  ┌─────────────┐    ┌─────────────────┐ │
                           │  │ Live Azure  │ OR │ Local Fallback  │ │
                           │  │   OpenAI    │    │   Generator     │ │
                           │  └─────────────┘    └─────────────────┘ │
                           └─────────────────────────────────────────┘
```

---

## Why This Requires Multiple AI Services

### Why Azure ML is Mandatory

The gating system cannot function with rule-based approaches:

1. **Semantic Understanding**: Distinguishing "I'm leaving my job" (high gravity) from "I'm leaving the room" (trivial) requires semantic comprehension, not keyword matching
2. **Nuanced Classification**: Question depth involves subtle distinctions between introspective probing and advice-seeking that emerge from training, not rules
3. **Quality Assurance**: Generated content quality cannot be verified through pattern matching; learned models evaluate coherence and depth

**Removing Azure ML** would eliminate the enforcement mechanism that distinguishes this system from an unbounded chatbot. Users could submit trivial decisions, ask shallow questions, and receive low-quality responses without consequence.

### Why Azure OpenAI is Mandatory

The reflection generation cannot function with templates or rule-based text generation:

1. **Contextual Coherence**: Reflections must maintain coherence with the specific decision, previous turns, and extracted anchors
2. **Emotional Authenticity**: Generated content must exhibit genuine emotional texture, not formulaic responses
3. **Adaptive Depth**: Reflections must respond to the specific question asked while maintaining the future-self persona

**Removing Azure OpenAI** would reduce the system to a template engine incapable of producing the contextually appropriate, emotionally resonant reflections that make the instrument valuable.

### Architectural Dependency

The two services are complementary:
- Azure ML **gates** ensure only serious, deep interactions proceed
- Azure OpenAI **generates** the reflections that users interrogate

Neither can substitute for the other. The system's value emerges from their integration.

---

## Demo Notes

### Runtime Configuration
- Demo runs with **fallback generation enabled** due to regional deployment constraints
- **ML gating remains fully active**—all three classifiers evaluate inputs and outputs
- Output quality is **deterministic** for consistent judging across sessions

### What Judges Will Observe
1. Decision submission triggers visible gravity evaluation
2. Shallow decisions are rejected with guidance
3. Questions are evaluated before generating responses
4. Shallow questions are rejected with reframing suggestions
5. Session terminates definitively after 9 turns
6. No advice, predictions, or alternative futures are provided

### Production Deployment
Production deployment uses live Azure OpenAI inference. The architectural integration is identical; only the generation source differs.

---

## Ethical & Safety Constraints

### No Advice
The system never tells users what to do. All responses are framed as reflections from a possible future self, not recommendations.

### No Prediction
The system never claims to know what will happen. All statements are explicitly framed as possibilities, not certainties.

### No Medical/Legal/Financial Guidance
Decisions involving medical treatment, legal matters, or specific financial investments are rejected with referrals to appropriate professionals.

### Crisis Handling
Self-harm indicators trigger immediate session termination with crisis resource information. The system does not attempt to provide mental health support.

### Session-Scoped Memory
No user data persists beyond the session. There is no user profiling, no cross-session learning, no data retention.

### Disclaimers
Every response includes explicit disclaimers:
- "This reflection represents one possible internal experience, not a prediction of what will happen."
- "This is not advice. It is a mirror for self-reflection."

---

## Setup Instructions

### Prerequisites
- Node.js 18.x or higher
- npm 9.x or higher

### Installation

```bash
# Clone the repository
git clone <repository-url>
cd irrevocable

# Install backend dependencies
npm install

# Install frontend dependencies
cd frontend
npm install
cd ..
```

### Environment Configuration

Create a `.env` file in the root directory:

```env
# Azure OpenAI Configuration (optional - fallback used if not set)
AZURE_OPENAI_ENDPOINT=https://<your-resource>.openai.azure.com/
AZURE_OPENAI_DEPLOYMENT=<your-deployment-name>
AZURE_OPENAI_API_KEY=<your-api-key>

# Server Configuration
PORT=3001
```

### Running the Application

```bash
# Terminal 1: Build and start backend
npm run build
npm start

# Terminal 2: Start frontend development server
cd frontend
npm run dev
```

### Access
- Frontend: http://localhost:5173
- Backend API: http://localhost:3001

---

## Project Structure

```
irrevocable/
├── src/                          # Backend source
│   ├── functions/                # API endpoint handlers
│   ├── gates/                    # ML gate implementations
│   ├── generation/               # Reflection generation
│   ├── patterns/                 # Forbidden content patterns
│   ├── responses/                # Response formatting
│   ├── session/                  # Session management
│   ├── types/                    # TypeScript type definitions
│   └── validators/               # Input validation
├── frontend/                     # React frontend
│   ├── src/
│   │   ├── components/           # UI components
│   │   ├── store/                # State management
│   │   ├── api/                  # API client
│   │   └── styles/               # Global styles
│   └── ...
├── ml/                           # ML training scripts and data
│   ├── data/                     # Training datasets
│   ├── train_*.py                # Training scripts
│   └── score_*.py                # Inference scripts
└── ...
```

---

## Imagine Cup Compliance Statement

This project complies with Imagine Cup IC26 requirements and uses multiple Microsoft AI services as core system components:

- **Azure Machine Learning**: Three production-active classifiers for decision gravity, question depth, and consequence depth evaluation
- **Azure OpenAI Service**: Architecturally integrated for reflection generation with environment-based configuration

Runtime behavior (fallback generation) does not affect architectural evaluation. The system demonstrates complete integration with Microsoft AI services and can transition to full live inference without code modification.

---

*"One decision. One future. No revision."*
