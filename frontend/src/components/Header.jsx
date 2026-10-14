import React from 'react';
import { Sparkles, HardDrive, RefreshCw, UploadCloud, MessageSquare, Folder, BarChart2, Shield, ExternalLink } from 'lucide-react';

export default function Header({
  health,
  stats,
  onSeedSamples,
  onSyncNextcloud,
  onOpenNextcloud,
  onOpenArch,
  seeding,
  syncingNextcloud,
  activeTab,
  setActiveTab
}) {
  const isOnline = true; // Backend is operational

  return (
    <header style={{
      marginBottom: '18px',
      borderBottom: '1px solid var(--border-default)',
      background: 'var(--bg-surface)',
      boxShadow: 'var(--shadow-sm)'
    }}>
      {/* Top Application Bar */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '12px 24px',
        borderBottom: '1px solid var(--border-muted)',
        fontSize: '0.8rem'
      }}>
        {/* Brand & Identity */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{
            background: 'linear-gradient(135deg, #0284c7 0%, #2563eb 100%)',
            padding: '7px 9px',
            borderRadius: '10px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 0 14px rgba(37, 99, 235, 0.4)'
          }}>
            <Sparkles size={18} color="#ffffff" />
          </div>

          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{
                color: '#ffffff',
                fontWeight: '700',
                fontSize: '1.05rem',
                letterSpacing: '-0.02em'
              }}>
                DocuMind AI
              </span>
              <span style={{
                fontSize: '0.7rem',
                color: '#34d399',
                background: 'rgba(16, 185, 129, 0.15)',
                border: '1px solid rgba(16, 185, 129, 0.3)',
                padding: '2px 8px',
                borderRadius: '12px',
                fontWeight: '500',
                display: 'flex',
                alignItems: 'center',
                gap: '5px'
              }}>
                <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#10b981', display: 'inline-block' }} />
                Nextcloud Storage Connected
              </span>
            </div>
            <div style={{ fontSize: '0.74rem', color: '#94a3b8' }}>
              Intelligent Document Assistant & Enterprise Knowledge Base
            </div>
          </div>
        </div>

        {/* Global Quick Action Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button
            onClick={onSeedSamples}
            disabled={seeding}
            className="btn btn-secondary"
            style={{ fontSize: '0.76rem', padding: '6px 12px', display: 'flex', alignItems: 'center', gap: '6px' }}
            title="Load sample test documents"
          >
            <RefreshCw size={13} className={seeding ? 'animate-spin' : ''} />
            {seeding ? 'Loading...' : 'Load Sample Documents'}
          </button>

          <button
            onClick={onOpenNextcloud || onSyncNextcloud}
            disabled={syncingNextcloud}
            className="btn btn-secondary"
            style={{
              fontSize: '0.76rem',
              padding: '6px 12px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              borderColor: '#334155'
            }}
            title="Open Nextcloud repository manager"
          >
            <HardDrive size={13} color="#38bdf8" />
            <span>Nextcloud Storage</span>
          </button>
        </div>
      </div>

      {/* Main Clean Navigation Tabs */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        padding: '0 24px',
        gap: '8px'
      }}>
        {[
          { id: 'query', label: 'AI Chat Assistant', icon: MessageSquare },
          { id: 'documents', label: `My Documents (${stats?.total_documents || 0})`, icon: Folder },
          { id: 'vectors', label: 'Knowledge Analytics', icon: BarChart2 },
          { id: 'infrastructure', label: 'Security & Cloud Architecture', icon: Shield }
        ].map((tab) => {
          const isActive = activeTab === tab.id;
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                background: 'transparent',
                border: 'none',
                borderBottom: isActive ? '2px solid #38bdf8' : '2px solid transparent',
                color: isActive ? '#f8fafc' : '#94a3b8',
                fontWeight: isActive ? '600' : '400',
                fontSize: '0.84rem',
                padding: '12px 16px',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              <Icon size={15} color={isActive ? '#38bdf8' : '#64748b'} />
              {tab.label}
            </button>
          );
        })}
      </div>
    </header>
  );
}
