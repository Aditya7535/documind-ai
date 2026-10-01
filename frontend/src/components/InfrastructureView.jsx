import React from 'react';
import { Layers, ShieldCheck, Server, Key, Cloud, Database, Lock, Code, CheckCircle2 } from 'lucide-react';

export default function InfrastructureView() {
  const cdkResources = [
    { type: 'AWS::S3::Bucket', name: 'DocuMindDocumentBucket', status: 'CREATE_COMPLETE', encryption: 'SSE-S3 / KMS Managed', desc: 'Encrypted document raw staging bucket with S3 ObjectCreated event notifications' },
    { type: 'AWS::OpenSearchServerless::Collection', name: 'documind-vectors', status: 'CREATE_COMPLETE', encryption: 'AWS Owned Key', desc: 'Vector search collection managing 512-dim HNSW index' },
    { type: 'AWS::OpenSearchServerless::SecurityPolicy', name: 'documind-vectors-enc', status: 'CREATE_COMPLETE', encryption: 'KMS Policy', desc: 'Encryption-at-rest enforcement' },
    { type: 'AWS::OpenSearchServerless::SecurityPolicy', name: 'documind-vectors-net', status: 'CREATE_COMPLETE', encryption: 'VPC / AllowFromPublic', desc: 'Network routing and ingress whitelist policy' },
    { type: 'AWS::OpenSearchServerless::AccessPolicy', name: 'documind-vectors-access', status: 'CREATE_COMPLETE', encryption: 'IAM Principal', desc: 'Data plane permissions for Lambda execution roles' },
    { type: 'AWS::Lambda::Function', name: 'DocuMindIngestFunction', status: 'CREATE_COMPLETE', encryption: 'Role Bound', desc: 'Asynchronous document parsing, Bedrock embedding, and OpenSearch ingestion' },
    { type: 'AWS::Lambda::Function', name: 'DocuMindQueryFunction', status: 'CREATE_COMPLETE', encryption: 'Role Bound', desc: 'Synchronous API Gateway vector retrieval and Claude 3.5 Sonnet prompt grounding' },
    { type: 'AWS::ApiGateway::RestApi', name: 'DocuMindRestApi', status: 'CREATE_COMPLETE', encryption: 'TLS 1.3', desc: 'REST endpoint with CORS and Lambda proxy integration' }
  ];

  const iamPolicy = {
    "Version": "2012-10-17",
    "Statement": [
      {
        "Sid": "BedrockInvokePermissions",
        "Effect": "Allow",
        "Action": [
          "bedrock:InvokeModel"
        ],
        "Resource": [
          "arn:aws:bedrock:us-east-1::foundation-model/amazon.titan-embed-text-v2:0",
          "arn:aws:bedrock:us-east-1::foundation-model/anthropic.claude-3-5-sonnet-20240620-v1:0"
        ]
      },
      {
        "Sid": "AOSSAccessPolicy",
        "Effect": "Allow",
        "Action": [
          "aoss:APIAccessAll"
        ],
        "Resource": "arn:aws:aoss:us-east-1:*:collection/documind-vectors"
      },
      {
        "Sid": "S3ObjectReadWrite",
        "Effect": "Allow",
        "Action": [
          "s3:GetObject",
          "s3:PutObject",
          "s3:DeleteObject"
        ],
        "Resource": "arn:aws:s3:::documind-documents-bucket/*"
      }
    ]
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      
      {/* Top Banner */}
      <div className="panel" style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '2px' }}>
            Infrastructure as Code (IaC) Stack
          </div>
          <div style={{ fontSize: '1.1rem', fontWeight: '600', color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>
            DocuMindRAGStack (AWS CDK v2 TypeScript)
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span className="badge badge-green">
            <CheckCircle2 size={11} />
            Stack Status: SYNCHRONIZED
          </span>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)', fontFamily: 'var(--font-mono)' }}>
            Region: us-east-1
          </span>
        </div>
      </div>

      {/* CloudFormation Resource Table */}
      <div className="panel">
        <div className="panel-header">
          <div className="panel-title">
            <Server size={14} color="#3b82f6" />
            Provisioned AWS CloudFormation Resources ({cdkResources.length})
          </div>
          <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
            Target: AWS us-east-1
          </span>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>Resource Type</th>
                <th>Logical Identifier</th>
                <th>Status</th>
                <th>Security / Encryption</th>
                <th>Purpose & Responsibility</th>
              </tr>
            </thead>
            <tbody>
              {cdkResources.map((res, i) => (
                <tr key={i}>
                  <td style={{ fontFamily: 'var(--font-mono)', fontSize: '0.74rem', color: '#60a5fa' }}>
                    {res.type}
                  </td>
                  <td style={{ fontWeight: '500', color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>
                    {res.name}
                  </td>
                  <td>
                    <span className="badge badge-green" style={{ fontSize: '0.68rem' }}>
                      {res.status}
                    </span>
                  </td>
                  <td style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    {res.encryption}
                  </td>
                  <td style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                    {res.desc}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* IAM Least-Privilege Security Policy */}
      <div className="panel">
        <div className="panel-header">
          <div className="panel-title">
            <ShieldCheck size={14} color="#10b981" />
            IAM Least-Privilege Execution Policy
          </div>
          <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
            DocuMindLambdaExecutionRole
          </span>
        </div>
        <div style={{ padding: '16px' }}>
          <pre style={{
            background: '#070b12',
            border: '1px solid var(--border-default)',
            borderRadius: '4px',
            padding: '12px',
            fontSize: '0.74rem',
            fontFamily: 'var(--font-mono)',
            color: '#cbd5e1',
            lineHeight: '1.45',
            maxHeight: '260px',
            overflowY: 'auto'
          }}>
            {JSON.stringify(iamPolicy, null, 2)}
          </pre>
        </div>
      </div>

    </div>
  );
}
