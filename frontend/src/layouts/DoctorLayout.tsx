import { useState } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { Layout, Menu, Typography, Button, Space, Tag } from 'antd';
import { UnorderedListOutlined, MessageOutlined, LogoutOutlined, MedicineBoxFilled } from '@ant-design/icons';
import { useAuth } from '../contexts/AuthContext';

const { Sider, Header, Content } = Layout;

export default function DoctorLayout() {
  const [collapsed, setCollapsed] = useState(false);
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const selectedKey = location.pathname.startsWith('/doctor/sessions') ? '/doctor/sessions' : '/doctor';

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider
        collapsible collapsed={collapsed} onCollapse={setCollapsed} theme="dark" width={220}
        style={{ boxShadow: '2px 0 12px rgba(0,0,0,0.06)', zIndex: 10 }}
      >
        <div style={{
          height: 60, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          borderBottom: '1px solid rgba(255,255,255,0.06)',
        }}>
          <MedicineBoxFilled style={{ fontSize: collapsed ? 22 : 26, color: '#00C896' }} />
          {!collapsed && (
            <Typography.Title level={5} style={{ color: '#fff', margin: 0, whiteSpace: 'nowrap' }}>
              医生工作台
            </Typography.Title>
          )}
        </div>
        <Menu theme="dark" mode="inline" selectedKeys={[selectedKey]}
          items={[
            { key: '/doctor', icon: <UnorderedListOutlined />, label: '待处理队列' },
            { key: '/doctor/sessions', icon: <MessageOutlined />, label: '我的会话' },
          ]}
          onClick={({ key }) => navigate(key)}
          style={{ borderInlineEnd: 'none', marginTop: 8 }}
        />
      </Sider>
      <Layout>
        <Header style={{
          background: '#fff', padding: '0 24px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          borderBottom: '1px solid #F0F2F5', height: 60,
        }}>
          <Space>
            <Typography.Text strong style={{ fontSize: 15 }}>{user?.name}</Typography.Text>
            {user?.specialty && <Tag color="blue" style={{ margin: 0 }}>{user.specialty}</Tag>}
            <Tag color="green" style={{ margin: 0 }}>在线</Tag>
          </Space>
          <Button icon={<LogoutOutlined />} onClick={logout} type="text">退出</Button>
        </Header>
        <Content style={{ margin: 20, padding: 24, background: '#fff', borderRadius: 12, minHeight: 280, overflow: 'auto' }}>
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  );
}
