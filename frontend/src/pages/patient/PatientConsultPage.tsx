import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Typography, Tag, Avatar, Spin, Button, message, Alert } from 'antd';
import { ArrowLeftOutlined } from '@ant-design/icons';
import ChatBubble from '../../components/ChatBubble';
import ChatInput from '../../components/ChatInput';
import client from '../../api/client';

function authHeaders(extra?: Record<string, string>) {
  const token = localStorage.getItem('token');
  return {
    ...(extra || {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

const deptColors: Record<string, string> = {
  '心内科': '#e74c3c', '内分泌科': '#e67e22', '儿科': '#27ae60',
  '中医科': '#2ecc71', '全科': '#2980b9', '药学': '#8e44ad',
};

const deptIcons: Record<string, string> = {
  '心内科': '❤', '内分泌科': '⚗', '儿科': '👶', '中医科': '🌿', '全科': '🩺', '药学': '💊',
};

export default function PatientConsultPage() {
  const { code } = useParams();
  const navigate = useNavigate();
  const [symptom, setSymptom] = useState('');
  const [sessionId, setSessionId] = useState<number | null>(null);
  const [doctor, setDoctor] = useState<{ id: number; name: string; department: string } | null>(null);
  const [messages, setMessages] = useState<{ id?: number; role: string; content: string }[]>([]);
  const [sending, setSending] = useState(false);
  const [escalate, setEscalate] = useState<{ id: number; status: string; queue_position: number; assigned_doctor?: any } | null>(null);
  const [started, setStarted] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  const startConsult = async (s: string) => {
    setStarted(true);
    try {
      const r = await client.post('/patient/consultations/start', { hospital_code: code, symptom: s });
      setSessionId(r.data.session_id);
      setDoctor(r.data.doctor);
      setMessages([{ role: 'assistant', content: r.data.greeting }]);
    } catch (e: any) {
      message.error(e.message);
      setStarted(false);
    }
  };

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const handleSend = async (text: string) => {
    if (!sessionId) return;
    setSending(true);
    setMessages((prev) => [...prev, { role: 'user', content: text }, { role: 'assistant', content: '' }]);
    try {
      const res = await fetch(`/api/patient/consultations/${sessionId}/message`, {
        method: 'POST',
        headers: authHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ content: text }),
      });
      if (!res.ok || !res.body) {
        let detail = 'AI 响应失败';
        try { detail = (await res.json()).detail || detail; } catch {}
        throw new Error(detail);
      }

      // 真人医生在线时返回 JSON，其余返回 SSE 流
      const contentType = res.headers.get('content-type') || '';
      if (contentType.includes('application/json')) {
        const data = await res.json();
        setMessages((prev) => { const copy = prev.slice(); copy[copy.length - 1] = { role: 'assistant', content: data.reply }; return copy; });
      } else {
        const reader = res.body.getReader();
        const decoder = new TextDecoder('utf-8');
        let buffer = '';
        let streamError: string | null = null;

        const appendDelta = (delta: string) => {
          setMessages((prev) => {
            const copy = prev.slice();
            const last = copy[copy.length - 1];
            if (last && last.role === 'assistant') {
              copy[copy.length - 1] = { ...last, content: last.content + delta };
            }
            return copy;
          });
        };

        while (true) {
          const { value, done } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const frames = buffer.split('\n\n');
          buffer = frames.pop() || '';
          for (const frame of frames) {
            const line = frame.replace(/^data:\s?/, '').trim();
            if (!line) continue;
            try {
              const obj = JSON.parse(line);
              if (obj.error) { streamError = obj.error; break; }
              if (obj.delta) appendDelta(obj.delta);
            } catch { /* 忽略残帧 */ }
          }
          if (streamError) break;
        }

        if (streamError) throw new Error(streamError);
      }
    } catch (e: any) {
      message.error(e.message);
      setMessages((prev) => prev.slice(0, -1));
    } finally {
      setSending(false);
    }

    // 用服务端全量结果替换本地，确保所有消息都带 id（供长轮询去重）
    try {
      const r = await client.get(`/patient/consultations/${sessionId}/messages`);
      const all = r.data as { id: number; role: string; content: string; source?: string }[];
      if (all.length > 0) {
        lastMsgIdRef.current = Math.max(lastMsgIdRef.current, all[all.length - 1].id);
        setMessages(all.map(m => ({
          id: m.id,
          role: m.role,
          content: m.source === 'human' ? `【真人医生】${m.content}` : m.content,
        })));
      }
    } catch { /* 忽略 */ }
  };

  const requestEscalate = async () => {
    if (!sessionId) return;
    try {
      const r = await client.post(`/patient/consultations/${sessionId}/escalate`, { reason: '需要真人医生进一步确认' });
      const data = r.data;
      const m = /第\s*(\d+)\s*位/.exec(data.message || '');
      setEscalate({ id: data.escalation_id, status: data.status, queue_position: m ? Number(m[1]) : 1 });
      message.info(data.message);
      pollEscalation();
    } catch (e: any) {
      message.error(e.message);
    }
  };

  const pollEscalation = () => {
    const timer = setInterval(async () => {
      if (!sessionId) { clearInterval(timer); return; }
      try {
        const r = await client.get(`/patient/consultations/${sessionId}/escalation-status`);
        if (r.data.status === 'in_progress' || r.data.status === 'resolved') {
          setEscalate(r.data);
          clearInterval(timer);
        }
      } catch { /* 静默忽略瞬时错误 */ }
    }, 3000);
    setTimeout(() => clearInterval(timer), 300000);
  };

  // 真人医生接入后，用长轮询接收医生回复（服务端 hold 至多 25s，有新消息立即返回）
  const lastMsgIdRef = useRef(0);
  useEffect(() => {
    if (!sessionId || !escalate || escalate.status !== 'in_progress') return;
    const ctrl = new AbortController();
    let stopped = false;

    // 首次：拉取全量，建立 lastMsgId 基准
    (async () => {
      try {
        const r = await client.get(`/patient/consultations/${sessionId}/messages`);
        const serverMsgs: { id: number; role: string; content: string; source?: string }[] = r.data;
        if (serverMsgs.length > 0) {
          lastMsgIdRef.current = serverMsgs[serverMsgs.length - 1].id;
          setMessages(serverMsgs.map(m => ({
            id: m.id,
            role: m.role,
            content: m.source === 'human' ? `【真人医生】${m.content}` : m.content,
          })));
        }
      } catch { /* 静默忽略 */ }

      // 进入长轮询循环
      while (!stopped) {
        try {
          const token = localStorage.getItem('token');
          const url = `/api/patient/consultations/${sessionId}/messages?after_id=${lastMsgIdRef.current}&wait=25`;
          const res = await fetch(url, {
            signal: ctrl.signal,
            headers: token ? { Authorization: `Bearer ${token}` } : {},
          });
          if (!res.ok) { await new Promise(r => setTimeout(r, 2000)); continue; }
          const newMsgs: { id: number; role: string; content: string; source?: string }[] = await res.json();
          if (newMsgs.length > 0) {
            lastMsgIdRef.current = newMsgs[newMsgs.length - 1].id;
            setMessages(prev => {
              const seen = new Set(prev.map(m => m.id).filter((x): x is number => typeof x === 'number'));
              const toAppend = newMsgs.filter(m => !seen.has(m.id));
              if (toAppend.length === 0) return prev;
              return [
                ...prev,
                ...toAppend.map(m => ({
                  id: m.id,
                  role: m.role,
                  content: m.source === 'human' ? `【真人医生】${m.content}` : m.content,
                })),
              ];
            });
          }
        } catch (e: any) {
          if (e?.name === 'AbortError') return;
          await new Promise(r => setTimeout(r, 2000));
        }
      }
    })();

    return () => { stopped = true; ctrl.abort(); };
  }, [sessionId, escalate?.status]);

  const handleSymptomSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (symptom.trim()) startConsult(symptom.trim());
  };

  // 未开始——输入症状
  if (!started) {
    return (
      <div style={{ textAlign: 'center', paddingTop: 60 }}>
        <Typography.Title level={3}>描述您的症状</Typography.Title>
        <Typography.Paragraph type="secondary">
          系统将为您匹配最合适的 AI 专科医生
        </Typography.Paragraph>
        <form onSubmit={handleSymptomSubmit} style={{ maxWidth: 500, margin: '24px auto' }}>
          <textarea
            value={symptom}
            onChange={(e) => setSymptom(e.target.value)}
            placeholder="例：最近总觉得胸闷，爬楼梯喘得厉害..."
            rows={4}
            style={{
              width: '100%', padding: '12px 16px', fontSize: 15, borderRadius: 8,
              border: '1px solid #d9d9d9', resize: 'vertical', fontFamily: 'inherit',
            }}
          />
          <Button type="primary" size="large" htmlType="submit" block style={{ marginTop: 12 }}
                  disabled={!symptom.trim()}>
            开始 AI 问诊
          </Button>
        </form>
      </div>
    );
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: 12, gap: 12 }}>
        <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/patient')}>返回</Button>
        {doctor && (
          <>
            <Avatar size={36} style={{ backgroundColor: deptColors[doctor.department] || '#666', flexShrink: 0 }}>
              {deptIcons[doctor.department] || '医'}
            </Avatar>
            <div>
              <Typography.Text strong>{doctor.name}</Typography.Text>
              <br />
              <Tag color={deptColors[doctor.department]}>{doctor.department}</Tag>
            </div>
          </>
        )}
        <div style={{ flex: 1 }} />
        {escalate ? (
          escalate.status === 'pending' ? (
            <Tag color="orange">排队中 (第{escalate.queue_position || '?'}位)</Tag>
          ) : escalate.assigned_doctor ? (
            <Tag color="green">真人医生已接入：{escalate.assigned_doctor.name}</Tag>
          ) : null
        ) : (
          <Button onClick={requestEscalate} type="default" size="small">
            请求真人医生
          </Button>
        )}
      </div>

      <Alert type="warning" title="AI 问诊仅供参考，不构成医疗建议。如有紧急症状请立即就医。" showIcon style={{ marginBottom: 12 }} closable />

      {escalate?.assigned_doctor && (
        <Alert type="success" title={`真人医生 ${escalate.assigned_doctor.name}（${escalate.assigned_doctor.specialty}）已接入`} showIcon style={{ marginBottom: 12 }} />
      )}

      <div style={{ border: '1px solid #f0f0f0', borderRadius: 8, padding: '16px 20px', minHeight: 380, maxHeight: 480, overflow: 'auto', background: '#fafafa', marginBottom: 12 }}>
        {messages.map((msg, i) => (
          <ChatBubble key={i} role={msg.role as 'user' | 'assistant'} content={msg.content} />
        ))}
        {sending && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Spin size="small" /><Typography.Text type="secondary">医生回复中...</Typography.Text>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <ChatInput onSend={handleSend} disabled={sending} />
    </div>
  );
}
