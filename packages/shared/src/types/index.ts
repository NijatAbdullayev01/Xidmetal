import {
  UserRole,
  BookingStatus,
  ServiceStatus,
  AvailabilityOverrideType,
  AvailabilitySlotStatus,
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
}

export interface UserProfile {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
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
  totalPrice: number;
  notes?: string;
  address?: string;
  imageUrl?: string;
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
  bookingsTotal: number;
  bookingsPending: number;
  reviewsPending: number;
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
