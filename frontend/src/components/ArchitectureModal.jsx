import React from 'react';
import { X, Cloud, Layers, Cpu, Database, Server, CheckCircle2, ShieldCheck, Zap } from 'lucide-react';

export default function ArchitectureModal({ isOpen, onClose }) {
  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.8)',
      backdropFilter: 'blur(10px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
      padding: '20px'
    }}>
      <div className="glass-panel" style={{
        maxWidth: '820px',
        width: '100%',
        maxHeight: '90vh',
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: '#0c111e',
        border: '1px solid rgba(255, 255, 255, 0.14)',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.9)'
      }}>
        {/* Header */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '20px 24px',
          borderBottom: '1px solid var(--border-subtle)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Cloud size={22} color="var(--accent-cyan)" />
            <div>
              <h3 style={{ fontSize: '1.15rem', fontWeight: '700' }}>AWS Cloud Architecture & RAG Pipeline</h3>
              <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                Production Blueprint for Serverless Enterprise GenAI Q&A Engine
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="btn btn-secondary"
            style={{ padding: '6px 10px', borderRadius: '8px' }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '24px', display: 'flex', flexDirection: 'column', gap: '22px' }}>
          
          {/* Architecture Pipeline Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px' }}>
            
            <div style={{ padding: '16px', background: 'rgba(255,255,255,0.02)', borderRadius: '12px', border: '1px solid var(--border-subtle)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--accent-amber)', marginBottom: '8px' }}>
                <Database size={16} />
                <h4 style={{ fontSize: '0.86rem', fontWeight: '600' }}>1. Storage & Ingestion</h4>
              </div>
              <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', lineHeight: '1.5' }}>
                PDFs uploaded to <strong>Amazon S3</strong> with SSE-KMS. S3 ObjectCreated events asynchronously invoke Ingest Lambda for recursive chunking (800 tokens, 150-token overlap).
              </p>
            </div>

            <div style={{ padding: '16px', background: 'rgba(255,255,255,0.02)', borderRadius: '12px', border: '1px solid var(--border-subtle)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--accent-cyan)', marginBottom: '8px' }}>
                <Cpu size={16} />
                <h4 style={{ fontSize: '0.86rem', fontWeight: '600' }}>2. Vector Embeddings</h4>
              </div>
              <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', lineHeight: '1.5' }}>
                <strong>AWS Bedrock Titan Text Embeddings v2</strong> generates 512-dimensional normalized vectors, cutting vector storage costs by 50% while preserving high retrieval accuracy.
              </p>
            </div>

            <div style={{ padding: '16px', background: 'rgba(255,255,255,0.02)', borderRadius: '12px', border: '1px solid var(--border-subtle)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--accent-indigo)', marginBottom: '8px' }}>
                <Server size={16} />
                <h4 style={{ fontSize: '0.86rem', fontWeight: '600' }}>3. Vector Engine</h4>
              </div>
              <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', lineHeight: '1.5' }}>
                <strong>Amazon OpenSearch Serverless (AOSS)</strong> manages HNSW indexes with cosine similarity, auto-scaling compute units (OCUs) without idle cluster costs.
              </p>
            </div>

            <div style={{ padding: '16px', background: 'rgba(255,255,255,0.02)', borderRadius: '12px', border: '1px solid var(--border-subtle)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--accent-emerald)', marginBottom: '8px' }}>
                <Zap size={16} />
                <h4 style={{ fontSize: '0.86rem', fontWeight: '600' }}>4. Grounded Inference</h4>
              </div>
              <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', lineHeight: '1.5' }}>
                <strong>AWS Bedrock Claude 3.5 Sonnet</strong> receives augmented context with strict attribution prompts, returning exact chunk citations and preventing hallucinations.
              </p>
            </div>

          </div>

          {/* Resume Engineering Takeaways */}
          <div style={{
            padding: '18px 20px',
            background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.08), rgba(6, 182, 212, 0.08))',
            borderRadius: '12px',
            border: '1px solid rgba(99, 102, 241, 0.25)'
          }}>
            <h4 style={{ fontSize: '0.92rem', fontWeight: '600', marginBottom: '10px', color: '#c7d2fe' }}>
              Resume Impact & Key Design Patterns
            </h4>
            <ul style={{ fontSize: '0.8rem', color: 'var(--text-muted)', lineHeight: '1.7', paddingLeft: '18px' }}>
              <li><strong>Zero-Idle Cost Serverless Architecture:</strong> Eliminated EC2/cluster idle costs via OpenSearch Serverless, Lambda, and on-demand Bedrock foundation models.</li>
              <li><strong>Hallucination Defense:</strong> Enforced prompt engineering contracts with inline citation brackets <code>[Chunk ID, Page #]</code> verified against vector similarity thresholds.</li>
              <li><strong>Infrastructure as Code (IaC):</strong> Fully codified in AWS CDK (TypeScript) with automated IAM least-privilege policies and AOSS data access rules.</li>
              <li><strong>Dual-Mode Portability:</strong> Local fallback engine with deterministic vector hashing allows zero-cost local iteration and offline demos.</li>
            </ul>
          </div>

        </div>

        {/* Footer */}
        <div style={{
          padding: '16px 24px',
          borderTop: '1px solid var(--border-subtle)',
          display: 'flex',
          justifyContent: 'flex-end'
        }}>
          <button onClick={onClose} className="btn btn-primary" style={{ padding: '8px 20px', fontSize: '0.84rem' }}>
            Got It
          </button>
        </div>
      </div>
    </div>
  );
}
