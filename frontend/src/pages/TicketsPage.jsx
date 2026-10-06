import React, { useState, useEffect } from 'react';
import { Ticket, PlusCircle, CheckCircle, Clock, RefreshCw } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { ticketService } from '../services/ticketService';
import LoadingSpinner from '../components/common/LoadingSpinner';

export default function TicketsPage() {
  const { user, isAuthenticated } = useAuth();
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchTickets = () => {
    if (!isAuthenticated) {
      setLoading(false);
      return;
    }
    setLoading(true);
    ticketService
      .getTickets()
      .then((res) => {
        setTickets(res.tickets || []);
      })
      .catch(() => {
        setTickets([]);
      })
      .finally(() => {
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchTickets();
  }, [isAuthenticated]);

  return (
    <div
      style={{
        flex: 1,
        padding: '30px',
        overflowY: 'auto',
        maxWidth: '1000px',
        margin: '0 auto',
        width: '100%',
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '24px',
        }}
      >
        <div>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 700 }}>Campus Support Tickets</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: '4px' }}>
            Track and monitor escalated queries that require official department follow-up.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            onClick={fetchTickets}
            disabled={loading}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '9px 14px',
              backgroundColor: 'var(--bg-card)',
              border: '1px solid var(--border-subtle)',
              borderRadius: '8px',
              color: 'var(--text-main)',
              fontSize: '0.85rem',
              fontWeight: 500,
            }}
            title="Refresh tickets"
          >
            <RefreshCw size={14} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '40px' }}>
          <LoadingSpinner size={28} color="var(--primary)" />
        </div>
      ) : tickets.length === 0 ? (
        <div
          style={{
            backgroundColor: 'var(--bg-card)',
            border: '1px solid var(--border-subtle)',
            borderRadius: '12px',
            padding: '40px',
            textAlign: 'center',
            color: 'var(--text-muted)',
          }}
        >
          <Ticket size={36} style={{ margin: '0 auto 12px', opacity: 0.5 }} />
          <p style={{ fontWeight: 600 }}>No Support Tickets Yet</p>
          <p style={{ fontSize: '0.85rem', marginTop: '4px' }}>
            Queries that require human agent escalation or specialist review will automatically appear here.
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {tickets.map((t) => (
            <div
              key={t.ticketId || t._id}
              style={{
                backgroundColor: 'var(--bg-card)',
                border: '1px solid var(--border-subtle)',
                borderRadius: '12px',
                padding: '18px 20px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                boxShadow: 'var(--shadow-sm)',
              }}
            >
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span
                    style={{
                      fontSize: '0.78rem',
                      fontWeight: 700,
                      color: 'var(--primary)',
                      fontFamily: 'monospace',
                    }}
                  >
                    #{String(t.ticketId || t._id).slice(0, 8)}
                  </span>
                  <h3 style={{ fontSize: '0.98rem', fontWeight: 600 }}>
                    {t.query || 'Campus Inquiry'}
                  </h3>
                </div>
                <div
                  style={{
                    display: 'flex',
                    gap: '14px',
                    fontSize: '0.82rem',
                    color: 'var(--text-muted)',
                    marginTop: '8px',
                  }}
                >
                  <span>Reason: {t.reason || 'Escalation'}</span>
                  <span>•</span>
                  <span>Created: {new Date(t.createdAt).toLocaleDateString()}</span>
                  <span>•</span>
                  <span>Conversation: {String(t.conversationId).slice(0, 8)}</span>
                </div>
              </div>

              <div>
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '6px 12px',
                    borderRadius: '9999px',
                    fontSize: '0.8rem',
                    fontWeight: 600,
                    backgroundColor:
                      t.status === 'resolved'
                        ? '#ecfdf5'
                        : t.status === 'in_progress'
                        ? '#eff6ff'
                        : '#fffbeb',
                    color:
                      t.status === 'resolved'
                        ? '#059669'
                        : t.status === 'in_progress'
                        ? '#2563eb'
                        : '#d97706',
                    border: `1px solid ${
                      t.status === 'resolved'
                        ? '#a7f3d0'
                        : t.status === 'in_progress'
                        ? '#bfdbfe'
                        : '#fde68a'
                    }`,
                  }}
                >
                  {t.status === 'resolved' ? (
                    <CheckCircle size={14} />
                  ) : (
                    <Clock size={14} />
                  )}
                  {t.status ? t.status.toUpperCase() : 'OPEN'}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
