import { api } from '@/lib/api';
import { EditServiceForm } from './edit-service-form';

interface EditServicePageProps {
  params: Promise<{ id: string }>;
}

export default async function EditServicePage({ params }: EditServicePageProps) {
  const { id } = await params;
  const categories = await api.categories();

  return <EditServiceForm serviceId={id} categories={categories} />;
}
