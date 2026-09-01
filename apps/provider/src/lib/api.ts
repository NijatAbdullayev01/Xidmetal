import type {
  AuthResponse,
  LoginInput,
  RegisterInput,
  ForgotPasswordInput,
  RequestEmailVerificationInput,
  ConfirmEmailVerificationInput,
  UserProfile,
  ServiceSummary,
  BookingSummary,
  CategorySummary,
  ReviewSummary,
  ProviderReviewsPage,
  ProviderDashboardStats,
  PaginatedResponse,
  CreateReviewInput,
  CreateServiceInput,
  UpdateServiceInput,
  CreateServiceTeamInput,
  UpdateServiceTeamInput,
  ServiceTeamSummary,
  UpdateProfileInput,
  ChangePasswordInput,
  ContactFormInput,
  CreateReportInput,
  RequestEmailChangeInput,
  ConfirmEmailChangeInput,
  RequestPhoneChangeInput,
  SubmitKycDocumentInput,
  KycDocumentSummary,
  ConversationSummary,
  ConversationDetail,
  MessageSummary,
  MessagesPage,
  UnreadMessagesSummary,
  NotificationSummary,
  UnreadNotificationsSummary,
  BookingAttentionSummary,
  ServiceAttentionSummary,
  CreateConversationInput,
  SendMessageInput,
  CreateBookingInput,
  RescheduleBookingInput,
  WorkingHoursDay,
  AvailabilityOverride,
  DayAvailability,
  UpsertWorkingHoursInput,
  CreateAvailabilityOverrideInput,
  ReportSummary,
  NearbyProviderSummary,
  GeocodeResult,
  UpdateProviderLocationInput,
  ProviderAvailability,
  LocationPingSummary,
  DispatchOfferSummary,
  DeviceTokenSummary,
  RegisterDeviceTokenInput,
  UnregisterDeviceTokenInput,
  PublicProviderProfile,
} from '@xidmetal/shared';
import { BookingStatus, CLIENT_APP, CLIENT_APP_HEADER } from '@xidmetal/shared';
import { useAuthStore } from '@/store/auth.store';
import { userFacingApiMessage } from './api-error';
import { isPublicGetRequest } from './api-fetch-policy';

/**
 * Brauzer: boş base → eyni origin (next.config rewrite → API) — cookie üçün vacibdir.
 * SSR/RSC: Node `fetch` relative URL qəbul etmir → API_URL / INTERNAL_API_URL.
 */
function resolveApiBaseUrl(): string {
  const fromPublic = process.env.NEXT_PUBLIC_API_URL?.trim();
  if (fromPublic) return fromPublic.replace(/\/$/, '');

  if (typeof window !== 'undefined') return '';

  const internal =
    process.env.API_URL?.trim() ||
    process.env.INTERNAL_API_URL?.trim() ||
    'http://localhost:4100';
  return internal.replace(/\/$/, '');
}

const API_PREFIX = '/api/v1';

/** İctimai GET-lər üçün ISR (server fetch cache). Client-də Next ignore edir. */
const PUBLIC_REVALIDATE_SECONDS = 60;

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

interface RequestOptions extends Omit<RequestInit, 'next'> {
  /** Truthy = cookie sessiyası gözlənilir (Bearer localStorage-dan göndərilmir) */
  token?: string;
  /** Server Components: Next.js fetch cache (ISR). Brauzerdə ignore olunur. */
  next?: {
    revalidate?: number | false;
    tags?: string[];
  };
}

let refreshPromise: Promise<string | null> | null = null;

async function refreshAccessToken(): Promise<string | null> {
  const { session, setAuth, logout } = useAuthStore.getState();
  if (!session) return null;

  if (!refreshPromise) {
    refreshPromise = (async () => {
      try {
        const response = await fetch(`${resolveApiBaseUrl()}${API_PREFIX}/auth/refresh`, {
          method: 'POST',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
            [CLIENT_APP_HEADER]: CLIENT_APP.PROVIDER,
          },
          body: JSON.stringify({}),
        });
        if (!response.ok) {
          logout();
          return null;
        }
        const data: AuthResponse = await response.json();
        setAuth(data.user);
        return 'session';
      } catch {
        logout();
        return null;
      } finally {
        refreshPromise = null;
      }
    })();
  }

  return refreshPromise;
}

