import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Table, Typography, Tag, message } from 'antd';
import { EyeOutlined } from '@ant-design/icons';
import client from '../../api/client';

export default function SessionListPage() {
  const [data, setData] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const load = (p: number) => {
    setLoading(true);
    client.get('/hospital/sessions', { params: { page: p, page_size: 20 } })
      .then((r) => { setData(r.data.items || []); setTotal(r.data.total || 0); })
      .catch((e) => message.error(e.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(page); }, [page]);

  return (
    <div>
      <Typography.Title level={4}>对话记录</Typography.Title>
      <Table
        rowKey="session_id"
        loading={loading}
        dataSource={data}
        columns={[
          { title: 'ID', dataIndex: 'session_id', width: 60 },
          { title: '病人', dataIndex: 'patient_name', width: 100 },
          { title: 'AI医生', dataIndex: 'ai_doctor_name', width: 100 },
          { title: '真人医生', dataIndex: 'real_doctor_name', width: 100, render: (v: string) => v || '-' },
          { title: '症状', dataIndex: 'symptom', ellipsis: true },
          { title: '消息', dataIndex: 'message_count', width: 60 },
          { title: '接替', dataIndex: 'is_escalated', width: 60, render: (v: boolean) => v ? <Tag color="red">是</Tag> : '-' },
          { title: '时间', dataIndex: 'started_at', render: (v: string) => v?.slice?.(0, 19) || '-' },
          {
            title: '操作', width: 60,
            render: (_: any, r: any) => <a onClick={() => navigate(`/hospital/sessions/${r.session_id}`)}><EyeOutlined /></a>,
          },
        ]}
        pagination={{ current: page, total, pageSize: 20, onChange: (p) => setPage(p) }}
        size="small"
      />
    </div>
  );
}
