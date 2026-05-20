import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Typography, Button, Card, message, Spin, Alert, Row, Col, Divider, Popconfirm } from 'antd';
import { ArrowLeftOutlined, CheckCircleOutlined } from '@ant-design/icons';
import ChatBubble from '../../components/ChatBubble';
import ChatInput from '../../components/ChatInput';
import client from '../../api/client';

export default function DoctorSessionPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [detail, setDetail] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [resolving, setResolving] = useState(false);
  const [aiSuggestion, setAiSuggestion] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);

  const load = () => {
    client.get(`/doctor/sessions/${id}`)
      .then((r) => { setDetail(r.data); setAiSuggestion(r.data.ai_suggestion || ''); })
      .catch((e) => message.error(e.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [id]);
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [detail?.messages]);

  // 接诊进行中时用长轮询接收新消息（服务端 hold 至多 25s）
  const lastMsgIdRef = useRef(0);
  useEffect(() => {
    if (!detail || !detail.escalation || detail.escalation.status !== 'in_progress') return;
    // 初次：用当前 detail 的最后 id 初始化
    lastMsgIdRef.current = detail.messages?.length
      ? Math.max(...detail.messages.map((m: any) => m.id || 0))
      : 0;
    const ctrl = new AbortController();
    let stopped = false;

    (async () => {
      while (!stopped) {
        try {
          const token = localStorage.getItem('token');
          const url = `/api/doctor/sessions/${id}/wait?after_id=${lastMsgIdRef.current}&wait=25`;
          const res = await fetch(url, {
            signal: ctrl.signal,
            headers: token ? { Authorization: `Bearer ${token}` } : {},
          });
          if (!res.ok) { await new Promise(r => setTimeout(r, 2000)); continue; }
          const payload: { messages: any[] } = await res.json();
          if (payload.messages && payload.messages.length > 0) {
            const newLast = Math.max(...payload.messages.map((m: any) => m.id || 0));
            if (newLast > lastMsgIdRef.current) lastMsgIdRef.current = newLast;
            let appended = false;
            setDetail((prev: any) => {
              if (!prev) return prev;
              const seen = new Set((prev.messages || []).map((m: any) => m.id).filter((x: any) => typeof x === 'number'));
              const toAppend = payload.messages.filter((m: any) => !seen.has(m.id));
              if (toAppend.length === 0) return prev;
              appended = true;
              return { ...prev, messages: [...(prev.messages || []), ...toAppend] };
            });
            if (appended) refreshSuggestion();
          }
        } catch (e: any) {
          if (e?.name === 'AbortError') return;
          await new Promise(r => setTimeout(r, 2000));
        }
      }
    })();

    return () => { stopped = true; ctrl.abort(); };
  }, [detail?.escalation?.status, id]);

  const handleSend = async (text: string) => {
    setSending(true);
    try {
      const r = await client.post(`/doctor/sessions/${id}/reply`, { content: text });
      // reply 已不再返回 ai_suggestion；用服务端返回的最新 messages 替换本地
      setDetail((prev: any) => prev ? { ...prev, messages: r.data.messages } : prev);
      const msgs = r.data.messages as any[];
      if (msgs?.length) {
        lastMsgIdRef.current = Math.max(...msgs.map(m => m.id || 0));
      }
      message.success('回复已发送');
    } catch (e: any) {
      message.error(e.message);
    } finally {
      setSending(false);
    }

    // 异步刷新 AI 建议（不阻塞 UI）
    refreshSuggestion();
  };

  const refreshSuggestion = async () => {
    try {
      const r = await client.get(`/doctor/sessions/${id}/suggestion`);
      if (r.data.ai_suggestion) setAiSuggestion(r.data.ai_suggestion);
    } catch { /* 忽略 */ }
  };

  const handleResolve = async () => {
    setResolving(true);
    try {
      await client.post(`/doctor/sessions/${id}/resolve`);
      message.success('已结束本次接诊');
      navigate('/doctor');
    } catch (e: any) {
      message.error(e.message);
    } finally {
      setResolving(false);
    }
  };

  const applySuggestion = () => {
    // 不做 setReply——ChatInput 不受控。改为提示用户
    message.info('AI 建议仅作参考，请根据您的专业判断回复。可选中并复制建议内容。');
  };

  if (loading) return <Spin size="large" style={{ display: 'block', margin: '120px auto' }} />;
  if (!detail) return <Alert type="error" title="会话不存在" showIcon />;

  const isActive = detail.escalation?.status === 'in_progress';

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/doctor')}>返回</Button>
          <Typography.Title level={5} style={{ margin: 0 }}>
            {detail.patient_name}　|　{detail.doctor_name}
          </Typography.Title>
        </div>
        {isActive && (
          <Popconfirm title="确认结束本次接诊？结束后将无法继续回复。" onConfirm={handleResolve}>
            <Button type="primary" danger icon={<CheckCircleOutlined />} loading={resolving}>
              结束接诊
            </Button>
          </Popconfirm>
        )}
      </div>

      {!isActive && detail.escalation?.status !== 'pending' && (
        <Alert type="success" title="本次接诊已结束" showIcon style={{ marginBottom: 12 }} />
      )}

      <Alert
        type="warning"
        title="请根据您的专业判断审核 AI 建议后再回复病人。AI 建议仅作参考。"
        showIcon
        style={{ marginBottom: 12 }}
      />

      <Row gutter={24}>
        <Col span={16}>
          <Card title="对话记录" size="small" style={{ marginBottom: 12 }}>
            <div style={{ maxHeight: 400, overflow: 'auto', padding: 8, background: '#fafafa', borderRadius: 6 }}>
              {detail.messages?.map((msg: any, i: number) => (
                <div key={i}>
                  {msg.source === 'human' && i > 0 && detail.messages[i - 1]?.source !== 'human' && (
                    <Divider style={{ margin: '8px 0' }}>真人医生 接入</Divider>
                  )}
                  <ChatBubble role={msg.role} content={msg.content} />
                </div>
              ))}
              <div ref={bottomRef} />
            </div>
          </Card>

          {isActive && (
            <Card size="small">
              <ChatInput onSend={handleSend} disabled={sending} />
            </Card>
          )}
        </Col>

        <Col span={8}>
          <Card title="AI 建议回复" size="small" style={{ position: 'sticky', top: 24 }}>
            <div style={{ whiteSpace: 'pre-wrap', fontSize: 13, lineHeight: 1.8, maxHeight: 520, overflow: 'auto' }}>
              {aiSuggestion || '暂无 AI 建议'}
            </div>
            <Divider style={{ margin: '12px 0' }} />
            <Button block onClick={applySuggestion} disabled={!aiSuggestion}>
              查看建议（请手动复制使用）
            </Button>
          </Card>
        </Col>
      </Row>
    </div>
  );
}
