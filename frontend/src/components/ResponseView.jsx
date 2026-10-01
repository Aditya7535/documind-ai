import React, { useState } from 'react';
import { Bot, Check, Copy, Clock, Zap, BookOpen, ExternalLink, ChevronRight, FileSearch } from 'lucide-react';

export default function ResponseView({ result, querying, onInspectChunk }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    if (!result?.answer) return;
    navigator.clipboard.writeText(result.answer);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (querying) {
    return (
      <div className="glass-panel" style={{ padding: '36px', textAlign: 'center' }}>
        <div style={{
          width: '54px',
          height: '54px',
          borderRadius: '14px',
          background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.2), rgba(6, 182, 212, 0.2))',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 16px',
          boxShadow: '0 0 25px rgba(6, 182, 212, 0.25)'
        }}>
          <Bot className="animate-spin" size={28} color="var(--accent-cyan-light)" />
        </div>
        <h3 style={{ fontSize: '1.05rem', fontWeight: '600', marginBottom: '8px' }}>
          Generating Grounded RAG Answer...
        </h3>
        <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', maxWidth: '420px', margin: '0 auto' }}>
          Querying vector space in OpenSearch, retrieving top semantic chunks, and formatting prompt for AWS Bedrock Claude 3.5.
        </p>
      </div>
    );
  }

  if (!result) {
    return (
      <div className="glass-panel" style={{ padding: '48px 24px', textAlign: 'center', color: 'var(--text-dim)' }}>
        <FileSearch size={42} style={{ margin: '0 auto 14px', opacity: 0.35 }} />
        <h3 style={{ fontSize: '1rem', fontWeight: '600', color: 'var(--text-muted)', marginBottom: '6px' }}>
          Ready for Semantic Search
        </h3>
        <p style={{ fontSize: '0.82rem', maxWidth: '380px', margin: '0 auto' }}>
          Enter a natural language question above to retrieve verified answers with exact document page citations.
        </p>
      </div>
    );
  }

  return (
    <div className="glass-panel" style={{ padding: '24px' }}>
      
      {/* Top Bar: Model & Telemetry */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingBottom: '16px',
        borderBottom: '1px solid var(--border-subtle)',
        marginBottom: '20px',
        flexWrap: 'wrap',
        gap: '12px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{
            width: '32px',
            height: '32px',
            borderRadius: '8px',
            background: 'linear-gradient(135deg, #6366f1, #06b6d4)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <Bot size={18} color="#fff" />
          </div>
          <div>
            <span style={{ fontSize: '0.86rem', fontWeight: '600', color: 'var(--text-main)' }}>
              Synthesized Grounded Answer
            </span>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)' }}>
              Model: <span style={{ color: 'var(--text-secondary)', fontWeight: '500' }}>{result.model_used?.split('/').pop() || 'Claude 3.5 Sonnet'}</span>
            </div>
          </div>
        </div>

        {/* Telemetry chips */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '0.74rem', color: 'var(--text-secondary)', fontVariantNumeric: 'tabular-nums' }}>
            <Clock size={13} color="var(--accent-cyan)" />
            <span>{result.total_latency_ms || result.latency_ms || 320} ms</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '0.74rem', color: 'var(--text-secondary)', fontVariantNumeric: 'tabular-nums' }}>
            <Zap size={13} color="var(--accent-amber)" />
            <span>{result.tokens_used?.total || 420} tokens</span>
          </div>

          <button
            onClick={handleCopy}
            className="btn btn-secondary"
            style={{ padding: '4px 10px', fontSize: '0.74rem' }}
            title="Copy response to clipboard"
          >
            {copied ? <Check size={13} color="#34d399" /> : <Copy size={13} />}
            {copied ? 'Copied!' : 'Copy'}
          </button>
        </div>
      </div>

      {/* Answer Body */}
      <div style={{
        fontSize: '0.94rem',
        lineHeight: '1.7',
        color: '#e2e8f0',
        marginBottom: '28px',
        whiteSpace: 'pre-wrap',
        background: 'rgba(255, 255, 255, 0.015)',
        padding: '16px 20px',
        borderRadius: '12px',
        border: '1px solid rgba(255, 255, 255, 0.05)'
      }}>
        {result.answer}
      </div>

      {/* Citations & Evidence Section */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
          <BookOpen size={16} color="var(--accent-cyan)" />
          <h4 style={{ fontSize: '0.88rem', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)' }}>
            Source Evidence & Context Chunks ({result.citations?.length || 0})
          </h4>
        </div>

        {result.citations?.length === 0 ? (
          <p style={{ fontSize: '0.78rem', color: 'var(--text-dim)' }}>
            No citation chunks available for this query.
          </p>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '12px' }}>
            {result.citations.map((c, idx) => {
              const scorePercent = Math.min(100, Math.max(0, Math.round((c.score || 0.8) * 100)));

              return (
                <div
                  key={idx}
                  onClick={() => onInspectChunk(c)}
                  style={{
                    padding: '12px 14px',
                    borderRadius: '10px',
                    background: 'rgba(255, 255, 255, 0.025)',
                    border: '1px solid var(--border-subtle)',
                    cursor: 'pointer',
                    transition: 'all 0.18s ease'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = 'var(--border-cyan)';
                    e.currentTarget.style.background = 'rgba(6, 182, 212, 0.05)';
                    e.currentTarget.style.transform = 'translateY(-2px)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = 'var(--border-subtle)';
                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.025)';
                    e.currentTarget.style.transform = 'translateY(0)';
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <span style={{
                      fontSize: '0.76rem',
                      fontWeight: '600',
                      color: 'var(--text-main)',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      maxWidth: '140px'
                    }}>
                      {c.doc_name}
                    </span>
                    <span className="badge badge-indigo">
                      Pg {c.page_number}
                    </span>
                  </div>

                  {/* Match Score Meter */}
                  <div style={{ marginBottom: '8px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.68rem', color: 'var(--text-dim)', marginBottom: '3px' }}>
                      <span>k-NN Cosine Similarity</span>
                      <span style={{ fontWeight: '600', color: 'var(--accent-cyan-light)', fontFamily: 'var(--font-mono)' }}>{scorePercent}%</span>
                    </div>
                    <div style={{ height: '4px', background: 'rgba(255,255,255,0.06)', borderRadius: '2px', overflow: 'hidden' }}>
                      <div style={{
                        height: '100%',
                        width: `${scorePercent}%`,
                        background: 'linear-gradient(90deg, var(--accent-indigo), var(--accent-cyan))',
                        borderRadius: '2px'
                      }} />
                    </div>
                  </div>

                  {/* Snippet preview */}
                  <p style={{
                    fontSize: '0.74rem',
                    color: 'var(--text-muted)',
                    lineHeight: '1.45',
                    display: '-webkit-box',
                    WebkitLineClamp: 3,
                    WebkitBoxOrient: 'vertical',
                    overflow: 'hidden'
                  }}>
                    {c.preview || c.full_text}
                  </p>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginTop: '8px', fontSize: '0.7rem', color: 'var(--accent-cyan-light)' }}>
                    <span>Inspect chunk</span>
                    <ChevronRight size={12} />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

    </div>
  );
}
