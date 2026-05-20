import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, Typography, Tag, Row, Col, Spin, message } from 'antd';
import { RightOutlined, MedicineBoxFilled } from '@ant-design/icons';
import { brand } from '../../theme';

interface HospitalInfo {
  id: number;
  name: string;
  code: string;
  departments: string[];
}

const deptColors: Record<string, string> = {
  '心内科': '#EF4444', '内分泌科': '#F59E0B', '儿科': '#00C896',
  '中医科': '#3B82F6', '全科': '#6366F1', '药学': '#EC4899',
};

export default function PatientHome() {
  const [hospitals, setHospitals] = useState<HospitalInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetch('/api/patient/hospitals')
      .then((r) => r.ok ? r.json() : null)
      .then((d) => { if (Array.isArray(d)) setHospitals(d); })
      .catch(() => message.error('医院列表加载失败'))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div style={{ paddingTop: 8 }}>
      <div style={{ textAlign: 'center', marginBottom: 36 }}>
        <MedicineBoxFilled style={{ fontSize: 40, color: brand.primary, marginBottom: 12 }} />
        <Typography.Title level={2} style={{ marginBottom: 8, fontWeight: 700, color: brand.text }}>
          选择医院
        </Typography.Title>
        <Typography.Text style={{ fontSize: 15, color: brand.textSecondary }}>
          选择您要就诊的医院，系统将为您智能匹配最合适的 AI 专科医生
        </Typography.Text>
      </div>

      <Spin spinning={loading}>
        <Row gutter={[20, 20]}>
          {hospitals.map((h) => (
            <Col key={h.id} xs={24} sm={12}>
              <Card
                hoverable
                onClick={() => navigate(`/patient/consult/${h.code}`)}
                style={{
                  borderRadius: 14,
                  boxShadow: brand.shadowCard,
                  border: '1px solid #F0F2F5',
                  transition: 'all 0.2s',
                }}
                styles={{ body: { padding: '22px 24px' } }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ flex: 1 }}>
                    <Typography.Title level={5} style={{ marginBottom: 10, fontWeight: 600 }}>
                      {h.name}
                    </Typography.Title>
                    <div>
                      {h.departments.map((d) => (
                        <Tag key={d} color={deptColors[d] || '#00C896'} style={{ marginBottom: 4, borderRadius: 6 }}>
                          {d}
                        </Tag>
                      ))}
                    </div>
                  </div>
                  <div style={{
                    width: 40, height: 40, borderRadius: 12,
                    background: brand.primarySoft,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    flexShrink: 0,
                  }}>
                    <RightOutlined style={{ color: brand.primary, fontSize: 16 }} />
                  </div>
                </div>
              </Card>
            </Col>
          ))}
        </Row>
      </Spin>
    </div>
  );
}
