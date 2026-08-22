import { BookingDetailPage } from '@/components/bookings/booking-detail-page';
import { UserRole } from '@xidmetal/shared';

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function ProviderBookingDetailRoute({ params }: PageProps) {
  const { id } = await params;
  return <BookingDetailPage bookingId={id} role={UserRole.PROVIDER} />;
}
