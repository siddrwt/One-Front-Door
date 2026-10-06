import React from 'react';
import { getDomainConfig } from '../../utils/constants';

export default function DomainBadge({ domain, confidence, showConfidence = true }) {
  if (!domain) return null;

  const config = getDomainConfig(domain);
  const pct = confidence ? Math.round(confidence * 100) : null;

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '6px',
        padding: '3px 10px',
        borderRadius: '9999px',
        fontSize: '0.75rem',
        fontWeight: 600,
        backgroundColor: config.bgColor,
        color: config.color,
        border: `1px solid ${config.borderColor}`,
      }}
    >
      <span
        style={{
          width: '6px',
          height: '6px',
          borderRadius: '50%',
          backgroundColor: config.color,
        }}
      />
      {config.label}
      {showConfidence && pct !== null && (
        <span style={{ opacity: 0.8, fontSize: '0.7rem' }}>({pct}%)</span>
      )}
    </span>
  );
}
