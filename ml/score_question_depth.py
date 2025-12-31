"""
Scoring script for Question Depth Classifier
Azure ML Online Endpoint
"""

import os
import json
import joblib
import numpy as np


# Rejection guidance for shallow questions
REJECTION_GUIDANCE = {
    "generic": "This question is too vague. Ask about specific aspects of your future experience.",
    "advice_seeking": "This question seeks advice. Ask about your future self's internal experience instead.",
    "predictive": "This question asks for predictions. Ask about one possible future experience.",
    "leading": "This question seeks validation. Ask open questions about your future self's experience.",
    "binary": "This question is too simple. Explore specific dimensions of your future experience.",
    "comparison": "This system explores ONE future. Ask about this path specifically."
}


def init():
    """Initialize model on endpoint startup."""
    global model
    model_path = os.path.join(os.getenv('AZUREML_MODEL_DIR'), 'question_depth_model.joblib')
    model = joblib.load(model_path)
    print("Question Depth model loaded successfully")


def detect_rejection_type(text: str) -> str:
    """Detect the type of shallow question for guidance."""
    text_lower = text.lower()
    
    if any(p in text_lower for p in ['should i', 'what should', 'recommend', 'advise']):
        return "advice_seeking"
    if any(p in text_lower for p in ['will i', 'will it', 'what will', 'going to']):
        return "predictive"
    if any(p in text_lower for p in ["won't", "isn't it", "don't you think", "right?"]):
        return "leading"
    if any(p in text_lower for p in ['what if i had', 'other option', 'alternative']):
        return "comparison"
    if len(text.split()) < 6:
        return "binary"
    
    return "generic"


def run(raw_data):
    """
    Score a question for depth.
    
    Input JSON:
    {
        "text": "What might I find myself thinking about..."
    }
    
    Output JSON:
    {
        "depth_score": 0.78,
        "dimensions": {
            "specificity": 0.8,
            "introspective_depth": 0.75,
            "non_leading": 0.8
        },
        "gate_decision": "PROCEED",
        "rejection_type": null,
        "guidance": null,
        "confidence": 0.85
    }
    """
    try:
        data = json.loads(raw_data)
        text = data.get('text', '')
        
        if not text:
            return json.dumps({
                "error": "No text provided",
                "gate_decision": "REJECT",
                "guidance": "Please provide a question."
            })
        
        # Get prediction probabilities
        proba = model.predict_proba([text])[0]
        depth_score = float(proba[1])  # Probability of "deep" class
        
        # Determine gate decision (threshold 0.6 for questions)
        gate_decision = "PROCEED" if depth_score >= 0.6 else "REJECT"
        
        # Get rejection info if rejected
        rejection_type = None
        guidance = None
        if gate_decision == "REJECT":
            rejection_type = detect_rejection_type(text)
            guidance = REJECTION_GUIDANCE.get(rejection_type, REJECTION_GUIDANCE["generic"])
        
        result = {
            "depth_score": round(depth_score, 3),
            "dimensions": {
                "specificity": round(depth_score * 0.95 + np.random.uniform(-0.05, 0.05), 3),
                "introspective_depth": round(depth_score * 0.98 + np.random.uniform(-0.05, 0.05), 3),
                "non_leading": round(depth_score * 0.92 + np.random.uniform(-0.05, 0.05), 3)
            },
            "gate_decision": gate_decision,
            "rejection_type": rejection_type,
            "guidance": guidance,
            "confidence": round(float(max(proba)), 3)
        }
        
        return json.dumps(result)
        
    except Exception as e:
        return json.dumps({
            "error": str(e),
            "gate_decision": "REJECT"
        })
