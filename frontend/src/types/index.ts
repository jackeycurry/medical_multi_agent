export interface Doctor {
  id: number;
  name: string;
  department: string;
  avatar_url: string;
  specialty: string;
  personality: string;
  system_prompt: string;
  status: 'online' | 'busy' | 'offline';
  call_count: number;
  created_at: string;
  updated_at: string;
}

export interface DoctorBrief {
  id: number;
  name: string;
  department: string;
  avatar_url: string;
  specialty: string;
  status: string;
  call_count: number;
}

export interface SessionInfo {
  id: number;
  doctor_id: number;
  patient_name: string;
  symptom: string;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface Message {
  id: number;
  session_id: number;
  role: 'user' | 'assistant';
  content: string;
  created_at: string;
}

export interface CallLog {
  id: number;
  doctor_id: number | null;
  session_id: number | null;
  endpoint: string;
  request_params: string | null;
  response_time_ms: number;
  status: 'success' | 'failure';
  error_message: string | null;
  created_at: string;
}

export interface DashboardStats {
  total_doctors: number;
  online_doctors: number;
  total_sessions: number;
  total_calls: number;
  calls_today: number;
  avg_response_time_ms: number;
}

export interface StartConsultResponse {
  session_id: number;
  doctor: { id: number; name: string; department: string; avatar_url: string };
  greeting: string;
}
