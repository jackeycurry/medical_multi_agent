import { useEffect, useState } from 'react';
import { Typography, Row, Col, Card, Table, message } from 'antd';
import {
  TeamOutlined, ApiOutlined, UserOutlined,
  ThunderboltOutlined, MessageOutlined, AlertOutlined,
} from '@ant-design/icons';
import client from '../../api/client';
import { brand } from '../../theme';

const statCards = [
  { key: 'total_patients', title: '病人数', icon: <TeamOutlined />, color: '#3B82F6' },
  { key: 'total_ai_doctors', title: 'AI 医生', icon: <ApiOutlined />, color: '#00C896' },
  { key: 'total_real_doctors', title: '真人医生', icon: <UserOutlined />, color: '#8B5CF6' },
  { key: 'sessions_today', title: '今日会话', icon: <ThunderboltOutlined />, color: '#F59E0B' },
  { key: 'total_sessions', title: '总会话', icon: <MessageOutlined />, color: '#06B6D4' },
  { key: 'escalation_pending', title: '待处理', icon: <AlertOutlined />, color: '#EF4444' },
];

function StatItem({ icon, value, color, label }: { icon: React.ReactNode; value: number; color: string; label: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
      <div style={{ width: 42, height: 42, borderRadius: 10, background: `${color}14`, display: 'flex', alignItems: 'center', justifyContent: 'center', color, fontSize: 20 }}>
        {icon}
      </div>
      <div>
        <Typography.Text type="secondary" style={{ fontSize: 12 }}>{label}</Typography.Text>
        <div style={{ fontSize: 24, fontWeight: 700, color: brand.text }}>{value}</div>
      </div>
    </div>
  );
}

export default function HospitalDashboard() {
  const [stats, setStats] = useState<any>({});
  const [recentSessions, setRecentSessions] = useState<any[]>([]);

  useEffect(() => {
    client.get('/hospital/stats').then((r) => setStats(r.data)).catch((e) => message.error(e.message));
    client.get('/hospital/sessions', { params: { page_size: 5 } })
      .then((r) => setRecentSessions(r.data.items || []))
      .catch(() => {});
  }, []);

  return (
    <div>
      <Typography.Title level={4} style={{ marginBottom: 20, fontWeight: 600 }}>数据总览</Typography.Title>
      <Row gutter={[16, 16]} style={{ marginBottom: 28 }}>
        {statCards.map((s) => (
          <Col key={s.key} span={4}>
            <Card style={{ borderRadius: 12 }} styles={{ body: { padding: '16px 18px' } }}>
              <StatItem icon={s.icon} label={s.title} value={stats[s.key] || 0} color={s.color} />
            </Card>
          </Col>
        ))}
      </Row>

      <Typography.Title level={5} style={{ marginBottom: 12, fontWeight: 600 }}>最近会话</Typography.Title>
      <Table
        rowKey="session_id"
        dataSource={recentSessions}
        columns={[
          { title: '病人', dataIndex: 'patient_name', width: 100 },
          { title: 'AI医生', dataIndex: 'ai_doctor_name', width: 100 },
          { title: '真人医生', dataIndex: 'real_doctor_name', width: 100, render: (v: string) => v || '-' },
          { title: '症状', dataIndex: 'symptom', ellipsis: true },
          { title: '消息数', dataIndex: 'message_count', width: 80 },
          { title: '接替', dataIndex: 'is_escalated', width: 60, render: (v: boolean) => v ? '是' : '-' },
          { title: '时间', dataIndex: 'started_at', width: 170, render: (v: string) => v?.slice(0, 19) },
        ]}
        pagination={false}
        size="small"
        style={{ borderRadius: 12, overflow: 'hidden' }}
      />
    </div>
  );
}
