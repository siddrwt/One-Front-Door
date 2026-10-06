import React, { useRef, useEffect } from 'react';
import { useChat } from '../../context/ChatContext';
import MessageItem from './MessageItem';
import ChatInput from './ChatInput';
import { QUICK_SUGGESTIONS } from '../../utils/constants';
import LoadingSpinner from '../common/LoadingSpinner';

export default function ChatContainer() {
  const { messages, isLoading, sendMessage } = useChat();
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        maxWidth: '900px',
        margin: '0 auto',
        width: '100%',
        padding: '16px 20px',
      }}
    >
      {/* Messages Scroll Area */}
      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          paddingRight: '8px',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {messages.map((msg) => (
          <MessageItem key={msg.id} message={msg} />
        ))}

        {isLoading && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              padding: '12px 16px',
              color: 'var(--text-muted)',
              fontSize: '0.88rem',
            }}
          >
            <LoadingSpinner size={18} color="var(--primary)" />
            <span>Classifying inquiry and checking domain knowledge bases...</span>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Quick Suggestions (Shown when initial greeting) */}
      {messages.length <= 1 && (
        <div style={{ marginBottom: '16px' }}>
          <div
            style={{
              fontSize: '0.8rem',
              color: 'var(--text-muted)',
              marginBottom: '8px',
              fontWeight: 500,
            }}
          >
            Suggested Inquiries:
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
            {QUICK_SUGGESTIONS.map((item, idx) => (
              <button
                key={idx}
                onClick={() => sendMessage(item)}
                style={{
                  background: 'var(--bg-card)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: '20px',
                  padding: '6px 14px',
                  fontSize: '0.82rem',
                  color: 'var(--text-main)',
                  transition: 'all var(--transition-fast)',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = 'var(--primary)';
                  e.currentTarget.style.color = 'var(--primary)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = 'var(--border-subtle)';
                  e.currentTarget.style.color = 'var(--text-main)';
                }}
              >
                {item}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input box */}
      <div style={{ paddingTop: '8px' }}>
        <ChatInput onSend={sendMessage} isLoading={isLoading} />
      </div>
    </div>
  );
}
