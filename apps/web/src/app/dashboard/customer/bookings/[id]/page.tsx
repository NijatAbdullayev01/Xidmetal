import { BookingDetailPage } from '@/components/bookings/booking-detail-page';
import { wantsBookingReviewOpen } from '@/lib/booking-review-query';
import { UserRole } from '@xidmetal/shared';

type PageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function CustomerBookingDetailRoute({
  params,
  searchParams,
}: PageProps) {
  const { id } = await params;
  const query = await searchParams;
  return (
    <BookingDetailPage
      bookingId={id}
      role={UserRole.CUSTOMER}
      openReview={wantsBookingReviewOpen(query)}
    />
  );
}
