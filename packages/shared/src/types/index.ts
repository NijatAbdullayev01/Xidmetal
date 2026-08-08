import {
  UserRole,
  BookingStatus,
  BookingType,
  ServiceStatus,
  AvailabilityOverrideType,
  AvailabilitySlotStatus,
  ProviderAvailability,
} from '../enums';

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface ProviderProfile {
  id: string;
  bio?: string;
  experience?: number;
  location?: string;
  isVerified: boolean;
  rating: number;
  reviewCount: number;
  /** Domain əlçatanlıq — presence heartbeat-dən ayrı */
  availability: ProviderAvailability;
  lastLat?: number | null;
  lastLng?: number | null;
  lastHeading?: number | null;
  locationUpdatedAt?: string | null;
}

export interface UserProfile {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  /** ISO — təsdiqlənmiş telefon; SMS üçün */
  phoneVerifiedAt?: string | null;
  avatarUrl?: string;
  role: UserRole;
  isVerified: boolean;
  createdAt: string;
  providerProfile?: ProviderProfile;
}

export interface ServiceImageSummary {
  id: string;
  url: string;
  alt?: string;
  sortOrder: number;
}

export interface ServiceSummary {
  id: string;
  title: string;
  description: string;
  price: number;
  priceUnit: string;
  categoryId: string;
  categoryName: string;
  providerId: string;
  providerName: string;
  providerAvatarUrl?: string;
  providerExperience?: number;
  averageRating: number;
  reviewCount: number;
  status: ServiceStatus;
  /** Admin düzəliş qeydi (NEEDS_REVISION) */
  reviewNote?: string | null;
  submittedAt?: string | null;
  reviewedAt?: string | null;
  location?: string;
  isRemote: boolean;
  serviceVenue?: string;
  /** Yükdaşıma: yük yeri uzunluğu (metr) */
  vehicleLength?: number;
  /** Yükdaşıma: yük yeri eni (metr) */
  vehicleWidth?: number;
  /** Yükdaşıma: yük yeri hündürlüyü (metr) */
  vehicleHeight?: number;
  /** Yükdaşıma: şəhərdaxili / şəhərlərarası */
  cargoRouteScope?: string;
  createdAt: string;
  bookingCount?: number;
  activeBookingCount?: number;
  /** Xidmətə bağlı şəkillər (sıralı) */
  images?: ServiceImageSummary[];
}

export interface BookingSummary {
  id: string;
  serviceId: string;
  serviceTitle: string;
  customerId: string;
  customerName: string;
  providerId: string;
  providerName: string;
  scheduledAt: string;
  proposedScheduledAt?: string;
  status: BookingStatus;
  /** Default SCHEDULED; INSTANT → on-demand avto-dispatch */
  type: BookingType;
  totalPrice: number;
  notes?: string;
  address?: string;
  /** Xidmət ünvanı koordinatları (opsional) */
  destLat?: number | null;
  destLng?: number | null;
  /** Mənşə / provider start (opsional) */
  originLat?: number | null;
  originLng?: number | null;
  imageUrl?: string;
  cancelReason?: string;
  cancelledBy?: string;
  cancelledAt?: string;
  acceptedAt?: string;
  enRouteAt?: string;
  arrivedAt?: string;
  startedAt?: string;
  completedAt?: string;
  hasReview?: boolean;
  createdAt: string;
}

export interface CategorySummary {
  id: string;
  name: string;
  slug: string;
  description?: string;
  icon?: string;
  serviceCount: number;
}

export interface ReviewSummary {
  id: string;
  bookingId: string;
  serviceTitle: string;
  authorName: string;
  rating: number;
  comment?: string;
  status: string;
  createdAt: string;
}

/** 1–5 ulduz üzrə rəy sayı paylanması */
export interface RatingDistribution {
  1: number;
  2: number;
  3: number;
  4: number;
  5: number;
}

export interface ProviderReviewStats {
  averageRating: number;
  reviewCount: number;
  ratingDistribution: RatingDistribution;
}

