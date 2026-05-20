import client from './client';
import type { Doctor, DoctorBrief } from '../types';

export function fetchDoctors(params?: { department?: string; status?: string }) {
  return client.get<DoctorBrief[]>('/doctors', { params }).then((r) => r.data);
}

export function fetchDoctor(id: number) {
  return client.get<Doctor>(`/doctors/${id}`).then((r) => r.data);
}

export function createDoctor(data: Partial<Doctor>) {
  return client.post<Doctor>('/doctors', data).then((r) => r.data);
}

export function updateDoctor(id: number, data: Partial<Doctor>) {
  return client.put<Doctor>(`/doctors/${id}`, data).then((r) => r.data);
}

export function updateDoctorStatus(id: number, status: string) {
  return client.patch<Doctor>(`/doctors/${id}/status`, { status }).then((r) => r.data);
}

export function deleteDoctor(id: number) {
  return client.delete(`/doctors/${id}`).then((r) => r.data);
}
