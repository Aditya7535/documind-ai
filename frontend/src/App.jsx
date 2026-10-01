import React, { useState, useEffect } from 'react';
import Header from './components/Header';
import QueryWorkbench from './components/QueryWorkbench';
import DocumentCorpusView from './components/DocumentCorpusView';
import VectorIndexView from './components/VectorIndexView';
import InfrastructureView from './components/InfrastructureView';
import ChunkInspectorModal from './components/ChunkInspectorModal';

const API_BASE = import.meta.env.VITE_API_BASE ?? (typeof window !== 'undefined' && window.location.port === '5173' ? 'http://localhost:8000' : '');

export default function App() {
  const [activeTab, setActiveTab] = useState('query');
  const [health, setHealth] = useState(null);
  const [stats, setStats] = useState(null);
  const [documents, setDocuments] = useState([]);
  const [queryResult, setQueryResult] = useState(null);
  const [querying, setQuerying] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [seeding, setSeeding] = useState(false);
  const [syncingNextcloud, setSyncingNextcloud] = useState(false);
  const [selectedChunk, setSelectedChunk] = useState(null);
  const [toast, setToast] = useState(null);

  const showToast = (message, type = 'info') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const loadData = async () => {
    try {
      const [hRes, dRes, sRes] = await Promise.all([
        fetch(`${API_BASE}/api/health`).then(r => r.json()).catch(() => null),
        fetch(`${API_BASE}/api/documents`).then(r => r.json()).catch(() => ({ documents: [] })),
        fetch(`${API_BASE}/api/stats`).then(r => r.json()).catch(() => null)
      ]);
      if (hRes) setHealth(hRes);
      if (dRes?.documents) setDocuments(dRes.documents);
      if (sRes) setStats(sRes);
    } catch (err) {
      console.error("Failed to load initial data", err);
    }
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 8000);
    return () => clearInterval(interval);
  }, []);

  const handleUpload = async (file) => {
    setUploading(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch(`${API_BASE}/api/upload`, {
        method: 'POST',
        body: formData
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Upload failed');
      
      showToast(`Artifact "${file.name}" indexed: ${data.chunks_indexed} vectors committed.`, 'success');
      await loadData();
    } catch (err) {
      showToast(`Ingestion error: ${err.message}`, 'error');
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (docId) => {
    try {
      const res = await fetch(`${API_BASE}/api/documents/${docId}`, { method: 'DELETE' });
      if (res.ok) {
        showToast('Document artifact purged and vectors deleted from AOSS index.', 'success');
        await loadData();
      } else {
        showToast('Failed to purge document', 'error');
      }
    } catch (err) {
      showToast(`Purge error: ${err.message}`, 'error');
    }
  };

  const handleSeedSamples = async () => {
    setSeeding(true);
    try {
      const res = await fetch(`${API_BASE}/api/seed-samples`, { method: 'POST' });
      const data = await res.json();
      if (data.status === 'seeded') {
        showToast(`Committed ${data.documents.length} benchmark corpora into vector index.`, 'success');
        await loadData();
      } else {
        showToast('Corpora already indexed.', 'info');
      }
    } catch (err) {
      showToast(`Corpus seed error: ${err.message}`, 'error');
    } finally {
      setSeeding(false);
    }
  };

  const handleSyncNextcloud = async () => {
    setSyncingNextcloud(true);
    try {
      const res = await fetch(`${API_BASE}/api/nextcloud/sync`, { method: 'POST' });
      const data = await res.json();
      if (data.status === 'synced') {
        showToast(`Synced ${data.count} documents from Nextcloud WebDAV storage.`, 'success');
        await loadData();
      } else {
        showToast(data.message || 'Nextcloud WebDAV storage offline (run docker compose up -d)', 'info');
      }
    } catch (err) {
      showToast(`Nextcloud WebDAV error: ${err.message}`, 'error');
    } finally {
      setSyncingNextcloud(false);
    }
  };

  const handleQuery = async (params) => {
    setQuerying(true);
    try {
      const res = await fetch(`${API_BASE}/api/query`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Inference query failed');
      setQueryResult(data);
    } catch (err) {
      showToast(`Inference error: ${err.message}`, 'error');
    } finally {
      setQuerying(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      
      {/* Toast Alert */}
      {toast && (
        <div style={{
          position: 'fixed',
          top: '16px',
          right: '20px',
          padding: '10px 16px',
          borderRadius: '4px',
          background: toast.type === 'error' ? '#ef4444' : '#10b981',
          color: '#ffffff',
          fontSize: '0.8rem',
          fontWeight: '500',
          boxShadow: '0 10px 15px -3px rgba(0,0,0,0.5)',
          zIndex: 9999
        }}>
          {toast.message}
        </div>
      )}

      {/* Enterprise Top Navigation & Service Bar */}
      <Header
        health={health}
        stats={stats}
        onSeedSamples={handleSeedSamples}
        onSyncNextcloud={handleSyncNextcloud}
        onOpenArch={() => setActiveTab('infrastructure')}
        seeding={seeding}
        syncingNextcloud={syncingNextcloud}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
      />

      {/* Main Workspace Body */}
      <main style={{ flex: 1, padding: '0 20px 30px', maxWidth: '1600px', margin: '0 auto', width: '100%' }}>
        {activeTab === 'query' && (
          <QueryWorkbench
            onQuery={handleQuery}
            querying={querying}
            result={queryResult}
            onInspectChunk={(chunk) => setSelectedChunk(chunk)}
            stats={stats}
          />
        )}

        {activeTab === 'documents' && (
          <DocumentCorpusView
            documents={documents}
            onUpload={handleUpload}
            onDelete={handleDelete}
            uploading={uploading}
            onSyncNextcloud={handleSyncNextcloud}
            syncingNextcloud={syncingNextcloud}
          />
        )}

        {activeTab === 'vectors' && (
          <VectorIndexView
            stats={stats}
            health={health}
          />
        )}

        {activeTab === 'infrastructure' && (
          <InfrastructureView />
        )}
      </main>

      {/* Chunk Inspector Audit Modal */}
      <ChunkInspectorModal
        chunk={selectedChunk}
        onClose={() => setSelectedChunk(null)}
      />

    </div>
  );
}
