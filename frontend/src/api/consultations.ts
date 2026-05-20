import client from './client';
import type { StartConsultResponse, Message } from '../types';

export function startConsultation(doctorId: number, symptom: string) {
  return client
    .post<StartConsultResponse>('/consultations/start', { doctor_id: doctorId, symptom })
    .then((r) => r.data);
}

export function sendMessage(sessionId: number, content: string) {
  return client
    .post<{ reply: string; session_id: number }>(`/consultations/${sessionId}/message`, { content })
    .then((r) => r.data);
}

export function fetchMessages(sessionId: number) {
  return client.get<Message[]>(`/consultations/${sessionId}/messages`).then((r) => r.data);
}