export async function apiClient<T>(
  endpoint: string,
  options: RequestOptions = {},
  allowRefresh = true,
): Promise<T> {
  const { token, headers, ...rest } = options;
  const isFormData = typeof FormData !== 'undefined' && rest.body instanceof FormData;
  const publicGet = isPublicGetRequest(rest.method, token);

  const response = await fetch(`${resolveApiBaseUrl()}${API_PREFIX}${endpoint}`, {
    ...rest,
    credentials: publicGet ? 'omit' : 'include',
    ...(!publicGet ? { cache: 'no-store' as const } : {}),
    headers: {
      ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
      [CLIENT_APP_HEADER]: CLIENT_APP.PROVIDER,
      ...headers,
    },
  });

  if (response.status === 401 && token && allowRefresh) {
    const refreshed = await refreshAccessToken();
    if (refreshed) {
      return apiClient<T>(endpoint, { ...options, token: refreshed }, false);
    }
  }

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Xəta baş verdi' }));
    throw new ApiError(userFacingApiMessage(response.status, error.message), response.status);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  const text = await response.text();
  if (!text) {
    return undefined as T;
  }

  return JSON.parse(text) as T;
}

export async function uploadImage(
  token: string,
  file: File,
  folder: 'services' | 'avatars' | 'bookings' | 'kyc' | 'messages',
): Promise<string> {
  const form = new FormData();
  form.append('file', file);
  form.append('folder', folder);
  const result = await apiClient<{ url: string }>('/uploads', {
    method: 'POST',
    token,
    body: form,
  });
  return result.url;
}

