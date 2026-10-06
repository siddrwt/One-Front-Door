import React, { useState } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import portalLogo from '../../assets/portal_logo.png';
import {
  Search,
  Landmark,
  MessageSquare,
  FileText,
  TrendingUp,
  CalendarCheck,
  CalendarDays,
  Grid,
  UserPlus,
  Utensils,
  Sun,
  FileCheck,
  Headphones,
  ChevronsLeft,
  ChevronsRight,
} from 'lucide-react';

export default function PortalSidebar({ isOpen, onClose, onSelectUpcomingModule }) {
  const { logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [isCollapsed, setIsCollapsed] = useState(false);

  const handleNavClick = () => {
    if (onClose) onClose();
  };

  const handleModuleClick = (moduleName, queryText) => {
    if (onSelectUpcomingModule) {
      onSelectUpcomingModule(moduleName);
    } else {
      navigate('/assistant', {
        state: { prefillQuery: queryText, autoSend: true },
      });
    }
    if (onClose) onClose();
  };

  const isDashboardActive = location.pathname === '/dashboard' || location.pathname === '/';
  const isChatActive = location.pathname.startsWith('/assistant');

  return (
    <aside
      style={{
        width: isCollapsed ? '80px' : '260px',
        backgroundColor: '#ffffff',
        borderRight: '1px solid #f1e5d8',
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        boxShadow: '1px 0 3px rgba(0, 0, 0, 0.02)',
        transition: 'width 0.2s ease',
        zIndex: 40,
        overflow: 'hidden',
      }}
    >
      {/* 1. Top Branding matching the reference image */}
      <div
        style={{
          padding: '20px 18px 16px',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          borderBottom: '1px solid #fdf8f4',
        }}
      >
        {/* Official Student Portal Logo Emblem */}
        <div
          style={{
            width: '44px',
            height: '44px',
            borderRadius: '13px',
            overflow: 'hidden',
            backgroundColor: '#0a1d2e',
            border: '1.5px solid #d97706',
            boxShadow: '0 4px 10px rgba(10, 29, 46, 0.25)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          <img
            src={portalLogo}
            alt="Student Portal Logo"
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
            }}
          />
        </div>

        {!isCollapsed && (
          <div style={{ lineHeight: 1.25 }}>
            <div
              style={{
                fontSize: '0.94rem',
                fontWeight: 800,
                color: '#1e293b',
                letterSpacing: '0.02em',
              }}
            >
              STUDENT PORTAL
            </div>
            <div
              style={{
                fontSize: '0.74rem',
                fontWeight: 800,
                color: '#c2410c',
                letterSpacing: '0.04em',
                textTransform: 'uppercase',
              }}
            >
              ONE FRONT DOOR
            </div>
          </div>
        )}
      </div>

      {/* 2. Search Bar */}
      {!isCollapsed && (
        <div style={{ padding: '0 16px 14px' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '9px',
              padding: '8px 12px',
              backgroundColor: '#fffdf9',
              border: '1px solid #ede5dc',
              borderRadius: '12px',
              fontSize: '0.86rem',
              color: '#64748b',
            }}
          >
            <Search size={16} color="#94a3b8" />
            <input
              type="text"
              placeholder="Search portal..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                border: 'none',
                outline: 'none',
                backgroundColor: 'transparent',
                fontSize: '0.86rem',
                width: '100%',
                color: '#1e293b',
              }}
            />
          </div>
        </div>
      )}

      {/* 3. Navigation List */}
      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '4px 14px 16px',
          display: 'flex',
          flexDirection: 'column',
          gap: '18px',
        }}
      >
        {/* SECTION 1: PORTAL OVERVIEW */}
        <div>
          {!isCollapsed && (
            <div
              style={{
                fontSize: '0.7rem',
                fontWeight: 800,
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
                color: '#94a3b8',
                padding: '0 10px 8px',
              }}
            >
              PORTAL OVERVIEW
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
            {/* My Institution (Active / Dashboard) */}
            <NavLink
              to="/dashboard"
              onClick={handleNavClick}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '9px 12px',
                borderRadius: '14px',
                textDecoration: 'none',
                fontSize: '0.88rem',
                fontWeight: isDashboardActive ? 700 : 500,
                backgroundColor: isDashboardActive ? '#c2410c' : 'transparent',
                color: isDashboardActive ? '#ffffff' : '#334155',
                boxShadow: isDashboardActive ? '0 3px 8px rgba(194, 65, 12, 0.25)' : 'none',
                transition: 'all 0.15s ease',
              }}
            >
              <div
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '10px',
                  backgroundColor: isDashboardActive ? 'rgba(255, 255, 255, 0.2)' : '#ffedd5',
                  color: isDashboardActive ? '#ffffff' : '#ea580c',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <Landmark size={17} />
              </div>
              {!isCollapsed && <span>My Institution</span>}
            </NavLink>

            {/* Messages / Luna AI */}
            <NavLink
              to="/assistant"
              onClick={handleNavClick}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '9px 12px',
                borderRadius: '14px',
                textDecoration: 'none',
                fontSize: '0.88rem',
                fontWeight: isChatActive ? 700 : 500,
                backgroundColor: isChatActive ? '#c2410c' : 'transparent',
                color: isChatActive ? '#ffffff' : '#334155',
                boxShadow: isChatActive ? '0 3px 8px rgba(194, 65, 12, 0.25)' : 'none',
                transition: 'all 0.15s ease',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div
                  style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '10px',
                    backgroundColor: isChatActive ? 'rgba(255, 255, 255, 0.2)' : '#fff7ed',
                    color: isChatActive ? '#ffffff' : '#ea580c',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  <MessageSquare size={17} />
                </div>
                {!isCollapsed && <span>Messages</span>}
              </div>

              {!isCollapsed && (
                <span
                  style={{
                    backgroundColor: isChatActive ? '#ffffff' : '#ffffffff',
                    color: isChatActive ? '#ffffffff' : '#ffffff',
                    fontSize: '0.74rem',
                    fontWeight: 800,
                    width: '20px',
                    height: '20px',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  
                </span>
              )}
            </NavLink>

            {/* Reports */}
            <button
              onClick={() => handleModuleClick('Reports', 'I would like to see my academic grade report.')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '9px 12px',
                borderRadius: '14px',
                fontSize: '0.88rem',
                color: '#334155',
                width: '100%',
                textAlign: 'left',
                transition: 'background 0.15s ease',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#fdfbf7')}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
            >
              <div
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '10px',
                  backgroundColor: '#f3e8ff',
                  color: '#9333ea',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <FileText size={17} />
              </div>
              {!isCollapsed && <span>Reports</span>}
            </button>

            {/* Progress Report */}
            <button
              onClick={() => handleModuleClick('Progress Report', 'What is my current semester progress report?')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '9px 12px',
                borderRadius: '14px',
                fontSize: '0.88rem',
                color: '#334155',
                width: '100%',
                textAlign: 'left',
                transition: 'background 0.15s ease',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#fdfbf7')}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
            >
              <div
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '10px',
                  backgroundColor: '#ffedd5',
                  color: '#ea580c',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <TrendingUp size={17} />
              </div>
              {!isCollapsed && <span>Progress Report</span>}
            </button>
          </div>
        </div>

        {/* SECTION 2: ACADEMICS */}
        <div>
          {!isCollapsed && (
            <div
              style={{
                fontSize: '0.7rem',
                fontWeight: 800,
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
                color: '#94a3b8',
                padding: '0 10px 8px',
              }}
            >
              ACADEMICS
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
            {/* Attendance */}
            <button
              onClick={() => handleModuleClick('Attendance', 'What is my current verified attendance?')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '9px 12px',
                borderRadius: '14px',
                fontSize: '0.88rem',
                color: '#334155',
                width: '100%',
                textAlign: 'left',
                transition: 'background 0.15s ease',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#fdfbf7')}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
            >
              <div
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '10px',
                  backgroundColor: '#ecfdf5',
                  color: '#10b981',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <CalendarCheck size={17} />
              </div>
              {!isCollapsed && <span>Attendance</span>}
            </button>

            {/* Exam schedules */}
            <button
              onClick={() => handleModuleClick('Exam schedules', 'When is the examination schedule?')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '9px 12px',
                borderRadius: '14px',
                fontSize: '0.88rem',
                color: '#334155',
                width: '100%',
                textAlign: 'left',
                transition: 'background 0.15s ease',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#fdfbf7')}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
            >
              <div
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '10px',
                  backgroundColor: '#fef3c7',
                  color: '#f59e0b',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <CalendarDays size={17} />
              </div>
              {!isCollapsed && <span>Exam schedules</span>}
            </button>

            {/* Timetable */}
            <button
              onClick={() => handleModuleClick('Timetable', 'What is my class timetable for this week?')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '9px 12px',
                borderRadius: '14px',
                fontSize: '0.88rem',
                color: '#334155',
                width: '100%',
                textAlign: 'left',
                transition: 'background 0.15s ease',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#fdfbf7')}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
            >
              <div
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '10px',
                  backgroundColor: '#fef9c3',
                  color: '#d97706',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <Grid size={17} />
              </div>
              {!isCollapsed && <span>Timetable</span>}
            </button>

            {/* Enrollment */}
            <button
              onClick={() => handleModuleClick('Enrollment', 'What is the course registration and enrollment process?')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '9px 12px',
                borderRadius: '14px',
                fontSize: '0.88rem',
                color: '#334155',
                width: '100%',
                textAlign: 'left',
                transition: 'background 0.15s ease',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#fdfbf7')}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
            >
              <div
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '10px',
                  backgroundColor: '#ffe4e6',
                  color: '#e11d48',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <UserPlus size={17} />
              </div>
              {!isCollapsed && <span>Enrollment</span>}
            </button>
          </div>
        </div>

        {/* SECTION 3: CAMPUS LIFE & SERVICES */}
        <div>
          {!isCollapsed && (
            <div
              style={{
                fontSize: '0.7rem',
                fontWeight: 800,
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
                color: '#94a3b8',
                padding: '0 10px 8px',
              }}
            >
              CAMPUS LIFE & SERVICES
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
            {/* Cafeteria */}
            <button
              onClick={() => handleModuleClick('Cafeteria', 'What are the campus cafeteria timings and menu?')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '9px 12px',
                borderRadius: '14px',
                fontSize: '0.88rem',
                color: '#334155',
                width: '100%',
                textAlign: 'left',
                transition: 'background 0.15s ease',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#fdfbf7')}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
            >
              <div
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '10px',
                  backgroundColor: '#fce7f3',
                  color: '#db2777',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <Utensils size={17} />
              </div>
              {!isCollapsed && <span>Cafeteria</span>}
            </button>

            {/* Holidays */}
            <button
              onClick={() => handleModuleClick('Holidays', 'What is the upcoming university holiday calendar?')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '9px 12px',
                borderRadius: '14px',
                fontSize: '0.88rem',
                color: '#334155',
                width: '100%',
                textAlign: 'left',
                transition: 'background 0.15s ease',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#fdfbf7')}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
            >
              <div
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '10px',
                  backgroundColor: '#fef9c3',
                  color: '#eab308',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <Sun size={17} />
              </div>
              {!isCollapsed && <span>Holidays</span>}
            </button>

            {/* Leave and Gate Pass */}
            <button
              onClick={() => handleModuleClick('Leave and Gate Pass', 'How do I apply for a student hostel gate pass?')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '9px 12px',
                borderRadius: '14px',
                fontSize: '0.88rem',
                color: '#334155',
                width: '100%',
                textAlign: 'left',
                transition: 'background 0.15s ease',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#fdfbf7')}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
            >
              <div
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '10px',
                  backgroundColor: '#ffe4e6',
                  color: '#f43f5e',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <FileCheck size={17} />
              </div>
              {!isCollapsed && <span>Leave and Gate Pass</span>}
            </button>

            {/* Services */}
            <button
              onClick={() => handleModuleClick('Services', 'What student support and campus services are available?')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '9px 12px',
                borderRadius: '14px',
                fontSize: '0.88rem',
                color: '#334155',
                width: '100%',
                textAlign: 'left',
                transition: 'background 0.15s ease',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#fdfbf7')}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
            >
              <div
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '10px',
                  backgroundColor: '#f3e8ff',
                  color: '#a855f7',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <Headphones size={17} />
              </div>
              {!isCollapsed && <span>Services</span>}
            </button>
          </div>
        </div>
      </div>

      {/* 4. Bottom: Collapse Menu & Logout */}
      <div
        style={{
          padding: '12px 16px',
          borderTop: '1px solid #f1e5d8',
          display: 'flex',
          alignItems: 'center',
          justifyContent: isCollapsed ? 'center' : 'space-between',
          backgroundColor: '#fffdf9',
        }}
      >
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            color: '#64748b',
            fontSize: '0.84rem',
            fontWeight: 500,
            cursor: 'pointer',
            padding: '4px',
          }}
          title={isCollapsed ? 'Expand menu' : 'Collapse menu'}
        >
          {isCollapsed ? <ChevronsRight size={17} /> : <ChevronsLeft size={17} />}
          {!isCollapsed && <span>Collapse menu</span>}
        </button>

      </div>
    </aside>
  );
}
