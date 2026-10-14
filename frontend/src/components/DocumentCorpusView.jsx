import React, { useRef, useState } from 'react';
import { FileText, UploadCloud, Trash2, HardDrive, RefreshCw, CheckCircle, Search, ShieldCheck, Database, Layers, ExternalLink, CloudCheck, Folder } from 'lucide-react';

export default function DocumentCorpusView({
  documents,
  onUpload,
  onDelete,
  uploading,
  onSyncNextcloud,
  onOpenNextcloud,
  syncingNextcloud,
  nextcloudStatus
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
    const isNextcloud = doc.has_nextcloud || doc.id?.startsWith('nc_') || doc.storage_location?.toLowerCase().includes('nextcloud');

    if (filterType === 'NEXTCLOUD') return matchesSearch && isNextcloud;
    if (filterType === 'PDF') return matchesSearch && doc.name.endsWith('.pdf');
    if (filterType === 'TXT') return matchesSearch && (doc.name.endsWith('.txt') || doc.name.endsWith('.md'));
    return matchesSearch;
  });

  const nextcloudCount = documents.filter(doc => doc.has_nextcloud || doc.id?.startsWith('nc_') || doc.storage_location?.toLowerCase().includes('nextcloud')).length;

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
            <option value="ALL">All File Types ({documents.length})</option>
            <option value="NEXTCLOUD">Nextcloud Storage ({nextcloudCount})</option>
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
            onClick={onOpenNextcloud || onSyncNextcloud}
            disabled={syncingNextcloud}
            className="btn btn-secondary"
            title="Connect and manage Nextcloud WebDAV Storage"
            style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <span style={{
              width: '7px',
              height: '7px',
              borderRadius: '50%',
              backgroundColor: nextcloudStatus?.connected ? '#10b981' : '#f59e0b',
              display: 'inline-block',
              boxShadow: nextcloudStatus?.connected ? '0 0 6px #10b981' : 'none'
            }} />
            <HardDrive size={13} color="#38bdf8" />
            Nextcloud Storage
          </button>

          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="btn btn-primary"
            title="Upload document: automatically saved to Nextcloud (/DocuMind) and vectorized into RAG"
          >
            <UploadCloud size={14} className={uploading ? 'animate-spin' : ''} />
            {uploading ? 'Ingesting Chunks...' : 'Upload to Nextcloud & RAG'}
          </button>
        </div>

      </div>

      {/* Enterprise Data Table */}
      <div className="panel" style={{ overflow: 'hidden' }}>
        <div className="panel-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div className="panel-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Database size={14} color="#0284c7" />
            Active Corpus Artifacts ({filteredDocs.length} Total)
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{
              fontSize: '0.72rem',
              color: '#38bdf8',
              background: 'rgba(2, 132, 199, 0.12)',
              border: '1px solid rgba(2, 132, 199, 0.3)',
              borderRadius: '4px',
              padding: '2px 8px',
              fontFamily: 'var(--font-mono)',
              display: 'flex',
              alignItems: 'center',
              gap: '4px'
            }}>
              <HardDrive size={11} /> Nextcloud: /DocuMind
            </span>
            <span style={{ fontSize: '0.72rem', color: 'var(--text-dim)', fontFamily: 'var(--font-mono)' }}>
              s3://documind-rag-documents-bucket
            </span>
          </div>
        </div>

        {filteredDocs.length === 0 ? (
          <div style={{ padding: '48px 20px', textAlign: 'center', color: 'var(--text-dim)' }}>
            <FileText size={36} style={{ margin: '0 auto 10px', opacity: 0.3 }} />
            <div style={{ fontSize: '0.84rem', color: 'var(--text-muted)' }}>
              No indexed documents in the corpus
            </div>
            <div style={{ fontSize: '0.74rem', marginTop: '4px' }}>
              Click <strong>Upload to Nextcloud & RAG</strong> or open <strong>Nextcloud Storage</strong> to sync existing files.
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
                {filteredDocs.map((doc) => {
                  const isNc = doc.has_nextcloud || doc.id?.startsWith('nc_') || doc.storage_location?.toLowerCase().includes('nextcloud');
                  const nextcloudFolder = doc.storage_location?.includes('/DocuMind') ? '/DocuMind' : (doc.storage_location || '/DocuMind');
                  const openUrl = doc.nextcloud_url || `http://localhost:8080/index.php/apps/files/files?dir=/DocuMind`;

                  return (
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
                        {isNc ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span style={{
                              background: 'rgba(2, 132, 199, 0.15)',
                              color: '#38bdf8',
                              border: '1px solid rgba(2, 132, 199, 0.4)',
                              borderRadius: '6px',
                              padding: '2px 8px',
                              fontSize: '0.72rem',
                              fontFamily: 'var(--font-mono)',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px'
                            }}>
                              <HardDrive size={11} color="#38bdf8" />
                              Nextcloud: /DocuMind
                            </span>
                            <a
                              href={openUrl}
                              target="_blank"
                              rel="noreferrer"
                              title="Open folder in Nextcloud Web UI"
                              style={{
                                color: '#94a3b8',
                                display: 'inline-flex',
                                alignItems: 'center',
                                padding: '3px',
                                borderRadius: '4px',
                                textDecoration: 'none'
                              }}
                              className="hover-opacity"
                            >
                              <ExternalLink size={12} />
                            </a>
                          </div>
                        ) : (
                          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                            {doc.storage_location || 's3://documind/docs'}
                          </span>
                        )}
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
                          title="Purge document from RAG and Nextcloud storage"
                        >
                          <Trash2 size={12} />
                          Delete
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

    </div>
  );
}
