import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Typography, Tag, Avatar, Spin, Button, message, Alert } from 'antd';
import { ArrowLeftOutlined } from '@ant-design/icons';
import ChatBubble from '../../components/ChatBubble';
import ChatInput from '../../components/ChatInput';
import { fetchDoctor } from '../../api/doctors';
import { startConsultation, sendMessage, fetchMessages } from '../../api/consultations';
import type { Doctor, Message } from '../../types';

export default function DoctorChatPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [doctor, setDoctor] = useState<Doctor | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [sessionId, setSessionId] = useState<number | null>(null);
  const [sending, setSending] = useState(false);
  const [initializing, setInitializing] = useState(true);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!id) return;
    fetchDoctor(Number(id))
      .then((d) => {
        setDoctor(d);
        return startConsultation(d.id, '');
      })
      .then((res) => {
        setSessionId(res.session_id);
        return fetchMessages(res.session_id);
      })
      .then((msgs) => setMessages(msgs))
      .catch((e) => message.error(e.message))
      .finally(() => setInitializing(false));
  }, [id]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async (text: string) => {
    if (!sessionId) return;
    setSending(true);
    setMessages((prev) => [...prev, { id: 0, session_id: sessionId, role: 'user', content: text, created_at: new Date().toISOString() }]);
    try {
      const res = await sendMessage(sessionId, text);
      setMessages((prev) => [...prev, { id: 0, session_id: sessionId, role: 'assistant', content: res.reply, created_at: new Date().toISOString() }]);
    } catch (e: any) {
      message.error(e.message);
    } finally {
      setSending(false);
    }
  };

  if (initializing) return <Spin size="large" style={{ display: 'block', margin: '120px auto' }} />;
  if (!doctor) return <Alert type="error" title="医生不存在" showIcon />;

  const deptColors: Record<string, string> = {
    '心内科': 'red', '内分泌科': 'orange', '儿科': 'green', '中医科': 'cyan', '全科': 'blue', '药学': 'purple',
  };

  return (
    <div style={{ maxWidth: 800, margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: 16, gap: 12 }}>
        <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/admin')}>返回</Button>
        <Avatar size={40}>{doctor.avatar_url || doctor.name[0]}</Avatar>
        <div>
          <Typography.Title level={5} style={{ margin: 0 }}>{doctor.name}</Typography.Title>
          <Tag color={deptColors[doctor.department]}>{doctor.department}</Tag>
          <Tag color="green">在线</Tag>
        </div>
      </div>

      <Alert
        type="warning"
        title="AI 医生问诊仅供参考，不构成医疗建议。如有紧急症状请立即就医。"
        showIcon
        style={{ marginBottom: 12 }}
        closable
      />

      <div style={{ border: '1px solid #f0f0f0', borderRadius: 8, padding: '16px 20px', minHeight: 400, maxHeight: 500, overflow: 'auto', background: '#fafafa' }}>
        {messages.map((msg, i) => (
          <ChatBubble key={i} role={msg.role as 'user' | 'assistant'} content={msg.content} />
        ))}
        {sending && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
            <Avatar size={36} style={{ backgroundColor: '#52c41a' }} />
            <Spin size="small" />
            <Typography.Text type="secondary">医生正在输入...</Typography.Text>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <ChatInput onSend={handleSend} disabled={sending} />
    </div>
  );
}
