import React, { useRef, useState } from 'react';
import { UploadCloud, FileText, Trash2, CheckCircle2, AlertCircle, FileUp, Sparkles, Folder } from 'lucide-react';

export default function DocumentManager({
  documents,
  onUpload,
  onDelete,
  uploading,
  uploadProgress,
  onSyncNextcloud,
  onOpenNextcloud,
  syncingNextcloud
}) {
  const fileInputRef = useRef(null);
  const [dragActive, setDragActive] = useState(false);

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      onUpload(e.dataTransfer.files[0]);
    }
  };

  const handleChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      onUpload(e.target.files[0]);
      e.target.value = '';
    }
  };

  const formatBytes = (bytes) => {
    if (!bytes || bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  return (
    <div className="glass-panel" style={{ padding: '22px', height: '100%', display: 'flex', flexDirection: 'column' }}>
      
      {/* Title & Nextcloud Sync */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '18px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Folder size={18} color="var(--accent-cyan)" />
          <h2 style={{ fontSize: '1.05rem', fontWeight: '600' }}>Knowledge Base</h2>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {(onOpenNextcloud || onSyncNextcloud) && (
            <button
              onClick={onOpenNextcloud || onSyncNextcloud}
              disabled={syncingNextcloud}
              className="btn btn-secondary"
              style={{ padding: '4px 10px', fontSize: '0.72rem' }}
              title="Connect and manage Nextcloud WebDAV drive"
            >
              <UploadCloud size={13} color="var(--accent-cyan-light)" />
              {syncingNextcloud ? 'Syncing...' : 'Nextcloud'}
            </button>
          )}
          <span className="badge badge-cyan">{documents.length} Indexed</span>
        </div>
      </div>

      {/* Upload Dropzone */}
      <div
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        onClick={() => !uploading && fileInputRef.current?.click()}
        style={{
          border: `2px dashed ${dragActive ? 'var(--accent-cyan)' : 'var(--border-subtle)'}`,
          borderRadius: '14px',
          padding: '24px 16px',
          textAlign: 'center',
          cursor: uploading ? 'wait' : 'pointer',
          background: dragActive ? 'rgba(6, 182, 212, 0.08)' : 'rgba(255, 255, 255, 0.02)',
          transition: 'all 0.2s ease',
          marginBottom: '20px'
        }}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,.txt,.md"
          style={{ display: 'none' }}
          onChange={handleChange}
          disabled={uploading}
        />

        <div style={{
          width: '42px',
          height: '42px',
          borderRadius: '10px',
          background: 'rgba(6, 182, 212, 0.12)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 12px'
        }}>
          {uploading ? (
            <UploadCloud className="animate-spin" size={20} color="var(--accent-cyan)" />
          ) : (
            <FileUp size={20} color="var(--accent-cyan)" />
          )}
        </div>

        <p style={{ fontSize: '0.88rem', fontWeight: '500', marginBottom: '4px' }}>
          {uploading ? 'Processing & Embedding Chunks...' : 'Click or Drop PDF / Text Documents'}
        </p>
        <p style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
          Supports PDFs, financial disclosures, contracts (.pdf, .txt, .md)
        </p>
      </div>

      {/* Document List */}
      <div style={{ flex: 1, overflowY: 'auto', minHeight: '180px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {documents.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '30px 10px', color: 'var(--text-dim)' }}>
            <FileText size={32} style={{ margin: '0 auto 8px', opacity: 0.4 }} />
            <p style={{ fontSize: '0.84rem' }}>No documents in vector store yet.</p>
            <p style={{ fontSize: '0.74rem', color: 'var(--text-dim)', marginTop: '4px' }}>
              Upload a file or click <strong>Load Samples</strong> in the header!
            </p>
          </div>
        ) : (
          documents.map((doc) => (
            <div
              key={doc.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '12px 14px',
                background: 'rgba(255, 255, 255, 0.03)',
                borderRadius: '12px',
                border: '1px solid var(--border-subtle)',
                transition: 'background 0.15s ease'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0 }}>
                <div style={{
                  width: '34px',
                  height: '34px',
                  borderRadius: '8px',
                  background: 'rgba(99, 102, 241, 0.14)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0
                }}>
                  <FileText size={17} color="var(--accent-indigo-light)" />
                </div>
                <div style={{ minWidth: 0 }}>
                  <div style={{
                    fontSize: '0.84rem',
                    fontWeight: '600',
                    color: 'var(--text-main)',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    maxWidth: '180px'
                  }} title={doc.name}>
                    {doc.name}
                  </div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)', display: 'flex', gap: '8px', marginTop: '2px' }}>
                    <span>{formatBytes(doc.size)}</span>
                    <span>•</span>
                    <span style={{ color: 'var(--accent-cyan-light)' }}>{doc.chunks_count || 0} chunks</span>
                    <span>•</span>
                    <span>{doc.pages || 1} pgs</span>
                  </div>
                </div>
              </div>

              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(doc.id);
                }}
                className="btn btn-danger"
                style={{ padding: '6px 8px', borderRadius: '8px' }}
                title="Delete document and remove vector embeddings"
              >
                <Trash2 size={14} />
              </button>
            </div>
          ))
        )}
      </div>

    </div>
  );
}
