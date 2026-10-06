import { request } from './api';

export const ticketService = {
  async getTickets() {
    return request('/student/tickets');
  },
};
