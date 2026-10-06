import React, { useState } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import PortalSidebar from './PortalSidebar';
import PortalHeader from './PortalHeader';
import { Sparkles, X, ArrowRight, Info } from 'lucide-react';

export default function PortalLayout() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [upcomingModule, setUpcomingModule] = useState(null);
  const navigate = useNavigate();
  const location = useLocation();

  // Whenever Luna is opened, the sidebar menu disappears
  const isLunaOpen = location.pathname.startsWith('/assistant');

  const handleAskLunaForModule = (moduleName) => {
    setUpcomingModule(null);
    const suggestedQueries = {
      Attendance: 'What is my current attendance and leave policy?',
      'Exam schedules': 'When are the upcoming semester examinations and timetable?',
      Timetable: 'What is my academic class timetable for this week?',
      Enrollment: 'What is the course registration and enrollment process?',
      Cafeteria: 'What are the campus cafeteria hours and today menu?',
      Holidays: 'What are the upcoming university campus holidays?',
      'Leave and Gate Pass': 'How do I apply for campus student leave and gate pass?',
      Services: 'What student services and campus amenities are open today?',
      Reports: 'How do I access and download my official semester grade reports?',
      'Progress Report': 'What is my current academic progress and credit completion status?',
    };
    const query = suggestedQueries[moduleName] || `I have a question regarding campus ${moduleName}.`;
    navigate('/assistant', { state: { prefillQuery: query, autoSend: true } });
  };

  return (
    <div
      style={{
        display: 'flex',
        height: '100vh',
        width: '100vw',
        overflow: 'hidden',
        backgroundColor: '#f8fafc',
      }}
    >
      {/* Sidebar: hidden completely whenever Luna is opened */}
      {!isLunaOpen && (
        <div
          className={`portal-sidebar-wrapper ${isSidebarOpen ? 'portal-sidebar-open' : ''}`}
          style={{
            height: '100%',
            flexShrink: 0,
          }}
        >
          <PortalSidebar
            isOpen={isSidebarOpen}
            onClose={() => setIsSidebarOpen(false)}
            onSelectUpcomingModule={(moduleName) => setUpcomingModule(moduleName)}
          />
        </div>
      )}

      {/* Backdrop for mobile drawer */}
      {!isLunaOpen && isSidebarOpen && (
        <div
          onClick={() => setIsSidebarOpen(false)}
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.4)',
            backdropFilter: 'blur(2px)',
            zIndex: 35,
          }}
        />
      )}

      {/* Main View Area */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          flex: 1,
          height: '100%',
          minWidth: 0,
          overflow: 'hidden',
        }}
      >
        <PortalHeader onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)} />
        <main
          style={{
            flex: 1,
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column',
            minHeight: 0,
          }}
        >
          <Outlet />
        </main>
      </div>

      {/* Polite Module Dialog / Ask Luna Bridge */}
      {upcomingModule && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.5)',
            backdropFilter: 'blur(3px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 60,
            padding: '20px',
          }}
        >
          <div
            style={{
              backgroundColor: '#ffffff',
              borderRadius: '16px',
              maxWidth: '440px',
              width: '100%',
              padding: '24px',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
              border: '1px solid #e2e8f0',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#c04515', fontWeight: 700 }}>
                <Info size={18} />
                <span>{upcomingModule} Module</span>
              </div>
              <button
                onClick={() => setUpcomingModule(null)}
                style={{ color: '#94a3b8', padding: '4px', borderRadius: '6px' }}
              >
                <X size={18} />
              </button>
            </div>

            <p style={{ color: '#475569', fontSize: '0.9rem', lineHeight: 1.5, marginBottom: '20px' }}>
              The dedicated <strong>{upcomingModule}</strong> self-service screen is scheduled for the upcoming portal update. In the meantime, <strong>Luna Campus Assistant</strong> has full knowledge of policies, records, and schedules!
            </p>

            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button
                onClick={() => setUpcomingModule(null)}
                style={{
                  padding: '9px 16px',
                  borderRadius: '8px',
                  border: '1px solid #cbd5e1',
                  color: '#64748b',
                  fontSize: '0.85rem',
                  fontWeight: 600,
                }}
              >
                Close
              </button>
              <button
                onClick={() => handleAskLunaForModule(upcomingModule)}
                style={{
                  padding: '9px 18px',
                  borderRadius: '8px',
                  background: '#c04515',
                  color: '#ffffff',
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  boxShadow: '0 2px 6px rgba(192, 69, 21, 0.3)',
                }}
              >
                <Sparkles size={15} />
                <span>Ask Luna About This</span>
                <ArrowRight size={14} />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
