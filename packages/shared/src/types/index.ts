import { UserRole, BookingStatus, ServiceStatus } from '../enums';

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
  averageRating: number;
  reviewCount: number;
  status: ServiceStatus;
  location?: string;
  isRemote: boolean;
  createdAt: string;
  bookingCount?: number;
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
  status: BookingStatus;
  totalPrice: number;
  notes?: string;
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

export interface ProviderDashboardStats {
  activeServices: number;
  totalServices: number;
  pendingBookings: number;
  completedBookings: number;
  rating: number;
  reviewCount: number;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface AuthResponse {
  user: UserProfile;
  tokens: AuthTokens;
}
