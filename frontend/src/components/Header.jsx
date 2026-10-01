import React from 'react';
import { Server, Database, Cpu, Terminal, RefreshCw, UploadCloud, BookOpen, Layers, ExternalLink, HardDrive } from 'lucide-react';

export default function Header({
  health,
  stats,
  onSeedSamples,
  onSyncNextcloud,
  onOpenArch,
  seeding,
  syncingNextcloud,
  activeTab,
  setActiveTab
}) {
  const isAws = health?.mode === 'aws';

  return (
    <header style={{ marginBottom: '16px', borderBottom: '1px solid var(--border-default)', background: 'var(--bg-surface)' }}>
      {/* Top AWS Console Bar */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '11px 22px',
        borderBottom: '1px solid var(--border-muted)',
        fontSize: '0.8rem'
      }}>
        {/* Breadcrumb path */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '9px' }}>
          <div style={{
            background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
            color: '#0f172a',
            padding: '2px 7px',
            borderRadius: '4px',
            fontWeight: '700',
            fontSize: '0.68rem',
            letterSpacing: '0.04em'
          }}>
            AWS
          </div>
          <span style={{ color: 'var(--text-muted)' }}>Amazon Bedrock</span>
          <span style={{ color: 'var(--text-dim)', fontSize: '0.75rem' }}>/</span>
          <span style={{ color: 'var(--text-muted)' }}>Knowledge Bases</span>
          <span style={{ color: 'var(--text-dim)', fontSize: '0.75rem' }}>/</span>
          <strong style={{ color: 'var(--text-primary)', fontWeight: '600', letterSpacing: '-0.01em' }}>documind-rag-v2</strong>
          <span className={`badge ${isAws ? 'badge-amber' : 'badge-green'}`} style={{ marginLeft: '4px' }}>
            <span className="indicator-dot active" />
            {isAws ? 'AWS us-east-1 LIVE' : 'SANDBOX SIMULATOR'}
          </span>
        </div>

        {/* Global Cluster Status Indicators */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '18px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Database size={13} color="var(--text-muted)" />
            <span style={{ color: 'var(--text-muted)' }}>AOSS Collection:</span>
            <span style={{ color: 'var(--text-primary)', fontWeight: '600', fontVariantNumeric: 'tabular-nums' }}>
              {stats?.total_chunks || 0} vectors <span style={{ color: 'var(--text-muted)', fontWeight: '400', fontSize: '0.75rem' }}>({stats?.vector_dimensions || 512}d)</span>
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Cpu size={13} color="var(--text-muted)" />
            <span style={{ color: 'var(--text-muted)' }}>Embeddings:</span>
            <span style={{ color: 'var(--text-primary)', fontWeight: '500' }}>
              Titan Text v2
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              onClick={onSeedSamples}
              disabled={seeding}
              className="btn btn-secondary"
              style={{ fontSize: '0.75rem', padding: '5px 10px' }}
              title="Load test benchmark documents"
            >
              <RefreshCw size={12} className={seeding ? 'animate-spin' : ''} />
              {seeding ? 'Seeding...' : 'Load Benchmark Docs'}
            </button>

            <button
              onClick={onSyncNextcloud}
              disabled={syncingNextcloud}
              className="btn btn-secondary"
              style={{ fontSize: '0.75rem', padding: '5px 10px' }}
              title="Sync documents from Nextcloud WebDAV drive"
            >
              <HardDrive size={12} />
              {syncingNextcloud ? 'Syncing...' : 'Sync Nextcloud'}
            </button>

            <button
              onClick={onOpenArch}
              className="btn btn-secondary"
              style={{ fontSize: '0.75rem', padding: '5px 10px' }}
              title="View AWS CDK & CloudFormation topology"
            >
              <Layers size={12} />
              Cloud Architecture
            </button>
          </div>
        </div>
      </div>

      {/* Main Service Navigation Tabs */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        padding: '0 20px',
        gap: '4px'
      }}>
        {[
          { id: 'query', label: 'RAG Query Console & Workbench' },
          { id: 'documents', label: `Document Corpus & S3 Storage (${stats?.total_documents || 0})` },
          { id: 'vectors', label: 'OpenSearch Vector Index' },
          { id: 'infrastructure', label: 'CDK & Security Policies' }
        ].map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                background: 'transparent',
                border: 'none',
                borderBottom: isActive ? '2px solid #2563eb' : '2px solid transparent',
                color: isActive ? '#ffffff' : 'var(--text-muted)',
                fontWeight: isActive ? '600' : '400',
                fontSize: '0.82rem',
                padding: '11px 16px',
                cursor: 'pointer',
                transition: 'all 0.15s ease'
              }}
            >
              {tab.label}
            </button>
          );
        })}
      </div>
    </header>
  );
}
