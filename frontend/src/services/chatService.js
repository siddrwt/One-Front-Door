import { request } from './api';

export const chatService = {
  async sendMessage({ query, message, conversationId = null }) {
    const text = message || query;
    return request('/chat', {
      method: 'POST',
      body: JSON.stringify({ message: text, query: text, conversationId }),
    });
  },

  async getConversation(id) {
    return request(`/conversations/${id}`);
  },

  async submitFeedback({ turnId, queryId, feedback, rating, comment = '' }) {
    const id = turnId || queryId;
    const fb = feedback || (rating > 0 ? 'up' : 'down');
    return request('/feedback', {
      method: 'POST',
      body: JSON.stringify({ turnId: id, feedback: fb, comment }),
    });
  },

  async checkHealth() {
    return request('/health');
  },
};
