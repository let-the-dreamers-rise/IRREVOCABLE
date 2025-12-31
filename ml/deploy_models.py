"""
Azure ML Model Deployment Script - Serverless Version
Deploys all three FCS classifiers using serverless compute (works with Azure for Students)

Usage:
    python deploy_models.py --subscription-id <sub> --resource-group <rg> --workspace-name <ws>
"""

import os
import argparse
import json
from azure.ai.ml import MLClient
from azure.ai.ml.entities import Model, Environment
from azure.identity import InteractiveBrowserCredential


def get_ml_client(subscription_id: str, resource_group: str, workspace_name: str):
    """Initialize Azure ML client using browser-based authentication."""
    credential = InteractiveBrowserCredential(
        tenant_id="b9137729-8875-4996-ab9e-86adc5250fd8"
    )
    return MLClient(
        credential=credential,
        subscription_id=subscription_id,
        resource_group_name=resource_group,
        workspace_name=workspace_name
    )


def register_model(ml_client: MLClient, model_name: str, model_path: str):
    """Register a model in Azure ML."""
    print(f"Registering model: {model_name}")
    
    model = Model(
        name=model_name,
        path=model_path,
        description=f"FCS {model_name} classifier for Future Context Snapshot system"
    )
    
    registered_model = ml_client.models.create_or_update(model)
    print(f"  Model registered: {registered_model.name} (version {registered_model.version})")
    return registered_model


def create_environment(ml_client: MLClient, env_name: str):
    """Create a conda environment for scoring."""
    print(f"Creating environment: {env_name}")
    
    env = Environment(
        name=env_name,
        conda_file="conda.yaml",
        image="mcr.microsoft.com/azureml/openmpi4.1.0-ubuntu20.04:latest",
        description="Environment for FCS classifiers"
    )
    
    registered_env = ml_client.environments.create_or_update(env)
    print(f"  Environment created: {registered_env.name} (version {registered_env.version})")
    return registered_env


def main():
    parser = argparse.ArgumentParser(description='Deploy FCS ML Models to Azure')
    parser.add_argument('--subscription-id', type=str, required=True)
    parser.add_argument('--resource-group', type=str, required=True)
    parser.add_argument('--workspace-name', type=str, required=True)
    parser.add_argument('--models-dir', type=str, default='outputs')
    args = parser.parse_args()
    
    print("Connecting to Azure ML workspace...")
    ml_client = get_ml_client(
        args.subscription_id,
        args.resource_group,
        args.workspace_name
    )
    
    print(f"Connected to workspace: {args.workspace_name}")
    print()
    
    # Create shared environment
    print("=== Creating Scoring Environment ===")
    env = create_environment(ml_client, "fcs-classifier-env")
    print()
    
    # Register all models
    models_info = [
        ("decision-gravity-classifier", "decision_gravity_model.joblib"),
        ("question-depth-classifier", "question_depth_model.joblib"),
        ("consequence-depth-classifier", "consequence_depth_model.joblib")
    ]
    
    registered_models = {}
    
    for model_name, model_file in models_info:
        print(f"=== Registering {model_name} ===")
        model_path = os.path.join(args.models_dir, model_file)
        
        if not os.path.exists(model_path):
            print(f"  WARNING: Model file not found: {model_path}")
            print(f"  Skipping {model_name}")
            continue
            
        model = register_model(ml_client, model_name, model_path)
        registered_models[model_name] = {
            "name": model.name,
            "version": model.version,
            "id": model.id
        }
        print()
    
    # Save model info for later use
    config_path = os.path.join(args.models_dir, "azure_models_config.json")
    config = {
        "workspace": args.workspace_name,
        "resource_group": args.resource_group,
        "subscription_id": args.subscription_id,
        "environment": {
            "name": env.name,
            "version": env.version
        },
        "models": registered_models
    }
    
    with open(config_path, 'w') as f:
        json.dump(config, f, indent=2)
    
    print("=== Deployment Summary ===")
    print(f"Workspace: {args.workspace_name}")
    print(f"Environment: {env.name} (v{env.version})")
    print(f"Models registered: {len(registered_models)}")
    for name, info in registered_models.items():
        print(f"  - {name} (v{info['version']})")
    print()
    print(f"Configuration saved to: {config_path}")
    print()
    print("NOTE: For MVP demo, models will be loaded locally or via batch inference.")
    print("      Managed endpoints require paid compute which isn't available on Azure for Students.")
    print()
    print("=== All models registered successfully! ===")


if __name__ == '__main__':
    main()
