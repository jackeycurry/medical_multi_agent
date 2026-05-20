import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ConfigProvider, Spin } from 'antd';
import zhCN from 'antd/locale/zh_CN';
import { themeConfig } from './theme';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import AppLayout from './components/AppLayout';
import Dashboard from './pages/admin/Dashboard';
import DoctorCreatePage from './pages/admin/DoctorCreate';
import DoctorChatPage from './pages/admin/DoctorChat';
import CallLogsPage from './pages/admin/CallLogs';
import ApiDemoPage from './pages/admin/ApiDemo';
import PatientLayout from './layouts/PatientLayout';
import PatientHome from './pages/patient/PatientHome';
import PatientConsultPage from './pages/patient/PatientConsultPage';
import DoctorLayout from './layouts/DoctorLayout';
import DoctorDashboard from './pages/doctor/DoctorDashboard';
import DoctorSessionPage from './pages/doctor/DoctorSessionPage';
import HospitalLayout from './layouts/HospitalLayout';
import HospitalDashboard from './pages/hospital/HospitalDashboard';
import PatientListPage from './pages/hospital/PatientListPage';
import PatientProfilePage from './pages/hospital/PatientProfilePage';
import SessionListPage from './pages/hospital/SessionListPage';
import SessionDetailPage from './pages/hospital/SessionDetailPage';

function ProtectedRoute({ roles, children }: { roles: string[]; children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <Spin size="large" style={{ display: 'block', margin: '200px auto' }} />;
  if (!user) return <Navigate to="/login" replace />;
  if (!roles.includes(user.role)) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function RoleRedirect() {
  const { user, loading } = useAuth();
  if (loading) return <Spin size="large" style={{ display: 'block', margin: '200px auto' }} />;
  if (!user) return <Navigate to="/login" replace />;
  const map: Record<string, string> = {
    super_admin: '/admin',
    hospital_admin: '/hospital',
    doctor: '/doctor',
    patient: '/patient',
  };
  return <Navigate to={map[user.role] || '/login'} replace />;
}

export default function App() {
  return (
    <ConfigProvider locale={zhCN} theme={themeConfig}>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/" element={<RoleRedirect />} />

            {/* 管理后台 (super_admin + hospital_admin) */}
            <Route element={<ProtectedRoute roles={['super_admin', 'hospital_admin']}><AppLayout /></ProtectedRoute>}>
              <Route path="/admin" element={<Dashboard />} />
              <Route path="/admin/doctors/new" element={<DoctorCreatePage />} />
              <Route path="/admin/doctors/:id/edit" element={<DoctorCreatePage />} />
              <Route path="/admin/doctors/:id/chat" element={<DoctorChatPage />} />
              <Route path="/admin/call-logs" element={<CallLogsPage />} />
              <Route path="/admin/api-demo" element={<ApiDemoPage />} />
            </Route>

            {/* 旧路径重定向到 /admin（仅静态路径；带参数的路径走 useParams 自身的 Redirect 组件无效，直接由调用方导航绝对路径） */}
            <Route path="/doctors/new" element={<Navigate to="/admin/doctors/new" replace />} />
            <Route path="/call-logs" element={<Navigate to="/admin/call-logs" replace />} />
            <Route path="/api-demo" element={<Navigate to="/admin/api-demo" replace />} />

            {/* 病人端（需要登录，仅 patient 角色） */}
            <Route element={<ProtectedRoute roles={['patient']}><PatientLayout /></ProtectedRoute>}>
              <Route path="/patient" element={<PatientHome />} />
              <Route path="/patient/consult/:code" element={<PatientConsultPage />} />
            </Route>

            {/* 医生辅助端 (doctor) */}
            <Route element={<ProtectedRoute roles={['doctor']}><DoctorLayout /></ProtectedRoute>}>
              <Route path="/doctor" element={<DoctorDashboard />} />
              <Route path="/doctor/sessions" element={<DoctorDashboard />} />
              <Route path="/doctor/session/:id" element={<DoctorSessionPage />} />
            </Route>

            {/* 医院管理端 (hospital_admin + super_admin) */}
            <Route element={<ProtectedRoute roles={['hospital_admin', 'super_admin']}><HospitalLayout /></ProtectedRoute>}>
              <Route path="/hospital" element={<HospitalDashboard />} />
              <Route path="/hospital/patients" element={<PatientListPage />} />
              <Route path="/hospital/patients/:id" element={<PatientProfilePage />} />
              <Route path="/hospital/sessions" element={<SessionListPage />} />
              <Route path="/hospital/sessions/:id" element={<SessionDetailPage />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </ConfigProvider>
  );
}
