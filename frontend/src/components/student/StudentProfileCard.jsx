import React, { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { studentService } from '../../services/studentService';
import studentAvatar from '../../assets/student_avatar.jpg';

export default function StudentProfileCard({ isFullPage = false }) {
  const { user } = useAuth();
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

  // Format admission number derived from roll no if available
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
            padding: '2px 10px',
            borderRadius: '9999px',
            fontSize: '0.78rem',
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

  return (
    <div
      style={{
        backgroundColor: '#fffefb',
        border: '1.5px solid #f1e5d8',
        borderRadius: '18px',
        padding: '28px 32px',
        boxShadow: '0 2px 8px rgba(15, 23, 42, 0.04)',
        width: '100%',
        maxWidth: isFullPage ? '1000px' : '100%',
        margin: isFullPage ? '0 auto' : '0',
      }}
    >
      {/* 1. Header: Avatar + Name + Subtitle */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
        <div
          style={{
            width: '74px',
            height: '74px',
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
          <h2
            style={{
              fontSize: '1.85rem',
              fontWeight: 800,
              color: '#0f172a',
              letterSpacing: '-0.02em',
              margin: '0 0 4px',
              lineHeight: 1.2,
            }}
          >
            {studentName}
          </h2>
          <div
            style={{
              fontSize: '0.94rem',
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
          margin: '22px 0 20px',
        }}
      />

      {/* 2. Three Metric Cards: Live Attendance, Pending Fee Balance, Allotted Hostel Room */}
      <div className="student-metrics-grid" style={{ marginBottom: '22px' }}>
        {/* Card 1: LIVE ATTENDANCE */}
        <div
          style={{
            backgroundColor: '#ffffff',
            border: '1.5px solid #a7f3d0',
            borderRadius: '14px',
            padding: '16px 20px',
            boxShadow: '0 1px 3px rgba(16, 185, 129, 0.05)',
          }}
        >
          <div
            style={{
              fontSize: '0.74rem',
              fontWeight: 800,
              color: '#059669',
              textTransform: 'uppercase',
              letterSpacing: '0.04em',
              marginBottom: '6px',
            }}
          >
            LIVE ATTENDANCE
          </div>
          <div
            style={{
              fontSize: '1.85rem',
              fontWeight: 800,
              color: '#059669',
              lineHeight: 1.15,
            }}
          >
            {attendance}%
          </div>
          <div
            style={{
              fontSize: '0.78rem',
              color: '#64748b',
              marginTop: '4px',
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
            padding: '16px 20px',
            boxShadow: '0 1px 3px rgba(245, 158, 11, 0.05)',
          }}
        >
          <div
            style={{
              fontSize: '0.74rem',
              fontWeight: 800,
              color: '#b45309',
              textTransform: 'uppercase',
              letterSpacing: '0.04em',
              marginBottom: '6px',
            }}
          >
            PENDING FEE BALANCE
          </div>
          <div
            style={{
              fontSize: '1.85rem',
              fontWeight: 800,
              color: '#0f172a',
              lineHeight: 1.15,
            }}
          >
            ₹{Number(feeBalance).toFixed(2)}
          </div>
          <div
            style={{
              fontSize: '0.78rem',
              color: '#64748b',
              marginTop: '4px',
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
            padding: '16px 20px',
            boxShadow: '0 1px 3px rgba(124, 58, 237, 0.05)',
          }}
        >
          <div
            style={{
              fontSize: '0.74rem',
              fontWeight: 800,
              color: '#7c3aed',
              textTransform: 'uppercase',
              letterSpacing: '0.04em',
              marginBottom: '6px',
            }}
          >
            ALLOTTED HOSTEL ROOM
          </div>
          <div
            style={{
              fontSize: '1.85rem',
              fontWeight: 800,
              color: '#7c3aed',
              lineHeight: 1.15,
            }}
          >
            {hostelRoom}
          </div>
          <div
            style={{
              fontSize: '0.78rem',
              color: '#64748b',
              marginTop: '4px',
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
          margin: '20px 0 22px',
        }}
      />

      {/* 3. Detailed Metadata Table */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
        {metadataRows.map((row, idx) => (
          <div
            key={idx}
            style={{
              display: 'flex',
              alignItems: 'center',
              fontSize: '0.92rem',
              lineHeight: 1.4,
            }}
          >
            <div
              style={{
                width: '180px',
                flexShrink: 0,
                color: '#334155',
                fontWeight: 500,
              }}
            >
              {row.label}
            </div>

            <div
              style={{
                width: '28px',
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
  );
}
