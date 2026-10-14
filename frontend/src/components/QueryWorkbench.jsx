import React, { useState, useRef, useEffect } from 'react';
import { Send, Sparkles, User, Bot, Paperclip, Copy, Check, FileText, ExternalLink, RefreshCw, ChevronRight, X, Clock, AlertCircle } from 'lucide-react';

const SUGGESTED_QUESTIONS = [
  {
    icon: "👤",
    title: "Who is Aditya Wagh?",
    subtitle: "Education, skills & AI experience",
    query: "Who is Aditya Wagh and what is his background?"
  },
  {
    icon: "🏥",
    title: "HIPAA Clinical AI Policy",
    subtitle: "Encryption & audit standards",
    query: "What encryption standards and audit log retention rules are required for patient data?"
  },
  {
    icon: "🛡️",
    title: "Ransomware Playbook",
    subtitle: "Incident response & Nextcloud isolation",
    query: "What is the response SLA and containment procedure for critical cybersecurity incidents?"
  },
  {
    icon: "⚡",
    title: "Tesla Megapack Specs",
    subtitle: "Storage capacity & LFP chemistry",
    query: "What is the energy capacity, battery chemistry, and system efficiency of Megapack 2XL?"
  }
];

export default function QueryWorkbench({ onQuery, querying, result, onInspectChunk, stats, onUpload }) {
  const [messages, setMessages] = useState([
    {
      id: 'welcome',
      sender: 'assistant',
      text: "Hello! I am your DocuMind AI Assistant. I can answer questions, summarize details, and extract verified insights directly from your documents stored in Nextcloud.\n\nWhat would you like to know today?",
      citations: [],
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
  ]);
  const [inputText, setInputText] = useState('');
  const [copiedId, setCopiedId] = useState(null);
  const [selectedCitation, setSelectedCitation] = useState(null);
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);

  // Auto-scroll to bottom when messages update
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, querying]);

  const handleSend = async (textToSend) => {
    const text = (textToSend || inputText).trim();
    if (!text || querying) return;

    const userMessageId = `user_${Date.now()}`;
    const newMessages = [
      ...messages,
      {
        id: userMessageId,
        sender: 'user',
        text: text,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }
    ];

    setMessages(newMessages);
    setInputText('');

    try {
      const response = await onQuery({ query: text });
      if (response && response.answer) {
        setMessages((prev) => [
          ...prev,
          {
            id: `assistant_${Date.now()}`,
            sender: 'assistant',
            text: response.answer,
            citations: response.citations || [],
            latency_ms: response.latency_ms,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          }
        ]);
      }
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          id: `error_${Date.now()}`,
          sender: 'assistant',
          text: `I encountered an issue retrieving the answer: ${err.message || 'Server error'}. Please verify that the document is uploaded.`,
          citations: [],
          isError: true,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ]);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleCopy = (id, text) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleClearChat = () => {
    setMessages([
      {
        id: 'welcome',
        sender: 'assistant',
        text: "Conversation cleared. Feel free to ask anything about your documents or select a suggested question below.",
        citations: [],
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }
    ]);
  };

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: 'calc(100vh - 160px)',
      minHeight: '580px',
      background: 'var(--bg-surface)',
      border: '1px solid var(--border-default)',
      borderRadius: '16px',
      overflow: 'hidden',
      boxShadow: 'var(--shadow-md)',
      position: 'relative'
    }}>
      {/* Top Chat Bar */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '12px 20px',
        borderBottom: '1px solid var(--border-default)',
        background: 'rgba(15, 23, 42, 0.7)',
        backdropFilter: 'blur(8px)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{
            background: 'linear-gradient(135deg, #0284c7 0%, #2563eb 100%)',
            padding: '7px',
            borderRadius: '10px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 0 12px rgba(37, 99, 235, 0.3)'
          }}>
            <Sparkles size={16} color="#ffffff" />
          </div>
          <div>
            <div style={{ fontWeight: '600', fontSize: '0.9rem', color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '8px' }}>
              DocuMind Assistant
              <span style={{
                fontSize: '0.68rem',
                color: '#34d399',
                background: 'rgba(16, 185, 129, 0.15)',
                border: '1px solid rgba(16, 185, 129, 0.3)',
                padding: '1px 7px',
                borderRadius: '12px',
                fontWeight: '500'
              }}>
                Ready
              </span>
            </div>
            <div style={{ fontSize: '0.74rem', color: '#94a3b8' }}>
              Answers verified against Nextcloud document repository
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {messages.length > 1 && (
            <button
              onClick={handleClearChat}
              className="btn btn-secondary"
              style={{ fontSize: '0.74rem', padding: '5px 12px' }}
              title="Clear conversation"
            >
              Clear Chat
            </button>
          )}
        </div>
      </div>

      {/* Messages Thread (Scrollable) */}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        padding: '24px 24px 100px 24px',
        display: 'flex',
        flexDirection: 'column',
        gap: '20px'
      }}>
        
        {/* Welcome Suggestions (shown when only initial message exists) */}
        {messages.length <= 1 && (
          <div style={{
            margin: '20px auto 10px',
            maxWidth: '780px',
            width: '100%'
          }}>
            <div style={{
              fontSize: '0.82rem',
              color: '#94a3b8',
              fontWeight: '500',
              marginBottom: '12px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}>
              <Sparkles size={14} color="#38bdf8" /> Suggested Questions to Ask:
            </div>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
              gap: '12px'
            }}>
              {SUGGESTED_QUESTIONS.map((sug, idx) => (
                <div
                  key={idx}
                  onClick={() => handleSend(sug.query)}
                  style={{
                    background: 'rgba(30, 41, 59, 0.4)',
                    border: '1px solid #1e293b',
                    borderRadius: '12px',
                    padding: '14px 16px',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '10px'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'rgba(30, 41, 59, 0.8)';
                    e.currentTarget.style.borderColor = '#38bdf8';
                    e.currentTarget.style.transform = 'translateY(-1px)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'rgba(30, 41, 59, 0.4)';
                    e.currentTarget.style.borderColor = '#1e293b';
                    e.currentTarget.style.transform = 'none';
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <span style={{ fontSize: '1.4rem' }}>{sug.icon}</span>
                    <div>
                      <div style={{ fontSize: '0.84rem', fontWeight: '600', color: '#f1f5f9' }}>
                        {sug.title}
                      </div>
                      <div style={{ fontSize: '0.74rem', color: '#94a3b8' }}>
                        {sug.subtitle}
                      </div>
                    </div>
                  </div>
                  <ChevronRight size={15} color="#64748b" />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Message Bubbles */}
        {messages.map((msg) => {
          const isUser = msg.sender === 'user';

          return (
            <div
              key={msg.id}
              style={{
                display: 'flex',
                flexDirection: isUser ? 'row-reverse' : 'row',
                alignItems: 'flex-start',
                gap: '12px',
                maxWidth: '850px',
                margin: isUser ? '0 0 0 auto' : '0 auto 0 0',
                width: '100%'
              }}
            >
              {/* Avatar */}
              <div style={{
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                background: isUser ? '#2563eb' : 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                boxShadow: isUser ? '0 0 10px rgba(37, 99, 235, 0.3)' : '0 0 10px rgba(2, 132, 199, 0.3)'
              }}>
                {isUser ? <User size={16} color="#ffffff" /> : <Bot size={16} color="#ffffff" />}
              </div>

              {/* Message Content */}
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
                maxWidth: 'calc(100% - 48px)'
              }}>
                <div style={{
                  background: isUser ? '#1d4ed8' : '#111c33',
                  border: `1px solid ${isUser ? '#2563eb' : '#1e293b'}`,
                  color: isUser ? '#ffffff' : '#f8fafc',
                  padding: '14px 18px',
                  borderRadius: isUser ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                  fontSize: '0.88rem',
                  lineHeight: '1.6',
                  whiteSpace: 'pre-wrap',
                  boxShadow: 'var(--shadow-sm)'
                }}>
                  {msg.text}
                </div>

                {/* Sources & Action Footer for Assistant Messages */}
                {!isUser && msg.citations && msg.citations.length > 0 && (
                  <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '6px',
                    padding: '0 4px'
                  }}>
                    <div style={{
                      fontSize: '0.72rem',
                      color: '#94a3b8',
                      fontWeight: '500',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}>
                      <FileText size={12} color="#38bdf8" /> Verified Sources:
                    </div>
                    
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                      {msg.citations.map((c, cIdx) => (
                        <button
                          key={cIdx}
                          onClick={() => setSelectedCitation(c)}
                          style={{
                            background: 'rgba(2, 132, 199, 0.12)',
                            border: '1px solid rgba(2, 132, 199, 0.3)',
                            borderRadius: '8px',
                            padding: '4px 10px',
                            color: '#38bdf8',
                            fontSize: '0.73rem',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            cursor: 'pointer',
                            transition: 'all 0.15s ease'
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.background = 'rgba(2, 132, 199, 0.25)';
                            e.currentTarget.style.borderColor = '#38bdf8';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.background = 'rgba(2, 132, 199, 0.12)';
                            e.currentTarget.style.borderColor = 'rgba(2, 132, 199, 0.3)';
                          }}
                          title="Click to view extracted document passage"
                        >
                          <FileText size={11} />
                          <span>{c.doc_name}</span>
                          <span style={{ color: '#94a3b8', fontSize: '0.68rem' }}>(Pg {c.page_number})</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Timestamp & Copy for Assistant */}
                {!isUser && (
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    fontSize: '0.7rem',
                    color: '#64748b',
                    padding: '0 4px'
                  }}>
                    <span>{msg.timestamp}</span>
                    <button
                      onClick={() => handleCopy(msg.id, msg.text)}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        color: copiedId === msg.id ? '#34d399' : '#64748b',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        fontSize: '0.7rem'
                      }}
                      title="Copy response"
                    >
                      {copiedId === msg.id ? <Check size={11} /> : <Copy size={11} />}
                      {copiedId === msg.id ? 'Copied' : 'Copy'}
                    </button>
                  </div>
                )}

              </div>
            </div>
          );
        })}

        {/* Loading Indicator */}
        {querying && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            maxWidth: '850px',
            margin: '0 auto 0 0',
            width: '100%'
          }}>
            <div style={{
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <Sparkles size={16} color="#ffffff" className="animate-spin" />
            </div>
            <div style={{
              background: '#111c33',
              border: '1px solid #1e293b',
              padding: '12px 18px',
              borderRadius: '16px 16px 16px 4px',
              color: '#94a3b8',
              fontSize: '0.84rem',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              <span>Analyzing your documents & formulating answer...</span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Floating Bottom Input Dock */}
      <div style={{
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        padding: '14px 24px',
        background: 'linear-gradient(to top, #0e1524 85%, rgba(14, 21, 36, 0.4) 100%)',
        borderTop: '1px solid #1e293b'
      }}>
        <div style={{
          maxWidth: '880px',
          margin: '0 auto',
          position: 'relative'
        }}>
          {/* Hidden File Input for Attachment */}
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.txt,.md"
            style={{ display: 'none' }}
            onChange={(e) => {
              if (e.target.files && e.target.files[0] && onUpload) {
                onUpload(e.target.files[0]);
                e.target.value = '';
              }
            }}
          />

          <div style={{
            display: 'flex',
            alignItems: 'center',
            background: '#070b14',
            border: '1px solid #334155',
            borderRadius: '28px',
            padding: '6px 8px 6px 14px',
            boxShadow: '0 8px 24px rgba(0, 0, 0, 0.4)',
            transition: 'border-color 0.2s ease'
          }}>
            {/* Attachment Button */}
            <button
              onClick={() => fileInputRef.current?.click()}
              type="button"
              style={{
                background: 'transparent',
                border: 'none',
                color: '#94a3b8',
                cursor: 'pointer',
                padding: '6px',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'color 0.15s ease'
              }}
              title="Upload and store a new document in Nextcloud & RAG"
              onMouseEnter={(e) => e.currentTarget.style.color = '#38bdf8'}
              onMouseLeave={(e) => e.currentTarget.style.color = '#94a3b8'}
            >
              <Paperclip size={18} />
            </button>

            {/* Query Input */}
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask anything about your documents, policies, or contracts... (Press Enter)"
              disabled={querying}
              style={{
                flex: 1,
                background: 'transparent',
                border: 'none',
                outline: 'none',
                color: '#f8fafc',
                fontSize: '0.88rem',
                padding: '8px 12px'
              }}
            />

            {/* Send Button */}
            <button
              onClick={() => handleSend()}
              disabled={!inputText.trim() || querying}
              style={{
                background: inputText.trim() && !querying ? '#2563eb' : '#1e293b',
                color: inputText.trim() && !querying ? '#ffffff' : '#64748b',
                border: 'none',
                borderRadius: '50%',
                width: '36px',
                height: '36px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: inputText.trim() && !querying ? 'pointer' : 'not-allowed',
                transition: 'all 0.2s ease',
                boxShadow: inputText.trim() && !querying ? '0 0 10px rgba(37, 99, 235, 0.4)' : 'none'
              }}
              title="Send question"
            >
              <Send size={15} />
            </button>
          </div>

          <div style={{
            fontSize: '0.7rem',
            color: '#64748b',
            textAlign: 'center',
            marginTop: '6px'
          }}>
            Answers are grounded strictly in your Nextcloud document repository. No external training data is used.
          </div>
        </div>
      </div>

      {/* Source Excerpt Modal / Popover */}
      {selectedCitation && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.75)',
          backdropFilter: 'blur(5px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1100,
          padding: '20px'
        }}>
          <div style={{
            background: '#0d1527',
            border: '1px solid #1e293b',
            borderRadius: '14px',
            width: '100%',
            maxWidth: '560px',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.7)',
            overflow: 'hidden',
            color: '#f8fafc'
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '16px 20px',
              borderBottom: '1px solid #1e293b',
              background: 'rgba(15, 23, 42, 0.8)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <FileText size={16} color="#38bdf8" />
                <div>
                  <h4 style={{ margin: 0, fontSize: '0.92rem', fontWeight: '600' }}>
                    {selectedCitation.doc_name}
                  </h4>
                  <span style={{ fontSize: '0.72rem', color: '#94a3b8' }}>
                    Document Source Passage (Page {selectedCitation.page_number})
                  </span>
                </div>
              </div>
              <button
                onClick={() => setSelectedCitation(null)}
                style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: '4px' }}
              >
                <X size={16} />
              </button>
            </div>

            <div style={{ padding: '20px', maxHeight: '360px', overflowY: 'auto' }}>
              <div style={{
                background: '#070b14',
                border: '1px solid #1e293b',
                borderRadius: '8px',
                padding: '14px 16px',
                fontSize: '0.84rem',
                lineHeight: '1.6',
                color: '#e2e8f0',
                whiteSpace: 'pre-wrap',
                fontFamily: 'inherit'
              }}>
                {selectedCitation.full_text || selectedCitation.preview}
              </div>
            </div>

            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'flex-end',
              padding: '12px 20px',
              borderTop: '1px solid #1e293b',
              background: 'rgba(15, 23, 42, 0.8)'
            }}>
              <button
                onClick={() => setSelectedCitation(null)}
                className="btn btn-secondary"
                style={{ fontSize: '0.78rem', padding: '5px 14px' }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