export const api = {
  health: () => apiClient<{ status: string }>('/health'),

  auth: {
    register: (data: RegisterInput) =>
      apiClient<AuthResponse>('/auth/register', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    login: (data: LoginInput) =>
      apiClient<AuthResponse>('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ ...data, clientApp: CLIENT_APP.PROVIDER }),
        headers: { [CLIENT_APP_HEADER]: CLIENT_APP.PROVIDER },
      }),
    refresh: () =>
      apiClient<AuthResponse>('/auth/refresh', {
        method: 'POST',
        body: JSON.stringify({}),
        token: 'session',
        headers: { [CLIENT_APP_HEADER]: CLIENT_APP.PROVIDER },
      }),
    logout: () =>
      apiClient<{ message: string }>('/auth/logout', {
        method: 'POST',
        body: JSON.stringify({}),
      }),
    forgotPassword: (data: ForgotPasswordInput) =>
      apiClient<{ message: string; mailDelivered?: boolean; previewCode?: string }>(
        '/auth/forgot-password',
        {
          method: 'POST',
          body: JSON.stringify(data),
        },
      ),
    resetPassword: (data: { email: string; code: string; newPassword: string }) =>
      apiClient<{ message: string }>('/auth/reset-password', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    requestEmailVerification: (data: RequestEmailVerificationInput) =>
      apiClient<{ message: string; mailDelivered?: boolean; previewCode?: string }>(
        '/auth/verify-email/request',
        {
          method: 'POST',
          body: JSON.stringify(data),
        },
      ),
    confirmEmailVerification: (data: ConfirmEmailVerificationInput) =>
      apiClient<{ message: string; user: AuthResponse['user'] }>('/auth/verify-email/confirm', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
  },

  users: {
    me: (token: string) => apiClient<UserProfile>('/users/me', { token }),
    dashboardStats: (token: string) =>
      apiClient<ProviderDashboardStats>('/users/me/dashboard-stats', { token }),
    heartbeat: (token: string) =>
      apiClient<{ lastSeenAt: string }>('/users/me/heartbeat', {
        method: 'POST',
        token,
      }),
    updateProfile: (token: string, data: UpdateProfileInput) =>
      apiClient<UserProfile>('/users/me', {
        method: 'PATCH',
        token,
        body: JSON.stringify(data),
      }),
    changePassword: (token: string, data: ChangePasswordInput) =>
      apiClient<{ message: string }>('/users/me/password', {
        method: 'PATCH',
        token,
        body: JSON.stringify({
          currentPassword: data.currentPassword,
          newPassword: data.newPassword,
        }),
      }),
    requestEmailChange: (token: string, data: RequestEmailChangeInput) =>
      apiClient<{ message: string }>('/users/me/email/request-change', {
        method: 'POST',
        token,
        body: JSON.stringify(data),
      }),
    confirmEmailChange: (token: string, data: ConfirmEmailChangeInput) =>
      apiClient<UserProfile>('/users/me/email/confirm-change', {
        method: 'POST',
        token,
        body: JSON.stringify(data),
      }),
    changePhone: (token: string, data: RequestPhoneChangeInput) =>
      apiClient<UserProfile>('/users/me/phone', {
        method: 'PATCH',
        token,
        body: JSON.stringify(data),
      }),
    kyc: (token: string) => apiClient<KycDocumentSummary[]>('/users/me/kyc', { token }),
    submitKyc: (token: string, data: SubmitKycDocumentInput) =>
      apiClient<KycDocumentSummary>('/users/me/kyc', {
        method: 'POST',
        token,
        body: JSON.stringify(data),
      }),
    deleteAccount: (
      token: string,
      data: { password: string; confirmText: string },
    ) =>
      apiClient<{ message: string }>('/users/me', {
        method: 'DELETE',
        token,
        body: JSON.stringify(data),
      }),
  },

  contact: {
    submit: (
      data: Omit<ContactFormInput, 'firstName' | 'lastName'> & {
        name: string;
        website?: string;
        captchaToken?: string;
      },
    ) =>
      apiClient<{ message: string }>('/contact', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
  },

  categories: () =>
    apiClient<CategorySummary[]>('/categories', {
      next: { revalidate: PUBLIC_REVALIDATE_SECONDS },
    }),

  category: (slug: string) =>
    apiClient<CategorySummary>(`/categories/${slug}`, {
      next: { revalidate: PUBLIC_REVALIDATE_SECONDS },
    }),

  services: (params?: Record<string, string>) => {
    const query = params ? `?${new URLSearchParams(params)}` : '';
    return apiClient<PaginatedResponse<ServiceSummary>>(`/services${query}`, {
      next: { revalidate: PUBLIC_REVALIDATE_SECONDS },
    });
  },

  myServices: (token: string, params?: Record<string, string>) => {
    const query = params ? `?${new URLSearchParams(params)}` : '';
    return apiClient<PaginatedResponse<ServiceSummary>>(`/services/mine${query}`, { token });
  },

  service: (id: string, token?: string) =>
    apiClient<ServiceSummary>(`/services/${id}`, { token }),

  publicProvider: (id: string) =>
    apiClient<PublicProviderProfile>(`/providers/${id}`, {
      next: { revalidate: PUBLIC_REVALIDATE_SECONDS },
    }),

  createService: (token: string, data: CreateServiceInput) =>
    apiClient<ServiceSummary>('/services', {
      method: 'POST',
      token,
      body: JSON.stringify(data),
    }),

  updateService: (token: string, id: string, data: UpdateServiceInput) =>
    apiClient<ServiceSummary>(`/services/${id}`, {
      method: 'PATCH',
      token,
      body: JSON.stringify(data),
    }),

  submitServiceForReview: (token: string, id: string) =>
    apiClient<ServiceSummary>(`/services/${id}/submit-review`, {
      method: 'POST',
      token,
    }),

  deleteService: (token: string, id: string) =>
    apiClient<{ message: string }>(`/services/${id}`, {
      method: 'DELETE',
      token,
    }),

  listServiceTeams: (token: string, serviceId: string) =>
    apiClient<ServiceTeamSummary[]>(`/services/${serviceId}/teams`, { token }),

  createServiceTeam: (token: string, serviceId: string, data: CreateServiceTeamInput) =>
    apiClient<ServiceTeamSummary>(`/services/${serviceId}/teams`, {
      method: 'POST',
      token,
      body: JSON.stringify(data),
    }),

  updateServiceTeam: (
    token: string,
    serviceId: string,
    teamId: string,
    data: UpdateServiceTeamInput,
  ) =>
    apiClient<ServiceTeamSummary>(`/services/${serviceId}/teams/${teamId}`, {
      method: 'PATCH',
      token,
      body: JSON.stringify(data),
    }),

  deleteServiceTeam: (token: string, serviceId: string, teamId: string) =>
    apiClient<void>(`/services/${serviceId}/teams/${teamId}`, {
      method: 'DELETE',
      token,
    }),

  getServiceAvailability: (serviceId: string, from: string, to: string) =>
    apiClient<DayAvailability[]>(
      `/services/${serviceId}/availability?${new URLSearchParams({ from, to })}`,
    ),

  getWorkingHours: (token: string, serviceId: string) =>
    apiClient<WorkingHoursDay[]>(`/services/${serviceId}/working-hours`, { token }),

  upsertWorkingHours: (token: string, serviceId: string, data: UpsertWorkingHoursInput) =>
    apiClient<WorkingHoursDay[]>(`/services/${serviceId}/working-hours`, {
      method: 'PUT',
      token,
      body: JSON.stringify(data),
    }),

  getAvailabilityOverrides: (token: string, serviceId: string, from: string, to: string) =>
    apiClient<AvailabilityOverride[]>(
      `/services/${serviceId}/availability/overrides?${new URLSearchParams({ from, to })}`,
      { token },
    ),

  createAvailabilityOverride: (
    token: string,
    serviceId: string,
    data: CreateAvailabilityOverrideInput,
  ) =>
    apiClient<AvailabilityOverride>(`/services/${serviceId}/availability/overrides`, {
      method: 'POST',
      token,
      body: JSON.stringify(data),
    }),

  deleteAvailabilityOverride: (token: string, serviceId: string, overrideId: string) =>
    apiClient<void>(`/services/${serviceId}/availability/overrides/${overrideId}`, {
      method: 'DELETE',
      token,
    }),

  bookings: (token: string, params?: Record<string, string>) => {
    const query = params ? `?${new URLSearchParams(params)}` : '';
    return apiClient<PaginatedResponse<BookingSummary>>(`/bookings${query}`, { token });
  },

  booking: (token: string, id: string) =>
    apiClient<BookingSummary>(`/bookings/${id}`, { token }),

  createBooking: (
    token: string,
    data: CreateBookingInput,
    options?: { idempotencyKey?: string },
  ) =>
    apiClient<BookingSummary>('/bookings', {
      method: 'POST',
      token,
      body: JSON.stringify(data),
      headers: options?.idempotencyKey
        ? { 'Idempotency-Key': options.idempotencyKey }
        : undefined,
    }),

  dispatch: {
    pendingOffers: (token: string) =>
      apiClient<DispatchOfferSummary[]>('/dispatch/offers/pending', { token }),
    acceptOffer: (token: string, offerId: string) =>
      apiClient<DispatchOfferSummary>(`/dispatch/offers/${offerId}/accept`, {
        method: 'POST',
        token,
        body: JSON.stringify({}),
      }),
    rejectOffer: (token: string, offerId: string, reason?: string) =>
      apiClient<DispatchOfferSummary>(`/dispatch/offers/${offerId}/reject`, {
        method: 'POST',
        token,
        body: JSON.stringify(reason ? { reason } : {}),
      }),
  },

  updateBookingStatus: (
    token: string,
    id: string,
    status: BookingStatus,
    options?: { cancelReason?: string },
  ) =>
    apiClient<BookingSummary>(`/bookings/${id}/status`, {
      method: 'PATCH',
      token,
      body: JSON.stringify({
        status,
        ...(options?.cancelReason ? { cancelReason: options.cancelReason } : {}),
      }),
    }),

  rescheduleBooking: (token: string, id: string, data: RescheduleBookingInput) =>
    apiClient<BookingSummary>(`/bookings/${id}/reschedule`, {
      method: 'PATCH',
      token,
      body: JSON.stringify(data),
    }),

  confirmReschedule: (token: string, id: string) =>
    apiClient<BookingSummary>(`/bookings/${id}/reschedule/confirm`, {
      method: 'PATCH',
      token,
    }),

  rejectReschedule: (token: string, id: string) =>
    apiClient<BookingSummary>(`/bookings/${id}/reschedule/reject`, {
      method: 'PATCH',
      token,
    }),

  skipBookingProvider: (token: string, id: string) =>
    apiClient<BookingSummary>(`/bookings/${id}/skip-provider`, {
      method: 'POST',
      token,
      body: JSON.stringify({}),
    }),

  locationPings: (token: string, bookingId: string, params?: { limit?: string }) => {
    const query = params ? `?${new URLSearchParams(params)}` : '';
    return apiClient<LocationPingSummary[]>(
      `/bookings/${bookingId}/location-pings${query}`,
      { token },
    );
  },

  createReview: (token: string, data: CreateReviewInput) =>
    apiClient<ReviewSummary>('/reviews', {
      method: 'POST',
      token,
      body: JSON.stringify(data),
    }),

  reviewsReceived: (token: string, params?: Record<string, string>) => {
    const query = params ? `?${new URLSearchParams(params)}` : '';
    return apiClient<PaginatedResponse<ReviewSummary>>(`/reviews/received${query}`, { token });
  },

  /** İctimai — xidmət verənin xidmət alan rəyləri (auth tələb olunmur) */
  reviewsByProvider: (providerId: string, params?: Record<string, string>) => {
    const query = params ? `?${new URLSearchParams(params)}` : '';
    return apiClient<ProviderReviewsPage>(`/reviews/provider/${providerId}${query}`);
  },

  messages: {
    unreadCount: (token: string) =>
      apiClient<UnreadMessagesSummary>('/messages/unread-count', { token }),
    conversations: (token: string, params?: Record<string, string>) => {
      const query = params ? `?${new URLSearchParams(params)}` : '';
      return apiClient<PaginatedResponse<ConversationSummary>>(
        `/messages/conversations${query}`,
        { token },
      );
    },
    conversation: (token: string, id: string) =>
      apiClient<ConversationDetail>(`/messages/conversations/${id}`, { token }),
    deleteConversation: (token: string, id: string) =>
      apiClient<{ ok: true }>(`/messages/conversations/${id}`, {
        method: 'DELETE',
        token,
      }),
    messages: (token: string, conversationId: string, params?: Record<string, string>) => {
      const query = params ? `?${new URLSearchParams(params)}` : '';
      return apiClient<MessagesPage>(
        `/messages/conversations/${conversationId}/messages${query}`,
        { token },
      );
    },
    markRead: (token: string, conversationId: string) =>
      apiClient<{ markedCount: number }>(`/messages/conversations/${conversationId}/read`, {
        method: 'POST',
        token,
      }),
    setTyping: (token: string, conversationId: string) =>
      apiClient<{ ok: true }>(`/messages/conversations/${conversationId}/typing`, {
        method: 'POST',
        token,
      }),
    createConversation: (token: string, data: CreateConversationInput) =>
      apiClient<ConversationDetail>('/messages/conversations', {
        method: 'POST',
        token,
        body: JSON.stringify(data),
      }),
    sendMessage: (token: string, conversationId: string, data: SendMessageInput) =>
      apiClient<MessageSummary>(`/messages/conversations/${conversationId}/messages`, {
        method: 'POST',
        token,
        body: JSON.stringify(data),
      }),
  },

  notifications: {
    list: (token: string, params?: Record<string, string>) => {
      const query = params ? `?${new URLSearchParams(params)}` : '';
      return apiClient<PaginatedResponse<NotificationSummary>>(`/notifications${query}`, {
        token,
      });
    },
    unreadCount: (token: string) =>
      apiClient<UnreadNotificationsSummary>('/notifications/unread-count', { token }),
    bookingUnreadCount: (token: string) =>
      apiClient<BookingAttentionSummary>('/notifications/booking-unread-count', { token }),
    markBookingReadAll: (token: string) =>
      apiClient<{ markedCount: number }>('/notifications/booking-read-all', {
        method: 'POST',
        token,
      }),
    reviewUnreadCount: (token: string) =>
      apiClient<BookingAttentionSummary>('/notifications/review-unread-count', { token }),
    markReviewReadAll: (token: string) =>
      apiClient<{ markedCount: number }>('/notifications/review-read-all', {
        method: 'POST',
        token,
      }),
    serviceUnreadCount: (token: string) =>
      apiClient<ServiceAttentionSummary>('/notifications/service-unread-count', { token }),
    markServiceReadAll: (token: string) =>
      apiClient<{ markedCount: number }>('/notifications/service-read-all', {
        method: 'POST',
        token,
      }),
    markRead: (token: string, id: string) =>
      apiClient<NotificationSummary>(`/notifications/${id}/read`, {
        method: 'PATCH',
        token,
      }),
    markAllRead: (token: string) =>
      apiClient<{ markedCount: number }>('/notifications/read-all', {
        method: 'POST',
        token,
      }),
  },

  devices: {
    listTokens: (token: string) =>
      apiClient<DeviceTokenSummary[]>('/devices/tokens', { token }),
    registerToken: (token: string, data: RegisterDeviceTokenInput) =>
      apiClient<DeviceTokenSummary>('/devices/tokens', {
        method: 'POST',
        token,
        body: JSON.stringify(data),
      }),
    unregisterToken: (token: string, data: UnregisterDeviceTokenInput) =>
      apiClient<{ removed: boolean }>('/devices/tokens', {
        method: 'DELETE',
        token,
        body: JSON.stringify(data),
      }),
  },

  reports: {
    create: (token: string, data: CreateReportInput) =>
      apiClient<ReportSummary>('/reports', {
        method: 'POST',
        token,
        body: JSON.stringify({
          ...data,
          targetId: data.targetId?.trim() || undefined,
        }),
      }),
    mine: (token: string) =>
      apiClient<PaginatedResponse<ReportSummary>>('/reports/mine', { token }),
  },

  geo: {
    geocode: (q: string) =>
      apiClient<GeocodeResult[]>(`/geo/geocode?${new URLSearchParams({ q })}`),
    reverse: (lat: number, lng: number) =>
      apiClient<GeocodeResult | null>(
        `/geo/reverse?${new URLSearchParams({ lat: String(lat), lng: String(lng) })}`,
      ),
    onlineCount: (params: {
      categoryId: string;
      serviceTitle: string;
      minRating?: number;
      minPrice?: number;
      maxPrice?: number;
      serviceLocation?: string;
    }) => {
      const query = new URLSearchParams({
        categoryId: params.categoryId,
        serviceTitle: params.serviceTitle,
      });
      if (params.minRating != null) query.set('minRating', String(params.minRating));
      if (params.minPrice != null) query.set('minPrice', String(params.minPrice));
      if (params.maxPrice != null) query.set('maxPrice', String(params.maxPrice));
      if (params.serviceLocation) {
        query.set('serviceLocation', params.serviceLocation);
      }
      return apiClient<{ count: number }>(`/geo/online-count?${query}`);
    },
    nearby: (params: {
      lat: number;
      lng: number;
      radiusKm?: number;
      categoryId?: string;
      limit?: number;
    }) => {
      const query = new URLSearchParams({
        lat: String(params.lat),
        lng: String(params.lng),
      });
      if (params.radiusKm != null) query.set('radiusKm', String(params.radiusKm));
      if (params.categoryId) query.set('categoryId', params.categoryId);
      if (params.limit != null) query.set('limit', String(params.limit));
      return apiClient<{ items: NearbyProviderSummary[]; engine: 'postgis' | 'haversine' }>(
        `/geo/nearby?${query}`,
      );
    },
    /** Sürücülük ETA/məsafə/polyline — yalnız sifariş iştirakçısı */
    route: (params: {
      bookingId: string;
      fromLat: number;
      fromLng: number;
    }) => {
      const query = new URLSearchParams({
        bookingId: params.bookingId,
        fromLat: String(params.fromLat),
        fromLng: String(params.fromLng),
      });
      return apiClient<{
        etaSeconds: number;
        distanceMeters: number;
        routePolyline: string | null;
        source: 'google' | 'osrm' | 'mapbox' | 'haversine';
      }>(`/geo/route?${query}`);
    },
    updateLocation: (token: string, data: UpdateProviderLocationInput) =>
      apiClient<{
        availability: ProviderAvailability;
        lastLat: number;
        lastLng: number;
        lastHeading: number | null;
        locationUpdatedAt: string;
      }>('/geo/me/location', {
        method: 'POST',
        token,
        body: JSON.stringify(data),
      }),
    updateAvailability: (token: string, availability: ProviderAvailability) =>
      apiClient<{
        availability: ProviderAvailability;
        lastLat: number | null;
        lastLng: number | null;
        lastHeading: number | null;
        locationUpdatedAt: string | null;
      }>('/geo/me/availability', {
        method: 'PATCH',
        token,
        body: JSON.stringify({ availability }),
      }),
  },
};
