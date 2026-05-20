import { useEffect, useState, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, Button, Typography, Row, Col, Tag, message, Empty, Spin, Space } from 'antd';
import { SoundOutlined } from '@ant-design/icons';
import client from '../../api/client';

interface QueueItem {
  escalation_id: number;
  patient_name: string;
  symptom: string;
  reason: string;
  session_id: number;
  waiting_minutes: number;
  messages_preview: { role: string; content: string }[];
}

export default function DoctorDashboard() {
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCount, setActiveCount] = useState(0);
  const totalRef = useRef(0);
  const navigate = useNavigate();

  const load = useCallback(() => {
    client.get('/doctor/queue')
      .then((r) => {
        const data = Array.isArray(r.data) ? r.data : [];
        setQueue(data);
        setLoading(false);
      })
      .catch((e) => message.error(e.message));

    // 同时拉我的会话统计
    client.get('/doctor/sessions').then((r) => {
      setActiveCount(Array.isArray(r.data) ? r.data.filter((s: any) => s.is_escalated && s.escalation_status === 'in_progress').length : 0);
    }).catch(() => {});
  }, []);

  // 首次加载
  useEffect(() => { load(); }, [load]);

  // 3 秒轮询：有新请求时声音提示
  useEffect(() => {
    const timer = setInterval(() => {
      client.get('/doctor/queue').then((r) => {
        const data = Array.isArray(r.data) ? r.data : [];
        if (data.length > totalRef.current) {
          message.info({ content: `有新的真人接诊请求（共 ${data.length} 条待处理）`, icon: <SoundOutlined />, duration: 5 });
        }
        totalRef.current = data.length;
        setQueue(data);
      }).catch(() => {});
    }, 3000);
    return () => clearInterval(timer);
  }, []);

  const claim = async (id: number) => {
    try {
      const r = await client.post(`/doctor/queue/${id}/claim`);
      message.success(r.data.message);
      navigate(`/doctor/session/${r.data.session_id}`);
    } catch (e: any) {
      message.error(e.message);
    }
  };

  return (
    <div>
      <Typography.Title level={4}>待处理真人请求</Typography.Title>
      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col span={8}>
          <Card style={{ borderLeft: '4px solid #F59E0B' }} styles={{ body: { padding: '16px 18px' } }}>
            <Typography.Text type="secondary">待处理</Typography.Text>
            <Typography.Title level={3} style={{ margin: 0, color: '#F59E0B' }}>
              {loading ? <Spin size="small" /> : queue.length}
            </Typography.Title>
          </Card>
        </Col>
        <Col span={8}>
          <Card style={{ borderLeft: '4px solid #3B82F6' }} styles={{ body: { padding: '16px 18px' } }}>
            <Typography.Text type="secondary">进行中</Typography.Text>
            <Typography.Title level={3} style={{ margin: 0, color: '#3B82F6' }}>
              {activeCount}
            </Typography.Title>
          </Card>
        </Col>
        <Col span={8}>
          <Card style={{ borderLeft: '4px solid #00C896' }} styles={{ body: { padding: '16px 18px' } }}>
            <Typography.Text type="secondary">队列实时刷新</Typography.Text>
            <Typography.Text style={{ fontSize: 13, color: '#00C896' }}>
              每 3 秒自动拉取
            </Typography.Text>
          </Card>
        </Col>
      </Row>

      {queue.length === 0 && !loading ? (
        <Empty description="暂无待处理请求，系统每 3 秒自动刷新" />
      ) : (
        queue.map((item) => (
          <Card key={item.escalation_id} style={{ marginBottom: 12, borderRadius: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div style={{ flex: 1 }}>
                <Space style={{ marginBottom: 4 }}>
                  <Typography.Text strong>{item.patient_name}</Typography.Text>
                  <Tag color="orange">等待 {item.waiting_minutes || 1} 分钟</Tag>
                </Space>
                <Typography.Paragraph type="secondary" ellipsis={{ rows: 2 }} style={{ marginBottom: 4 }}>
                  症状：{item.symptom}
                </Typography.Paragraph>
                <Typography.Text type="secondary" style={{ fontSize: 13 }}>
                  原因：{item.reason}
                </Typography.Text>
                {item.messages_preview.length > 0 && (
                  <div style={{ marginTop: 8, padding: 8, background: '#fafafa', borderRadius: 6, fontSize: 13 }}>
                    {item.messages_preview.map((m, i) => (
                      <Typography.Paragraph key={i} style={{ margin: 0 }} type={m.role === 'user' ? undefined : 'secondary'}>
                        {m.role === 'user' ? '患者' : 'AI'}: {m.content}
                      </Typography.Paragraph>
                    ))}
                  </div>
                )}
              </div>
              <Button type="primary" onClick={() => claim(item.escalation_id)}>抢单接诊</Button>
            </div>
          </Card>
        ))
      )}
    </div>
  );
}
