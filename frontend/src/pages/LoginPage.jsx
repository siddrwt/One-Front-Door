import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Shield, Eye, EyeOff, AlertCircle, ArrowRight, Sparkles } from 'lucide-react';
import LoadingSpinner from '../components/common/LoadingSpinner';
import portalLogo from '../assets/portal_logo.png';

export default function LoginPage() {
  const { login, signup } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [isRegister, setIsRegister] = useState(false);
  const [studentId, setStudentId] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  const from = location.state?.from?.pathname || '/dashboard';

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      if (isRegister) {
        await signup({ studentId, password, name, email });
      } else {
        await login(studentId, password);
      }
      navigate(from, { replace: true });
    } catch (err) {
      setError(err.message || 'Authentication failed. Please verify your credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  const fillDemoStudent = () => {
    setStudentId('BU2023CSE045');
    setPassword('demoPass123');
    setError(null);
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#f8fafc',
        backgroundImage: 'radial-gradient(at 0% 0%, rgba(99, 102, 241, 0.08) 0px, transparent 50%), radial-gradient(at 100% 100%, rgba(124, 58, 237, 0.06) 0px, transparent 50%)',
        padding: '24px',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '440px',
          backgroundColor: '#ffffff',
          borderRadius: '16px',
          border: '1px solid #e2e8f0',
          boxShadow: '0 10px 25px -5px rgba(15, 23, 42, 0.08), 0 8px 10px -6px rgba(15, 23, 42, 0.04)',
          padding: '36px 32px',
        }}
      >
        {/* University Crest & Branding */}
        <div style={{ textAlign: 'center', marginBottom: '28px' }}>
          <div
            style={{
              width: '58px',
              height: '58px',
              borderRadius: '16px',
              overflow: 'hidden',
              backgroundColor: '#0a1d2e',
              border: '2px solid #d97706',
              margin: '0 auto 14px',
              boxShadow: '0 6px 16px rgba(10, 29, 46, 0.3)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
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

          <div
            style={{
              fontSize: '0.75rem',
              fontWeight: 800,
              textTransform: 'uppercase',
              letterSpacing: '0.12em',
              color: '#6366f1',
              marginBottom: '4px',
            }}
          >
            Student Portal
          </div>

          <h1
            style={{
              fontSize: '1.5rem',
              fontWeight: 800,
              color: '#0f172a',
              letterSpacing: '-0.02em',
              marginBottom: '6px',
            }}
          >
            One Front Door
          </h1>

          <p style={{ color: '#64748b', fontSize: '0.88rem' }}>
            {isRegister
              ? 'Create your campus student account'
              : 'Welcome back to your campus portal'}
          </p>
        </div>

        {/* Error Alert */}
        {error && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              backgroundColor: '#fef2f2',
              border: '1px solid #fecaca',
              color: '#dc2626',
              padding: '10px 14px',
              borderRadius: '10px',
              fontSize: '0.84rem',
              marginBottom: '20px',
            }}
          >
            <AlertCircle size={16} style={{ flexShrink: 0 }} />
            <span>{error}</span>
          </div>
        )}

        {/* Login / Register Form */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {isRegister && (
            <>
              <div>
                <label
                  style={{
                    display: 'block',
                    fontSize: '0.82rem',
                    fontWeight: 600,
                    color: '#1e293b',
                    marginBottom: '6px',
                  }}
                >
                  Full Name
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Aryan Sharma"
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    outline: 'none',
                    fontSize: '0.92rem',
                    backgroundColor: '#ffffff',
                    color: '#0f172a',
                  }}
                />
              </div>

              <div>
                <label
                  style={{
                    display: 'block',
                    fontSize: '0.82rem',
                    fontWeight: 600,
                    color: '#1e293b',
                    marginBottom: '6px',
                  }}
                >
                  Campus Email
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="student@demo.camu.edu"
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    outline: 'none',
                    fontSize: '0.92rem',
                    backgroundColor: '#ffffff',
                    color: '#0f172a',
                  }}
                />
              </div>
            </>
          )}

          <div>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '6px',
              }}
            >
              <label
                style={{
                  fontSize: '0.82rem',
                  fontWeight: 600,
                  color: '#1e293b',
                }}
              >
                Student ID or Email
              </label>

              {!isRegister && (
                <button
                  type="button"
                  onClick={fillDemoStudent}
                  style={{
                    fontSize: '0.72rem',
                    color: '#4f46e5',
                    fontWeight: 600,
                    textDecoration: 'underline',
                    padding: '2px 4px',
                  }}
                >
                  Fill Demo Student
                </button>
              )}
            </div>

            <input
              type="text"
              required
              value={studentId}
              onChange={(e) => setStudentId(e.target.value)}
              placeholder="e.g. BU2023CSE045 or aryan.sharma@demo.camu.edu"
              style={{
                width: '100%',
                padding: '10px 14px',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                outline: 'none',
                fontSize: '0.92rem',
                backgroundColor: '#ffffff',
                color: '#0f172a',
              }}
            />
          </div>

          <div>
            <label
              style={{
                display: 'block',
                fontSize: '0.82rem',
                fontWeight: 600,
                color: '#1e293b',
                marginBottom: '6px',
              }}
            >
              Password
            </label>

            <div style={{ position: 'relative' }}>
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                style={{
                  width: '100%',
                  padding: '10px 38px 10px 14px',
                  borderRadius: '8px',
                  border: '1px solid #cbd5e1',
                  outline: 'none',
                  fontSize: '0.92rem',
                  backgroundColor: '#ffffff',
                  color: '#0f172a',
                }}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  position: 'absolute',
                  right: '12px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: '#94a3b8',
                  padding: '2px',
                  display: 'flex',
                }}
                tabIndex={-1}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            style={{
              marginTop: '8px',
              padding: '12px 18px',
              borderRadius: '8px',
              backgroundColor: '#4f46e5',
              color: '#ffffff',
              fontWeight: 600,
              fontSize: '0.92rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              boxShadow: '0 2px 4px rgba(79, 70, 229, 0.2)',
              transition: 'background-color 0.15s ease',
            }}
          >
            {isLoading ? (
              <LoadingSpinner size={18} color="#fff" />
            ) : (
              <>
                <span>{isRegister ? 'Create Account' : 'Sign In to Portal'}</span>
                <ArrowRight size={16} />
              </>
            )}
          </button>
        </form>

        {/* Toggle Register / Sign In */}
        <div
          style={{
            marginTop: '22px',
            textAlign: 'center',
            fontSize: '0.84rem',
            color: '#64748b',
            borderTop: '1px solid #f1f5f9',
            paddingTop: '18px',
          }}
        >
          {isRegister ? 'Already registered on campus?' : "Don't have an active account?"}{' '}
          <button
            type="button"
            onClick={() => {
              setIsRegister(!isRegister);
              setError(null);
            }}
            style={{ color: '#4f46e5', fontWeight: 600 }}
          >
            {isRegister ? 'Sign In' : 'Register now'}
          </button>
        </div>
      </div>

      {/* Footer institutional note */}
      <div
        style={{
          marginTop: '24px',
          fontSize: '0.78rem',
          color: '#94a3b8',
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
        }}
      >
        <Sparkles size={14} color="#6366f1" />
        <span>One Front Door · Powered by Luna Campus Intelligence</span>
      </div>
    </div>
  );
}
