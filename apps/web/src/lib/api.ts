import type {
  AuthResponse,
  LoginInput,
  RegisterInput,
  UserProfile,
  ServiceSummary,
  BookingSummary,
  CategorySummary,
  ReviewSummary,
  PaginatedResponse,
  CreateServiceInput,
  UpdateServiceInput,
  UpdateProfileInput,
  ChangePasswordInput,
  RequestEmailChangeInput,
  ConfirmEmailChangeInput,
  ConversationSummary,
  ConversationDetail,
  MessageSummary,
  CreateConversationInput,
  SendMessageInput,
  CreateBookingInput,
  RescheduleBookingInput,
} from '@xidmetal/shared';
import { BookingStatus } from '@xidmetal/shared';
import { useAuthStore } from '@/store/auth.store';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';
const API_PREFIX = '/api/v1';

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

interface RequestOptions extends RequestInit {
  token?: string;
}

// Bir vaxtda yalnız bir refresh sorğusu getsin deyə (eyni access token ilə
// paralel çağırışlar) nəticə paylaşılan promise ilə keşlənir.
let refreshPromise: Promise<string | null> | null = null;

async function refreshAccessToken(): Promise<string | null> {
  const { tokens, setAuth, logout } = useAuthStore.getState();
  if (!tokens?.refreshToken) return null;

  if (!refreshPromise) {
    refreshPromise = (async () => {
      try {
        const response = await fetch(`${API_URL}${API_PREFIX}/auth/refresh`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refreshToken: tokens.refreshToken }),
        });
        if (!response.ok) {
          logout();
          return null;
        }
        const data: AuthResponse = await response.json();
        setAuth(data.user, data.tokens);
        return data.tokens.accessToken;
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

  const response = await fetch(`${API_URL}${API_PREFIX}${endpoint}`, {
    ...rest,
    headers: {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
      ...headers,
    },
  });

  if (response.status === 401 && token && allowRefresh) {
    const newToken = await refreshAccessToken();
    if (newToken) {
      return apiClient<T>(endpoint, { ...options, token: newToken }, false);
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

  return response.json();
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
        body: JSON.stringify(data),
      }),
    refresh: (refreshToken: string) =>
      apiClient<AuthResponse>('/auth/refresh', {
        method: 'POST',
        body: JSON.stringify({ refreshToken }),
      }),
  },

  users: {
    me: (token: string) => apiClient<UserProfile>('/users/me', { token }),
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

  categories: () => apiClient<CategorySummary[]>('/categories'),

  category: (slug: string) => apiClient<CategorySummary>(`/categories/${slug}`),

  services: (params?: Record<string, string>) => {
    const query = params ? `?${new URLSearchParams(params)}` : '';
    return apiClient<PaginatedResponse<ServiceSummary>>(`/services${query}`);
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

  reviewsReceived: (token: string, params?: Record<string, string>) => {
    const query = params ? `?${new URLSearchParams(params)}` : '';
    return apiClient<PaginatedResponse<ReviewSummary>>(`/reviews/received${query}`, { token });
  },

  messages: {
    conversations: (token: string, params?: Record<string, string>) => {
      const query = params ? `?${new URLSearchParams(params)}` : '';
      return apiClient<PaginatedResponse<ConversationSummary>>(
        `/messages/conversations${query}`,
        { token },
      );
    },
    conversation: (token: string, id: string) =>
      apiClient<ConversationDetail>(`/messages/conversations/${id}`, { token }),
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
};
