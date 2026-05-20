import { Form, Input, Select, Button, Card, Row, Col, Avatar, Tag, Typography } from 'antd';
import type { Doctor } from '../types';

interface Props {
  initialValues?: Partial<Doctor>;
  onSubmit: (values: Partial<Doctor>) => void;
  loading?: boolean;
}

const departments = ['心内科', '内分泌科', '儿科', '中医科', '全科', '药学'];

const deptColors: Record<string, string> = {
  '心内科': 'red',
  '内分泌科': 'orange',
  '儿科': 'green',
  '中医科': 'cyan',
  '全科': 'blue',
  '药学': 'purple',
};

export default function DoctorForm({ initialValues, onSubmit, loading }: Props) {
  const [form] = Form.useForm();
  const watchName = Form.useWatch('name', form);
  const watchDept = Form.useWatch('department', form);
  const watchAvatar = Form.useWatch('avatar_url', form);
  const watchSpecialty = Form.useWatch('specialty', form);

  return (
    <Row gutter={24}>
      <Col span={16}>
        <Form
          form={form}
          layout="vertical"
          initialValues={initialValues}
          onFinish={onSubmit}
        >
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="name" label="医生姓名" rules={[{ required: true, message: '请输入姓名' }]}>
                <Input placeholder="如：李主任" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="department" label="科室" rules={[{ required: true, message: '请选择科室' }]}>
                <Select options={departments.map((d) => ({ label: d, value: d }))} placeholder="选择科室" />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item name="avatar_url" label="头像（Emoji 或 URL）">
            <Input placeholder="如：🫀 或 https://..." />
          </Form.Item>
          <Form.Item name="specialty" label="擅长领域" rules={[{ required: true, message: '请输入擅长领域' }]}>
            <Input.TextArea rows={2} placeholder="如：冠心病、高血压、心律失常" />
          </Form.Item>
          <Form.Item name="personality" label="性格特点">
            <Input.TextArea rows={2} placeholder="如：严谨学术型，引用医学指南" />
          </Form.Item>
          <Form.Item
            name="system_prompt"
            label="系统提示词"
            rules={[{ required: true, message: '请输入系统提示词' }]}
            extra="这段提示词决定 AI 医生的问诊风格和专业能力"
          >
            <Input.TextArea rows={10} style={{ fontFamily: 'monospace', fontSize: 13 }} />
          </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit" loading={loading} size="large">
              {initialValues ? '保存修改' : '创建医生'}
            </Button>
          </Form.Item>
        </Form>
      </Col>
      <Col span={8}>
        <Card title="医生预览" style={{ position: 'sticky', top: 24 }}>
          <div style={{ textAlign: 'center', marginBottom: 12 }}>
            <Avatar size={64} style={{ backgroundColor: '#1677ff', fontSize: 28 }}>
              {watchAvatar || (watchName || '医')[0]}
            </Avatar>
          </div>
          <Typography.Title level={5} style={{ textAlign: 'center' }}>
            {watchName || '医生姓名'}
          </Typography.Title>
          <div style={{ textAlign: 'center', marginBottom: 8 }}>
            {watchDept && <Tag color={deptColors[watchDept] || 'default'}>{watchDept}</Tag>}
            <Tag color="green">在线</Tag>
          </div>
          {watchSpecialty && (
            <Typography.Paragraph type="secondary" style={{ fontSize: 13 }}>
              擅长：{watchSpecialty}
            </Typography.Paragraph>
          )}
        </Card>
      </Col>
    </Row>
  );
}
