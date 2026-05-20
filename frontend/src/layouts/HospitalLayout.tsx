import { useState } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { Layout, Menu, Typography, Button, Space, Tag } from 'antd';
import { DashboardOutlined, TeamOutlined, MessageOutlined, LogoutOutlined, MedicineBoxFilled } from '@ant-design/icons';
import { useAuth } from '../contexts/AuthContext';

const { Sider, Header, Content } = Layout;

export default function HospitalLayout() {
  const [collapsed, setCollapsed] = useState(false);
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const pathSeg = location.pathname.split('/')[2] || '';
  const selectedKey = location.pathname === '/hospital' ? '/hospital' : pathSeg;

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
              {user?.hospital_name || '医院管理'}
            </Typography.Title>
          )}
        </div>
        <Menu theme="dark" mode="inline" selectedKeys={[selectedKey]}
          items={[
            { key: '/hospital', icon: <DashboardOutlined />, label: '数据总览' },
            { key: 'patients', icon: <TeamOutlined />, label: '病人管理' },
            { key: 'sessions', icon: <MessageOutlined />, label: '对话记录' },
          ]}
          onClick={({ key }) => navigate(key === '/hospital' ? '/hospital' : `/hospital/${key}`)}
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
            <Typography.Text strong style={{ fontSize: 15 }}>{user?.hospital_name || '全部医院'}</Typography.Text>
            <Tag color="blue" style={{ margin: 0 }}>{user?.name}</Tag>
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
