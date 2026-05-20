import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Row, Col, Select, Spin, message, Empty } from 'antd';
import {
  TeamOutlined, ApiOutlined, MessageOutlined,
  ThunderboltOutlined, ClockCircleOutlined, BarChartOutlined,
} from '@ant-design/icons';
import DoctorCard from '../../components/DoctorCard';
import StatCard from '../../components/StatCard';
import { fetchDoctors, updateDoctorStatus, deleteDoctor } from '../../api/doctors';
import { fetchStats } from '../../api/callLogs';
import type { DoctorBrief, DashboardStats } from '../../types';

export default function Dashboard() {
  const [doctors, setDoctors] = useState<DoctorBrief[]>([]);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [filterDept, setFilterDept] = useState<string | undefined>();
  const [filterStatus, setFilterStatus] = useState<string | undefined>();
  const navigate = useNavigate();

  const load = () => {
    setLoading(true);
    Promise.all([
      fetchDoctors({ department: filterDept, status: filterStatus }),
      fetchStats(),
    ])
      .then(([d, s]) => {
        setDoctors(d);
        setStats(s);
      })
      .catch((e) => message.error(e.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [filterDept, filterStatus]);

  const handleChat = (id: number) => navigate(`/admin/doctors/${id}/chat`);
  const handleEdit = (id: number) => navigate(`/admin/doctors/${id}/edit`);
  const handleToggle = (id: number, status: string) => {
    const newStatus = status === 'online' ? 'offline' : 'online';
    updateDoctorStatus(id, newStatus).then(() => load()).catch((e) => message.error(e.message));
  };
  const handleDelete = (id: number) => {
    deleteDoctor(id).then(() => load()).catch((e) => message.error(e.message));
  };

  return (
    <div>
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col span={4}><StatCard title="医生总数" value={stats?.total_doctors ?? '-'} suffix="位" color="#3B82F6" icon={<TeamOutlined />} /></Col>
        <Col span={4}><StatCard title="在线医生" value={stats?.online_doctors ?? '-'} suffix="位" color="#00C896" icon={<ApiOutlined />} /></Col>
        <Col span={4}><StatCard title="累计会话" value={stats?.total_sessions ?? '-'} suffix="次" color="#8B5CF6" icon={<MessageOutlined />} /></Col>
        <Col span={4}><StatCard title="今日调用" value={stats?.calls_today ?? '-'} suffix="次" color="#F59E0B" icon={<ThunderboltOutlined />} /></Col>
        <Col span={4}><StatCard title="平均响应" value={stats?.avg_response_time_ms ?? '-'} suffix="ms" color="#06B6D4" icon={<ClockCircleOutlined />} /></Col>
        <Col span={4}><StatCard title="总调用数" value={stats?.total_calls ?? '-'} suffix="次" color="#EC4899" icon={<BarChartOutlined />} /></Col>
      </Row>

      <div style={{ marginBottom: 16, display: 'flex', gap: 12 }}>
        <Select
          allowClear
          placeholder="筛选科室"
          style={{ width: 160 }}
          options={['心内科', '内分泌科', '儿科', '中医科', '全科', '药学'].map((d) => ({ label: d, value: d }))}
          onChange={(v) => setFilterDept(v)}
        />
        <Select
          allowClear
          placeholder="筛选状态"
          style={{ width: 140 }}
          options={[
            { label: '在线', value: 'online' },
            { label: '忙碌', value: 'busy' },
            { label: '离线', value: 'offline' },
          ]}
          onChange={(v) => setFilterStatus(v)}
        />
      </div>

      <Spin spinning={loading}>
        {doctors.length === 0 && !loading ? (
          <Empty description="暂无医生，请先创建" />
        ) : (
          <Row gutter={[16, 16]}>
            {doctors.map((d) => (
              <Col key={d.id} xs={24} sm={12} lg={8} xl={6}>
                <DoctorCard
                  doctor={d}
                  onChat={handleChat}
                  onEdit={handleEdit}
                  onToggle={handleToggle}
                  onDelete={handleDelete}
                />
              </Col>
            ))}
          </Row>
        )}
      </Spin>
    </div>
  );
}
