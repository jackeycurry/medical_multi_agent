import { Card, Tag, Button, Space, Avatar, Typography, Popconfirm } from 'antd';
import {
  MessageOutlined,
  EditOutlined,
  DeleteOutlined,
} from '@ant-design/icons';
import type { DoctorBrief } from '../types';

interface Props {
  doctor: DoctorBrief;
  onChat: (id: number) => void;
  onEdit: (id: number) => void;
  onToggle?: (id: number, currentStatus: string) => void;
  onDelete: (id: number) => void;
}

const deptColors: Record<string, string> = {
  '心内科': 'red',
  '内分泌科': 'orange',
  '儿科': 'green',
  '中医科': 'cyan',
  '全科': 'blue',
  '药学': 'purple',
};

export default function DoctorCard({ doctor, onChat, onEdit, onDelete }: Props) {
  return (
    <Card
      hoverable
      actions={[
        <Button type="link" icon={<MessageOutlined />} onClick={() => onChat(doctor.id)}>
          问诊
        </Button>,
        <Button type="link" icon={<EditOutlined />} onClick={() => onEdit(doctor.id)}>
          编辑
        </Button>,
        <Popconfirm title="确认删除该医生？" onConfirm={() => onDelete(doctor.id)}>
          <Button type="link" danger icon={<DeleteOutlined />}>
            删除
          </Button>
        </Popconfirm>,
      ]}
    >
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: 12 }}>
        <Avatar size={48} style={{ backgroundColor: '#1677ff', fontSize: 22, flexShrink: 0 }}>
          {doctor.avatar_url || doctor.name[0]}
        </Avatar>
        <div style={{ marginLeft: 12, flex: 1, minWidth: 0 }}>
          <Typography.Title level={5} style={{ margin: 0 }}>
            {doctor.name}
          </Typography.Title>
          <Space>
            <Tag color={deptColors[doctor.department] || 'default'}>{doctor.department}</Tag>
            <Tag color={doctor.status === 'online' ? 'green' : doctor.status === 'busy' ? 'orange' : 'default'}>
              {doctor.status === 'online' ? '在线' : doctor.status === 'busy' ? '忙碌' : '离线'}
            </Tag>
          </Space>
        </div>
      </div>
      <Typography.Paragraph
        type="secondary"
        ellipsis={{ rows: 2 }}
        style={{ marginBottom: 8, fontSize: 13 }}
      >
        擅长：{doctor.specialty}
      </Typography.Paragraph>
      <Typography.Text type="secondary" style={{ fontSize: 12 }}>
        被调用 {doctor.call_count} 次
      </Typography.Text>
    </Card>
  );
}
