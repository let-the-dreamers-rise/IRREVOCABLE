"""
Question Depth Classifier Training Script
Azure ML Training Pipeline for FCS System

This classifier evaluates user questions during the reflection arc.
Shallow questions are rejected with guidance; deep questions proceed.

Dimensions:
- Specificity: Is this question concrete or vague?
- Introspective Depth: Does it probe internal experience?
- Non-Leading Phrasing: Does it avoid seeking advice/prediction?

Output: Question Depth Score (0.0-1.0)
Gate Threshold: 0.6
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
    """Load labeled question data from JSONL file."""
    texts = []
    scores = []
    rejection_data = []
    
    with open(data_path, 'r', encoding='utf-8') as f:
        for line in f:
            item = json.loads(line.strip())
            texts.append(item['text'])
            scores.append(item['score'])
            
            # Store rejection info for shallow questions
            if item.get('rejection_reason'):
                rejection_data.append({
                    'text': item['text'],
                    'reason': item['rejection_reason'],
                    'guidance': item.get('guidance', '')
                })
    
    return texts, np.array(scores), rejection_data


def create_binary_labels(scores: np.ndarray, threshold: float = 0.6):
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
    
    print("\n=== Question Depth Classifier Evaluation ===")
    print(f"Accuracy: {accuracy_score(y_test, predictions):.3f}")
    print("\nClassification Report:")
    print(classification_report(y_test, predictions, 
                                target_names=['Shallow (< 0.6)', 'Deep (>= 0.6)']))
    
    return predictions


def get_depth_score(pipeline, text: str) -> dict:
    """Get depth score for a single question."""
    proba = pipeline.predict_proba([text])[0]
    score = proba[1]  # Probability of class 1 (deep)
    
    return {
        'text': text,
        'depth_score': float(score),
        'gate_decision': 'PROCEED' if score >= 0.6 else 'REJECT',
        'confidence': float(max(proba))
    }


def main():
    parser = argparse.ArgumentParser(description='Train Question Depth Classifier')
    parser.add_argument('--data-path', type=str, 
                        default='data/question_depth_labels.jsonl',
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
    texts, scores, rejection_data = load_training_data(args.data_path)
    print(f"Loaded {len(texts)} examples")
    print(f"Questions with rejection guidance: {len(rejection_data)}")
    
    # Convert to binary labels (threshold 0.6 for questions)
    labels = create_binary_labels(scores, threshold=0.6)
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
    model_path = os.path.join(args.output_dir, 'question_depth_model.joblib')
    joblib.dump(pipeline, model_path)
    print(f"\nModel saved to: {model_path}")
    
    # Save rejection guidance mapping
    guidance_path = os.path.join(args.output_dir, 'question_rejection_guidance.json')
    with open(guidance_path, 'w') as f:
        json.dump(rejection_data, f, indent=2)
    print(f"Rejection guidance saved to: {guidance_path}")
    
    # Test with sample questions
    print("\n=== Sample Predictions ===")
    test_questions = [
        "Will I be happy?",
        "What might I find myself thinking about in quiet moments?",
        "Should I do this?",
        "How might my sense of identity have shifted in ways I didn't anticipate?"
    ]
    
    for question in test_questions:
        result = get_depth_score(pipeline, question)
        print(f"\nQuestion: {result['text'][:60]}...")
        print(f"  Score: {result['depth_score']:.3f}")
        print(f"  Gate: {result['gate_decision']}")


if __name__ == '__main__':
    main()
