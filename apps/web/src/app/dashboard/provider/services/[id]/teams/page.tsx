import { ServiceTeamsPage } from './service-teams-page';

interface ServiceTeamsRouteProps {
  params: Promise<{ id: string }>;
}

export default async function ServiceTeamsRoute({ params }: ServiceTeamsRouteProps) {
  const { id } = await params;
  return <ServiceTeamsPage serviceId={id} />;
}
