import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { chatService } from '../../services/chatService';
import {
  Menu,
  Activity,
  User,
  LogOut,
  Sparkles,
  ChevronRight,
  ShieldCheck,
} from 'lucide-react';
import studentAvatar from '../../assets/student_avatar.jpg';

export default function PortalHeader({ onToggleSidebar }) {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
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

  const getPageTitle = () => {
    if (location.pathname.startsWith('/assistant')) return 'Luna AI Campus Assistant';
    if (location.pathname.startsWith('/tickets')) return 'Support Tickets';
    if (location.pathname.startsWith('/profile')) return 'Student Profile';
    if (location.pathname.startsWith('/dashboard')) return 'Student Dashboard';
    return 'Campus Portal';
  };

  const studentName = user?.name || user?.studentId || 'Student';
  const program = user?.profile?.program || 'B.Tech CSE';
  const semester = user?.profile?.semester || 5;
  const studentId = user?.studentId || 'BU2023CSE045';

  return (
    <header
      style={{
        height: '66px',
        backgroundColor: '#ffffff',
        borderBottom: '1px solid #e2e8f0',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 24px',
        zIndex: 20,
        boxShadow: '0 1px 2px rgba(0, 0, 0, 0.03)',
      }}
    >
      {/* Left Area: Mobile hamburger & breadcrumb */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
        <button
          onClick={onToggleSidebar}
          className="portal-mobile-menu-btn"
          style={{
            display: 'none',
            padding: '8px',
            borderRadius: '8px',
            backgroundColor: '#f1f5f9',
            color: '#334155',
          }}
          title="Toggle Navigation"
        >
          <Menu size={20} />
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.86rem' }}>
          <span style={{ color: '#94a3b8', fontWeight: 500 }}>Portal</span>
          <ChevronRight size={14} color="#cbd5e1" />
          <span style={{ color: '#0f172a', fontWeight: 600 }}>{getPageTitle()}</span>
        </div>
      </div>

      {/* Right Area: System router health & Student profile card */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        {/* Router Health Indicator */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '5px 11px',
            borderRadius: '9999px',
            backgroundColor: '#f8fafc',
            border: '1px solid #e2e8f0',
            fontSize: '0.74rem',
            color: '#64748b',
          }}
          title={`Campus AI router status: ${healthStatus}`}
        >
          <Activity
            size={13}
            color={
              healthStatus === 'live' || healthStatus === 'mock'
                ? '#10b981'
                : '#ef4444'
            }
          />
          <span>Router: <strong style={{ color: '#334155', textTransform: 'capitalize' }}>{healthStatus}</strong></span>
        </div>

        {/* Authenticated Student Profile Card */}
        <div
          onClick={() => navigate('/dashboard')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            padding: '4px 12px 4px 5px',
            borderRadius: '30px',
            backgroundColor: '#f8fafc',
            border: '1px solid #e2e8f0',
            cursor: 'pointer',
            transition: 'border-color 0.15s ease, background-color 0.15s ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = '#cbd5e1';
            e.currentTarget.style.backgroundColor = '#f1f5f9';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = '#e2e8f0';
            e.currentTarget.style.backgroundColor = '#f8fafc';
          }}
          title="View Student Profile"
        >
          <div
            style={{
              width: '36px',
              height: '36px',
              borderRadius: '50%',
              overflow: 'hidden',
              backgroundColor: '#f1f5f9',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: '1px solid #e2e8f0',
              flexShrink: 0,
            }}
          >
            <img
              src={studentAvatar}
              alt={studentName}
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
          </div>

          <div style={{ lineHeight: 1.25 }}>
            <div style={{ fontSize: '0.86rem', fontWeight: 700, color: '#0f172a' }}>
              {studentName}
            </div>
            <div style={{ fontSize: '0.72rem', color: '#64748b' }}>
              {program} · Sem {semester}
            </div>
          </div>

          <button
            onClick={(e) => {
              e.stopPropagation();
              logout();
              navigate('/login');
            }}
            style={{
              marginLeft: '4px',
              padding: '6px',
              borderRadius: '6px',
              color: '#94a3b8',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'color 0.15s ease, background 0.15s ease',
            }}
            title="Sign out of student portal"
            onMouseEnter={(e) => {
              e.currentTarget.style.color = '#ef4444';
              e.currentTarget.style.backgroundColor = '#fee2e2';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = '#94a3b8';
              e.currentTarget.style.backgroundColor = 'transparent';
            }}
          >
            <LogOut size={15} />
          </button>
        </div>
      </div>
    </header>
  );
}
