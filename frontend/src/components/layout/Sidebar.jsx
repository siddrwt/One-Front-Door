import React from 'react';
import { useChat } from '../../context/ChatContext';
import { Plus, MessageSquare, Ticket, BookOpen, Layers } from 'lucide-react';
import { DOMAIN_CONFIG } from '../../utils/constants';

export default function Sidebar({ currentTab, setCurrentTab }) {
  const { startNewChat } = useChat();

  const domains = Object.values(DOMAIN_CONFIG).filter((d) => d.id !== 'general');

  return (
    <aside
      style={{
        width: '260px',
        backgroundColor: 'var(--bg-card)',
        borderRight: '1px solid var(--border-subtle)',
        display: 'flex',
        flexDirection: 'column',
        padding: '16px',
        gap: '20px',
        height: '100%',
      }}
    >
      <button
        onClick={startNewChat}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '8px',
          padding: '10px 16px',
          borderRadius: '10px',
          background: 'var(--primary)',
          color: '#ffffff',
          fontWeight: 600,
          fontSize: '0.9rem',
          boxShadow: 'var(--shadow-sm)',
          transition: 'background var(--transition-fast)',
        }}
      >
        <Plus size={18} />
        <span>New Inquiry</span>
      </button>

      {/* Navigation tabs */}
      <nav style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
        <button
          onClick={() => setCurrentTab('chat')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            padding: '10px 14px',
            borderRadius: '8px',
            textAlign: 'left',
            fontSize: '0.88rem',
            fontWeight: currentTab === 'chat' ? 600 : 400,
            background: currentTab === 'chat' ? 'var(--primary-light)' : 'transparent',
            color: currentTab === 'chat' ? 'var(--primary)' : 'var(--text-main)',
          }}
        >
          <MessageSquare size={16} />
          <span>Campus Chat</span>
        </button>

        <button
          onClick={() => setCurrentTab('tickets')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            padding: '10px 14px',
            borderRadius: '8px',
            textAlign: 'left',
            fontSize: '0.88rem',
            fontWeight: currentTab === 'tickets' ? 600 : 400,
            background: currentTab === 'tickets' ? 'var(--primary-light)' : 'transparent',
            color: currentTab === 'tickets' ? 'var(--primary)' : 'var(--text-main)',
          }}
        >
          <Ticket size={16} />
          <span>Support Tickets</span>
        </button>
      </nav>

      {/* Domains Reference List */}
      <div style={{ marginTop: 'auto', borderTop: '1px solid var(--border-subtle)', paddingTop: '16px' }}>
        <div
          style={{
            fontSize: '0.75rem',
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            color: 'var(--text-muted)',
            marginBottom: '10px',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
          }}
        >
          <Layers size={13} />
          <span>Supported Domains</span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          {domains.map((dom) => (
            <div
              key={dom.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                fontSize: '0.8rem',
                color: 'var(--text-main)',
                padding: '4px 6px',
                borderRadius: '6px',
              }}
            >
              <span
                style={{
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  backgroundColor: dom.color,
                }}
              />
              <span>{dom.label}</span>
            </div>
          ))}
        </div>
      </div>
    </aside>
  );
}
