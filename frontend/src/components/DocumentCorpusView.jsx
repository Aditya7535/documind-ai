import React, { useRef, useState } from 'react';
import { FileText, UploadCloud, Trash2, HardDrive, RefreshCw, CheckCircle, Search, ShieldCheck, Database, Layers } from 'lucide-react';

export default function DocumentCorpusView({
  documents,
  onUpload,
  onDelete,
  uploading,
  onSyncNextcloud,
  syncingNextcloud
}) {
  const fileInputRef = useRef(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('ALL');

  const formatBytes = (bytes) => {
    if (!bytes || bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const filteredDocs = documents.filter(doc => {
    const matchesSearch = doc.name.toLowerCase().includes(searchTerm.toLowerCase());
    if (filterType === 'PDF') return matchesSearch && doc.name.endsWith('.pdf');
    if (filterType === 'TXT') return matchesSearch && (doc.name.endsWith('.txt') || doc.name.endsWith('.md'));
    return matchesSearch;
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      
      {/* Top Controls & Action Bar */}
      <div className="panel" style={{ padding: '14px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1, minWidth: '280px' }}>
          <div style={{ position: 'relative', width: '260px' }}>
            <Search size={14} color="var(--text-dim)" style={{ position: 'absolute', left: '10px', top: '9px' }} />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search indexed documents..."
              className="input-text"
              style={{ paddingLeft: '30px', fontSize: '0.8rem' }}
            />
          </div>

          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="select-control"
          >
            <option value="ALL">All File Types</option>
            <option value="PDF">PDF Documents (.pdf)</option>
            <option value="TXT">Plain Text / Markdown (.txt, .md)</option>
          </select>
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.txt,.md"
            style={{ display: 'none' }}
            onChange={(e) => {
              if (e.target.files && e.target.files[0]) {
                onUpload(e.target.files[0]);
                e.target.value = '';
              }
            }}
            disabled={uploading}
          />

          <button
            onClick={onSyncNextcloud}
            disabled={syncingNextcloud}
            className="btn btn-secondary"
          >
            <HardDrive size={13} />
            {syncingNextcloud ? 'Syncing...' : 'Sync Nextcloud WebDAV'}
          </button>

          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="btn btn-primary"
          >
            <UploadCloud size={14} className={uploading ? 'animate-spin' : ''} />
            {uploading ? 'Ingesting Chunks...' : 'Ingest Document to S3'}
          </button>
        </div>

      </div>

      {/* Enterprise Data Table */}
      <div className="panel" style={{ overflow: 'hidden' }}>
        <div className="panel-header">
          <div className="panel-title">
            <Database size={14} color="#0284c7" />
            Active Corpus Artifacts ({filteredDocs.length} Total)
          </div>
          <span style={{ fontSize: '0.72rem', color: 'var(--text-dim)', fontFamily: 'var(--font-mono)' }}>
            Bucket: s3://documind-rag-documents-bucket
          </span>
        </div>

        {filteredDocs.length === 0 ? (
          <div style={{ padding: '48px 20px', textAlign: 'center', color: 'var(--text-dim)' }}>
            <FileText size={36} style={{ margin: '0 auto 10px', opacity: 0.3 }} />
            <div style={{ fontSize: '0.84rem', color: 'var(--text-muted)' }}>
              No indexed documents in the corpus
            </div>
            <div style={{ fontSize: '0.74rem', marginTop: '4px' }}>
              Click <strong>Ingest Document to S3</strong> or use <strong>Load Benchmark Docs</strong> in the header bar.
            </div>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Document Name</th>
                  <th>Storage Location</th>
                  <th>File Size</th>
                  <th>Pages</th>
                  <th>Vector Chunks</th>
                  <th>Encryption / Status</th>
                  <th style={{ width: '80px', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredDocs.map((doc) => (
                  <tr key={doc.id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <FileText size={15} color="#3b82f6" />
                        <span style={{ fontWeight: '500', color: 'var(--text-primary)' }}>
                          {doc.name}
                        </span>
                      </div>
                    </td>
                    <td>
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                        {doc.id.startsWith('nc_') ? 'Nextcloud /remote.php' : 's3://documind/docs'}
                      </span>
                    </td>
                    <td style={{ fontFamily: 'var(--font-mono)' }}>
                      {formatBytes(doc.size)}
                    </td>
                    <td style={{ fontFamily: 'var(--font-mono)' }}>
                      {doc.pages || 1}
                    </td>
                    <td>
                      <span className="badge badge-blue">
                        {doc.chunks_count || 0} chunks (512-d)
                      </span>
                    </td>
                    <td>
                      <span className="badge badge-green">
                        <CheckCircle size={10} />
                        Active & Indexed
                      </span>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <button
                        onClick={() => onDelete(doc.id)}
                        className="btn btn-danger"
                        style={{ padding: '3px 8px', fontSize: '0.7rem' }}
                        title="Delete from S3 and remove OpenSearch embeddings"
                      >
                        <Trash2 size={12} />
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

    </div>
  );
}
