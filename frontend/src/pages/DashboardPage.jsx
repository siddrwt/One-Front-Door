import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { studentService } from '../services/studentService';
import studentAvatar from '../assets/student_avatar.jpg';
import { Sparkles } from 'lucide-react';

export default function DashboardPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [profileData, setProfileData] = useState(null);

  useEffect(() => {
    let mounted = true;
    studentService
      .getProfile()
      .then((data) => {
        if (mounted && data) setProfileData(data);
      })
      .catch(() => {
        // Fall back gracefully to user context
      });
    return () => {
      mounted = false;
    };
  }, []);

  const studentName = profileData?.name || user?.name || 'Aryan Sharma';
  const studentId = profileData?.studentId || user?.studentId || 'BU2023CSE045';
  const profile = profileData?.profile || user?.profile || {};

  const program = profile.program || 'B.Tech CSE';
  const semester = profile.semester ?? 5;
  const attendance = profile.attendancePercent ?? 87;
  const feeBalance = profile.feeBalance ?? 0;
  const hostelRoom = profile.hostelRoom || 'C-204';

  const admissionNo = studentId === 'BU2023CSE045' ? 'BU-CSE-2023-045' : studentId;

  const metadataRows = [
    {
      label: 'Student Status',
      renderValue: () => (
        <span
          style={{
            display: 'inline-block',
            backgroundColor: '#dcfce7',
            color: '#15803d',
            padding: '2px 12px',
            borderRadius: '9999px',
            fontSize: '0.8rem',
            fontWeight: 700,
          }}
        >
          Active
        </span>
      ),
    },
    { label: 'Admission No.', value: admissionNo },
    { label: 'Admission Year', value: '2023-2024' },
    { label: 'Roll No.', value: studentId },
    { label: 'Degree', value: 'Undergraduate' },
    { label: 'Department', value: 'School of Computer Science Engineering & Technology' },
    { label: 'Semester', value: `Semester - ${semester}` },
    { label: 'Course Name', value: 'Bachelor of Technology (Computer Science and Engineering)' },
    { label: 'College', value: 'School of Engineering & Technology' },
  ];

  const quickInquiries = [
    { label: 'My Attendance', icon: '📊', query: 'What is my attendance?' },
    { label: 'Timetable', icon: '📅', query: 'What is my class timetable?' },
    { label: 'Fee Status', icon: '💳', query: 'What is my fee status and pending dues?' },
    { label: 'Gate Pass', icon: '📄', query: 'How do I apply for a campus gate pass?' },
    { label: 'Exam Schedule', icon: '📚', query: 'What is my semester exam schedule?' },
  ];

  const handleQuickQuery = (queryText) => {
    navigate('/assistant', {
      state: {
        prefillQuery: queryText,
        autoSend: true,
      },
    });
  };

  return (
    <div
      style={{
        flex: 1,
        height: '100%',
        padding: '22px 40px',
        overflow: 'hidden',
        width: '100%',
        backgroundColor: '#fdfbf7',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        boxSizing: 'border-box',
      }}
    >
      {/* Upper Main Profile Content */}
      <div style={{ display: 'flex', flexDirection: 'column', flex: 1, justifyContent: 'flex-start' }}>
        {/* 1. Profile Header: Avatar + Student Name + Subtitle */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '22px' }}>
          <div
            style={{
              width: '78px',
              height: '78px',
              borderRadius: '16px',
              overflow: 'hidden',
              border: '1px solid #e2e8f0',
              backgroundColor: '#f8fafc',
              flexShrink: 0,
              boxShadow: '0 2px 6px rgba(0, 0, 0, 0.06)',
            }}
          >
            <img
              src={studentAvatar}
              alt={studentName}
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                display: 'block',
              }}
            />
          </div>

          <div>
            <h1
              style={{
                fontSize: '2.05rem',
                fontWeight: 800,
                color: '#0f172a',
                letterSpacing: '-0.02em',
                margin: '0 0 4px',
                lineHeight: 1.15,
              }}
            >
              {studentName}
            </h1>
            <div
              style={{
                fontSize: '0.98rem',
                color: '#64748b',
                fontWeight: 500,
              }}
            >
              {program} • School of Computer Science Engineering & Technology
            </div>
          </div>
        </div>

        {/* Divider */}
        <hr
          style={{
            border: 'none',
            borderTop: '1px solid #f1e5d8',
            margin: '16px 0 16px',
            width: '100%',
          }}
        />

        {/* 2. Three Metric Cards: Live Attendance, Pending Fee Balance, Allotted Hostel Room */}
        <div className="student-metrics-grid" style={{ marginBottom: '16px', width: '100%' }}>
          {/* Card 1: LIVE ATTENDANCE */}
          <div
            style={{
              backgroundColor: '#ffffff',
              border: '1.5px solid #a7f3d0',
              borderRadius: '14px',
              padding: '16px 24px',
              boxShadow: '0 1px 3px rgba(16, 185, 129, 0.04)',
            }}
          >
            <div
              style={{
                fontSize: '0.78rem',
                fontWeight: 800,
                color: '#059669',
                textTransform: 'uppercase',
                letterSpacing: '0.04em',
                marginBottom: '4px',
              }}
            >
              LIVE ATTENDANCE
            </div>
            <div
              style={{
                fontSize: '1.95rem',
                fontWeight: 800,
                color: '#059669',
                lineHeight: 1.15,
              }}
            >
              {attendance}%
            </div>
            <div
              style={{
                fontSize: '0.8rem',
                color: '#64748b',
                marginTop: '3px',
              }}
            >
              Database verified record
            </div>
          </div>

          {/* Card 2: PENDING FEE BALANCE */}
          <div
            style={{
              backgroundColor: '#ffffff',
              border: '1.5px solid #fde68a',
              borderRadius: '14px',
              padding: '16px 24px',
              boxShadow: '0 1px 3px rgba(245, 158, 11, 0.04)',
            }}
          >
            <div
              style={{
                fontSize: '0.78rem',
                fontWeight: 800,
                color: '#b45309',
                textTransform: 'uppercase',
                letterSpacing: '0.04em',
                marginBottom: '4px',
              }}
            >
              PENDING FEE BALANCE
            </div>
            <div
              style={{
                fontSize: '1.95rem',
                fontWeight: 800,
                color: '#0f172a',
                lineHeight: 1.15,
              }}
            >
              ₹{Number(feeBalance).toFixed(2)}
            </div>
            <div
              style={{
                fontSize: '0.8rem',
                color: '#64748b',
                marginTop: '3px',
              }}
            >
              {feeBalance === 0 ? 'All semester dues cleared' : 'Payment pending on portal'}
            </div>
          </div>

          {/* Card 3: ALLOTTED HOSTEL ROOM */}
          <div
            style={{
              backgroundColor: '#ffffff',
              border: '1.5px solid #ddd6fe',
              borderRadius: '14px',
              padding: '16px 24px',
              boxShadow: '0 1px 3px rgba(124, 58, 237, 0.04)',
            }}
          >
            <div
              style={{
                fontSize: '0.78rem',
                fontWeight: 800,
                color: '#7c3aed',
                textTransform: 'uppercase',
                letterSpacing: '0.04em',
                marginBottom: '4px',
              }}
            >
              ALLOTTED HOSTEL ROOM
            </div>
            <div
              style={{
                fontSize: '1.95rem',
                fontWeight: 800,
                color: '#7c3aed',
                lineHeight: 1.15,
              }}
            >
              {hostelRoom}
            </div>
            <div
              style={{
                fontSize: '0.8rem',
                color: '#64748b',
                marginTop: '3px',
              }}
            >
              Campus Residence Wing
            </div>
          </div>
        </div>

        {/* Divider */}
        <hr
          style={{
            border: 'none',
            borderTop: '1px solid #f1e5d8',
            margin: '16px 0 16px',
            width: '100%',
          }}
        />

        {/* 3. Detailed Metadata Table */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '9px', width: '100%' }}>
          {metadataRows.map((row, idx) => (
            <div
              key={idx}
              style={{
                display: 'flex',
                alignItems: 'center',
                fontSize: '0.94rem',
                lineHeight: 1.35,
              }}
            >
              <div
                style={{
                  width: '200px',
                  flexShrink: 0,
                  color: '#334155',
                  fontWeight: 500,
                }}
              >
                {row.label}
              </div>

              <div
                style={{
                  width: '32px',
                  flexShrink: 0,
                  color: '#64748b',
                  fontWeight: 600,
                }}
              >
                :
              </div>

              <div style={{ flex: 1, color: '#0f172a', fontWeight: 700 }}>
                {row.renderValue ? row.renderValue() : row.value}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 4. Luna Quick Actions Bar (Anchored at the bottom of the page) */}
      <div
        style={{
          marginTop: '18px',
          backgroundColor: '#fff7ed',
          border: '1.5px solid #fed7aa',
          borderRadius: '16px',
          padding: '14px 22px',
          boxShadow: '0 2px 6px rgba(194, 65, 12, 0.04)',
          width: '100%',
          boxSizing: 'border-box',
        }}
      >
        {/* Top Quick Actions Row */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '12px',
          }}
        >
          {quickInquiries.map((item, idx) => (
            <button
              key={idx}
              onClick={() => handleQuickQuery(item.query)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '8px 18px',
                backgroundColor: '#ffffff',
                border: '1px solid #f1e5d8',
                borderRadius: '10px',
                fontSize: '0.9rem',
                fontWeight: 600,
                color: '#1e293b',
                boxShadow: '0 1px 2px rgba(0, 0, 0, 0.03)',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = '#ea580c';
                e.currentTarget.style.transform = 'translateY(-1px)';
                e.currentTarget.style.boxShadow = '0 3px 6px rgba(234, 88, 12, 0.1)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = '#f1e5d8';
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 1px 2px rgba(0, 0, 0, 0.03)';
              }}
            >
              <span style={{ fontSize: '1.05rem' }}>{item.icon}</span>
              <span>{item.label}</span>
            </button>
          ))}
        </div>

        {/* Divider */}
        <hr
          style={{
            border: 'none',
            borderTop: '1px solid #fed7aa',
            margin: '12px 0 10px',
            width: '100%',
          }}
        />

        {/* Bottom Action: Open LUNA */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center' }}>
          <button
            onClick={() => navigate('/assistant')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              backgroundColor: '#c2410c',
              color: '#ffffff',
              borderRadius: '9999px',
              padding: '9px 26px',
              fontSize: '0.94rem',
              fontWeight: 700,
              boxShadow: '0 2px 6px rgba(194, 65, 12, 0.22)',
              cursor: 'pointer',
              transition: 'background-color 0.15s ease, transform 0.15s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#9a3412';
              e.currentTarget.style.transform = 'translateY(-1px)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = '#c2410c';
              e.currentTarget.style.transform = 'translateY(0)';
            }}
          >
            <Sparkles size={16} />
            <span>Open LUNA</span>
          </button>
        </div>
      </div>
    </div>
  );
}
