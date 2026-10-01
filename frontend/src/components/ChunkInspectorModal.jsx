import React from 'react';
import { X, Copy, Check, FileText, Database, ShieldCheck } from 'lucide-react';

export default function ChunkInspectorModal({ chunk, onClose }) {
  const [copied, setCopied] = React.useState(false);

  if (!chunk) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(chunk.full_text || chunk.preview || '');
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.75)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
      padding: '20px'
    }}>
      <div className="panel" style={{
        maxWidth: '750px',
        width: '100%',
        maxHeight: '85vh',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: 'var(--shadow-lg)'
      }}>
        {/* Header */}
        <div className="panel-header" style={{ padding: '12px 18px' }}>
          <div className="panel-title">
            <FileText size={14} color="#3b82f6" />
            Vector Context Chunk Audit Inspector
          </div>
          <button
            onClick={onClose}
            className="btn btn-secondary"
            style={{ padding: '3px 7px' }}
          >
            <X size={14} />
          </button>
        </div>

        {/* Technical Metadata Bar */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: '8px',
          padding: '12px 18px',
          background: '#070b12',
          borderBottom: '1px solid var(--border-default)',
          fontSize: '0.72rem'
        }}>
          <div>
            <span style={{ color: 'var(--text-dim)', display: 'block' }}>Source Artifact</span>
            <span style={{ fontWeight: '500', color: 'var(--text-primary)' }}>{chunk.doc_name}</span>
          </div>
          <div>
            <span style={{ color: 'var(--text-dim)', display: 'block' }}>Document Page</span>
            <span style={{ fontFamily: 'var(--font-mono)', color: '#60a5fa' }}>Page {chunk.page_number}</span>
          </div>
          <div>
            <span style={{ color: 'var(--text-dim)', display: 'block' }}>Cosine Match</span>
            <span style={{ fontFamily: 'var(--font-mono)', color: '#34d399', fontWeight: '600' }}>
              {Math.round((chunk.score || 0.8) * 100)}% Match
            </span>
          </div>
          <div>
            <span style={{ color: 'var(--text-dim)', display: 'block' }}>Chunk Identifier</span>
            <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>{chunk.chunk_id}</span>
          </div>
        </div>

        {/* Chunk Content */}
        <div style={{
          flex: 1,
          overflowY: 'auto',
          padding: '18px',
          fontSize: '0.84rem',
          lineHeight: '1.65',
          color: '#cbd5e1',
          whiteSpace: 'pre-wrap',
          fontFamily: 'var(--font-mono)',
          background: '#090e18'
        }}>
          {chunk.full_text || chunk.preview}
        </div>

        {/* Footer */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '12px 18px',
          borderTop: '1px solid var(--border-default)',
          background: 'var(--bg-surface)'
        }}>
          <span style={{ fontSize: '0.72rem', color: 'var(--text-dim)' }}>
            Payload Length: {(chunk.full_text || chunk.preview || '').length} characters
          </span>
          <button
            onClick={handleCopy}
            className="btn btn-secondary"
            style={{ fontSize: '0.75rem', padding: '4px 10px' }}
          >
            {copied ? <Check size={12} color="#10b981" /> : <Copy size={12} />}
            {copied ? 'Copied Full Chunk' : 'Copy Chunk Text'}
          </button>
        </div>
      </div>
    </div>
  );
}
