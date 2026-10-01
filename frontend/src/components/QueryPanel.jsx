import React, { useState } from 'react';
import { Search, Sliders, Sparkles, Send, RefreshCw } from 'lucide-react';

const SAMPLE_QUERIES = [
  "What is the SLA uptime commitment and monthly credit schedule?",
  "What was Q4 revenue and Adjusted EBITDA margin for Meridian?",
  "How does Titan Text Embeddings v2 optimize vector storage and latency?",
  "What are the data privacy clauses regarding AI model training?"
];

export default function QueryPanel({ onQuery, querying, stats }) {
  const [queryText, setQueryText] = useState('');
  const [modelId, setModelId] = useState('anthropic.claude-3-5-sonnet-20240620-v1:0');
  const [topK, setTopK] = useState(4);
  const [threshold, setThreshold] = useState(0.40);
  const [showSettings, setShowSettings] = useState(false);

  const handleSubmit = (e) => {
    e?.preventDefault();
    if (!queryText.trim() || querying) return;
    onQuery({
      query: queryText,
      top_k: parseInt(topK),
      similarity_threshold: parseFloat(threshold),
      model_id: modelId
    });
  };

  const handleChipClick = (q) => {
    setQueryText(q);
    onQuery({
      query: q,
      top_k: parseInt(topK),
      similarity_threshold: parseFloat(threshold),
      model_id: modelId
    });
  };

  return (
    <div className="glass-panel" style={{ padding: '22px', marginBottom: '24px' }}>
      
      {/* Top Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Sparkles size={18} color="var(--accent-indigo)" />
          <h2 style={{ fontSize: '1.05rem', fontWeight: '600' }}>Semantic RAG Query Engine</h2>
        </div>
        <button
          type="button"
          onClick={() => setShowSettings(!showSettings)}
          className="btn btn-secondary"
          style={{ padding: '6px 12px', fontSize: '0.8rem' }}
        >
          <Sliders size={14} />
          {showSettings ? 'Hide Parameters' : 'RAG Parameters'}
        </button>
      </div>

      {/* Advanced Settings Drawer */}
      {showSettings && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '16px',
          padding: '16px',
          background: 'rgba(255, 255, 255, 0.02)',
          border: '1px solid var(--border-subtle)',
          borderRadius: '12px',
          marginBottom: '16px'
        }}>
          {/* Bedrock Model Selector */}
          <div>
            <label style={{ display: 'block', fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '6px' }}>
              Bedrock LLM Model
            </label>
            <select
              value={modelId}
              onChange={(e) => setModelId(e.target.value)}
              style={{
                width: '100%',
                padding: '8px 12px',
                background: 'var(--surface-hover)',
                border: '1px solid var(--border-subtle)',
                borderRadius: '8px',
                color: 'var(--text-main)',
                fontFamily: 'var(--font-sans)',
                fontSize: '0.82rem',
                outline: 'none'
              }}
            >
              <option value="anthropic.claude-3-5-sonnet-20240620-v1:0">Anthropic Claude 3.5 Sonnet</option>
              <option value="anthropic.claude-3-haiku-20240307-v1:0">Anthropic Claude 3 Haiku (Fast)</option>
              <option value="meta.llama3-70b-instruct-v1:0">Meta Llama 3 70B Instruct</option>
              <option value="amazon.titan-text-express-v1">Amazon Titan Text Express</option>
            </select>
          </div>

          {/* Top-K Chunks */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '6px' }}>
              <span>Top-K Retrieved Chunks</span>
              <span style={{ fontWeight: '600', color: 'var(--accent-cyan-light)', fontFamily: 'var(--font-mono)' }}>{topK}</span>
            </div>
            <input
              type="range"
              min="1"
              max="8"
              step="1"
              value={topK}
              onChange={(e) => setTopK(e.target.value)}
              style={{ width: '100%', accentColor: 'var(--accent-cyan)' }}
            />
          </div>

          {/* Similarity Threshold */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '6px' }}>
              <span>Similarity Cutoff Threshold</span>
              <span style={{ fontWeight: '600', color: 'var(--accent-indigo-light)', fontFamily: 'var(--font-mono)' }}>{threshold}</span>
            </div>
            <input
              type="range"
              min="0.10"
              max="0.80"
              step="0.05"
              value={threshold}
              onChange={(e) => setThreshold(e.target.value)}
              style={{ width: '100%', accentColor: 'var(--accent-indigo)' }}
            />
          </div>
        </div>
      )}

      {/* Search Input Box */}
      <form onSubmit={handleSubmit} style={{ position: 'relative' }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          background: 'rgba(255, 255, 255, 0.04)',
          border: '1px solid var(--border-subtle)',
          borderRadius: '12px',
          padding: '6px 8px 6px 16px',
          boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.3)',
          transition: 'border-color 0.2s ease'
        }}>
          <Search size={18} color="var(--text-dim)" style={{ flexShrink: 0, marginRight: '10px' }} />
          <input
            type="text"
            value={queryText}
            onChange={(e) => setQueryText(e.target.value)}
            placeholder="Ask anything about uploaded documents (e.g. financial metrics, SLA terms, architecture)..."
            disabled={querying}
            style={{
              flex: 1,
              background: 'transparent',
              border: 'none',
              color: 'var(--text-main)',
              fontSize: '0.94rem',
              fontFamily: 'var(--font-sans)',
              outline: 'none',
              padding: '6px 0'
            }}
          />
          <button
            type="submit"
            disabled={querying || !queryText.trim()}
            className="btn btn-primary"
            style={{ padding: '8px 18px', fontSize: '0.86rem' }}
          >
            {querying ? (
              <>
                <RefreshCw size={15} className="animate-spin" />
                Thinking...
              </>
            ) : (
              <>
                <Send size={15} />
                Ask RAG
              </>
            )}
          </button>
        </div>
      </form>

      {/* Quick Example Chips */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginTop: '14px' }}>
        <span style={{ fontSize: '0.74rem', color: 'var(--text-dim)' }}>Try asking:</span>
        {SAMPLE_QUERIES.map((sq, i) => (
          <button
            key={i}
            type="button"
            onClick={() => handleChipClick(sq)}
            style={{
              background: 'rgba(255, 255, 255, 0.03)',
              border: '1px solid var(--border-subtle)',
              borderRadius: '9999px',
              padding: '4px 10px',
              fontSize: '0.74rem',
              color: 'var(--text-muted)',
              cursor: 'pointer',
              transition: 'all 0.15s ease'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = 'var(--accent-cyan)';
              e.currentTarget.style.color = '#fff';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = 'var(--border-subtle)';
              e.currentTarget.style.color = 'var(--text-muted)';
            }}
          >
            {sq}
          </button>
        ))}
      </div>

    </div>
  );
}
