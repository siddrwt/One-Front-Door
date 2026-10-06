import React, { createContext, useContext, useState } from 'react';
import { chatService } from '../services/chatService';

const ChatContext = createContext(null);

export function ChatProvider({ children }) {
  const [messages, setMessages] = useState([
    {
      id: 'welcome',
      role: 'assistant',
      content:
        "Hello! I am your One Front Door Campus Assistant. You can ask me about fee payments, exam schedules, IT support, facilities, placements, and more. How can I help you today?",
      domain: 'general',
      confidence: 1.0,
      timestamp: new Date().toISOString(),
    },
  ]);
  const [conversationId, setConversationId] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const sendMessage = async (queryText) => {
    if (!queryText.trim() || isLoading) return;

    const userMsg = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: queryText,
      timestamp: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setIsLoading(true);
    setError(null);

    try {
      const res = await chatService.sendMessage({
        query: queryText,
        conversationId,
      });

      if (res.conversationId) {
        setConversationId(res.conversationId);
      }

      const botMsg = {
        id: res.turnId || res.queryId || `bot-${Date.now()}`,
        turnId: res.turnId,
        role: 'assistant',
        type: res.type || 'answer',
        content: res.answer || res.message || res.response,
        domain: res.domain || (res.domains && res.domains[0]) || 'general',
        domains: res.domains || (res.domain ? [res.domain] : []),
        answers: res.answers || [],
        confidence: res.routingScore ?? res.confidence ?? null,
        sources: res.sources || [],
        routedTo: res.routedTo || res.department || (res.ticketId ? `Escalated Ticket (${res.ticketId})` : null),
        ticketId: res.ticketId || null,
        signals: res.signals || null,
        replyKind: res.replyKind || null,
        timestamp: new Date().toISOString(),
      };

      setMessages((prev) => [...prev, botMsg]);
      return botMsg;
    } catch (err) {
      console.error('Chat error:', err);
      const isAuthError = err.status === 401;
      const errMsg = {
        id: `err-${Date.now()}`,
        role: 'assistant',
        content: isAuthError
          ? "Please sign in using your Student ID (e.g., BU2023CSE045) using the 'Student Login' button in the top right to access campus queries."
          : err.data?.message || err.message || "Sorry, I encountered an issue connecting to campus services. Please try again shortly.",
        isError: true,
        isAuthError,
        timestamp: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, errMsg]);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const startNewChat = () => {
    setConversationId(null);
    setMessages([
      {
        id: 'welcome',
        role: 'assistant',
        content:
          "Started a new session! What campus inquiry or department would you like help with?",
        domain: 'general',
        confidence: 1.0,
        timestamp: new Date().toISOString(),
      },
    ]);
  };

  return (
    <ChatContext.Provider
      value={{
        messages,
        conversationId,
        isLoading,
        error,
        sendMessage,
        startNewChat,
      }}
    >
      {children}
    </ChatContext.Provider>
  );
}

export function useChat() {
  const context = useContext(ChatContext);
  if (!context) {
    throw new Error('useChat must be used within a ChatProvider');
  }
  return context;
}