/** İctimai: xidmət verənin rəyləri (səhifələnmiş + statistika) */
export interface ProviderReviewsPage extends PaginatedResponse<ReviewSummary> {
  stats: ProviderReviewStats;
  providerName: string;
}

export interface ProviderDashboardStats {
  activeServices: number;
  totalServices: number;
  pendingBookings: number;
  completedBookings: number;
  rating: number;
  reviewCount: number;
}

/** Admin panel — platforma icmalı */
export interface AdminDashboardStats {
  usersTotal: number;
  usersCustomers: number;
  usersProviders: number;
  usersActive: number;
  providersUnverified: number;
  servicesTotal: number;
  servicesActive: number;
  /** Yoxlama növbəsindəki xidmətlər */
  servicesPendingReview: number;
  bookingsTotal: number;
  bookingsPending: number;
  reviewsPending: number;
  reportsPending: number;
  categoriesActive: number;
}

export interface AdminUserSummary {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  avatarUrl?: string;
  role: UserRole;
  isVerified: boolean;
  isActive: boolean;
  createdAt: string;
  lastSeenAt?: string | null;
  providerProfile?: {
    id: string;
    isVerified: boolean;
    rating: number;
    reviewCount: number;
    location?: string;
    experience?: number;
  };
  _count?: {
    services: number;
    bookingsAsCustomer: number;
    bookingsAsProvider: number;
  };
}

export interface AdminCategorySummary {
  id: string;
  name: string;
  slug: string;
  description?: string;
  icon?: string;
  sortOrder: number;
  isActive: boolean;
  serviceCount: number;
  createdAt: string;
}

export interface AdminReviewSummary extends ReviewSummary {
  authorId: string;
  providerId: string;
  providerName: string;
}

export interface AdminAnnouncementResult {
  sentCount: number;
}

export interface ReportSummary {
  id: string;
  targetType: string;
  targetId?: string | null;
  reason: string;
  description: string;
  status: string;
  createdAt: string;
}

export interface AdminReportSummary extends ReportSummary {
  reporterId: string;
  reporterName: string;
  reporterEmail: string;
  adminNote?: string | null;
  resolvedAt?: string | null;
  resolvedByName?: string | null;
}

export interface MessageSummary {
  id: string;
  conversationId: string;
  senderId: string;
  senderName: string;
  content: string;
  isRead: boolean;
  /** Oxunma vaxtı (WhatsApp tipli oxundu) */
  readAt?: string | null;
  createdAt: string;
}

export interface PeerPresence {
  isOnline: boolean;
  lastSeenAt: string | null;
}

export interface ConversationSummary {
  id: string;
  customerId: string;
  customerName: string;
  customerAvatarUrl?: string;
  providerId: string;
  providerName: string;
  providerAvatarUrl?: string;
  bookingId?: string;
  serviceTitle?: string;
  lastMessage?: string;
  lastMessageAt?: string;
  unreadCount: number;
  updatedAt: string;
}

export interface ConversationDetail extends ConversationSummary {
  messages: MessageSummary[];
  /** Köhnə mesajlar üçün cursor (ən köhnə yüklənmiş mesajın id-si) */
  nextCursor?: string | null;
  hasMore?: boolean;
  /** Qarşı tərəfin onlayn / son görülmə statusu */
  peerPresence?: PeerPresence;
  /** Qarşı tərəf hazırda yazır */
  peerTyping?: boolean;
}

export interface MessagesPage {
  items: MessageSummary[];
  nextCursor: string | null;
  hasMore: boolean;
}

export interface NotificationSummary {
  id: string;
  type: string;
  title: string;
  body: string;
  data?: Record<string, unknown> | null;
  isRead: boolean;
  createdAt: string;
}

export interface UnreadNotificationsSummary {
  count: number;
}

