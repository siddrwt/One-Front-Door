import React, { useState } from 'react';
import { Send, CornerDownLeft } from 'lucide-react';
import LoadingSpinner from '../common/LoadingSpinner';

export default function ChatInput({ onSend, isLoading }) {
  const [text, setText] = useState('');

  const handleSubmit = (e) => {
    e?.preventDefault();
    if (!text.trim() || isLoading) return;
    onSend(text.trim());
    setText('');
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      style={{
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
        background: 'var(--bg-card)',
        borderRadius: '16px',
        border: '1px solid var(--border-subtle)',
        boxShadow: 'var(--shadow-md)',
        padding: '8px 12px 8px 16px',
        transition: 'border-color var(--transition-fast)',
      }}
    >
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Ask anything about fees, exams, IT support, hostel, or placements..."
        rows={1}
        style={{
          flex: 1,
          border: 'none',
          outline: 'none',
          resize: 'none',
          background: 'transparent',
          color: 'var(--text-main)',
          fontSize: '0.95rem',
          lineHeight: '1.5',
          maxHeight: '120px',
        }}
      />

      <button
        type="submit"
        disabled={!text.trim() || isLoading}
        style={{
          width: '38px',
          height: '38px',
          borderRadius: '10px',
          backgroundColor: text.trim() && !isLoading ? 'var(--primary)' : 'var(--border-subtle)',
          color: text.trim() && !isLoading ? '#ffffff' : 'var(--text-muted)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transition: 'all var(--transition-fast)',
          marginLeft: '8px',
        }}
      >
        {isLoading ? <LoadingSpinner size={18} color="#fff" /> : <Send size={18} />}
      </button>
    </form>
  );
}
