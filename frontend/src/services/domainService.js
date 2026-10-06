import { request } from './api';

export const domainService = {
  async getDomains() {
    return request('/domains');
  },
};
