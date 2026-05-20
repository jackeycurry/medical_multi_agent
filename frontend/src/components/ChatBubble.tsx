import { Avatar, Typography } from 'antd';
import { UserOutlined, RobotOutlined } from '@ant-design/icons';

interface Props {
  role: 'user' | 'assistant';
  content: string;
}

export default function ChatBubble({ role, content }: Props) {
  const isUser = role === 'user';
  return (
    <div style={{
      display: 'flex', marginBottom: 14,
      flexDirection: isUser ? 'row-reverse' : 'row',
      gap: 10,
    }}>
      <Avatar
        size={36}
        icon={isUser ? <UserOutlined /> : <RobotOutlined />}
        style={{
          backgroundColor: isUser ? '#3B82F6' : '#00C896',
          flexShrink: 0,
          boxShadow: isUser ? '0 2px 8px rgba(59,130,246,0.2)' : '0 2px 8px rgba(0,200,150,0.2)',
        }}
      />
      <div
        style={{
          maxWidth: '72%',
          padding: '10px 16px',
          borderRadius: isUser ? '12px 12px 4px 12px' : '12px 12px 12px 4px',
          backgroundColor: isUser ? '#3B82F6' : '#F5F7FA',
          color: isUser ? '#fff' : '#1F2937',
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-word',
          fontSize: 14,
          lineHeight: 1.7,
        }}
      >
        <Typography.Text style={{ color: isUser ? '#fff' : '#1F2937' }}>{content}</Typography.Text>
      </div>
    </div>
  );
}
