import client from './client';
import type { CallLog, DashboardStats } from '../types';

export function fetchCallLogs(params?: { page?: number; page_size?: number; doctor_id?: number }) {
  return client.get<CallLog[]>('/call-logs', { params }).then((r) => r.data);
}

export function fetchStats() {
  return client.get<DashboardStats>('/stats').then((r) => r.data);
}
