import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Table, Typography, message } from 'antd';
import { EyeOutlined } from '@ant-design/icons';
import client from '../../api/client';

export default function PatientListPage() {
  const [data, setData] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const load = (p: number) => {
    setLoading(true);
    client.get('/hospital/patients', { params: { page: p, page_size: 20 } })
      .then((r) => { setData(r.data.items || []); setTotal(r.data.total || 0); })
      .catch((e) => message.error(e.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(page); }, [page]);

  return (
    <div>
      <Typography.Title level={4}>病人管理</Typography.Title>
      <Table
        rowKey="id"
        loading={loading}
        dataSource={data}
        columns={[
          { title: '姓名', dataIndex: 'name', width: 100 },
          { title: '手机', dataIndex: 'phone', width: 130 },
          { title: '会话数', dataIndex: 'session_count', width: 80 },
          { title: '接替次数', dataIndex: 'escalation_count', width: 80 },
          { title: '最近症状', dataIndex: 'last_symptom', ellipsis: true },
          { title: '最近时间', dataIndex: 'last_session_time', render: (v: string) => v?.slice?.(0, 19) || '-' },
          {
            title: '操作', width: 80,
            render: (_: any, record: any) => <a onClick={() => navigate(`/hospital/patients/${record.id}`)}><EyeOutlined /> 查看</a>,
          },
        ]}
        pagination={{ current: page, total, pageSize: 20, onChange: (p) => setPage(p) }}
        size="small"
      />
    </div>
  );
}
