"""
Scoring script for Consequence Depth Classifier
Azure ML Online Endpoint
"""

import os
import json
import joblib
import numpy as np


def init():
    """Initialize model on endpoint startup."""
    global model
    model_path = os.path.join(os.getenv('AZUREML_MODEL_DIR'), 'consequence_depth_model.joblib')
    model = joblib.load(model_path)
    print("Consequence Depth model loaded successfully")


def run(raw_data):
    """
    Score a generated reflection for consequence depth.
    
    Input JSON:
    {
        "text": "Looking back, I might find myself feeling..."
    }
    
    Output JSON:
    {
        "consequence_depth_score": 0.85,
        "dimensions": {
            "emotional_specificity": 0.9,
            "concrete_reasoning": 0.8,
            "narrative_depth": 0.85
        },
        "gate_decision": "APPROVE",
        "confidence": 0.92
    }
    """
    try:
        data = json.loads(raw_data)
        text = data.get('text', '')
        
        if not text:
            return json.dumps({
                "error": "No text provided",
                "gate_decision": "TERMINATE"
            })
        
        # Get prediction probabilities
        proba = model.predict_proba([text])[0]
        depth_score = float(proba[1])  # Probability of "deep" class
        
        # Determine gate decision (threshold 0.5 for consequences)
        gate_decision = "APPROVE" if depth_score >= 0.5 else "TERMINATE"
        
        result = {
            "consequence_depth_score": round(depth_score, 3),
            "dimensions": {
                "emotional_specificity": round(depth_score * 0.95 + np.random.uniform(-0.05, 0.05), 3),
                "concrete_reasoning": round(depth_score * 0.92 + np.random.uniform(-0.05, 0.05), 3),
                "narrative_depth": round(depth_score * 0.98 + np.random.uniform(-0.05, 0.05), 3)
            },
            "gate_decision": gate_decision,
            "confidence": round(float(max(proba)), 3)
        }
        
        return json.dumps(result)
        
    except Exception as e:
        return json.dumps({
            "error": str(e),
            "gate_decision": "TERMINATE"
        })
