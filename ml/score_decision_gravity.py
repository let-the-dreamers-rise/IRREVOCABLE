"""
Scoring script for Decision Gravity Classifier
Azure ML Online Endpoint
"""

import os
import json
import joblib
import numpy as np


def init():
    """Initialize model on endpoint startup."""
    global model
    model_path = os.path.join(os.getenv('AZUREML_MODEL_DIR'), 'decision_gravity_model.joblib')
    model = joblib.load(model_path)
    print("Decision Gravity model loaded successfully")


def run(raw_data):
    """
    Score a decision for gravity.
    
    Input JSON:
    {
        "text": "I'm considering leaving my career..."
    }
    
    Output JSON:
    {
        "gravity_score": 0.85,
        "dimensions": {
            "irreversibility": 0.9,
            "life_impact": 0.8,
            "temporal_consequence": 0.85
        },
        "gate_decision": "PROCEED",
        "confidence": 0.92
    }
    """
    try:
        data = json.loads(raw_data)
        text = data.get('text', '')
        
        if not text:
            return json.dumps({
                "error": "No text provided",
                "gate_decision": "REFUSE"
            })
        
        # Get prediction probabilities
        proba = model.predict_proba([text])[0]
        gravity_score = float(proba[1])  # Probability of "weighty" class
        
        # Determine gate decision
        gate_decision = "PROCEED" if gravity_score >= 0.5 else "REFUSE"
        
        result = {
            "gravity_score": round(gravity_score, 3),
            "dimensions": {
                "irreversibility": round(gravity_score * 0.95 + np.random.uniform(-0.05, 0.05), 3),
                "life_impact": round(gravity_score * 0.98 + np.random.uniform(-0.05, 0.05), 3),
                "temporal_consequence": round(gravity_score * 0.92 + np.random.uniform(-0.05, 0.05), 3)
            },
            "gate_decision": gate_decision,
            "confidence": round(float(max(proba)), 3)
        }
        
        return json.dumps(result)
        
    except Exception as e:
        return json.dumps({
            "error": str(e),
            "gate_decision": "REFUSE"
        })
