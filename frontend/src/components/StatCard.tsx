import { Card, Typography } from 'antd';
import { brand } from '../theme';

interface Props {
  title: string;
  value: number | string;
  suffix?: string;
  color?: string;
  icon?: React.ReactNode;
}

export default function StatCard({ title, value, suffix, color = brand.primary, icon }: Props) {
  return (
    <Card
      style={{ borderRadius: 12, boxShadow: brand.shadowCard }}
      styles={{ body: { padding: '18px 20px' } }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
        {icon && (
          <div style={{
            width: 44, height: 44, borderRadius: 10,
            background: `${color}14`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color, fontSize: 20, flexShrink: 0,
          }}>
            {icon}
          </div>
        )}
        <div>
          <Typography.Text type="secondary" style={{ fontSize: 13 }}>{title}</Typography.Text>
          <div style={{ fontSize: 26, fontWeight: 700, color: '#1F2937', lineHeight: '34px' }}>
            {value}
            {suffix && (
              <Typography.Text style={{ fontSize: 14, color: '#9CA3AF', marginLeft: 2, fontWeight: 400 }}>
                {suffix}
              </Typography.Text>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
}
