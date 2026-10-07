import React, { useState } from 'react';
import DomainBadge from './DomainBadge';
import { ThumbsUp, ThumbsDown, Check, Sparkles, Building, GitBranch } from 'lucide-react';
import { chatService } from '../../services/chatService';
import { getDomainConfig } from '../../utils/constants';

export default function MessageItem({ message, onInspectMessage, isSelected }) {
  const isUser = message.role === 'user';
  const [feedback, setFeedback] = useState(null);
  const [isSubmittingFeedback, setIsSubmittingFeedback] = useState(false);

  const handleFeedback = async (rating) => {
    if (feedback || isSubmittingFeedback) return;
    setIsSubmittingFeedback(true);
    try {
      const targetId = message.turnId || message.id;
      if (targetId && !String(targetId).startsWith('welcome')) {
        await chatService.submitFeedback({ turnId: targetId, rating });
      }
      setFeedback(rating);
    } catch (e) {
      console.error('Failed to submit feedback:', e);
      setFeedback(rating); // Soft optimistic feedback
    } finally {
      setIsSubmittingFeedback(false);
    }
  };

  const isMultiAnswer = !isUser && (message.type === 'multi_answer' || (Array.isArray(message.answers) && message.answers.length > 1));
  const displayDomains = isMultiAnswer
    ? (message.domains && message.domains.length > 0 ? message.domains : (message.domain ? [message.domain] : []))
    : (message.domain ? [message.domain] : (message.domains && message.domains.length > 0 ? [message.domains[0]] : []));

  const routedPath = message.routedTo || (
    displayDomains.length > 0
      ? displayDomains.map((d) => getDomainConfig(d).department || d).join(' & ')
      : null
  );

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: isUser ? 'flex-end' : 'flex-start',
        marginBottom: '20px',
        maxWidth: '100%',
      }}
    >
      <div
        style={{
          display: 'flex',
          gap: '10px',
          maxWidth: '85%',
          flexDirection: isUser ? 'row-reverse' : 'row',
        }}
      >
        {!isUser && (
          <div
            style={{
              width: '36px',
              height: '36px',
              borderRadius: '10px',
              backgroundColor: 'var(--primary-light)',
              color: 'var(--primary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <Sparkles size={18} />
          </div>
        )}

        <div
          style={{
            backgroundColor: isUser ? 'var(--primary)' : 'var(--bg-card)',
            color: isUser ? '#ffffff' : 'var(--text-main)',
            border: isUser ? 'none' : isSelected ? '1.5px solid #ea580c' : '1px solid var(--border-subtle)',
            borderRadius: isUser ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
            padding: '14px 18px',
            boxShadow: isSelected ? '0 0 14px rgba(234, 88, 12, 0.16)' : 'var(--shadow-sm)',
            lineHeight: 1.6,
            wordBreak: 'break-word',
            transition: 'border-color 0.2s ease, box-shadow 0.2s ease',
          }}
        >
          {!isUser && (displayDomains.length > 0 || routedPath) && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '8px',
                marginBottom: '10px',
              }}
            >
              {displayDomains.map((dom, idx) => {
                const partScore =
                  message.answers?.find((a) => a.domain === dom)?.routingScore ?? message.confidence;
                return <DomainBadge key={idx} domain={dom} confidence={partScore} />;
              })}
              {routedPath && (
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    fontSize: '0.75rem',
                    color: 'var(--text-muted)',
                  }}
                >
                  <Building size={12} /> Routed: {routedPath}
                </span>
              )}

              <button
                type="button"
                onClick={() => onInspectMessage?.(message)}
                style={{
                  marginLeft: 'auto',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  fontSize: '0.72rem',
                  fontWeight: 700,
                  color: isSelected ? '#ea580c' : '#64748b',
                  backgroundColor: isSelected ? '#fff7ed' : '#f8fafc',
                  border: `1px solid ${isSelected ? '#fed7aa' : '#e2e8f0'}`,
                  padding: '3px 8px',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
                title="Inspect routing telemetry and flow map"
              >
                <GitBranch size={12} color={isSelected ? '#ea580c' : '#64748b'} />
                <span>{isSelected ? 'Route Visible' : 'Inspect Route'}</span>
              </button>
            </div>
          )}

          {isMultiAnswer ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {message.answers.map((part, idx) => {
                const cfg = getDomainConfig(part.domain);
                const targetDept = part.routedTo || part.department || cfg.department;
                return (
                  <div
                    key={idx}
                    style={{
                      backgroundColor: cfg.bgColor,
                      border: `1px solid ${cfg.borderColor}`,
                      borderRadius: '12px',
                      padding: '12px 14px',
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        flexWrap: 'wrap',
                        gap: '8px',
                        marginBottom: '8px',
                      }}
                    >
                      <DomainBadge domain={part.domain} confidence={part.routingScore} />
                      {targetDept && (
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            fontSize: '0.75rem',
                            color: cfg.color,
                            fontWeight: 600,
                          }}
                        >
                          <Building size={12} /> Routed to: {targetDept}
                        </span>
                      )}
                    </div>

                    <div style={{ whiteSpace: 'pre-wrap', fontSize: '0.93rem', color: '#1e293b' }}>
                      {part.answer}
                    </div>

                    {part.sources && part.sources.length > 0 && (
                      <div
                        style={{
                          marginTop: '10px',
                          paddingTop: '8px',
                          borderTop: `1px solid ${cfg.borderColor}`,
                          fontSize: '0.78rem',
                          color: 'var(--text-muted)',
                        }}
                      >
                        <div style={{ fontWeight: 600, marginBottom: '2px', color: cfg.color }}>
                          Verified Sources:
                        </div>
                        <ul style={{ paddingLeft: '16px', margin: 0 }}>
                          {part.sources.map((src, i) => (
                            <li key={i}>
                              {src.document ||
                                src.title ||
                                src.source ||
                                (typeof src === 'string' ? src : 'Campus Policy')}
                              {src.section ? ` (${src.section})` : ''}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <>
              <div style={{ whiteSpace: 'pre-wrap', fontSize: '0.95rem' }}>{message.content}</div>

              {!isUser && message.sources && message.sources.length > 0 && (
                <div
                  style={{
                    marginTop: '12px',
                    paddingTop: '10px',
                    borderTop: '1px solid var(--border-subtle)',
                    fontSize: '0.8rem',
                    color: 'var(--text-muted)',
                  }}
                >
                  <div style={{ fontWeight: 600, marginBottom: '4px' }}>Sources:</div>
                  <ul style={{ paddingLeft: '16px', margin: 0 }}>
                    {message.sources.map((src, i) => (
                      <li key={i}>
                        {src.document ||
                          src.title ||
                          src.source ||
                          src.url ||
                          (typeof src === 'string' ? src : 'Campus Policy')}
                        {src.section ? ` (${src.section})` : ''}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </>
          )}

          {!isUser && !message.isError && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                marginTop: '10px',
                paddingTop: '8px',
                borderTop: '1px dashed var(--border-subtle)',
              }}
            >
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                Was this helpful?
              </span>
              <button
                onClick={() => handleFeedback(1)}
                disabled={feedback !== null}
                style={{
                  color: feedback === 1 ? 'var(--status-success)' : 'var(--text-muted)',
                  padding: '2px 4px',
                }}
                title="Helpful"
              >
                {feedback === 1 ? <Check size={14} /> : <ThumbsUp size={14} />}
              </button>
              <button
                onClick={() => handleFeedback(-1)}
                disabled={feedback !== null}
                style={{
                  color: feedback === -1 ? 'var(--status-error)' : 'var(--text-muted)',
                  padding: '2px 4px',
                }}
                title="Not helpful"
              >
                <ThumbsDown size={14} />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
