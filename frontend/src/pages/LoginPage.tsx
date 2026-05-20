import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Form, Input, Button, Typography, message } from 'antd';
import { UserOutlined, LockOutlined, MedicineBoxFilled, SwapOutlined } from '@ant-design/icons';
import { useAuth } from '../contexts/AuthContext';
import { brand } from '../theme';

const roleLabels: Record<string, string> = {
  super_admin: '超级管理员',
  hospital_admin: '医院管理员',
  doctor: '医生',
  patient: '病人',
};

export default function LoginPage() {
  const [loading, setLoading] = useState(false);
  const { login, user, logout } = useAuth();
  const [forceLogin, setForceLogin] = useState(false);

  // 用户有有效 session 且没有主动点击"切换账号"
  if (user && !forceLogin) {
    return (
      <div style={{
        minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: brand.primaryGradient, position: 'relative',
      }}>
        <div style={{
          width: 400, padding: '48px 36px 36px', background: '#FFFFFF', borderRadius: 16,
          boxShadow: '0 24px 80px rgba(0,0,0,0.12)', textAlign: 'center', position: 'relative', zIndex: 1,
        }}>
          <MedicineBoxFilled style={{ fontSize: 44, color: brand.primary, marginBottom: 16 }} />
          <Typography.Title level={3} style={{ marginBottom: 6, fontWeight: 700 }}>
            您已登录
          </Typography.Title>
          <div style={{
            marginBottom: 24, padding: '12px 16px', background: brand.primarySoft, borderRadius: 10,
            display: 'inline-block',
          }}>
            <Typography.Text strong style={{ fontSize: 15, color: brand.text }}>
              {user.name}
            </Typography.Text>
            <Typography.Text style={{ color: brand.textSecondary, marginLeft: 6 }}>
              （{roleLabels[user.role] || user.role}）
            </Typography.Text>
          </div>

          <div style={{ marginBottom: 20, display: 'flex', flexDirection: 'column', gap: 10 }}>
            <Button type="primary" size="large" block
              onClick={() => {
                const map: Record<string, string> = {
                  super_admin: '/admin', hospital_admin: '/hospital',
                  doctor: '/doctor', patient: '/patient',
                };
                window.location.href = map[user.role] || '/';
              }}
            >
              前往我的工作台
            </Button>
            <Button block icon={<SwapOutlined />}
              onClick={() => { logout(); setForceLogin(true); }}
            >
              切换其他账号
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // 未登录状态或主动点击了"切换账号"——显示登录表单
  const onFinish = async (values: { username: string; password: string }) => {
    setLoading(true);
    try {
      await login(values.username, values.password);
      message.success('登录成功');
    } catch (e: any) {
      message.error(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: brand.primaryGradient,
      position: 'relative',
      overflow: 'hidden',
    }}>
      {/* Decorative blur circles */}
      <div style={{
        position: 'absolute', top: -80, right: -120,
        width: 360, height: 360,
        borderRadius: '50%', background: 'rgba(255,255,255,0.08)', filter: 'blur(60px)',
      }} />
      <div style={{
        position: 'absolute', bottom: -100, left: -60,
        width: 280, height: 280,
        borderRadius: '50%', background: 'rgba(255,255,255,0.06)', filter: 'blur(50px)',
      }} />

      <div style={{
        width: 420, padding: '48px 40px 36px',
        background: '#FFFFFF', borderRadius: 16,
        boxShadow: '0 24px 80px rgba(0,0,0,0.12), 0 8px 24px rgba(0,0,0,0.04)',
        position: 'relative', zIndex: 1,
      }}>
        {/* Brand header */}
        <div style={{ textAlign: 'center', marginBottom: 36 }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            width: 56, height: 56, borderRadius: 16,
            background: brand.primaryGradient, marginBottom: 16,
          }}>
            <MedicineBoxFilled style={{ fontSize: 28, color: '#fff' }} />
          </div>
          <Typography.Title level={2} style={{ margin: 0, fontWeight: 700, color: brand.text }}>
            大健康 AI
          </Typography.Title>
          <Typography.Text style={{ color: brand.textMuted, fontSize: 15 }}>
            智能体医生平台 · 让专业医疗触手可及
          </Typography.Text>
        </div>

        <Form layout="vertical" onFinish={onFinish} size="large">
          <Form.Item name="username" rules={[{ required: true, message: '请输入用户名' }]}>
            <Input prefix={<UserOutlined style={{ color: brand.textMuted }} />} placeholder="用户名" />
          </Form.Item>
          <Form.Item name="password" rules={[{ required: true, message: '请输入密码' }]}>
            <Input.Password prefix={<LockOutlined style={{ color: brand.textMuted }} />} placeholder="密码" />
          </Form.Item>
          <Form.Item style={{ marginBottom: 20 }}>
            <Button type="primary" htmlType="submit" loading={loading} block size="large">
              登 录
            </Button>
          </Form.Item>
        </Form>

        <div style={{ textAlign: 'center', marginBottom: 20 }}>
          <Link to="/register" style={{ fontSize: 14, color: brand.primary }}>
            没有账号？立即注册 →
          </Link>
        </div>

        <div style={{
          padding: '12px 16px', background: '#FAFBFC', borderRadius: 10,
          fontSize: 12, lineHeight: '20px', color: brand.textMuted,
        }}>
          病人：patient_wang / 123456（推荐试用）<br />
          医生：doctor_zhang / 123456　院长：wang_yuanzhang / 123456<br />
          超管：admin / admin123
        </div>
      </div>
    </div>
  );
}
