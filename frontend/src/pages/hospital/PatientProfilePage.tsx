import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Typography, Card, Row, Col, Descriptions, Timeline, Tag, Button, Spin, message } from 'antd';
import { ArrowLeftOutlined } from '@ant-design/icons';
import client from '../../api/client';

export default function PatientProfilePage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    client.get(`/hospital/patients/${id}/profile`)
      .then((r) => setProfile(r.data))
      .catch((e) => message.error(e.message))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <Spin size="large" style={{ display: 'block', margin: '80px auto' }} />;
  if (!profile) return null;

  return (
    <div>
      <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/hospital/patients')} style={{ marginBottom: 16 }}>返回</Button>
      <Typography.Title level={4}>{profile.name} 的画像</Typography.Title>

      <Row gutter={[16, 16]}>
        <Col span={8}>
          <Card title="基本信息" size="small">
            <Descriptions column={1} size="small">
              <Descriptions.Item label="姓名">{profile.name}</Descriptions.Item>
              <Descriptions.Item label="手机">{profile.phone}</Descriptions.Item>
              <Descriptions.Item label="注册时间">{profile.registered_at}</Descriptions.Item>
              <Descriptions.Item label="总会话">{profile.stats?.total_sessions} 次</Descriptions.Item>
              <Descriptions.Item label="真人接替">{profile.stats?.escalation_count} 次</Descriptions.Item>
            </Descriptions>
          </Card>
        </Col>
        <Col span={8}>
          <Card title="数据标签" size="small">
            {(profile.tags || []).length === 0 ? <Typography.Text type="secondary">暂无标签</Typography.Text> : (
              profile.tags.map((t: any, i: number) => (
                <Tag key={i}>{t.name}</Tag>
              ))
            )}
          </Card>
          <Card title="常见症状" size="small" style={{ marginTop: 12 }}>
            {(profile.stats?.common_symptoms || []).map((s: string, i: number) => (
              <Tag key={i} color="blue">{s}</Tag>
            ))}
            {(profile.stats?.common_symptoms || []).length === 0 && <Typography.Text type="secondary">暂无</Typography.Text>}
          </Card>
        </Col>
        <Col span={8}>
          <Card title="健康时间线" size="small">
            <Timeline items={(profile.timeline || []).map((t: any) => ({
              color: t.escalated ? 'red' : 'green',
              children: (
                <div>
                  <Typography.Text strong>{t.date}</Typography.Text>
                  <br />
                  <Typography.Text type="secondary">{t.detail}</Typography.Text>
                  {t.escalated && <Tag color="red" style={{ marginLeft: 4 }}>真人接替</Tag>}
                </div>
              ),
            }))} />
          </Card>
        </Col>
      </Row>
    </div>
  );
}
