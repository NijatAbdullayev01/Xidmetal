import { EditServiceForm } from './edit-service-form';

interface EditServicePageProps {
  params: Promise<{ id: string }>;
}

export default async function EditServicePage({ params }: EditServicePageProps) {
  const { id } = await params;

  return <EditServiceForm serviceId={id} />;
}
