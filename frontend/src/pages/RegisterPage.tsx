import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Form, Input, Button, Card, Typography, Select, message } from 'antd';
import { UserOutlined, LockOutlined, PhoneOutlined, BankOutlined, MedicineBoxFilled } from '@ant-design/icons';
import { useAuth } from '../contexts/AuthContext';
import { brand } from '../theme';

export default function RegisterPage() {
  const [loading, setLoading] = useState(false);
  const [hospitals, setHospitals] = useState<{ id: number; name: string; code: string }[]>([]);
  const { register } = useAuth();

  useEffect(() => {
    fetch('/api/patient/hospitals').then((r) => r.ok ? r.json() : null).then((d) => Array.isArray(d) && setHospitals(d)).catch(() => {});
  }, []);

  const onFinish = async (values: any) => {
    setLoading(true);
    try {
      await register(values);
      message.success('注册成功，已自动登录');
    } catch (e: any) {
      message.error(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: brand.primaryGradient, position: 'relative', overflow: 'hidden',
    }}>
      {/* Decorative blur */}
      <div style={{ position: 'absolute', bottom: -120, right: -80, width: 320, height: 320, borderRadius: '50%', background: 'rgba(255,255,255,0.08)', filter: 'blur(60px)' }} />

      <Card style={{
        width: 420, padding: '40px 36px 24px', borderRadius: 16,
        boxShadow: '0 24px 80px rgba(0,0,0,0.12), 0 8px 24px rgba(0,0,0,0.04)',
        position: 'relative', zIndex: 1,
      }} styles={{ body: { padding: 0 } }}>
        {/* Brand header */}
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            width: 48, height: 48, borderRadius: 14,
            background: brand.primaryGradient, marginBottom: 12,
          }}>
            <MedicineBoxFilled style={{ fontSize: 24, color: '#fff' }} />
          </div>
          <Typography.Title level={3} style={{ margin: 0, fontWeight: 700, color: brand.text }}>
            创建账号
          </Typography.Title>
          <Typography.Text style={{ color: brand.textMuted, fontSize: 14 }}>
            注册后开启智能问诊体验
          </Typography.Text>
        </div>

        <Form layout="vertical" onFinish={onFinish} size="large">
          <Form.Item name="name" rules={[{ required: true, message: '请输入姓名' }]}>
            <Input prefix={<UserOutlined style={{ color: brand.textMuted }} />} placeholder="姓名" />
          </Form.Item>
          <Form.Item name="phone" rules={[{ required: true, message: '请输入手机号' }]}>
            <Input prefix={<PhoneOutlined style={{ color: brand.textMuted }} />} placeholder="手机号" />
          </Form.Item>
          <Form.Item name="username" rules={[{ required: true, message: '请输入用户名' }]}>
            <Input prefix={<UserOutlined style={{ color: brand.textMuted }} />} placeholder="用户名" />
          </Form.Item>
          <Form.Item name="password" rules={[{ required: true, message: '请输入密码' }]}>
            <Input.Password prefix={<LockOutlined style={{ color: brand.textMuted }} />} placeholder="密码" />
          </Form.Item>
          <Form.Item name="hospital_code" rules={[{ required: true, message: '请选择医院' }]}>
            <Select
              prefix={<BankOutlined />}
              placeholder="选择所属医院"
              options={hospitals.map((h) => ({ label: h.name, value: h.code }))}
            />
          </Form.Item>
          <Form.Item style={{ marginBottom: 20 }}>
            <Button type="primary" htmlType="submit" loading={loading} block>
              注 册
            </Button>
          </Form.Item>
        </Form>

        <div style={{ textAlign: 'center' }}>
          <Link to="/login" style={{ fontSize: 14, color: brand.primary }}>← 已有账号？去登录</Link>
        </div>
      </Card>
    </div>
  );
}
