import React, { useState } from 'react';
import { Send, SlidersHorizontal, Terminal, Clock, Check, Copy, FileText, ChevronRight, Eye, RefreshCw, BarChart2, ShieldCheck, Database, Code } from 'lucide-react';

const BENCHMARK_QUERIES = [
  { label: "SLA Commitments", query: "What is the SLA uptime commitment and monthly credit schedule?" },
  { label: "Financial Metrics", query: "What was Q4 revenue and Adjusted EBITDA margin for Meridian?" },
  { label: "Titan Optimization", query: "How does Titan Text Embeddings v2 optimize vector storage and latency?" },
  { label: "AI Data Privacy", query: "What are the data privacy clauses regarding AI model training?" }
];

export default function QueryWorkbench({ onQuery, querying, result, onInspectChunk, stats }) {
  const [queryText, setQueryText] = useState('');
  const [modelId, setModelId] = useState('anthropic.claude-3-5-sonnet-20240620-v1:0');
  const [topK, setTopK] = useState(4);
  const [threshold, setThreshold] = useState(0.10);
  const [temperature, setTemperature] = useState(0.2);
  const [showSystemPrompt, setShowSystemPrompt] = useState(false);
  const [activeTab, setActiveTab] = useState('answer'); // 'answer' | 'retrieval' | 'raw_payload'
  const [copied, setCopied] = useState(false);

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

  const handleCopy = () => {
    if (!result?.answer) return;
    navigator.clipboard.writeText(result.answer);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      
      {/* Upper Grid: Left Formulator & Right Answer Output */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(380px, 450px) 1fr', gap: '16px', alignItems: 'stretch' }}>
        
        {/* Left Column: Query Config & Formulation */}
        <div className="panel" style={{ display: 'flex', flexDirection: 'column' }}>
          <div className="panel-header">
            <div className="panel-title">
              <Terminal size={14} color="#3b82f6" />
              RAG Prompt & Model Formulation
            </div>
            <button
              onClick={() => setShowSystemPrompt(!showSystemPrompt)}
              className="btn btn-secondary"
              style={{ fontSize: '0.72rem', padding: '3px 8px' }}
            >
              <Code size={12} />
              {showSystemPrompt ? 'Hide System Prompt' : 'System Prompt'}
            </button>
          </div>

          <form onSubmit={handleSubmit} style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '14px', flex: 1 }}>
            
            {/* System Prompt Collapsible */}
            {showSystemPrompt && (
              <div style={{
                background: '#070b12',
                border: '1px solid var(--border-default)',
                borderRadius: '4px',
                padding: '10px 12px',
                fontSize: '0.74rem',
                color: 'var(--text-muted)',
                fontFamily: 'var(--font-mono)',
                lineHeight: '1.45'
              }}>
                <div style={{ color: 'var(--text-dim)', marginBottom: '4px', textTransform: 'uppercase', fontSize: '0.68rem' }}>
                  Bedrock System Directive
                </div>
                You are DocuMind AI, an enterprise RAG assistant deployed on AWS Bedrock. Answer the user question strictly using the provided context chunks. Always cite source chunks inline as [Chunk: &lt;id&gt;, Page: &lt;page&gt;]. Reject ungrounded claims.
              </div>
            )}

            {/* Model Configuration Dropdown */}
            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '500', color: 'var(--text-secondary)', marginBottom: '5px' }}>
                Foundation Model (AWS Bedrock)
              </label>
              <select
                value={modelId}
                onChange={(e) => setModelId(e.target.value)}
                className="select-control"
                style={{ width: '100%' }}
              >
                <option value="anthropic.claude-3-5-sonnet-20240620-v1:0">anthropic.claude-3-5-sonnet-20240620-v1:0 (Default)</option>
                <option value="anthropic.claude-3-haiku-20240307-v1:0">anthropic.claude-3-haiku-20240307-v1:0 (Low Latency)</option>
                <option value="meta.llama3-70b-instruct-v1:0">meta.llama3-70b-instruct-v1:0</option>
                <option value="amazon.titan-text-express-v1">amazon.titan-text-express-v1</option>
              </select>
            </div>

            {/* Hyperparameters Grid */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '12px',
              padding: '12px',
              background: 'rgba(255,255,255,0.015)',
              border: '1px solid var(--border-muted)',
              borderRadius: '4px'
            }}>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: '4px' }}>
                  <span>Top-K Neighbors</span>
                  <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-primary)' }}>{topK}</span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="8"
                  value={topK}
                  onChange={(e) => setTopK(e.target.value)}
                  style={{ width: '100%', accentColor: '#2563eb' }}
                />
              </div>

              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: '4px' }}>
                  <span>Cosine Cutoff</span>
                  <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-primary)' }}>{threshold}</span>
                </div>
                <input
                  type="range"
                  min="0.10"
                  max="0.80"
                  step="0.05"
                  value={threshold}
                  onChange={(e) => setThreshold(e.target.value)}
                  style={{ width: '100%', accentColor: '#2563eb' }}
                />
              </div>
            </div>

            {/* Input Prompt Box */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '500', color: 'var(--text-secondary)', marginBottom: '5px' }}>
                Natural Language Query
              </label>
              <textarea
                value={queryText}
                onChange={(e) => setQueryText(e.target.value)}
                placeholder="Submit an enterprise query to test vector retrieval and Bedrock inference..."
                disabled={querying}
                rows={4}
                className="input-text"
                style={{ resize: 'vertical', fontFamily: 'var(--font-sans)', fontSize: '0.82rem', flex: 1, minHeight: '80px' }}
              />
            </div>

            {/* Benchmark Queries */}
            <div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)', textTransform: 'uppercase', marginBottom: '6px', fontWeight: '600' }}>
                Benchmark Test Cases
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                {BENCHMARK_QUERIES.map((bq, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      setQueryText(bq.query);
                      onQuery({ query: bq.query, top_k: parseInt(topK), similarity_threshold: parseFloat(threshold), model_id: modelId });
                    }}
                    style={{
                      background: '#131b2c',
                      border: '1px solid var(--border-default)',
                      borderRadius: '3px',
                      padding: '3px 8px',
                      fontSize: '0.72rem',
                      color: 'var(--text-secondary)',
                      cursor: 'pointer',
                      textAlign: 'left'
                    }}
                  >
                    {bq.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Submit Bar */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: '6px' }}>
              <button
                type="submit"
                disabled={querying || !queryText.trim()}
                className="btn btn-primary"
                style={{ width: '100%', padding: '8px 14px' }}
              >
                {querying ? (
                  <>
                    <RefreshCw size={13} className="animate-spin" />
                    Executing RAG Pipeline...
                  </>
                ) : (
                  <>
                    <Send size={13} />
                    Execute Vector Search & Inference
                  </>
                )}
              </button>
            </div>

          </form>
        </div>

        {/* Right Column: Grounded Answer & Evaluation */}
        <div className="panel" style={{ display: 'flex', flexDirection: 'column' }}>
          
          <div className="panel-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div className="panel-title">
                <ShieldCheck size={14} color="#10b981" />
                Grounded Model Response
              </div>
              {result && (
                <div style={{ display: 'flex', gap: '4px' }}>
                  <button
                    onClick={() => setActiveTab('answer')}
                    style={{
                      background: activeTab === 'answer' ? '#1e293b' : 'transparent',
                      border: 'none',
                      color: activeTab === 'answer' ? '#fff' : 'var(--text-muted)',
                      padding: '3px 8px',
                      borderRadius: '3px',
                      fontSize: '0.72rem',
                      cursor: 'pointer'
                    }}
                  >
                    Synthesis
                  </button>
                  <button
                    onClick={() => setActiveTab('raw_payload')}
                    style={{
                      background: activeTab === 'raw_payload' ? '#1e293b' : 'transparent',
                      border: 'none',
                      color: activeTab === 'raw_payload' ? '#fff' : 'var(--text-muted)',
                      padding: '3px 8px',
                      borderRadius: '3px',
                      fontSize: '0.72rem',
                      cursor: 'pointer'
                    }}
                  >
                    Raw Bedrock JSON
                  </button>
                </div>
              )}
            </div>

            {result && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span className="badge badge-neutral" style={{ fontFamily: 'var(--font-mono)' }}>
                  Latency: {result.total_latency_ms || result.latency_ms || 42}ms
                </span>
                <span className="badge badge-neutral" style={{ fontFamily: 'var(--font-mono)' }}>
                  Tokens: {result.tokens_used?.total || 240}
                </span>
                <button
                  onClick={handleCopy}
                  className="btn btn-secondary"
                  style={{ padding: '3px 8px', fontSize: '0.72rem' }}
                >
                  {copied ? <Check size={12} color="#10b981" /> : <Copy size={12} />}
                  {copied ? 'Copied' : 'Copy'}
                </button>
              </div>
            )}
          </div>

          {/* Response Content Area */}
          <div style={{ flex: 1, padding: '16px', overflowY: 'auto' }}>
            {querying ? (
              <div style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--text-muted)' }}>
                <RefreshCw size={24} className="animate-spin" style={{ margin: '0 auto 12px', color: '#3b82f6' }} />
                <div style={{ fontSize: '0.84rem', fontWeight: '500', color: 'var(--text-primary)' }}>
                  Executing Vector Search & Calling Bedrock Runtime
                </div>
                <div style={{ fontSize: '0.74rem', color: 'var(--text-dim)', marginTop: '4px' }}>
                  AOSS k-NN query -&gt; Titan Embeddings v2 -&gt; Claude 3.5 Sonnet context injection
                </div>
              </div>
            ) : !result ? (
              <div style={{ padding: '60px 20px', textAlign: 'center', color: 'var(--text-dim)' }}>
                <Terminal size={32} style={{ margin: '0 auto 10px', opacity: 0.35 }} />
                <div style={{ fontSize: '0.84rem', color: 'var(--text-muted)' }}>
                  Query Console Ready
                </div>
                <div style={{ fontSize: '0.74rem', marginTop: '4px' }}>
                  Select a benchmark query on the left or type a custom natural language query.
                </div>
              </div>
            ) : activeTab === 'raw_payload' ? (
              <pre style={{
                background: '#070b12',
                border: '1px solid var(--border-default)',
                borderRadius: '4px',
                padding: '12px',
                fontSize: '0.72rem',
                fontFamily: 'var(--font-mono)',
                color: '#cbd5e1',
                overflowX: 'auto',
                lineHeight: '1.45'
              }}>
                {JSON.stringify(result, null, 2)}
              </pre>
            ) : (
              <div style={{ fontSize: '0.86rem', lineHeight: '1.65', color: '#e2e8f0', whiteSpace: 'pre-wrap' }}>
                {result.answer}
              </div>
            )}
          </div>

        </div>

      </div>

      {/* Lower Panel: Retrieved Vector Context Chunks (Ranked Table) */}
      {result && result.citations && result.citations.length > 0 && (
        <div className="panel">
          <div className="panel-header">
            <div className="panel-title">
              <Database size={14} color="#0284c7" />
              Retrieved Context Chunks & Vector Distance Metrics ({result.citations.length})
            </div>
            <span style={{ fontSize: '0.72rem', color: 'var(--text-dim)' }}>
              Engine: OpenSearch Serverless (HNSW Cosine Space)
            </span>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th style={{ width: '60px' }}>Rank</th>
                  <th>Source Document</th>
                  <th style={{ width: '80px' }}>Page</th>
                  <th style={{ width: '130px' }}>Cosine Match</th>
                  <th>Extracted Chunk Context</th>
                  <th style={{ width: '90px' }}>Audit</th>
                </tr>
              </thead>
              <tbody>
                {result.citations.map((c, i) => {
                  const pct = Math.round((c.score || 0.8) * 100);
                  return (
                    <tr key={i}>
                      <td style={{ fontFamily: 'var(--font-mono)', fontWeight: '600', color: 'var(--text-muted)' }}>
                        #{i + 1}
                      </td>
                      <td style={{ fontWeight: '500', color: 'var(--text-primary)' }}>
                        {c.doc_name}
                      </td>
                      <td style={{ fontFamily: 'var(--font-mono)' }}>
                        Pg {c.page_number}
                      </td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: pct >= 50 ? '#34d399' : '#fbbf24' }}>
                            {pct}%
                          </span>
                          <div style={{ width: '50px', height: '4px', background: '#1e293b', borderRadius: '2px', overflow: 'hidden' }}>
                            <div style={{ width: `${pct}%`, height: '100%', background: '#2563eb' }} />
                          </div>
                        </div>
                      </td>
                      <td style={{ color: 'var(--text-secondary)', maxWidth: '420px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {c.preview || c.full_text}
                      </td>
                      <td>
                        <button
                          onClick={() => onInspectChunk(c)}
                          className="btn btn-secondary"
                          style={{ padding: '3px 8px', fontSize: '0.72rem' }}
                        >
                          <Eye size={12} />
                          Inspect
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

    </div>
  );
}
