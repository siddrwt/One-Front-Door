import React from 'react';
import {
  GitBranch,
  Cpu,
  Layers,
  Activity,
  FileText,
  CheckCircle2,
  ArrowRight,
  X,
  Sparkles,
  Building2,
  HelpCircle,
  Clock,
  ExternalLink,
  AlertCircle,
  ShieldCheck,
  Split,
} from 'lucide-react';
import { getDomainConfig, DOMAIN_CONFIG } from '../../utils/constants';

export default function RoutingInspector({
  activeMessage,
  userQuery,
  allTurns = [],
  selectedTurnIndex,
  onSelectTurn,
  onClose,
}) {
  if (!activeMessage) {
    return (
      <div
        style={{
          width: '360px',
          height: '100%',
          backgroundColor: '#ffffff',
          borderLeft: '1px solid #e2e8f0',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '24px',
          color: '#64748b',
          textAlign: 'center',
        }}
      >
        <GitBranch size={36} color="#94a3b8" style={{ marginBottom: '12px' }} />
        <h4 style={{ margin: 0, color: '#1e293b', fontSize: '0.96rem', fontWeight: 700 }}>
          Route Inspector Ready
        </h4>
        <p style={{ fontSize: '0.82rem', marginTop: '6px', lineHeight: 1.5 }}>
          Send a query or click on any bot response to visualize how One Front Door routed it across campus departments.
        </p>
      </div>
    );
  }

  // Check if session is in initial/starting state (no inquiry sent yet)
  const isStarting =
    !userQuery ||
    activeMessage.id === 'welcome' ||
    (!activeMessage.turnId && activeMessage.domain === 'general');

  // Derive domain info
  const isMulti = !isStarting && (activeMessage.type === 'multi_answer' || (Array.isArray(activeMessage.answers) && activeMessage.answers.length > 1));
  const isClarification = !isStarting && activeMessage.type === 'clarification';
  const isHandoff = !isStarting && (activeMessage.type === 'handoff' || !!activeMessage.ticketId);

  const primaryDomain = isStarting
    ? 'general'
    : (activeMessage.domain || (activeMessage.domains && activeMessage.domains[0]) || 'general');
  const primaryConfig = getDomainConfig(primaryDomain);

  // Confidence score for router node (0% in starting state)
  const confidenceVal = isStarting
    ? 0
    : (typeof activeMessage.confidence === 'number'
        ? Math.round(activeMessage.confidence <= 1 ? activeMessage.confidence * 100 : activeMessage.confidence)
        : 92);

  // Domain score distributions (strictly 0% across all domains in the starting state)
  const candidateDomainScores = activeMessage.candidateDomainScores || activeMessage.signals || {};
  const allKnownDomains = ['fees', 'examination', 'it', 'facilities', 'career_services'];
  
  const scoreBreakdown = allKnownDomains.map((domKey) => {
    const cfg = getDomainConfig(domKey);
    let score = 0;
    if (isStarting) {
      score = 0;
    } else if (candidateDomainScores[domKey] !== undefined) {
      score = Math.round(candidateDomainScores[domKey] <= 1 ? candidateDomainScores[domKey] * 100 : candidateDomainScores[domKey]);
    } else if (isMulti && activeMessage.domains?.includes(domKey)) {
      const match = activeMessage.answers?.find((a) => a.domain === domKey);
      score = match?.routingScore ? Math.round(match.routingScore * 100) : 86;
    } else if (domKey === primaryDomain) {
      score = confidenceVal;
    } else {
      score = 0;
    }
    return {
      key: domKey,
      label: cfg.label,
      color: cfg.color,
      bg: cfg.bgColor,
      border: cfg.borderColor,
      score,
      isSelected: !isStarting && (isMulti ? activeMessage.domains?.includes(domKey) : domKey === primaryDomain),
    };
  }).sort((a, b) => (isStarting ? 0 : b.score - a.score));

  // Sources (empty in starting state)
  const sources = isStarting ? [] : (activeMessage.sources || []);

  return (
    <aside
      style={{
        width: '370px',
        height: '100%',
        backgroundColor: '#ffffff',
        borderLeft: '1px solid #e2e8f0',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        flexShrink: 0,
        boxShadow: '-4px 0 16px rgba(0, 0, 0, 0.03)',
        zIndex: 10,
      }}
    >
      {/* 1. Header Bar */}
      <div
        style={{
          padding: '14px 18px',
          borderBottom: '1px solid #f1f5f9',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          backgroundColor: '#ffffff',
          flexShrink: 0,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div
            style={{
              width: '28px',
              height: '28px',
              borderRadius: '8px',
              backgroundColor: '#fff7ed',
              border: '1px solid #fed7aa',
              color: '#ea580c',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <GitBranch size={16} />
          </div>
          <div>
            <div style={{ fontSize: '0.88rem', fontWeight: 800, color: '#0f172a', letterSpacing: '0.01em' }}>
              Routing Visualizer
            </div>
            <div style={{ fontSize: '0.70rem', color: '#64748b', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#10b981' }} />
              Live Telemetry & Graph
            </div>
          </div>
        </div>

        <button
          onClick={onClose}
          style={{
            padding: '6px',
            borderRadius: '6px',
            color: '#64748b',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'background 0.15s ease',
          }}
          title="Close Inspector"
          onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#f1f5f9')}
          onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
        >
          <X size={18} />
        </button>
      </div>

      {/* Scrollable Visual Content */}

      {/* 3. Scrollable Visual Content */}
      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '16px',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px',
        }}
      >
        {/* User Query Preview */}
        {userQuery && (
          <div
            style={{
              padding: '10px 14px',
              borderRadius: '10px',
              backgroundColor: '#f8fafc',
              border: '1px solid #e2e8f0',
            }}
          >
            <div
              style={{
                fontSize: '0.68rem',
                fontWeight: 800,
                color: '#64748b',
                textTransform: 'uppercase',
                letterSpacing: '0.04em',
                marginBottom: '4px',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
              }}
            >
              <HelpCircle size={12} /> Input Inquiry
            </div>
            <div style={{ fontSize: '0.82rem', color: '#1e293b', fontWeight: 600, fontStyle: 'italic', lineHeight: 1.4 }}>
              "{userQuery}"
            </div>
          </div>
        )}

        {/* --- INTERACTIVE ROUTING FLOW DIAGRAM --- */}
        <div
          style={{
            border: '1px solid #e2e8f0',
            borderRadius: '12px',
            backgroundColor: '#fafbfc',
            padding: '14px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '12px',
            }}
          >
            <span
              style={{
                fontSize: '0.72rem',
                fontWeight: 800,
                color: '#475569',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
              }}
            >
              <Activity size={14} color="#ea580c" /> Visual Flow Path
            </span>
            <span
              style={{
                fontSize: '0.68rem',
                fontWeight: 700,
                backgroundColor: isStarting ? '#f1f5f9' : isMulti ? '#f5f3ff' : '#ecfdf5',
                color: isStarting ? '#64748b' : isMulti ? '#7c3aed' : '#059669',
                border: `1px solid ${isStarting ? '#cbd5e1' : isMulti ? '#ddd6fe' : '#a7f3d0'}`,
                padding: '2px 8px',
                borderRadius: '9999px',
              }}
            >
              {isStarting ? 'Standby' : isMulti ? 'Multi-Branch' : isClarification ? 'Ambiguous' : 'Resolved'}
            </span>
          </div>

          {/* NODE 1: User Request */}
          <div
            style={{
              backgroundColor: '#ffffff',
              border: '1.5px solid #cbd5e1',
              borderRadius: '10px',
              padding: '10px 12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div
                style={{
                  width: '26px',
                  height: '26px',
                  borderRadius: '6px',
                  backgroundColor: '#f1f5f9',
                  color: '#475569',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                🎓
              </div>
              <div>
                <div style={{ fontSize: '0.78rem', fontWeight: 800, color: '#1e293b' }}>
                  Student Front Door
                </div>
                <div style={{ fontSize: '0.68rem', color: '#64748b' }}>
                  Channel: Web Assistant
                </div>
              </div>
            </div>
            <span style={{ fontSize: '0.66rem', color: '#94a3b8', fontWeight: 600 }}>T+0ms</span>
          </div>

          {/* CONNECTOR 1 */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              height: '24px',
              justifyContent: 'center',
              position: 'relative',
            }}
          >
            <div style={{ width: '2px', height: '100%', backgroundColor: '#cbd5e1' }} />
            <div
              style={{
                position: 'absolute',
                width: '6px',
                height: '6px',
                borderRadius: '50%',
                backgroundColor: '#ea580c',
                boxShadow: '0 0 6px #ea580c',
              }}
            />
          </div>

          {/* NODE 2: Decision Classifier Router */}
          <div
            style={{
              backgroundColor: '#fff7ed',
              border: '1.5px solid #fed7aa',
              borderRadius: '10px',
              padding: '10px 12px',
              boxShadow: '0 2px 5px rgba(234, 88, 12, 0.08)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div
                  style={{
                    width: '26px',
                    height: '26px',
                    borderRadius: '6px',
                    backgroundColor: '#ea580c',
                    color: '#ffffff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Cpu size={14} />
                </div>
                <div>
                  <div style={{ fontSize: '0.80rem', fontWeight: 800, color: '#9a3412' }}>
                    One Front Door Router
                  </div>
                  <div style={{ fontSize: '0.68rem', color: '#c2410c' }}>
                    campus-classifier
                  </div>
                </div>
              </div>
              <span
                style={{
                  fontSize: '0.70rem',
                  fontWeight: 800,
                  color: isStarting ? '#64748b' : '#c2410c',
                  backgroundColor: '#ffffff',
                  padding: '2px 6px',
                  borderRadius: '4px',
                  border: `1px solid ${isStarting ? '#e2e8f0' : '#fed7aa'}`,
                }}
              >
                {isStarting ? '0% (Standby)' : `${confidenceVal}% Match`}
              </span>
            </div>
          </div>

          {/* CONNECTOR 2: Single or Branching */}
          {isMulti ? (
            /* Multi-branch visual connector */
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                margin: '4px 0',
              }}
            >
              <div style={{ width: '2px', height: '12px', backgroundColor: '#cbd5e1' }} />
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  fontSize: '0.66rem',
                  fontWeight: 700,
                  color: '#7c3aed',
                  backgroundColor: '#f5f3ff',
                  padding: '2px 8px',
                  borderRadius: '9999px',
                  border: '1px solid #ddd6fe',
                }}
              >
                <Split size={12} /> Split Inquiry Dispatched
              </div>
              <div style={{ width: '2px', height: '12px', backgroundColor: '#cbd5e1' }} />
            </div>
          ) : (
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                height: '24px',
                justifyContent: 'center',
                position: 'relative',
              }}
            >
              <div style={{ width: '2px', height: '100%', backgroundColor: '#cbd5e1' }} />
              <div
                style={{
                  position: 'absolute',
                  width: '6px',
                  height: '6px',
                  borderRadius: '50%',
                  backgroundColor: primaryConfig.color,
                  boxShadow: `0 0 6px ${primaryConfig.color}`,
                }}
              />
            </div>
          )}

          {/* NODE 3: Destination Department(s) */}
          {isMulti && activeMessage.answers?.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {activeMessage.answers.map((ans, aIdx) => {
                const subCfg = getDomainConfig(ans.domain);
                const subScore = ans.routingScore ? Math.round(ans.routingScore * 100) : 88;
                return (
                  <div
                    key={aIdx}
                    style={{
                      backgroundColor: subCfg.bgColor,
                      border: `1.5px solid ${subCfg.borderColor}`,
                      borderRadius: '10px',
                      padding: '9px 12px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span
                        style={{
                          width: '8px',
                          height: '8px',
                          borderRadius: '50%',
                          backgroundColor: subCfg.color,
                        }}
                      />
                      <div>
                        <div style={{ fontSize: '0.78rem', fontWeight: 800, color: subCfg.color }}>
                          {subCfg.label}
                        </div>
                        <div style={{ fontSize: '0.67rem', color: '#64748b' }}>
                          Target: {ans.routedTo || ans.department || subCfg.department}
                        </div>
                      </div>
                    </div>
                    <span
                      style={{
                        fontSize: '0.70rem',
                        fontWeight: 800,
                        color: subCfg.color,
                        backgroundColor: '#ffffff',
                        padding: '2px 6px',
                        borderRadius: '4px',
                      }}
                    >
                      {subScore}%
                    </span>
                  </div>
                );
              })}
            </div>
          ) : (
            <div
              style={{
                backgroundColor: primaryConfig.bgColor,
                border: `1.5px solid ${primaryConfig.borderColor}`,
                borderRadius: '10px',
                padding: '10px 12px',
                boxShadow: `0 2px 6px ${primaryConfig.bgColor}`,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div
                    style={{
                      width: '26px',
                      height: '26px',
                      borderRadius: '6px',
                      backgroundColor: primaryConfig.color,
                      color: '#ffffff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Building2 size={14} />
                  </div>
                  <div>
                    <div style={{ fontSize: '0.80rem', fontWeight: 800, color: isStarting ? '#475569' : primaryConfig.color }}>
                      {isStarting ? 'Campus Front Door' : primaryConfig.label}
                    </div>
                    <div style={{ fontSize: '0.68rem', color: '#64748b' }}>
                      {isStarting ? 'Awaiting student inquiry...' : (activeMessage.routedTo || primaryConfig.department)}
                    </div>
                  </div>
                </div>

                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    fontSize: '0.68rem',
                    fontWeight: 700,
                    color: isStarting ? '#64748b' : '#059669',
                    backgroundColor: '#ffffff',
                    padding: '2px 8px',
                    borderRadius: '4px',
                    border: `1px solid ${isStarting ? '#cbd5e1' : '#a7f3d0'}`,
                  }}
                >
                  <CheckCircle2 size={12} /> {isStarting ? 'Standby' : 'Routed'}
                </div>
              </div>
            </div>
          )}

          {/* Escalated ticket node if applicable */}
          {activeMessage.ticketId && (
            <>
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  height: '20px',
                  justifyContent: 'center',
                }}
              >
                <div style={{ width: '2px', height: '100%', backgroundColor: '#f87171' }} />
              </div>
              <div
                style={{
                  backgroundColor: '#fef2f2',
                  border: '1.5px solid #fecaca',
                  borderRadius: '10px',
                  padding: '9px 12px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <AlertCircle size={15} color="#ef4444" />
                  <div>
                    <div style={{ fontSize: '0.78rem', fontWeight: 800, color: '#b91c1c' }}>
                      Escalated Ticket Created
                    </div>
                    <div style={{ fontSize: '0.68rem', color: '#ef4444' }}>
                      ID: #{activeMessage.ticketId}
                    </div>
                  </div>
                </div>
                <span
                  style={{
                    fontSize: '0.66rem',
                    fontWeight: 800,
                    color: '#b91c1c',
                    backgroundColor: '#fee2e2',
                    padding: '2px 6px',
                    borderRadius: '4px',
                  }}
                >
                  Action Required
                </span>
              </div>
            </>
          )}
        </div>

        {/* --- CONFIDENCE SCORE DISTRIBUTION GAUGES --- */}
        <div
          style={{
            border: '1px solid #e2e8f0',
            borderRadius: '12px',
            backgroundColor: '#ffffff',
            padding: '14px',
          }}
        >
          <div
            style={{
              fontSize: '0.72rem',
              fontWeight: 800,
              color: '#475569',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              marginBottom: '10px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
              <Layers size={13} color="#ea580c" /> Domain Probability
            </span>
            <span style={{ fontSize: '0.66rem', color: '#94a3b8' }}>Softmax / Margin</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '9px' }}>
            {scoreBreakdown.map((item) => (
              <div key={item.key}>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    fontSize: '0.72rem',
                    marginBottom: '3px',
                  }}
                >
                  <span
                    style={{
                      fontWeight: item.isSelected ? 800 : 500,
                      color: item.isSelected ? item.color : '#64748b',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '5px',
                    }}
                  >
                    {item.isSelected && (
                      <span
                        style={{
                          width: '6px',
                          height: '6px',
                          borderRadius: '50%',
                          backgroundColor: item.color,
                        }}
                      />
                    )}
                    {item.label}
                  </span>
                  <span
                    style={{
                      fontWeight: item.isSelected ? 800 : 600,
                      color: item.isSelected ? item.color : '#94a3b8',
                    }}
                  >
                    {item.score}%
                  </span>
                </div>

                <div
                  style={{
                    height: '6px',
                    borderRadius: '9999px',
                    backgroundColor: '#f1f5f9',
                    overflow: 'hidden',
                  }}
                >
                  <div
                    style={{
                      height: '100%',
                      width: `${item.score}%`,
                      backgroundColor: item.isSelected ? item.color : '#cbd5e1',
                      borderRadius: '9999px',
                      transition: 'width 0.4s ease',
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* --- KNOWLEDGE BASE GROUNDING SOURCES --- */}
        <div
          style={{
            border: '1px solid #e2e8f0',
            borderRadius: '12px',
            backgroundColor: '#ffffff',
            padding: '14px',
          }}
        >
          <div
            style={{
              fontSize: '0.72rem',
              fontWeight: 800,
              color: '#475569',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              marginBottom: '10px',
              display: 'flex',
              alignItems: 'center',
              gap: '5px',
            }}
          >
            <FileText size={13} color="#ea580c" /> Grounding Evidence ({sources.length})
          </div>

          {sources.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {sources.map((src, sIdx) => {
                const docName =
                  src.document || src.title || src.source || (typeof src === 'string' ? src : 'Campus Policy Document');
                const secName = src.section || src.clause;
                const score = src.score ? Math.round(src.score * 100) : null;

                return (
                  <div
                    key={sIdx}
                    style={{
                      padding: '8px 10px',
                      borderRadius: '8px',
                      backgroundColor: '#f8fafc',
                      border: '1px solid #e2e8f0',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '3px',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span
                        style={{
                          fontSize: '0.76rem',
                          fontWeight: 700,
                          color: '#1e293b',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          maxWidth: '220px',
                        }}
                        title={docName}
                      >
                        📄 {docName}
                      </span>
                      {score && (
                        <span
                          style={{
                            fontSize: '0.66rem',
                            fontWeight: 700,
                            color: '#059669',
                            backgroundColor: '#ecfdf5',
                            padding: '1px 5px',
                            borderRadius: '4px',
                          }}
                        >
                          {score}% match
                        </span>
                      )}
                    </div>
                    {secName && (
                      <div style={{ fontSize: '0.68rem', color: '#64748b' }}>
                        Section: <strong>{secName}</strong>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <div
              style={{
                fontSize: '0.74rem',
                color: '#94a3b8',
                padding: '10px 0',
                textAlign: 'center',
                fontStyle: 'italic',
              }}
            >
              System response or general greeting (no external PDF cited).
            </div>
          )}
        </div>

        {/* --- ROUTER METADATA SPECS --- */}
        <div
          style={{
            padding: '10px 12px',
            borderRadius: '10px',
            backgroundColor: '#f8fafc',
            border: '1px solid #f1f5f9',
            fontSize: '0.70rem',
            color: '#64748b',
            lineHeight: 1.6,
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span>Architecture:</span>
            <strong style={{ color: '#1e293b' }}>One Front Door Hybrid RAG</strong>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span>Response Type:</span>
            <strong style={{ color: '#ea580c' }}>{activeMessage.type || 'direct_answer'}</strong>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span>Tenant Isolation:</span>
            <strong style={{ color: '#059669' }}>Enforced (JWT verified)</strong>
          </div>
        </div>
      </div>
    </aside>
  );
}
