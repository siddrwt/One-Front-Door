import React from 'react';
import StudentProfileCard from '../components/student/StudentProfileCard';
import { UserCheck, Shield } from 'lucide-react';

export default function ProfilePage() {
  return (
    <div
      style={{
        flex: 1,
        padding: '28px 32px',
        overflowY: 'auto',
        maxWidth: '1100px',
        margin: '0 auto',
        width: '100%',
      }}
    >
      <div style={{ marginBottom: '22px' }}>
        <div
          style={{
            fontSize: '0.78rem',
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
            color: '#6366f1',
            marginBottom: '4px',
          }}
        >
          University Student Records
        </div>
        <h1
          style={{
            fontSize: '1.75rem',
            fontWeight: 800,
            color: '#0f172a',
            letterSpacing: '-0.02em',
            margin: 0,
          }}
        >
          Student Academic Profile
        </h1>
        <p style={{ color: '#64748b', fontSize: '0.92rem', marginTop: '4px' }}>
          Official institutional profile and database-verified academic records.
        </p>
      </div>

      <StudentProfileCard isFullPage={true} />
    </div>
  );
}
