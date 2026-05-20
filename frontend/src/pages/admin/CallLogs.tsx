import { useEffect, useState } from 'react';
import { Table, Select, Tag, Typography, message } from 'antd';
import { fetchCallLogs } from '../../api/callLogs';
import { fetchDoctors } from '../../api/doctors';
import type { CallLog, DoctorBrief } from '../../types';

export default function CallLogsPage() {
  const [logs, setLogs] = useState<CallLog[]>([]);
  const [doctors, setDoctors] = useState<DoctorBrief[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterDoctor, setFilterDoctor] = useState<number | undefined>();

  const load = () => {
    setLoading(true);
    fetchCallLogs({ page: 1, page_size: 100, doctor_id: filterDoctor })
      .then(setLogs)
      .catch((e) => message.error(e.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [filterDoctor]);
  useEffect(() => {
    fetchDoctors().then(setDoctors).catch(() => {});
  }, []);

  const columns = [
    { title: 'ID', dataIndex: 'id', width: 60 },
    {
      title: '医生', dataIndex: 'doctor_id', width: 100,
      render: (v: number) => {
        const d = doctors.find((d) => d.id === v);
        return d ? `${d.name} (${d.department})` : v || '-';
      },
    },
    { title: '接口', dataIndex: 'endpoint', width: 240, ellipsis: true },
    {
      title: '状态', dataIndex: 'status', width: 80,
      render: (v: string) => <Tag color={v === 'success' ? 'green' : 'red'}>{v === 'success' ? '成功' : '失败'}</Tag>,
    },
    {
      title: '响应耗时', dataIndex: 'response_time_ms', width: 100,
      render: (v: number) => `${v} ms`,
    },
    {
      title: '时间', dataIndex: 'created_at', width: 180,
      render: (v: string) => new Date(v).toLocaleString('zh-CN'),
    },
  ];

  return (
    <div>
      <Typography.Title level={4}>调用日志</Typography.Title>
      <div style={{ marginBottom: 16 }}>
        <Select
          allowClear
          placeholder="筛选医生"
          style={{ width: 240 }}
          options={doctors.map((d) => ({ label: `${d.name} (${d.department})`, value: d.id }))}
          onChange={(v) => setFilterDoctor(v)}
        />
      </div>
      <Table
        rowKey="id"
        columns={columns}
        dataSource={logs}
        loading={loading}
        pagination={{ pageSize: 20 }}
      />
    </div>
  );
}
