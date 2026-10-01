#!/usr/bin/env python3
"""
DocuMind AI: Automated AWS CDK Deployment & Verification Pipeline
Checks AWS credentials, validates STS identity, installs CDK dependencies, and executes cdk deploy.
"""
import os
import sys
import subprocess
import json

def log(msg, status="INFO"):
    colors = {"INFO": "\033[94m", "SUCCESS": "\033[92m", "WARN": "\033[93m", "ERROR": "\033[91m"}
    reset = "\033[0m"
    print(f"{colors.get(status, '')}[{status}]{reset} {msg}")

def check_aws_credentials():
    log("Verifying AWS caller identity with STS...")
    try:
        import boto3
        sts = boto3.client("sts")
        identity = sts.get_caller_identity()
        log(f"Authenticated as: {identity.get('Arn')}", "SUCCESS")
        log(f"AWS Account ID: {identity.get('Account')} | Region: {sts.meta.region_name}")
        return True, identity
    except Exception as e:
        log(f"AWS Authentication failed: {e}", "ERROR")
        return False, None

def deploy_cdk(infra_dir):
    log("Installing AWS CDK TypeScript dependencies...")
    subprocess.run(["npm", "install"], cwd=infra_dir, check=True, shell=True)

    log("Synthesizing CloudFormation template...")
    subprocess.run(["npx", "cdk", "synth"], cwd=infra_dir, check=True, shell=True)

    log("Deploying DocuMindRAGStack to AWS...")
    cmd = ["npx", "cdk", "deploy", "--require-approval", "never", "--outputs-file", "cdk-outputs.json"]
    subprocess.run(cmd, cwd=infra_dir, check=True, shell=True)

    outputs_path = os.path.join(infra_dir, "cdk-outputs.json")
    if os.path.exists(outputs_path):
        with open(outputs_path, "r") as f:
            outputs = json.load(f)
        log("Deployment Succeeded! CloudFormation Outputs:", "SUCCESS")
        print(json.dumps(outputs, indent=2))
        return outputs
    return None

if __name__ == "__main__":
    current_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    infra_dir = os.path.join(current_dir, "infra")

    is_authed, identity = check_aws_credentials()
    if not is_authed:
        print("\n" + "="*70)
        log("ACTION REQUIRED: AWS Session Token Expired / Invalid", "WARN")
        print("Your ~/.aws/credentials file contains an expired temporary session token.")
        print("Please refresh your credentials by copying fresh keys into:")
        print(f"  {os.path.expanduser('~/.aws/credentials')}")
        print("Example format:")
        print("  [default]")
        print("  aws_access_key_id = ASIA...")
        print("  aws_secret_access_key = ...")
        print("  aws_session_token = IQoJb3JpZ2luX2Vj...")
        print("="*70 + "\n")
        sys.exit(1)

    deploy_cdk(infra_dir)
