"""
Consequence Depth Classifier Training Script
Azure ML Training Pipeline for FCS System

This classifier evaluates generated reflections before delivery.
Shallow responses terminate the session; deep responses are delivered.

Dimensions:
- Emotional Specificity: Does it name specific feelings?
- Concrete Reasoning: Does it describe tangible consequences?
- Narrative Depth: Does it go beyond surface reflection?

Output: Consequence Depth Score (0.0-1.0)
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
    """Load labeled reflection data from JSONL file."""
    texts = []
    scores = []
    dimensions = []
    
    with open(data_path, 'r', encoding='utf-8') as f:
        for line in f:
            item = json.loads(line.strip())
            texts.append(item['text'])
            scores.append(item['score'])
            dimensions.append(item.get('dimensions', {}))
    
    return texts, np.array(scores), dimensions


def create_binary_labels(scores: np.ndarray, threshold: float = 0.5):
    """Convert continuous scores to binary labels for classification."""
    return (scores >= threshold).astype(int)


def train_classifier(texts, labels):
    """Train a text classification pipeline."""
    pipeline = Pipeline([
        ('tfidf', TfidfVectorizer(
            max_features=8000,
            ngram_range=(1, 4),
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
    
    print("\n=== Consequence Depth Classifier Evaluation ===")
    print(f"Accuracy: {accuracy_score(y_test, predictions):.3f}")
    print("\nClassification Report:")
    print(classification_report(y_test, predictions, 
                                target_names=['Shallow (< 0.5)', 'Deep (>= 0.5)']))
    
    return predictions


def get_depth_score(pipeline, text: str) -> dict:
    """Get consequence depth score for a single reflection."""
    proba = pipeline.predict_proba([text])[0]
    score = proba[1]  # Probability of class 1 (deep)
    
    return {
        'text': text[:100] + '...' if len(text) > 100 else text,
        'consequence_depth_score': float(score),
        'gate_decision': 'APPROVE' if score >= 0.5 else 'TERMINATE',
        'confidence': float(max(proba))
    }


def main():
    parser = argparse.ArgumentParser(description='Train Consequence Depth Classifier')
    parser.add_argument('--data-path', type=str, 
                        default='data/consequence_depth_labels.jsonl',
                        help='Path to training data')
    parser.add_argument('--output-dir', type=str, 
                        default='outputs',
                        help='Directory to save model')
    parser.add_argument('--test-size', type=float, 
                        default=0.2,
                        help='Test set proportion')
    args = parser.parse_args()
    
    os.makedirs(args.output_dir, exist_ok=True)
    
    print("Loading training data...")
    texts, scores, dimensions = load_training_data(args.data_path)
    print(f"Loaded {len(texts)} examples")
    
    # Convert to binary labels
    labels = create_binary_labels(scores, threshold=0.5)
    print(f"Class distribution: Shallow={sum(labels==0)}, Deep={sum(labels==1)}")
    
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
    model_path = os.path.join(args.output_dir, 'consequence_depth_model.joblib')
    joblib.dump(pipeline, model_path)
    print(f"\nModel saved to: {model_path}")
    
    # Test with sample reflections
    print("\n=== Sample Predictions ===")
    test_reflections = [
        "I might feel different about things.",
        "Looking back, I might find myself feeling a quiet sense of loss on Sunday mornings—those were the times we used to spend together, and now the silence feels heavier than I expected.",
        "Things could be okay.",
        "Perhaps I've discovered that grief doesn't arrive all at once—it seeps in through the cracks of ordinary moments."
    ]
    
    for reflection in test_reflections:
        result = get_depth_score(pipeline, reflection)
        print(f"\nReflection: {result['text']}")
        print(f"  Score: {result['consequence_depth_score']:.3f}")
        print(f"  Gate: {result['gate_decision']}")


if __name__ == '__main__':
    main()
