import React, { useEffect, useState, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useChat } from '../context/ChatContext';
import { ticketService } from '../services/ticketService';
import studentAvatar from '../assets/student_avatar.jpg';
import portalLogo from '../assets/portal_logo.png';
import MessageItem from '../components/chat/MessageItem';
import LoadingSpinner from '../components/common/LoadingSpinner';
import {
  ArrowLeft,
  Sparkles,
  Plus,
  Send,
  Activity,
  LogOut,
  Maximize2,
  Minimize2,
  RotateCcw,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  X,
  Ticket,
  MessageSquare,
  Clock,
  ExternalLink,
  ShieldCheck,
} from 'lucide-react';

export default function ChatPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();
  const { messages, isLoading, sendMessage, startNewChat } = useChat();

  const [tickets, setTickets] = useState([]);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [isTicketsModalOpen, setIsTicketsModalOpen] = useState(false);
  const [ticketStatusFilter, setTicketStatusFilter] = useState('ALL');
  const [inputText, setInputText] = useState('');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isWhyAnswerOpen, setIsWhyAnswerOpen] = useState(false);
  const [badgeBump, setBadgeBump] = useState(false);
  const prevCountRef = useRef(0);
  const messagesEndRef = useRef(null);
  const initialSentRef = useRef(false);

  const filteredTickets = tickets.filter((t) => {
    if (ticketStatusFilter === 'ALL') return true;
    return (t.status || 'OPEN').toUpperCase() === ticketStatusFilter;
  });

  const studentName = user?.name || user?.studentId || 'Aryan Sharma';
  const program = user?.profile?.program || 'School of Engineering & Technology';
  const semester = user?.profile?.semester || 5;

  // Fetch tickets for the left sidebar "TICKETS RAISED"
  const fetchTickets = () => {
    ticketService
      .getTickets()
      .then((res) => {
        setTickets(res.tickets || []);
      })
      .catch(() => {
        setTickets([]);
      });
  };

  useEffect(() => {
    fetchTickets();
  }, []);

  // When ticket count increases, trigger bump animation on badge
  useEffect(() => {
    if (prevCountRef.current > 0 && tickets.length > prevCountRef.current) {
      setBadgeBump(true);
      const timer = setTimeout(() => setBadgeBump(false), 1500);
      return () => clearTimeout(timer);
    }
    prevCountRef.current = tickets.length;
  }, [tickets.length]);

  // Live update ticket count whenever messages change and a ticketId is detected
  useEffect(() => {
    if (!messages || messages.length === 0) return;
    const lastMsg = messages[messages.length - 1];
    if (lastMsg && (lastMsg.ticketId || lastMsg.routedTo?.includes('Ticket'))) {
      if (lastMsg.ticketId) {
        setTickets((prev) => {
          if (prev.some((t) => (t.ticketId || t._id) === lastMsg.ticketId)) return prev;
          return [
            {
              ticketId: lastMsg.ticketId,
              _id: lastMsg.ticketId,
              query: messages[messages.length - 2]?.content || 'Escalated Campus Inquiry',
              status: 'open',
              reason: lastMsg.routedTo || 'Escalated to Staff',
              createdAt: lastMsg.timestamp || new Date().toISOString(),
            },
            ...prev,
          ];
        });
      }
      fetchTickets();
    }
  }, [messages]);

  // Sync tickets whenever an AI turn finishes
  useEffect(() => {
    if (!isLoading) {
      fetchTickets();
    }
  }, [isLoading]);

  // Handle auto-send queries from Dashboard navigation state
  useEffect(() => {
    const query = location.state?.prefillQuery;
    const shouldAutoSend = location.state?.autoSend;

    if (query && shouldAutoSend && !initialSentRef.current) {
      initialSentRef.current = true;
      sendMessage(query);
      window.history.replaceState({}, document.title);
    }
  }, [location.state, sendMessage]);

  // Scroll to bottom when messages update
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  const handleSend = async (textToSend) => {
    const text = (textToSend || inputText).trim();
    if (!text || isLoading) return;
    setInputText('');
    const botMsg = await sendMessage(text);
    if (botMsg?.ticketId) {
      setTickets((prev) => {
        const id = botMsg.ticketId;
        if (prev.some((t) => (t.ticketId || t._id) === id)) return prev;
        return [
          {
            ticketId: id,
            _id: id,
            query: text,
            status: 'open',
            reason: botMsg.routedTo || 'Escalated to Staff',
            createdAt: new Date().toISOString(),
          },
          ...prev,
        ];
      });
      fetchTickets();
    }
  };

  const openTicketsModal = () => {
    fetchTickets();
    setIsTicketsModalOpen(true);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const quickTryAsking = [
    { label: 'Fee Deadline', query: 'When is the semester tuition fee deadline?' },
    { label: 'Ambiguous Query', query: 'What is the policy for students?' },
    { label: 'Fees + Exams (Multi-Domain)', query: 'Can I pay my exam fees late without penalty?' },
    { label: 'Out of Scope (Handoff)', query: 'Can I bring an exotic pet to stay in the campus hostel?' },
    { label: 'Wi-Fi Config (IT)', query: 'How do I configure campus eduroam and Wi-Fi?' },
    { label: 'Library Room (Facilities)', query: 'How can I book a discussion room in the campus library?' },
  ];

  const meshDomains = [
    { label: 'Fees & Finance', color: '#059669', bg: '#ecfdf5', border: '#a7f3d0' },
    { label: 'Examination & Evaluation', color: '#c2410c', bg: '#fff7ed', border: '#fed7aa' },
    { label: 'IT & Digital Services', color: '#d97706', bg: '#fffbeb', border: '#fde68a' },
    { label: 'Campus Facilities', color: '#7c3aed', bg: '#f5f3ff', border: '#ddd6fe' },
  ];

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
      {/* 1. LEFT SIDEBAR: NEW CHAT + TICKETS RAISED */}
      <aside
        style={{
          width: '290px',
          backgroundColor: '#ffffff',
          borderRight: '1px solid #e2e8f0',
          display: 'flex',
          flexDirection: 'column',
          height: '100%',
          flexShrink: 0,
          boxShadow: '1px 0 3px rgba(0,0,0,0.02)',
        }}
      >
        {/* Brand Header */}
        <div
          style={{
            padding: '18px 20px',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            borderBottom: '1px solid #f1f5f9',
          }}
        >
          <div
            style={{
              width: '42px',
              height: '42px',
              borderRadius: '12px',
              overflow: 'hidden',
              backgroundColor: '#0a1d2e',
              border: '1.5px solid #d97706',
              boxShadow: '0 3px 8px rgba(10, 29, 46, 0.25)',
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

          <div>
            <div style={{ fontSize: '0.94rem', fontWeight: 800, color: '#0f172a', letterSpacing: '0.02em' }}>
              STUDENT PORTAL
            </div>
            <div style={{ fontSize: '0.72rem', fontWeight: 800, color: '#c2410c', letterSpacing: '0.04em' }}>
              ONE FRONT DOOR
            </div>
          </div>
        </div>

        {/* New Chat Button */}
        <div style={{ padding: '16px 18px 12px' }}>
          <button
            onClick={startNewChat}
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              padding: '11px 16px',
              borderRadius: '12px',
              backgroundColor: '#c2410c',
              color: '#ffffff',
              fontWeight: 700,
              fontSize: '0.9rem',
              boxShadow: '0 2px 6px rgba(194, 65, 12, 0.25)',
              cursor: 'pointer',
              transition: 'background-color 0.15s ease',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#9a3412')}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#c2410c')}
          >
            <Plus size={18} />
            <span>New Chat</span>
          </button>
        </div>

        {/* Tickets Raised Button */}
        <div style={{ padding: '4px 18px 14px' }}>
          <button
            onClick={openTicketsModal}
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '12px 14px',
              borderRadius: '12px',
              backgroundColor: '#ffffff',
              border: badgeBump ? '1.5px solid #16a34a' : '1.5px solid #fed7aa',
              boxShadow: badgeBump
                ? '0 4px 14px rgba(22, 163, 74, 0.25)'
                : '0 2px 4px rgba(0, 0, 0, 0.04)',
              cursor: 'pointer',
              transition: 'all 0.25s ease',
              textAlign: 'left',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#fff7ed';
              e.currentTarget.style.borderColor = '#ea580c';
              e.currentTarget.style.transform = 'translateY(-1px)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = '#ffffff';
              e.currentTarget.style.borderColor = badgeBump ? '#16a34a' : '#fed7aa';
              e.currentTarget.style.transform = 'translateY(0)';
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div
                style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '10px',
                  backgroundColor: badgeBump ? '#dcfce7' : '#ffedd5',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                  transition: 'background-color 0.25s ease',
                }}
              >
                <Ticket size={18} color={badgeBump ? '#16a34a' : '#c2410c'} />
              </div>
              <div>
                <div style={{ fontSize: '0.88rem', fontWeight: 700, color: '#0f172a', lineHeight: 1.2 }}>
                  Tickets Raised
                </div>
                <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '2px' }}>
                  Tap to view & track
                </div>
              </div>
            </div>

            <span
              style={{
                backgroundColor: badgeBump ? '#16a34a' : '#c2410c',
                color: '#ffffff',
                fontSize: '0.76rem',
                fontWeight: 800,
                padding: '3px 9px',
                borderRadius: '9999px',
                minWidth: '22px',
                textAlign: 'center',
                boxShadow: badgeBump
                  ? '0 0 12px rgba(22, 163, 74, 0.6)'
                  : '0 2px 4px rgba(194, 65, 12, 0.3)',
                transform: badgeBump ? 'scale(1.2)' : 'scale(1)',
                transition: 'all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
              }}
            >
              {tickets.length}
            </span>
          </button>
        </div>

        {/* Spacer to push Back to Portal button to bottom */}
        <div style={{ flex: 1 }} />

        {/* Bottom: Back to Portal button */}
        <div style={{ padding: '12px 16px', borderTop: '1px solid #f1f5f9', backgroundColor: '#fafaf9' }}>
          <button
            onClick={() => navigate('/dashboard')}
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              padding: '9px 14px',
              borderRadius: '10px',
              border: '1px solid #cbd5e1',
              backgroundColor: '#ffffff',
              color: '#334155',
              fontSize: '0.86rem',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'background 0.15s ease',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#f1f5f9')}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#ffffff')}
          >
            <ArrowLeft size={16} />
            <span>Back to Portal</span>
          </button>
        </div>
      </aside>

      {/* 2. RIGHT MAIN CHAT AREA */}
      <main
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          height: '100%',
          minWidth: 0,
          backgroundColor: '#f8fafc',
          overflow: 'hidden',
        }}
      >
        {/* Top Header Bar: Clean (No benchmarks, No sign-in/switch) */}
        <header
          style={{
            height: '62px',
            backgroundColor: '#ffffff',
            borderBottom: '1px solid #e2e8f0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0 24px',
            flexShrink: 0,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '4px 10px',
                borderRadius: '9999px',
                backgroundColor: '#ecfdf5',
                border: '1px solid #a7f3d0',
                color: '#059669',
                fontSize: '0.76rem',
                fontWeight: 700,
              }}
            >
              <span
                style={{
                  width: '7px',
                  height: '7px',
                  borderRadius: '50%',
                  backgroundColor: '#10b981',
                }}
              />
              <span>Backend Live (:5000)</span>
            </span>
          </div>

          {/* Student Profile Pill */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                padding: '4px 12px 4px 6px',
                borderRadius: '30px',
                backgroundColor: '#f8fafc',
                border: '1px solid #e2e8f0',
              }}
            >
              <div
                style={{
                  width: '34px',
                  height: '34px',
                  borderRadius: '50%',
                  overflow: 'hidden',
                  backgroundColor: '#e2e8f0',
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
                <div style={{ fontSize: '0.7rem', color: '#64748b' }}>
                  {program} • Sem - {semester} | 2026-2027
                </div>
              </div>

              <button
                onClick={() => {
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
                }}
                title="Sign Out"
              >
                <LogOut size={15} />
              </button>
            </div>
          </div>
        </header>

        {/* Chat Content Body */}
        <div
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            padding: '16px 24px',
            overflow: 'hidden',
            maxWidth: isFullscreen ? '100%' : '1100px',
            margin: '0 auto',
            width: '100%',
            boxSizing: 'border-box',
          }}
        >
          {/* Dark LUNA Header Banner */}
          <div
            style={{
              backgroundColor: '#1c1917',
              color: '#ffffff',
              borderRadius: '14px 14px 0 0',
              padding: '12px 18px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
              flexShrink: 0,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <button
                onClick={() => navigate('/dashboard')}
                style={{
                  color: '#d6d3d1',
                  display: 'flex',
                  alignItems: 'center',
                  padding: '4px',
                  borderRadius: '6px',
                }}
                title="Back to Dashboard"
              >
                <ArrowLeft size={16} />
              </button>

              <span
                style={{
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  backgroundColor: '#ea580c',
                  boxShadow: '0 0 8px rgba(234, 88, 12, 0.6)',
                }}
              />

              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '0.98rem', fontWeight: 800, letterSpacing: '0.02em' }}>
                    LUNA • Campus AI Assistant
                  </span>
                  <span
                    style={{
                      fontSize: '0.66rem',
                      fontWeight: 800,
                      color: '#fbbf24',
                      border: '1px solid rgba(251, 191, 36, 0.4)',
                      padding: '1px 6px',
                      borderRadius: '4px',
                      textTransform: 'uppercase',
                    }}
                  >
                    One Front Door
                  </span>
                </div>
                <div style={{ fontSize: '0.72rem', color: '#a8a29e', marginTop: '1px' }}>
                  Authenticated: {studentName} • <span style={{ color: '#4ade80' }}>● Backend Live (:5000)</span>
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span
                style={{
                  fontSize: '0.72rem',
                  fontWeight: 600,
                  backgroundColor: 'rgba(255, 255, 255, 0.1)',
                  padding: '4px 10px',
                  borderRadius: '6px',
                  color: '#e7e5e4',
                }}
              >
                Evaluation
              </span>

              <button
                onClick={() => setIsFullscreen(!isFullscreen)}
                style={{
                  color: '#e7e5e4',
                  padding: '5px',
                  borderRadius: '6px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
                title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
              >
                {isFullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
              </button>

              <button
                onClick={startNewChat}
                style={{
                  color: '#e7e5e4',
                  padding: '5px',
                  borderRadius: '6px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
                title="Restart Session"
              >
                <RotateCcw size={16} />
              </button>
            </div>
          </div>

          {/* Active Orchestration Mesh Row */}
          <div
            style={{
              backgroundColor: '#ffffff',
              borderLeft: '1px solid #e2e8f0',
              borderRight: '1px solid #e2e8f0',
              borderBottom: '1px solid #e2e8f0',
              padding: '8px 18px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '10px',
              fontSize: '0.76rem',
              flexShrink: 0,
            }}
          >
            <span style={{ fontWeight: 800, color: '#64748b', letterSpacing: '0.04em' }}>
              ACTIVE ORCHESTRATION MESH:
            </span>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              {meshDomains.map((dom, idx) => (
                <span
                  key={idx}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '5px',
                    padding: '3px 9px',
                    borderRadius: '9999px',
                    backgroundColor: dom.bg,
                    border: `1px solid ${dom.border}`,
                    color: dom.color,
                    fontWeight: 700,
                    fontSize: '0.72rem',
                  }}
                >
                  <span
                    style={{
                      width: '6px',
                      height: '6px',
                      borderRadius: '50%',
                      backgroundColor: dom.color,
                    }}
                  />
                  <span>{dom.label}</span>
                </span>
              ))}
            </div>
          </div>

          {/* Messages Stream Area */}
          <div
            style={{
              flex: 1,
              overflowY: 'auto',
              backgroundColor: '#ffffff',
              borderLeft: '1px solid #e2e8f0',
              borderRight: '1px solid #e2e8f0',
              padding: '18px 20px',
              display: 'flex',
              flexDirection: 'column',
              minHeight: 0,
            }}
          >
            {/* If initial session, render the rich LUNA AI Orchestrator card from screenshot */}
            {messages.length <= 1 && (
              <div
                style={{
                  display: 'flex',
                  gap: '14px',
                  alignItems: 'flex-start',
                  marginBottom: '20px',
                }}
              >
                {/* Luna Sparkle Avatar */}
                <div
                  style={{
                    width: '38px',
                    height: '38px',
                    borderRadius: '50%',
                    backgroundColor: '#ea580c',
                    color: '#ffffff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: '0 2px 6px rgba(234, 88, 12, 0.3)',
                    flexShrink: 0,
                  }}
                >
                  <Sparkles size={18} />
                </div>

                <div style={{ flex: 1 }}>
                  {/* Card Container */}
                  <div
                    style={{
                      border: '1px solid #e2e8f0',
                      borderRadius: '14px',
                      padding: '16px 20px',
                      backgroundColor: '#fffdfa',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
                    }}
                  >
                    {/* Header meta */}
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        marginBottom: '12px',
                        borderBottom: '1px solid #f1f5f9',
                        paddingBottom: '8px',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span
                          style={{
                            fontSize: '0.76rem',
                            fontWeight: 700,
                            color: '#ea580c',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '5px',
                          }}
                        >
                          <span
                            style={{
                              width: '6px',
                              height: '6px',
                              borderRadius: '50%',
                              backgroundColor: '#ea580c',
                            }}
                          />
                          LUNA AI Orchestrator
                        </span>
                        <span
                          style={{
                            fontSize: '0.72rem',
                            fontFamily: 'monospace',
                            color: '#94a3b8',
                            backgroundColor: '#f1f5f9',
                            padding: '1px 6px',
                            borderRadius: '4px',
                          }}
                        >
                          ID: general
                        </span>
                      </div>

                      <span
                        style={{
                          fontSize: '0.74rem',
                          fontWeight: 700,
                          color: '#059669',
                          backgroundColor: '#ecfdf5',
                          border: '1px solid #a7f3d0',
                          padding: '2px 8px',
                          borderRadius: '9999px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px',
                        }}
                      >
                        <ShieldCheck size={12} />
                        100% confidence
                      </span>
                    </div>

                    {/* Message Body */}
                    <div style={{ fontSize: '0.92rem', color: '#1e293b', lineHeight: 1.6, marginBottom: '14px' }}>
                      <p style={{ margin: '0 0 10px' }}>
                        Welcome to <strong>One Front Door</strong>, {studentName}! I am <strong>LUNA</strong>, your
                        institutional AI assistant connected directly to the live backend server.
                      </p>
                      <p style={{ margin: '0 0 10px' }}>
                        Ask any question without needing to navigate departmental silos — your requests are dynamically
                        routed across <strong>Fees & Finance</strong>, <strong>Examination & Evaluation</strong>,{' '}
                        <strong>IT & Digital Services</strong>, and <strong>Campus Facilities</strong>.
                      </p>
                      <p style={{ margin: 0, color: '#64748b' }}>
                        Click any suggested query below or type your inquiry to test live routing:
                      </p>
                    </div>

                    {/* Sources Box */}
                    <div
                      style={{
                        backgroundColor: '#f8fafc',
                        border: '1px solid #e2e8f0',
                        borderRadius: '10px',
                        padding: '10px 14px',
                        marginBottom: '12px',
                      }}
                    >
                      <div
                        style={{
                          fontSize: '0.72rem',
                          fontWeight: 800,
                          textTransform: 'uppercase',
                          letterSpacing: '0.04em',
                          color: '#64748b',
                          marginBottom: '6px',
                        }}
                      >
                        GROUNDED INSTITUTIONAL SOURCES
                      </div>
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          fontSize: '0.8rem',
                          color: '#059669',
                          fontWeight: 600,
                        }}
                      >
                        <CheckCircle2 size={14} />
                        <span>One Front Door Architecture (Real-time Router v2.4)</span>
                      </div>
                    </div>

                    {/* Collapsible Why this answer section */}
                    <button
                      onClick={() => setIsWhyAnswerOpen(!isWhyAnswerOpen)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        width: '100%',
                        fontSize: '0.78rem',
                        color: '#ea580c',
                        fontWeight: 600,
                        padding: '6px 0',
                      }}
                    >
                      <span>⚙️ Why this answer? (Routing Metadata)</span>
                      {isWhyAnswerOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                    </button>

                    {isWhyAnswerOpen && (
                      <div
                        style={{
                          marginTop: '6px',
                          padding: '10px 12px',
                          backgroundColor: '#f8fafc',
                          borderRadius: '8px',
                          fontSize: '0.76rem',
                          color: '#64748b',
                          lineHeight: 1.5,
                        }}
                      >
                        <div>
                          <strong>Router Model:</strong> campus-rag-classifier-v2.4
                        </div>
                        <div>
                          <strong>Evaluated Domains:</strong> Finance (0.24), Exam (0.18), IT (0.12), Facilities (0.08)
                        </div>
                        <div>
                          <strong>Selected Domain:</strong> general (System Greeting)
                        </div>
                      </div>
                    )}
                  </div>

                  <div style={{ fontSize: '0.7rem', color: '#94a3b8', marginTop: '4px', paddingLeft: '4px' }}>
                    Live • LUNA AI
                  </div>
                </div>
              </div>
            )}

            {/* Conversation Messages */}
            {messages.length > 1 &&
              messages.map((msg) => <MessageItem key={msg.id} message={msg} />)}

            {isLoading && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  padding: '12px 16px',
                  color: '#64748b',
                  fontSize: '0.86rem',
                }}
              >
                <LoadingSpinner size={18} color="#c2410c" />
                <span>Classifying inquiry and checking domain knowledge bases...</span>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Quick Try Asking Row */}
          <div
            style={{
              backgroundColor: '#fffdfa',
              borderLeft: '1px solid #e2e8f0',
              borderRight: '1px solid #e2e8f0',
              padding: '10px 18px',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              flexWrap: 'wrap',
              flexShrink: 0,
            }}
          >
            <span style={{ fontSize: '0.74rem', fontWeight: 800, color: '#64748b', letterSpacing: '0.04em' }}>
              TRY ASKING:
            </span>

            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              {quickTryAsking.map((item, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSend(item.query)}
                  style={{
                    padding: '5px 12px',
                    borderRadius: '8px',
                    backgroundColor: '#ffffff',
                    border: '1px solid #e2e8f0',
                    fontSize: '0.78rem',
                    color: '#334155',
                    fontWeight: 600,
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = '#c2410c';
                    e.currentTarget.style.color = '#c2410c';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = '#e2e8f0';
                    e.currentTarget.style.color = '#334155';
                  }}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          {/* Bottom Composer Bar */}
          <div
            style={{
              backgroundColor: '#ffffff',
              border: '1px solid #e2e8f0',
              borderRadius: '0 0 14px 14px',
              padding: '10px 14px',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              flexShrink: 0,
            }}
          >
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask anything about fees, exams, attendance, cafeteria or timetable..."
              disabled={isLoading}
              style={{
                flex: 1,
                border: 'none',
                outline: 'none',
                backgroundColor: 'transparent',
                fontSize: '0.92rem',
                color: '#0f172a',
              }}
            />

            <button
              onClick={() => handleSend()}
              disabled={!inputText.trim() || isLoading}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '9px 20px',
                borderRadius: '10px',
                backgroundColor: inputText.trim() && !isLoading ? '#c2410c' : '#cbd5e1',
                color: '#ffffff',
                fontSize: '0.88rem',
                fontWeight: 700,
                cursor: inputText.trim() && !isLoading ? 'pointer' : 'default',
                transition: 'background-color 0.15s ease',
                boxShadow: inputText.trim() && !isLoading ? '0 2px 6px rgba(194, 65, 12, 0.25)' : 'none',
              }}
            >
              {isLoading ? (
                <LoadingSpinner size={16} color="#ffffff" />
              ) : (
                <>
                  <Send size={15} />
                  <span>Send</span>
                </>
              )}
            </button>
          </div>
        </div>
      </main>

      {/* 3. TICKET DETAILS MODAL (When tapping any raised ticket) */}
      {selectedTicket && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.5)',
            backdropFilter: 'blur(3px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 100,
            padding: '20px',
          }}
        >
          <div
            style={{
              backgroundColor: '#ffffff',
              borderRadius: '16px',
              maxWidth: '520px',
              width: '100%',
              padding: '24px 28px',
              boxShadow: '0 20px 25px -5px rgba(0,0,0,0.15)',
              border: '1px solid #e2e8f0',
            }}
          >
            {/* Modal Header */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '16px',
                borderBottom: '1px solid #f1f5f9',
                paddingBottom: '12px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Ticket size={20} color="#ea580c" />
                <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>
                  Ticket Details
                </h3>
                <span
                  style={{
                    fontFamily: 'monospace',
                    fontSize: '0.8rem',
                    fontWeight: 700,
                    color: '#c2410c',
                    backgroundColor: '#fff7ed',
                    padding: '2px 8px',
                    borderRadius: '6px',
                  }}
                >
                  #{String(selectedTicket.ticketId || selectedTicket._id).slice(0, 8)}
                </span>
              </div>

              <button
                onClick={() => setSelectedTicket(null)}
                style={{ color: '#94a3b8', padding: '4px', borderRadius: '6px' }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Body */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', fontSize: '0.9rem' }}>
              <div>
                <span style={{ fontSize: '0.76rem', color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>
                  Student Inquiry / Escalation
                </span>
                <div style={{ fontSize: '1rem', fontWeight: 700, color: '#0f172a', marginTop: '3px' }}>
                  {selectedTicket.query || 'Campus Support Escalation'}
                </div>
              </div>

              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: '12px',
                  backgroundColor: '#f8fafc',
                  padding: '12px 14px',
                  borderRadius: '10px',
                  border: '1px solid #e2e8f0',
                }}
              >
                <div>
                  <span style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>
                    Status
                  </span>
                  <div style={{ marginTop: '2px' }}>
                    <span
                      style={{
                        display: 'inline-block',
                        fontSize: '0.76rem',
                        fontWeight: 700,
                        padding: '2px 8px',
                        borderRadius: '9999px',
                        backgroundColor: selectedTicket.status === 'resolved' ? '#ecfdf5' : '#fff7ed',
                        color: selectedTicket.status === 'resolved' ? '#059669' : '#c2410c',
                        border: `1px solid ${selectedTicket.status === 'resolved' ? '#a7f3d0' : '#fed7aa'}`,
                      }}
                    >
                      {selectedTicket.status ? selectedTicket.status.toUpperCase() : 'OPEN'}
                    </span>
                  </div>
                </div>

                <div>
                  <span style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>
                    Reason
                  </span>
                  <div style={{ fontSize: '0.84rem', fontWeight: 600, color: '#334155', marginTop: '2px' }}>
                    {selectedTicket.reason || 'Escalated to Staff'}
                  </div>
                </div>

                <div>
                  <span style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>
                    Created Date
                  </span>
                  <div style={{ fontSize: '0.82rem', color: '#334155', marginTop: '2px' }}>
                    {selectedTicket.createdAt
                      ? new Date(selectedTicket.createdAt).toLocaleString()
                      : 'Just now'}
                  </div>
                </div>

                <div>
                  <span style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>
                    Conversation
                  </span>
                  <div
                    style={{
                      fontSize: '0.82rem',
                      fontFamily: 'monospace',
                      color: '#475569',
                      marginTop: '2px',
                    }}
                  >
                    {String(selectedTicket.conversationId || 'active-session').slice(0, 10)}
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Actions */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '20px' }}>
              <button
                onClick={() => setSelectedTicket(null)}
                style={{
                  padding: '8px 16px',
                  borderRadius: '8px',
                  border: '1px solid #cbd5e1',
                  color: '#475569',
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Close
              </button>
              <button
                onClick={() => {
                  const q = `Can you check the progress of my ticket #${String(
                    selectedTicket.ticketId || selectedTicket._id
                  ).slice(0, 8)}: "${selectedTicket.query}"?`;
                  setSelectedTicket(null);
                  handleSend(q);
                }}
                style={{
                  padding: '8px 18px',
                  borderRadius: '8px',
                  backgroundColor: '#c2410c',
                  color: '#ffffff',
                  fontSize: '0.85rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  boxShadow: '0 2px 6px rgba(194, 65, 12, 0.25)',
                }}
              >
                <Sparkles size={14} />
                <span>Ask Luna About This</span>
              </button>
            </div>
          </div>
        </div>
      )}
      {/* 4. TICKETS RAISED MODAL (VIEW ALL RAISED TICKETS) */}
      {isTicketsModalOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.65)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 100,
            padding: '20px',
          }}
          onClick={() => setIsTicketsModalOpen(false)}
        >
          <div
            style={{
              backgroundColor: '#ffffff',
              borderRadius: '18px',
              width: '100%',
              maxWidth: '720px',
              maxHeight: '85vh',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
              overflow: 'hidden',
              border: '1px solid #e2e8f0',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div
              style={{
                padding: '18px 24px',
                borderBottom: '1px solid #e2e8f0',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                backgroundColor: '#ffffff',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div
                  style={{
                    width: '42px',
                    height: '42px',
                    borderRadius: '12px',
                    backgroundColor: '#ffedd5',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Ticket size={22} color="#c2410c" />
                </div>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <h2 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>
                      Tickets Raised
                    </h2>
                    <span
                      style={{
                        backgroundColor: '#ffedd5',
                        color: '#c2410c',
                        fontSize: '0.78rem',
                        fontWeight: 800,
                        padding: '2px 8px',
                        borderRadius: '9999px',
                      }}
                    >
                      {tickets.length} Total
                    </span>
                  </div>
                  <p style={{ fontSize: '0.8rem', color: '#64748b', margin: '2px 0 0' }}>
                    Inquiries escalated to campus departments for review & action
                  </p>
                </div>
              </div>

              <button
                onClick={() => setIsTicketsModalOpen(false)}
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '8px',
                  border: '1px solid #e2e8f0',
                  backgroundColor: '#f8fafc',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  color: '#64748b',
                }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Filter & Action bar */}
            <div
              style={{
                padding: '12px 24px',
                backgroundColor: '#f8fafc',
                borderBottom: '1px solid #e2e8f0',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '12px',
                flexWrap: 'wrap',
              }}
            >
              {/* Filter tabs */}
              <div style={{ display: 'flex', gap: '6px' }}>
                {['ALL', 'OPEN', 'RESOLVED'].map((filter) => {
                  const active = ticketStatusFilter === filter;
                  const count =
                    filter === 'ALL'
                      ? tickets.length
                      : tickets.filter((t) => (t.status || 'OPEN').toUpperCase() === filter).length;
                  return (
                    <button
                      key={filter}
                      onClick={() => setTicketStatusFilter(filter)}
                      style={{
                        padding: '5px 12px',
                        borderRadius: '8px',
                        fontSize: '0.78rem',
                        fontWeight: 700,
                        border: '1px solid',
                        borderColor: active ? '#c2410c' : '#cbd5e1',
                        backgroundColor: active ? '#c2410c' : '#ffffff',
                        color: active ? '#ffffff' : '#475569',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      {filter} ({count})
                    </button>
                  );
                })}
              </div>

              {/* Action: Raise new inquiry via Luna */}
              <button
                onClick={() => {
                  setIsTicketsModalOpen(false);
                  setInputText('I need to raise a formal ticket regarding: ');
                }}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '6px 14px',
                  borderRadius: '8px',
                  backgroundColor: '#fff7ed',
                  border: '1px solid #fed7aa',
                  color: '#c2410c',
                  fontSize: '0.8rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                <Plus size={14} />
                <span>Raise New Inquiry</span>
              </button>
            </div>

            {/* Tickets List */}
            <div
              style={{
                flex: 1,
                overflowY: 'auto',
                padding: '16px 24px',
                display: 'flex',
                flexDirection: 'column',
                gap: '10px',
              }}
            >
              {filteredTickets.length === 0 ? (
                <div
                  style={{
                    padding: '40px 20px',
                    textAlign: 'center',
                    color: '#64748b',
                  }}
                >
                  <Ticket size={36} color="#cbd5e1" style={{ margin: '0 auto 10px', display: 'block' }} />
                  <div style={{ fontWeight: 700, color: '#334155', fontSize: '0.96rem' }}>
                    No tickets found
                  </div>
                  <div style={{ fontSize: '0.82rem', marginTop: '4px' }}>
                    {ticketStatusFilter !== 'ALL'
                      ? `No ${ticketStatusFilter.toLowerCase()} tickets currently.`
                      : 'No escalated support tickets have been created yet.'}
                  </div>
                </div>
              ) : (
                filteredTickets.map((t) => {
                  const isResolved = t.status === 'resolved';
                  return (
                    <div
                      key={t.ticketId || t._id}
                      style={{
                        padding: '14px 16px',
                        borderRadius: '12px',
                        backgroundColor: '#ffffff',
                        border: '1px solid #e2e8f0',
                        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.03)',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '8px',
                        transition: 'border-color 0.15s ease',
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.borderColor = '#fdba74')}
                      onMouseLeave={(e) => (e.currentTarget.style.borderColor = '#e2e8f0')}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span
                            style={{
                              fontFamily: 'monospace',
                              fontWeight: 700,
                              fontSize: '0.78rem',
                              color: '#c2410c',
                              backgroundColor: '#fff7ed',
                              padding: '2px 8px',
                              borderRadius: '6px',
                              border: '1px solid #ffedd5',
                            }}
                          >
                            #{String(t.ticketId || t._id).slice(0, 8)}
                          </span>
                          <span
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              fontSize: '0.74rem',
                              fontWeight: 700,
                              padding: '2px 8px',
                              borderRadius: '9999px',
                              backgroundColor: isResolved ? '#ecfdf5' : '#fff7ed',
                              color: isResolved ? '#059669' : '#c2410c',
                              border: `1px solid ${isResolved ? '#a7f3d0' : '#fed7aa'}`,
                            }}
                          >
                            <span
                              style={{
                                width: '6px',
                                height: '6px',
                                borderRadius: '50%',
                                backgroundColor: isResolved ? '#10b981' : '#f97316',
                              }}
                            />
                            {t.status ? t.status.toUpperCase() : 'OPEN'}
                          </span>
                        </div>

                        <span style={{ fontSize: '0.74rem', color: '#94a3b8' }}>
                          {t.createdAt
                            ? new Date(t.createdAt).toLocaleDateString([], {
                                month: 'short',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit',
                              })
                            : 'Recent'}
                        </span>
                      </div>

                      <div style={{ fontSize: '0.92rem', fontWeight: 600, color: '#0f172a', lineHeight: 1.4 }}>
                        {t.query || 'Campus Support Escalation'}
                      </div>

                      {t.reason && (
                        <div style={{ fontSize: '0.76rem', color: '#64748b', display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span style={{ fontWeight: 600, color: '#475569' }}>Category/Reason:</span>
                          <span>{t.reason}</span>
                        </div>
                      )}

                      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '4px', paddingTop: '8px', borderTop: '1px solid #f8fafc' }}>
                        <button
                          onClick={() => {
                            setSelectedTicket(t);
                          }}
                          style={{
                            padding: '5px 12px',
                            borderRadius: '6px',
                            border: '1px solid #cbd5e1',
                            backgroundColor: '#ffffff',
                            color: '#475569',
                            fontSize: '0.78rem',
                            fontWeight: 600,
                            cursor: 'pointer',
                          }}
                        >
                          View Details
                        </button>
                        <button
                          onClick={() => {
                            setIsTicketsModalOpen(false);
                            const q = `Can you check the progress of my ticket #${String(t.ticketId || t._id).slice(0, 8)}: "${t.query}"?`;
                            handleSend(q);
                          }}
                          style={{
                            padding: '5px 14px',
                            borderRadius: '6px',
                            backgroundColor: '#c2410c',
                            color: '#ffffff',
                            fontSize: '0.78rem',
                            fontWeight: 700,
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '5px',
                            boxShadow: '0 1px 3px rgba(194, 65, 12, 0.2)',
                          }}
                        >
                          <Sparkles size={12} />
                          <span>Ask Luna</span>
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
