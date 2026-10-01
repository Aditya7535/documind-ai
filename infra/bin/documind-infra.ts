#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { DocuMindStack } from '../lib/documind-stack';

const app = new cdk.App();

new DocuMindStack(app, 'DocuMindRAGStack', {
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION || 'us-east-1',
  },
  description: 'Enterprise GenAI RAG Document Q&A Search Engine using AWS Bedrock, OpenSearch Serverless, Lambda and S3',
});
