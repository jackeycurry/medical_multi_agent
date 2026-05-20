import { Outlet, useNavigate } from 'react-router-dom';
import { Layout, Typography, Button, Space } from 'antd';
import { LogoutOutlined, MedicineBoxFilled } from '@ant-design/icons';
import { useAuth } from '../contexts/AuthContext';

const { Header, Content } = Layout;

export default function PatientLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  return (
    <Layout style={{ minHeight: '100vh', background: '#F5F7FA' }}>
      <Header style={{
        background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 28px', borderBottom: '1px solid #F0F2F5', height: 60,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }} onClick={() => navigate('/patient')}>
          <MedicineBoxFilled style={{ fontSize: 26, color: '#00C896' }} />
          <Typography.Title level={4} style={{ margin: 0, color: '#1F2937', fontWeight: 600 }}>
            大健康在线问诊
          </Typography.Title>
        </div>
        <Space>
          {user && (
            <>
              <Typography.Text style={{ color: '#6B7280' }}>{user.name}</Typography.Text>
              <Button icon={<LogoutOutlined />} onClick={logout} type="text">退出</Button>
            </>
          )}
        </Space>
      </Header>
      <Content style={{ padding: 28, maxWidth: 800, margin: '0 auto', width: '100%' }}>
        <Outlet />
      </Content>
    </Layout>
  );
}
