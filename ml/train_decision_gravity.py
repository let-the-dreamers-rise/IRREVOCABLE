"""
Decision Gravity Classifier Training Script
Azure ML Training Pipeline for FCS System

This classifier determines if a decision is "weighty" enough to warrant
the FCS reflection experience. Trivial decisions are refused.

Dimensions:
- Irreversibility: Can this decision be undone?
- Life Impact: How many life domains does this affect?
- Temporal Consequence: How far into the future do effects extend?

Output: Decision Gravity Score (0.0-1.0)
Gate Threshold: 0.5
"""

import json
import os
import argparse
import joblib
import numpy as np
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.model_selection import train_test_split
from sklearn.metrics import classification_report, accuracy_score
from sklearn.pipeline import Pipeline


def load_training_data(data_path: str):
    """Load labeled decision data from JSONL file."""
    texts = []
    scores = []
    
    with open(data_path, 'r', encoding='utf-8') as f:
        for line in f:
            item = json.loads(line.strip())
            texts.append(item['text'])
            scores.append(item['score'])
    
    return texts, np.array(scores)


def create_binary_labels(scores: np.ndarray, threshold: float = 0.5):
    """Convert continuous scores to binary labels for classification."""
    return (scores >= threshold).astype(int)


def train_classifier(texts, labels):
    """Train a text classification pipeline."""
    pipeline = Pipeline([
        ('tfidf', TfidfVectorizer(
            max_features=5000,
            ngram_range=(1, 3),
            stop_words='english',
            min_df=1
        )),
        ('classifier', LogisticRegression(
            max_iter=1000,
            class_weight='balanced',
            random_state=42
        ))
    ])
    
    pipeline.fit(texts, labels)
    return pipeline


def evaluate_model(pipeline, X_test, y_test):
    """Evaluate model performance."""
    predictions = pipeline.predict(X_test)
    
    print("\n=== Decision Gravity Classifier Evaluation ===")
    print(f"Accuracy: {accuracy_score(y_test, predictions):.3f}")
    print("\nClassification Report:")
    print(classification_report(y_test, predictions, 
                                target_names=['Trivial (< 0.5)', 'Weighty (>= 0.5)']))
    
    return predictions


def get_gravity_score(pipeline, text: str) -> dict:
    """Get gravity score for a single decision text."""
    # Get probability of being "weighty"
    proba = pipeline.predict_proba([text])[0]
    score = proba[1]  # Probability of class 1 (weighty)
    
    return {
        'text': text,
        'gravity_score': float(score),
        'gate_decision': 'PROCEED' if score >= 0.5 else 'REFUSE',
        'confidence': float(max(proba))
    }


def main():
    parser = argparse.ArgumentParser(description='Train Decision Gravity Classifier')
    parser.add_argument('--data-path', type=str, 
                        default='data/decision_gravity_labels.jsonl',
                        help='Path to training data')
    parser.add_argument('--output-dir', type=str, 
                        default='outputs',
                        help='Directory to save model')
    parser.add_argument('--test-size', type=float, 
                        default=0.2,
                        help='Test set proportion')
    args = parser.parse_args()
    
    # Create output directory
    os.makedirs(args.output_dir, exist_ok=True)
    
    print("Loading training data...")
    texts, scores = load_training_data(args.data_path)
    print(f"Loaded {len(texts)} examples")
    
    # Convert to binary labels
    labels = create_binary_labels(scores, threshold=0.5)
    print(f"Class distribution: Trivial={sum(labels==0)}, Weighty={sum(labels==1)}")
    
    # Split data
    X_train, X_test, y_train, y_test = train_test_split(
        texts, labels, test_size=args.test_size, random_state=42, stratify=labels
    )
    
    print(f"\nTraining set: {len(X_train)} examples")
    print(f"Test set: {len(X_test)} examples")
    
    # Train model
    print("\nTraining classifier...")
    pipeline = train_classifier(X_train, y_train)
    
    # Evaluate
    evaluate_model(pipeline, X_test, y_test)
    
    # Save model
    model_path = os.path.join(args.output_dir, 'decision_gravity_model.joblib')
    joblib.dump(pipeline, model_path)
    print(f"\nModel saved to: {model_path}")
    
    # Test with sample decisions
    print("\n=== Sample Predictions ===")
    test_decisions = [
        "Should I get coffee or tea this morning",
        "I'm considering leaving my 15-year career to start my own company",
        "I'm thinking about what to watch on Netflix tonight",
        "Should I end my marriage after 10 years together"
    ]
    
    for decision in test_decisions:
        result = get_gravity_score(pipeline, decision)
        print(f"\nDecision: {result['text'][:60]}...")
        print(f"  Score: {result['gravity_score']:.3f}")
        print(f"  Gate: {result['gate_decision']}")


if __name__ == '__main__':
    main()
