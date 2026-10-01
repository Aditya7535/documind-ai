#!/usr/bin/env python3
import boto3
import sys

def test():
    print("Testing AWS Credentials...")
    try:
        sts = boto3.client("sts")
        id_info = sts.get_caller_identity()
        print("\033[92m[SUCCESS] AWS Identity Verified!\033[0m")
        print(f"Account: {id_info.get('Account')}")
        print(f"ARN:     {id_info.get('Arn')}")
        print(f"User ID: {id_info.get('UserId')}")
        return True
    except Exception as e:
        print(f"\033[91m[ERROR] Failed to authenticate: {e}\033[0m")
        return False

if __name__ == "__main__":
    success = test()
    sys.exit(0 if success else 1)
