import { useState } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { Layout, Menu, Typography, Button, Space, Tag } from 'antd';
import {
  DashboardOutlined,
  PlusCircleOutlined,
  FileTextOutlined,
  ApiOutlined,
  BookOutlined,
  LogoutOutlined,
  MedicineBoxFilled,
} from '@ant-design/icons';
import { useAuth } from '../contexts/AuthContext';

const { Sider, Header, Content } = Layout;

const menuItems = [
  { key: '/admin', icon: <DashboardOutlined />, label: '医生面板' },
  { key: '/admin/doctors/new', icon: <PlusCircleOutlined />, label: '新增医生' },
  { key: '/admin/call-logs', icon: <FileTextOutlined />, label: '调用日志' },
  { key: '/admin/api-demo', icon: <ApiOutlined />, label: '接口演示' },
];

export default function AppLayout() {
  const [collapsed, setCollapsed] = useState(false);
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const selectedKey = '/' + location.pathname.split('/').slice(1, 3).join('/');

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider
        collapsible
        collapsed={collapsed}
        onCollapse={setCollapsed}
        theme="dark"
        width={220}
        style={{
          boxShadow: '2px 0 12px rgba(0,0,0,0.06)',
          zIndex: 10,
        }}
      >
        <div style={{
          height: 60, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          borderBottom: '1px solid rgba(255,255,255,0.06)',
        }}>
          <MedicineBoxFilled style={{ fontSize: collapsed ? 22 : 26, color: '#00C896' }} />
          {!collapsed && (
            <Typography.Title level={5} style={{ color: '#fff', margin: 0, whiteSpace: 'nowrap' }}>
              AI 医生平台
            </Typography.Title>
          )}
        </div>
        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={[selectedKey]}
          items={menuItems}
          onClick={({ key }) => navigate(key)}
          style={{ borderInlineEnd: 'none', marginTop: 8 }}
        />
        <div style={{ position: 'absolute', bottom: 0, width: '100%', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
          <Menu theme="dark" mode="inline" selectable={false}
            items={[{ key: 'docs', icon: <BookOutlined />, label: 'API 文档' }]}
            onClick={() => window.open('/docs', '_blank')}
          />
        </div>
      </Sider>
      <Layout>
        <Header style={{
          background: '#fff', padding: '0 24px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          borderBottom: '1px solid #F0F2F5', height: 60,
        }}>
          <Typography.Text strong style={{ fontSize: 16, color: '#1F2937' }}>
            大健康 AI · 管理后台
          </Typography.Text>
          <Space size={12}>
            <Tag color="blue" style={{ margin: 0 }}>{user?.role === 'super_admin' ? '超级管理员' : '医院管理员'}</Tag>
            <Typography.Text style={{ color: '#6B7280' }}>{user?.name}</Typography.Text>
            <Button icon={<LogoutOutlined />} onClick={logout} type="text">退出</Button>
          </Space>
        </Header>
        <Content style={{ margin: 20, padding: 24, background: '#fff', borderRadius: 12, minHeight: 280, overflow: 'auto' }}>
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  );
}
