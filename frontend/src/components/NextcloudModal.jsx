import React, { useState, useEffect, useRef } from 'react';
import { Cloud, HardDrive, RefreshCw, CheckCircle2, AlertCircle, ExternalLink, Play, X, Key, User, Globe, FileText, UploadCloud, Folder, ArrowRight, Layers } from 'lucide-react';

export default function NextcloudModal({ isOpen, onClose, onSyncSuccess, API_BASE }) {
  const [activeTab, setActiveTab] = useState('explorer'); // 'explorer' | 'config'
  const [status, setStatus] = useState({ connected: false, url: 'http://localhost:8080', username: 'admin' });
  const [formData, setFormData] = useState({ url: 'http://localhost:8080', username: 'admin', password: 'admin123' });
  const [checking, setChecking] = useState(false);
  const [saving, setSaving] = useState(false);
  const [launchingDocker, setLaunchingDocker] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [alert, setAlert] = useState(null);

  // Files in Nextcloud
  const [files, setFiles] = useState([]);
  const [loadingFiles, setLoadingFiles] = useState(false);
  const [ingestingFile, setIngestingFile] = useState(null);
  const [uploadingDirect, setUploadingDirect] = useState(false);
  const modalFileInputRef = useRef(null);

  const fetchStatus = async () => {
    setChecking(true);
    try {
      const res = await fetch(`${API_BASE}/api/nextcloud/status`);
      const data = await res.json();
      setStatus(data);
      setFormData(prev => ({ ...prev, url: data.url || prev.url, username: data.username || prev.username }));
      if (data.connected) {
        fetchFiles();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setChecking(false);
    }
  };

  const fetchFiles = async () => {
    setLoadingFiles(true);
    try {
      const res = await fetch(`${API_BASE}/api/nextcloud/files`);
      const data = await res.json();
      if (data.files) {
        setFiles(data.files);
      }
    } catch (err) {
      console.error("Error fetching Nextcloud files:", err);
    } finally {
      setLoadingFiles(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchStatus();
      setAlert(null);
    }
  }, [isOpen]);

  const handleSaveConfig = async (e) => {
    if (e) e.preventDefault();
    setSaving(true);
    setAlert(null);
    try {
      const res = await fetch(`${API_BASE}/api/nextcloud/config`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      const data = await res.json();
      setStatus({ connected: data.connected, url: data.url, username: data.username });
      setAlert({
        type: data.connected ? 'success' : 'warning',
        message: data.message
      });
      if (data.connected) {
        fetchFiles();
      }
    } catch (err) {
      setAlert({ type: 'error', message: `Failed to save configuration: ${err.message}` });
    } finally {
      setSaving(false);
    }
  };

  const handleLaunchDocker = async () => {
    setLaunchingDocker(true);
    setAlert(null);
    try {
      const res = await fetch(`${API_BASE}/api/nextcloud/launch-docker`, { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        setAlert({ type: 'success', message: data.message });
        await fetchStatus();
      } else {
        setAlert({
          type: 'warning',
          message: data.message
        });
      }
    } catch (err) {
      setAlert({ type: 'error', message: `Docker launch request error: ${err.message}` });
    } finally {
      setLaunchingDocker(false);
    }
  };

  const handleSyncNow = async () => {
    setSyncing(true);
    setAlert(null);
    try {
      const res = await fetch(`${API_BASE}/api/nextcloud/sync`, { method: 'POST' });
      const data = await res.json();
      if (data.status === 'synced') {
        setAlert({ type: 'success', message: `Successfully synced ${data.count} documents from Nextcloud WebDAV.` });
        if (onSyncSuccess) onSyncSuccess();
        fetchFiles();
      } else {
        setAlert({ type: 'warning', message: data.message || 'Nextcloud instance is offline or unreachable.' });
      }
    } catch (err) {
      setAlert({ type: 'error', message: `Sync error: ${err.message}` });
    } finally {
      setSyncing(false);
    }
  };

  const handleIngestSingleFile = async (fileItem) => {
    setIngestingFile(fileItem.name);
    try {
      const res = await fetch(`${API_BASE}/api/nextcloud/ingest-file`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path: fileItem.path, name: fileItem.name })
      });
      const data = await res.json();
      if (res.ok) {
        setAlert({ type: 'success', message: `Document "${fileItem.name}" vectorized: ${data.chunks} chunks committed to RAG.` });
        if (onSyncSuccess) onSyncSuccess();
        fetchFiles();
      } else {
        setAlert({ type: 'error', message: data.detail || 'Ingestion failed' });
      }
    } catch (err) {
      setAlert({ type: 'error', message: `Ingest error: ${err.message}` });
    } finally {
      setIngestingFile(null);
    }
  };

  const handleModalDirectUpload = async (file) => {
    setUploadingDirect(true);
    setAlert(null);
    const form = new FormData();
    form.append('file', file);

    try {
      const res = await fetch(`${API_BASE}/api/upload`, {
        method: 'POST',
        body: form
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Upload failed');

      setAlert({
        type: 'success',
        message: `Uploaded "${file.name}" to Nextcloud /DocuMind and committed ${data.chunks_indexed} vectors to RAG.`
      });
      if (onSyncSuccess) onSyncSuccess();
      fetchFiles();
    } catch (err) {
      setAlert({ type: 'error', message: `Upload error: ${err.message}` });
    } finally {
      setUploadingDirect(false);
    }
  };

  const formatBytes = (bytes) => {
    if (!bytes || bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.75)',
      backdropFilter: 'blur(6px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
      padding: '20px'
    }}>
      <div style={{
        background: '#0d1527',
        border: '1px solid #1e293b',
        borderRadius: '16px',
        width: '100%',
        maxWidth: '680px',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.7)',
        overflow: 'hidden',
        color: '#f8fafc',
        maxHeight: '90vh',
        display: 'flex',
        flexDirection: 'column'
      }}>
        {/* Header */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '18px 24px',
          borderBottom: '1px solid #1e293b',
          background: 'rgba(15, 23, 42, 0.8)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
              padding: '8px',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <Cloud size={20} color="#ffffff" />
            </div>
            <div>
              <h3 style={{ fontSize: '1.1rem', fontWeight: '600', margin: 0 }}>Nextcloud Enterprise Storage</h3>
              <p style={{ fontSize: '0.78rem', color: '#94a3b8', margin: '2px 0 0 0' }}>
                All RAG uploads automatically store in <code style={{ color: '#38bdf8' }}>/DocuMind</code>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#94a3b8',
              cursor: 'pointer',
              padding: '6px',
              borderRadius: '6px'
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Tab Navigation */}
        <div style={{
          display: 'flex',
          borderBottom: '1px solid #1e293b',
          padding: '0 24px',
          background: 'rgba(15, 23, 42, 0.5)'
        }}>
          <button
            onClick={() => setActiveTab('explorer')}
            style={{
              padding: '10px 16px',
              background: 'transparent',
              border: 'none',
              borderBottom: activeTab === 'explorer' ? '2px solid #38bdf8' : '2px solid transparent',
              color: activeTab === 'explorer' ? '#38bdf8' : '#94a3b8',
              fontWeight: activeTab === 'explorer' ? '600' : '400',
              fontSize: '0.84rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <Folder size={14} />
            Storage Explorer ({files.length})
          </button>
          <button
            onClick={() => setActiveTab('config')}
            style={{
              padding: '10px 16px',
              background: 'transparent',
              border: 'none',
              borderBottom: activeTab === 'config' ? '2px solid #38bdf8' : '2px solid transparent',
              color: activeTab === 'config' ? '#38bdf8' : '#94a3b8',
              fontWeight: activeTab === 'config' ? '600' : '400',
              fontSize: '0.84rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <HardDrive size={14} />
            Connection & Docker Setup
          </button>
        </div>

        {/* Body Container (Scrollable) */}
        <div style={{ padding: '20px 24px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '16px', flex: 1 }}>
          
          {/* Status Banner */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '10px 14px',
            borderRadius: '10px',
            background: status.connected ? 'rgba(16, 185, 129, 0.1)' : 'rgba(245, 158, 11, 0.1)',
            border: `1px solid ${status.connected ? 'rgba(16, 185, 129, 0.3)' : 'rgba(245, 158, 11, 0.3)'}`
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              {status.connected ? (
                <CheckCircle2 size={16} color="#10b981" />
              ) : (
                <AlertCircle size={16} color="#f59e0b" />
              )}
              <div>
                <span style={{ fontSize: '0.82rem', fontWeight: '600', color: status.connected ? '#10b981' : '#f59e0b' }}>
                  {status.connected ? 'Nextcloud Connected & Synchronized' : 'Nextcloud Offline'}
                </span>
                <div style={{ fontSize: '0.72rem', color: '#94a3b8' }}>
                  WebDAV endpoint: <span style={{ color: '#cbd5e1' }}>{status.url}</span> ({status.username})
                </div>
              </div>
            </div>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <button
                onClick={() => { fetchStatus(); fetchFiles(); }}
                disabled={checking || loadingFiles}
                className="btn btn-secondary"
                style={{ fontSize: '0.72rem', padding: '4px 10px' }}
                title="Refresh Nextcloud status and file list"
              >
                <RefreshCw size={12} className={checking || loadingFiles ? 'animate-spin' : ''} />
                Refresh
              </button>
              {status.connected && (
                <a
                  href={`${status.url}/index.php/apps/files/files?dir=/DocuMind`}
                  target="_blank"
                  rel="noreferrer"
                  className="btn btn-secondary"
                  style={{ fontSize: '0.72rem', padding: '4px 10px', textDecoration: 'none', color: '#38bdf8' }}
                >
                  Open Web UI <ExternalLink size={11} style={{ marginLeft: '4px' }} />
                </a>
              )}
            </div>
          </div>

          {/* Feedback Alert */}
          {alert && (
            <div style={{
              padding: '10px 14px',
              borderRadius: '8px',
              fontSize: '0.8rem',
              display: 'flex',
              alignItems: 'flex-start',
              gap: '8px',
              background: alert.type === 'success' ? 'rgba(16, 185, 129, 0.15)' : alert.type === 'error' ? 'rgba(239, 68, 68, 0.15)' : 'rgba(245, 158, 11, 0.15)',
              border: `1px solid ${alert.type === 'success' ? '#10b981' : alert.type === 'error' ? '#ef4444' : '#f59e0b'}`,
              color: alert.type === 'success' ? '#34d399' : alert.type === 'error' ? '#f87171' : '#fbbf24'
            }}>
              {alert.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
              <span>{alert.message}</span>
            </div>
          )}

          {/* TAB 1: STORAGE EXPLORER */}
          {activeTab === 'explorer' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              
              {/* Explorer Action Bar */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
                <div>
                  <h4 style={{ margin: 0, fontSize: '0.88rem', fontWeight: '600', color: '#e2e8f0' }}>
                    Nextcloud Documents Repository
                  </h4>
                  <p style={{ margin: '2px 0 0 0', fontSize: '0.74rem', color: '#94a3b8' }}>
                    Uploaded documents are saved in Nextcloud <span style={{ color: '#38bdf8' }}>/DocuMind</span> folder.
                  </p>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <input
                    ref={modalFileInputRef}
                    type="file"
                    accept=".pdf,.txt,.md"
                    style={{ display: 'none' }}
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        handleModalDirectUpload(e.target.files[0]);
                        e.target.value = '';
                      }
                    }}
                    disabled={uploadingDirect}
                  />
                  <button
                    onClick={() => modalFileInputRef.current?.click()}
                    disabled={uploadingDirect || !status.connected}
                    className="btn btn-secondary"
                    style={{ fontSize: '0.75rem', padding: '5px 12px', display: 'flex', alignItems: 'center', gap: '6px' }}
                  >
                    <UploadCloud size={13} className={uploadingDirect ? 'animate-spin' : ''} />
                    {uploadingDirect ? 'Uploading...' : 'Upload to /DocuMind'}
                  </button>
                </div>
              </div>

              {/* Files Table / List */}
              <div style={{
                background: 'rgba(15, 23, 42, 0.6)',
                border: '1px solid #1e293b',
                borderRadius: '10px',
                overflow: 'hidden'
              }}>
                {loadingFiles ? (
                  <div style={{ padding: '32px', textAlign: 'center', color: '#94a3b8', fontSize: '0.82rem' }}>
                    <RefreshCw size={20} className="animate-spin" style={{ margin: '0 auto 8px', color: '#38bdf8' }} />
                    Scanning Nextcloud repository...
                  </div>
                ) : files.length === 0 ? (
                  <div style={{ padding: '32px', textAlign: 'center', color: '#94a3b8', fontSize: '0.82rem' }}>
                    <Folder size={28} style={{ margin: '0 auto 8px', opacity: 0.4 }} />
                    {status.connected ? 'No documents currently in Nextcloud. Upload a document to start!' : 'Nextcloud is offline. Start the Docker stack in the Connection tab.'}
                  </div>
                ) : (
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.78rem' }}>
                      <thead>
                        <tr style={{ borderBottom: '1px solid #1e293b', color: '#94a3b8', textAlign: 'left', background: 'rgba(30, 41, 59, 0.5)' }}>
                          <th style={{ padding: '10px 14px' }}>Document</th>
                          <th style={{ padding: '10px 14px' }}>Folder</th>
                          <th style={{ padding: '10px 14px' }}>Size</th>
                          <th style={{ padding: '10px 14px' }}>RAG Status</th>
                          <th style={{ padding: '10px 14px', textAlign: 'right' }}>Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {files.map((f, idx) => (
                          <tr key={idx} style={{ borderBottom: '1px solid rgba(30, 41, 59, 0.5)', transition: 'background 0.2s' }}>
                            <td style={{ padding: '10px 14px' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <FileText size={15} color="#38bdf8" />
                                <span style={{ fontWeight: '500', color: '#f8fafc' }}>{f.name}</span>
                              </div>
                            </td>
                            <td style={{ padding: '10px 14px' }}>
                              <span style={{
                                background: f.folder === 'DocuMind' ? 'rgba(2, 132, 199, 0.2)' : 'rgba(100, 116, 139, 0.2)',
                                color: f.folder === 'DocuMind' ? '#38bdf8' : '#94a3b8',
                                border: `1px solid ${f.folder === 'DocuMind' ? 'rgba(2, 132, 199, 0.4)' : 'rgba(100, 116, 139, 0.3)'}`,
                                borderRadius: '4px',
                                padding: '1px 6px',
                                fontSize: '0.7rem',
                                fontFamily: 'monospace'
                              }}>
                                /{f.folder}
                              </span>
                            </td>
                            <td style={{ padding: '10px 14px', color: '#94a3b8', fontFamily: 'monospace' }}>
                              {formatBytes(f.size)}
                            </td>
                            <td style={{ padding: '10px 14px' }}>
                              {f.is_indexed ? (
                                <span style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '4px',
                                  color: '#34d399',
                                  fontSize: '0.72rem'
                                }}>
                                  <CheckCircle2 size={12} /> Indexed
                                </span>
                              ) : (
                                <span style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '4px',
                                  color: '#fbbf24',
                                  fontSize: '0.72rem'
                                }}>
                                  Not Indexed
                                </span>
                              )}
                            </td>
                            <td style={{ padding: '10px 14px', textAlign: 'right' }}>
                              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '6px' }}>
                                {!f.is_indexed && (
                                  <button
                                    onClick={() => handleIngestSingleFile(f)}
                                    disabled={ingestingFile === f.name}
                                    className="btn btn-primary"
                                    style={{ fontSize: '0.7rem', padding: '2px 8px' }}
                                    title="Index this file into RAG vector store"
                                  >
                                    {ingestingFile === f.name ? 'Vectorizing...' : 'Index to RAG'}
                                  </button>
                                )}
                                <a
                                  href={f.web_url || `${status.url}/index.php/apps/files/files?dir=/${f.folder}`}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="btn btn-secondary"
                                  style={{ fontSize: '0.7rem', padding: '2px 6px', textDecoration: 'none' }}
                                  title="View in Nextcloud Web UI"
                                >
                                  <ExternalLink size={11} />
                                </a>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

            </div>
          )}

          {/* TAB 2: CONFIGURATION & DOCKER */}
          {activeTab === 'config' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              
              {/* Local Docker Stack */}
              <div style={{
                background: 'rgba(30, 41, 59, 0.4)',
                border: '1px solid #1e293b',
                borderRadius: '12px',
                padding: '16px'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <HardDrive size={16} color="#38bdf8" />
                    <h4 style={{ margin: 0, fontSize: '0.9rem', fontWeight: '600' }}>Local Nextcloud Docker Stack</h4>
                  </div>
                  <span style={{ fontSize: '0.7rem', color: '#94a3b8' }}>Port 8080</span>
                </div>
                <p style={{ fontSize: '0.76rem', color: '#94a3b8', margin: '0 0 12px 0', lineHeight: 1.4 }}>
                  Runs Nextcloud Apache + MariaDB in Docker containers. Requires Docker Desktop to be running on your system.
                </p>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <button
                    onClick={handleLaunchDocker}
                    disabled={launchingDocker}
                    className="btn btn-secondary"
                    style={{ fontSize: '0.78rem', padding: '6px 14px' }}
                  >
                    <Play size={13} color="#38bdf8" />
                    {launchingDocker ? 'Launching...' : 'Start Docker Stack'}
                  </button>
                  <a
                    href="http://localhost:8080"
                    target="_blank"
                    rel="noreferrer"
                    style={{
                      fontSize: '0.75rem',
                      color: '#38bdf8',
                      textDecoration: 'none',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}
                  >
                    Open Nextcloud Web UI <ExternalLink size={12} />
                  </a>
                </div>
              </div>

              {/* Connection Credentials Form */}
              <form onSubmit={handleSaveConfig} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <h4 style={{ margin: 0, fontSize: '0.9rem', fontWeight: '600', color: '#e2e8f0' }}>WebDAV Connection Details</h4>
                
                <div>
                  <label style={{ fontSize: '0.75rem', color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                    <Globe size={13} /> Nextcloud Server URL
                  </label>
                  <input
                    type="text"
                    value={formData.url}
                    onChange={(e) => setFormData({ ...formData, url: e.target.value })}
                    placeholder="http://localhost:8080 or https://cloud.example.com"
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: '8px',
                      background: '#0f172a',
                      border: '1px solid #334155',
                      color: '#f8fafc',
                      fontSize: '0.82rem'
                    }}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div>
                    <label style={{ fontSize: '0.75rem', color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                      <User size={13} /> Username
                    </label>
                    <input
                      type="text"
                      value={formData.username}
                      onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                      placeholder="admin"
                      style={{
                        width: '100%',
                        padding: '8px 12px',
                        borderRadius: '8px',
                        background: '#0f172a',
                        border: '1px solid #334155',
                        color: '#f8fafc',
                        fontSize: '0.82rem'
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ fontSize: '0.75rem', color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                      <Key size={13} /> Password / App Token
                    </label>
                    <input
                      type="password"
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      placeholder="admin123"
                      style={{
                        width: '100%',
                        padding: '8px 12px',
                        borderRadius: '8px',
                        background: '#0f172a',
                        border: '1px solid #334155',
                        color: '#f8fafc',
                        fontSize: '0.82rem'
                      }}
                    />
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '6px' }}>
                  <button
                    type="submit"
                    disabled={saving}
                    className="btn btn-secondary"
                    style={{ fontSize: '0.78rem', padding: '6px 14px' }}
                  >
                    {saving ? 'Testing & Saving...' : 'Save & Test Connection'}
                  </button>
                </div>
              </form>

            </div>
          )}

        </div>

        {/* Footer */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '16px 24px',
          borderTop: '1px solid #1e293b',
          background: 'rgba(15, 23, 42, 0.8)'
        }}>
          <button
            onClick={onClose}
            className="btn btn-secondary"
            style={{ fontSize: '0.78rem', padding: '6px 14px' }}
          >
            Close
          </button>
          
          <button
            onClick={handleSyncNow}
            disabled={syncing || !status.connected}
            className="btn btn-primary"
            style={{
              fontSize: '0.82rem',
              padding: '7px 18px',
              background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
              color: '#ffffff',
              border: 'none',
              borderRadius: '8px',
              cursor: status.connected ? 'pointer' : 'not-allowed',
              opacity: status.connected ? 1 : 0.6,
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontWeight: '500'
            }}
          >
            <Cloud size={14} className={syncing ? 'animate-spin' : ''} />
            {syncing ? 'Syncing Files...' : 'Sync All Documents into RAG'}
          </button>
        </div>
      </div>
    </div>
  );
}
