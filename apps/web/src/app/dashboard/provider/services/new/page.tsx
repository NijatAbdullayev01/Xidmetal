import { api } from '@/lib/api';
import { NewServiceForm } from './new-service-form';

export default async function NewServicePage() {
  const categories = await api.categories();

  return <NewServiceForm categories={categories} />;
}
