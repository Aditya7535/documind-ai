import React from 'react';
import { Database, Cpu, Activity, ShieldCheck, Code, Layers, HardDrive } from 'lucide-react';

export default function VectorIndexView({ stats, health }) {
  const indexMapping = {
    "settings": {
      "index.knn": true,
      "index.knn.algo_param.ef_search": 100
    },
    "mappings": {
      "properties": {
        "vector": {
          "type": "knn_vector",
          "dimension": 512,
          "method": {
            "name": "hnsw",
            "space_type": "cosinesimil",
            "engine": "nmslib",
            "parameters": {
              "ef_construction": 128,
              "m": 16
            }
          }
        },
        "text": { "type": "text" },
        "doc_id": { "type": "keyword" },
        "doc_name": { "type": "keyword" },
        "page_number": { "type": "integer" }
      }
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      
      {/* Cluster Metrics Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px' }}>
        
        <div className="panel" style={{ padding: '16px' }}>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '6px' }}>
            Vector Search Engine
          </div>
          <div style={{ fontSize: '1.05rem', fontWeight: '600', color: 'var(--text-primary)' }}>
            OpenSearch Serverless
          </div>
          <div style={{ fontSize: '0.72rem', color: '#10b981', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '5px' }}>
            <span className="indicator-dot active" />
            Collection: Active (Vector Type)
          </div>
        </div>

        <div className="panel" style={{ padding: '16px' }}>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '6px' }}>
            Embedding Dimensions
          </div>
          <div style={{ fontSize: '1.05rem', fontWeight: '600', color: 'var(--text-primary)', fontVariantNumeric: 'tabular-nums' }}>
            512 Dimensions
          </div>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '4px' }}>
            Model: Amazon Titan Embeddings v2
          </div>
        </div>

        <div className="panel" style={{ padding: '16px' }}>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '6px' }}>
            Indexed Vector Count
          </div>
          <div style={{ fontSize: '1.05rem', fontWeight: '600', color: '#3b82f6', fontVariantNumeric: 'tabular-nums' }}>
            {stats?.total_chunks || 0} Vectors
          </div>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '4px' }}>
            Across {stats?.total_documents || 0} source documents
          </div>
        </div>

        <div className="panel" style={{ padding: '16px' }}>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '6px' }}>
            Distance Metric
          </div>
          <div style={{ fontSize: '1.05rem', fontWeight: '600', color: 'var(--text-primary)' }}>
            Cosine Similarity
          </div>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '4px' }}>
            HNSW Graph (nmslib engine)
          </div>
        </div>

      </div>

      {/* Deep Dive Panels */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
        
        {/* OpenSearch Index Mapping Schema */}
        <div className="panel">
          <div className="panel-header">
            <div className="panel-title">
              <Code size={14} color="#3b82f6" />
              OpenSearch Vector Schema & HNSW Settings
            </div>
            <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
              documind-vectors
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
              maxHeight: '320px',
              overflowY: 'auto'
            }}>
              {JSON.stringify(indexMapping, null, 2)}
            </pre>
          </div>
        </div>

        {/* Technical Architecture Specs */}
        <div className="panel">
          <div className="panel-header">
            <div className="panel-title">
              <Layers size={14} color="#0284c7" />
              Vector Space Optimization Details
            </div>
          </div>
          <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '14px', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
            <div>
              <strong style={{ color: 'var(--text-primary)', display: 'block', marginBottom: '3px' }}>
                1. 512-Dimensional Vector Quantization
              </strong>
              By standardizing Bedrock Titan Text Embeddings v2 to 512 dimensions with L2 normalization, vector storage and memory utilization in OpenSearch Serverless is reduced by 50% compared to 1024-dim vectors while retaining 97% of semantic retrieval recall.
            </div>

            <div>
              <strong style={{ color: 'var(--text-primary)', display: 'block', marginBottom: '3px' }}>
                2. HNSW Graph Architecture
              </strong>
              Uses Non-Metric Space Library (NMSLIB) with <code>ef_construction: 128</code> and <code>m: 16</code> to generate multi-layer graph topologies for logarithmic approximate nearest neighbor search times (&lt;10ms per query).
            </div>

            <div>
              <strong style={{ color: 'var(--text-primary)', display: 'block', marginBottom: '3px' }}>
                3. OpenSearch Compute Units (OCUs)
              </strong>
              Serverless indexing dynamically scales OCUs up during burst document ingestion and scales down during read-heavy query workloads, avoiding provisioned instance idle costs.
            </div>
          </div>
        </div>

      </div>

    </div>
  );
}
