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
  PaginatedResponse,
  CreateReviewInput,
  CreateServiceInput,
  UpdateServiceInput,
  UpdateProfileInput,
  ChangePasswordInput,
  RequestEmailChangeInput,
  ConfirmEmailChangeInput,
  ConversationSummary,
  ConversationDetail,
  MessageSummary,
  MessagesPage,
  UnreadMessagesSummary,
  NotificationSummary,
  UnreadNotificationsSummary,
  BookingAttentionSummary,
  CreateConversationInput,
  SendMessageInput,
  CreateBookingInput,
  RescheduleBookingInput,
  WorkingHoursDay,
  AvailabilityOverride,
  DayAvailability,
  UpsertWorkingHoursInput,
  CreateAvailabilityOverrideInput,
} from '@xidmetal/shared';
import { BookingStatus, CLIENT_APP, CLIENT_APP_HEADER } from '@xidmetal/shared';
import { useAuthStore } from '@/store/auth.store';

/**
 * Boş/undefined → eyni origin (Next rewrite → API).
 * Absolute URL yalnız SSR və ya birbaşa API üçün.
 */
const API_URL = process.env.NEXT_PUBLIC_API_URL ?? '';
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
        const response = await fetch(`${API_URL}${API_PREFIX}/auth/refresh`, {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
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

  const response = await fetch(`${API_URL}${API_PREFIX}${endpoint}`, {
    ...rest,
    credentials: 'include',
    ...(token ? { cache: 'no-store' as const } : {}),
    headers: {
      ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
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
    const rawMessage = error.message;
    let message = Array.isArray(rawMessage)
      ? rawMessage.join(', ')
      : (rawMessage ?? 'Xəta baş verdi');
    if (response.status === 413) {
      message = 'Şəkil çox böyükdür. Daha kiçik fayl seçin.';
    }
    throw new ApiError(message, response.status);
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
  folder: 'services' | 'avatars' | 'bookings',
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
        body: JSON.stringify({ ...data, clientApp: CLIENT_APP.MARKETPLACE }),
        headers: { [CLIENT_APP_HEADER]: CLIENT_APP.MARKETPLACE },
      }),
    refresh: () =>
      apiClient<AuthResponse>('/auth/refresh', {
        method: 'POST',
        body: JSON.stringify({}),
        token: 'session',
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

  deleteService: (token: string, id: string) =>
    apiClient<{ message: string }>(`/services/${id}`, {
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

  createBooking: (token: string, data: CreateBookingInput) =>
    apiClient<BookingSummary>('/bookings', {
      method: 'POST',
      token,
      body: JSON.stringify(data),
    }),

  updateBookingStatus: (token: string, id: string, status: BookingStatus) =>
    apiClient<BookingSummary>(`/bookings/${id}/status`, {
      method: 'PATCH',
      token,
      body: JSON.stringify({ status }),
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

  /** İctimai — xidmət verənin müştəri rəyləri (auth tələb olunmur) */
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
};