/** Sifarişlər bölməsi üzərindəki diqqət badge-i */
export interface BookingAttentionSummary {
  count: number;
  /** Yeni sifariş səsi üçün — ən son oxunmamış bildiriş */
  latestUnreadId?: string | null;
  latestUnreadAt?: string | null;
}

/** Yaxın provider axtarışı cavabı */
export interface NearbyProviderSummary {
  userId: string;
  firstName: string;
  lastName: string;
  avatarUrl?: string;
  rating: number;
  reviewCount: number;
  isVerified: boolean;
  availability: ProviderAvailability;
  lastLat: number;
  lastLng: number;
  locationUpdatedAt?: string | null;
  /** Məsafə metr */
  distanceM: number;
}

export interface GeocodeResult {
  lat: number;
  lng: number;
  displayName: string;
  /** mock | nominatim */
  provider: string;
}

/** GDPR — istifadəçi məlumat ixracı */
export interface UserDataExport {
  exportedAt: string;
  profile: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    phone: string | null;
    phoneVerifiedAt: string | null;
    role: string;
    isVerified: boolean;
    createdAt: string;
    providerProfile: {
      bio: string | null;
      experience: number | null;
      location: string | null;
      isVerified: boolean;
      rating: number;
      reviewCount: number;
      availability: string;
    } | null;
  };
  services: Array<{
    id: string;
    title: string;
    status: string;
    price: number;
    createdAt: string;
  }>;
  bookings: Array<{
    id: string;
    serviceTitle: string;
    status: string;
    type: string;
    scheduledAt: string;
    totalPrice: number;
    role: 'customer' | 'provider';
    createdAt: string;
  }>;
  notifications: Array<{
    id: string;
    type: string;
    title: string;
    createdAt: string;
    isRead: boolean;
  }>;
  deviceTokens: Array<{
    id: string;
    platform: string;
    tokenMasked: string;
    createdAt: string;
  }>;
}

export interface UnreadMessagesSummary {
  count: number;
  latestUnreadMessageId: string | null;
  latestUnreadAt: string | null;
}

/** Yalnız server daxili / legacy — HTTP JSON cavabında artıq göndərilmir (httpOnly cookie). */
export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface AuthResponse {
  user: UserProfile;
  mailDelivered?: boolean;
  previewCode?: string;
}

export interface WorkingHoursDay {
  id?: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  isActive: boolean;
}

export interface AvailabilityOverride {
  id: string;
  serviceId: string;
  date: string;
  startTime?: string;
  endTime?: string;
  type: AvailabilityOverrideType;
  note?: string;
}

export interface AvailabilitySlot {
  start: string;
  end: string;
  status: AvailabilitySlotStatus;
}

export interface DayAvailability {
  date: string;
  slots: AvailabilitySlot[];
  hasCalendar: boolean;
}

/** On-demand dispatch təklifi (Faza 4) */
export interface DispatchOfferSummary {
  id: string;
  bookingId: string;
  providerId: string;
  status: string;
  distanceM?: number | null;
  score?: number | null;
  expiresAt: string;
  createdAt: string;
  respondedAt?: string | null;
  booking?: {
    id: string;
    serviceTitle: string;
    address?: string | null;
    destLat?: number | null;
    destLng?: number | null;
    scheduledAt: string;
    notes?: string | null;
    totalPrice: number;
    customerName: string;
  };
}

/** Ödəniş xülasəsi (Faza 5 — flag-gated) */
export interface PaymentSummary {
  id: string;
  bookingId?: string | null;
  amount: number;
  commission: number;
  currency: string;
  status: string;
  provider: string;
  externalId?: string | null;
  idempotencyKey?: string | null;
  createdAt: string;
  updatedAt: string;
}

/** Qeydiyyatlı cihaz tokeni */
export interface DeviceTokenSummary {
  id: string;
  platform: string;
  /** Token-in qısa maskası (təhlükəsizlik) */
  tokenPreview: string;
  createdAt: string;
}

/** Push payload (FCM data + notification) */
export interface PushPayload {
  title: string;
  body: string;
  data?: Record<string, string>;
}
