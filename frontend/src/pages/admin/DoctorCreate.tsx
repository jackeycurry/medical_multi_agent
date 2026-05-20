import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Typography, message } from 'antd';
import DoctorForm from '../../components/DoctorForm';
import { fetchDoctor, createDoctor, updateDoctor } from '../../api/doctors';
import type { Doctor } from '../../types';

export default function DoctorCreatePage() {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const [doctor, setDoctor] = useState<Partial<Doctor> | undefined>();
  const [submitting, setSubmitting] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (id) {
      fetchDoctor(Number(id))
        .then(setDoctor)
        .catch((e) => message.error(e.message));
    }
  }, [id]);

  const handleSubmit = async (values: Partial<Doctor>) => {
    setSubmitting(true);
    try {
      if (isEdit) {
        await updateDoctor(Number(id), values);
        message.success('医生信息已更新');
      } else {
        await createDoctor(values);
        message.success('医生创建成功');
      }
      navigate('/admin');
    } catch (e: any) {
      message.error(e.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      <Typography.Title level={4} style={{ marginBottom: 24 }}>
        {isEdit ? '编辑医生' : '创建新的 AI 医生'}
      </Typography.Title>
      <DoctorForm initialValues={doctor} onSubmit={handleSubmit} loading={submitting} />
    </div>
  );
}
