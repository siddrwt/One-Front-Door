import React, { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { chatService } from '../../services/chatService';
import { ShieldCheck, LogOut, User, Sparkles, Activity } from 'lucide-react';

export default function Navbar({ onOpenLogin, currentTab, setCurrentTab }) {
  const { user, logout, isAuthenticated } = useAuth();
  const [healthStatus, setHealthStatus] = useState('checking');

  useEffect(() => {
    let mounted = true;
    chatService
      .checkHealth()
      .then((data) => {
        if (mounted) {
          setHealthStatus(data.status === 'ok' ? (data.ai === 'mock' ? 'mock' : 'live') : 'down');
        }
      })
      .catch(() => {
        if (mounted) setHealthStatus('offline');
      });
    return () => {
      mounted = false;
    };
  }, []);

  return (
    <header
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '12px 24px',
        backgroundColor: 'var(--bg-card)',
        borderBottom: '1px solid var(--border-subtle)',
        boxShadow: 'var(--shadow-sm)',
        zIndex: 10,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <div
          style={{
            width: '36px',
            height: '36px',
            borderRadius: '10px',
            background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#fff',
            boxShadow: 'var(--shadow-glow)',
          }}
        >
          <Sparkles size={20} />
        </div>
        <div>
          <h1 style={{ fontSize: '1.1rem', fontWeight: 700, letterSpacing: '-0.02em' }}>
            One Front Door
          </h1>
          <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
            Campus Assistant & Intelligent Query Router
          </span>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        {/* System Health Indicator */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '4px 10px',
            borderRadius: '9999px',
            background: 'var(--bg-card-subtle)',
            fontSize: '0.75rem',
            color: 'var(--text-muted)',
          }}
          title={`Backend status: ${healthStatus}`}
        >
          <Activity
            size={13}
            color={
              healthStatus === 'live' || healthStatus === 'mock'
                ? 'var(--status-success)'
                : 'var(--status-error)'
            }
          />
          <span>AI Router: {healthStatus}</span>
        </div>

        {/* User / Auth State */}
        {isAuthenticated ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                fontSize: '0.85rem',
                color: 'var(--text-main)',
                fontWeight: 500,
              }}
            >
              <div
                style={{
                  width: '30px',
                  height: '30px',
                  borderRadius: '50%',
                  background: 'var(--primary-light)',
                  color: 'var(--primary)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <User size={16} />
              </div>
              <span>{user?.name || user?.studentId || 'Student'}</span>
            </div>

            <button
              onClick={logout}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 12px',
                borderRadius: '8px',
                border: '1px solid var(--border-subtle)',
                color: 'var(--text-muted)',
                fontSize: '0.8rem',
              }}
              title="Sign Out"
            >
              <LogOut size={14} />
              <span>Logout</span>
            </button>
          </div>
        ) : (
          <button
            onClick={onOpenLogin}
            style={{
              padding: '8px 18px',
              borderRadius: '8px',
              background: 'var(--primary)',
              color: '#ffffff',
              fontSize: '0.85rem',
              fontWeight: 600,
              boxShadow: 'var(--shadow-sm)',
            }}
          >
            Student Login
          </button>
        )}
      </div>
    </header>
  );
}
