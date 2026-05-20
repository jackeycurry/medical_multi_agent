import { useState } from 'react';
import { Steps, Button, Input, Select, Typography, Card, Space, message, Spin, Alert, Divider, Table, Tag } from 'antd';
import { ApiOutlined, CheckCircleOutlined, BookOutlined, LinkOutlined } from '@ant-design/icons';
import ChatBubble from '../../components/ChatBubble';
import type { DoctorBrief } from '../../types';

export default function ApiDemoPage() {
  const [step, setStep] = useState(0);
  const [apiKey, setApiKey] = useState('');
  const [symptom, setSymptom] = useState('');
  const [department, setDepartment] = useState('');
  const [loading, setLoading] = useState(false);
  const [matchedDoctor, setMatchedDoctor] = useState<DoctorBrief | null>(null);
  const [messages, setMessages] = useState<{ role: string; content: string }[]>([]);
  const [sessionId, setSessionId] = useState<number | null>(null);
  const [sending, setSending] = useState(false);
  const [input, setInput] = useState('');

  const handleMatch = async () => {
    if (!apiKey.trim()) { message.warning('请先输入 X-API-Key'); return; }
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (symptom) params.set('symptom', symptom);
      if (department) params.set('department', department);
      const res = await fetch(`/api/v1/consultations?${params.toString()}`, {
        method: 'POST',
        headers: { 'X-API-Key': apiKey.trim() },
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || '请求失败');
      }
      const data = await res.json();
      setMatchedDoctor(data.doctor);
      setSessionId(data.session_id);
      setMessages([{ role: 'assistant', content: data.greeting }]);
      setStep(1);
    } catch (e: any) {
      message.error(e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSend = async () => {
    if (!input.trim() || !sessionId) return;
    const text = input.trim();
    setInput('');
    setMessages((prev) => [...prev, { role: 'user', content: text }]);
    setSending(true);
    try {
      const res = await fetch(`/api/v1/consultations/${sessionId}/message?content=${encodeURIComponent(text)}`, {
        method: 'POST',
        headers: { 'X-API-Key': apiKey.trim() },
      });
      if (!res.ok) throw new Error((await res.json()).detail || '请求失败');
      const data = await res.json();
      setMessages((prev) => [...prev, { role: 'assistant', content: data.reply }]);
    } catch (e: any) {
      message.error(e.message);
    } finally {
      setSending(false);
    }
  };

  return (
    <div style={{ maxWidth: 900, margin: '0 auto' }}>
      <Typography.Title level={4}>开放接口调用演示</Typography.Title>
      <Typography.Paragraph type="secondary">
        此页面模拟第三方应用通过标准 RESTful API 接入 AI 医生系统的完整流程。
      </Typography.Paragraph>

      <Alert
        type="info"
        showIcon
        icon={<BookOutlined />}
        title="完整 API 文档"
        description={
          <span>
            可交互的 Swagger 文档请访问{' '}
            <a href="/docs" target="_blank" rel="noreferrer">
              /docs <LinkOutlined />
            </a>
            {' '}或 Redoc 格式{' '}
            <a href="/redoc" target="_blank" rel="noreferrer">
              /redoc <LinkOutlined />
            </a>
          </span>
        }
        style={{ marginBottom: 16 }}
      />

      <Card title="对外接口一览（/api/v1）" style={{ marginBottom: 24 }}>
        <Table
          rowKey="path"
          pagination={false}
          size="small"
          dataSource={[
            { method: 'GET', path: '/api/v1/doctors', desc: '获取所有可用医生列表', body: '-' },
            { method: 'POST', path: '/api/v1/consultations', desc: '发起问诊（自动匹配医生）', body: 'symptom, department?, doctor_id?, patient_name?' },
            { method: 'POST', path: '/api/v1/consultations/{id}/message', desc: '向已有会话发送消息', body: 'content' },
            { method: 'GET', path: '/api/v1/consultations/{id}', desc: '获取会话详情及消息记录', body: '-' },
          ]}
          columns={[
            { title: '方法', dataIndex: 'method', width: 70, render: (v: string) => <Tag color={v === 'GET' ? 'green' : 'blue'}>{v}</Tag> },
            { title: '路径', dataIndex: 'path', width: 260, render: (v: string) => <code style={{ fontSize: 13 }}>{v}</code> },
            { title: '说明', dataIndex: 'desc' },
            { title: '参数', dataIndex: 'body', render: (v: string) => v === '-' ? <Typography.Text type="secondary">-</Typography.Text> : <code style={{ fontSize: 12 }}>{v}</code> },
          ]}
        />
        <Divider style={{ margin: '16px 0 0' }} />
        <Typography.Text type="secondary" style={{ fontSize: 13 }}>
          完整的管理后台 API（/api/*）请在 <a href="/docs" target="_blank" rel="noreferrer">Swagger 文档</a> 中查看和测试。所有接口均返回 JSON。
        </Typography.Text>
      </Card>

      <Typography.Title level={5}>交互式调用演示</Typography.Title>

      <Card size="small" style={{ marginBottom: 16, background: '#fffbe6', borderColor: '#ffe58f' }}>
        <Space direction="vertical" style={{ width: '100%' }}>
          <Typography.Text strong style={{ fontSize: 13 }}>
            第三方接入鉴权：所有 /api/v1/* 接口需要在请求头中携带 <code>X-API-Key</code>
          </Typography.Text>
          <Input.Password
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder="粘贴你的 X-API-Key（见 backend/.env 中 EXTERNAL_API_KEYS）"
            style={{ maxWidth: 520 }}
            size="small"
          />
          <Typography.Text type="secondary" style={{ fontSize: 12 }}>
            此页面模拟第三方调用，演示标准 RESTful API 接入流程
          </Typography.Text>
        </Space>
      </Card>

      <Divider />

      <Steps
        current={step}
        style={{ marginBottom: 32 }}
        items={[
          { title: '输入症状', content: '选择科室或描述症状' },
          { title: '自动匹配', content: '系统分配医生并开始问诊' },
          { title: '对话交互', content: '持续多轮问诊对话' },
        ]}
      />

      {step === 0 && (
        <Card style={{ maxWidth: 600, margin: '0 auto' }}>
          <Space orientation="vertical" size="large" style={{ width: '100%' }}>
            <div>
              <Typography.Text strong>症状描述</Typography.Text>
              <Input.TextArea
                rows={3}
                value={symptom}
                onChange={(e) => setSymptom(e.target.value)}
                placeholder="如：最近总觉得胸闷，爬楼梯喘得厉害"
                style={{ marginTop: 8 }}
              />
            </div>
            <div>
              <Typography.Text strong>目标科室（可选）</Typography.Text>
              <Select
                allowClear
                style={{ width: '100%', marginTop: 8 }}
                placeholder="不选则自动匹配"
                value={department || undefined}
                onChange={(v) => setDepartment(v || '')}
                options={['心内科', '内分泌科', '儿科', '中医科', '全科', '药学'].map((d) => ({ label: d, value: d }))}
              />
            </div>
            <Button type="primary" size="large" block loading={loading} onClick={handleMatch}>
              <ApiOutlined /> 调用 API 匹配医生
            </Button>

            <Card size="small" style={{ background: '#f5f5f5', fontFamily: 'monospace', fontSize: 13 }}>
              <Typography.Text type="secondary">
                POST /api/v1/consultations<br />
                {'{'} "symptom": "{symptom || '...'}", "department": "{department || '...'}" {'}'}<br />
              </Typography.Text>
            </Card>
          </Space>
        </Card>
      )}

      {step >= 1 && matchedDoctor && (
        <div style={{ maxWidth: 700, margin: '0 auto' }}>
          <Alert
            type="success"
            title={
              <span>
                已自动匹配医生：<strong>{matchedDoctor.name}</strong>（{matchedDoctor.department}）
                &nbsp;&mdash;&nbsp;{matchedDoctor.specialty}
              </span>
            }
            icon={<CheckCircleOutlined />}
            showIcon
            style={{ marginBottom: 16 }}
            action={
              <Button size="small" onClick={() => { setStep(0); setMessages([]); setMatchedDoctor(null); setSessionId(null); }}>
                重新匹配
              </Button>
            }
          />

          <div style={{ border: '1px solid #f0f0f0', borderRadius: 8, padding: '16px 20px', minHeight: 350, maxHeight: 450, overflow: 'auto', background: '#fafafa', marginBottom: 12 }}>
            {messages.map((msg, i) => (
              <ChatBubble key={i} role={msg.role as 'user' | 'assistant'} content={msg.content} />
            ))}
            {sending && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Spin size="small" /><Typography.Text type="secondary">AI 医生回复中...</Typography.Text>
              </div>
            )}
          </div>

          <div style={{ display: 'flex', gap: 8 }}>
            <Input.TextArea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onPressEnter={(e) => { if (!e.shiftKey) { e.preventDefault(); handleSend(); } }}
              rows={2}
              placeholder="输入您的问题..."
              disabled={sending}
              style={{ flex: 1 }}
            />
            <Button type="primary" onClick={handleSend} disabled={!input.trim() || sending} style={{ height: 'auto' }}>
              发送
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
