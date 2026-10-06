import { request } from './api';

export const studentService = {
  async getProfile() {
    return request('/student/profile');
  },
};
