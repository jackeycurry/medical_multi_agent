import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Typography, Card, Tag, Spin, Button, Divider, message } from 'antd';
import { ArrowLeftOutlined } from '@ant-design/icons';
import ChatBubble from '../../components/ChatBubble';
import client from '../../api/client';

export default function SessionDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [detail, setDetail] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    client.get(`/hospital/sessions/${id}`)
      .then((r) => setDetail(r.data))
      .catch((e) => message.error(e.message))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <Spin size="large" style={{ display: 'block', margin: '80px auto' }} />;
  if (!detail) return null;

  return (
    <div>
      <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/hospital/sessions')} style={{ marginBottom: 16 }}>返回</Button>

      <Typography.Title level={4}>对话记录 #{detail.session_id}</Typography.Title>

      <div style={{ marginBottom: 16 }}>
        <Tag>病人：{detail.patient?.name}</Tag>
        <Tag>AI医生：{detail.ai_doctor?.name} ({detail.ai_doctor?.department})</Tag>
        {detail.real_doctor && <Tag color="green">真人医生：{detail.real_doctor.name}</Tag>}
        {detail.is_escalated && <Tag color="red">含真人接替</Tag>}
      </div>

      {detail.escalation_reason && (
        <Card size="small" style={{ marginBottom: 12, background: '#fff7e6' }}>
          <Typography.Text>接替原因：{detail.escalation_reason}</Typography.Text>
        </Card>
      )}

      <Card style={{ background: '#fafafa' }}>
        <div style={{ maxHeight: 500, overflow: 'auto' }}>
          {detail.messages?.map((msg: any, i: number) => (
            <div key={i}>
              {msg.source === 'human' && i > 0 && detail.messages[i - 1]?.source !== 'human' && (
                <Divider style={{ margin: '8px 0' }}>真人医生 {detail.real_doctor?.name} 接入</Divider>
              )}
              <ChatBubble role={msg.role} content={msg.content} />
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
