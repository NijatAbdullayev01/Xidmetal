import type {
  AuthResponse,
  LoginInput,
  UserProfile,
  ServiceSummary,
  BookingSummary,
  PaginatedResponse,
  UpdateProfileInput,
  ChangePasswordInput,
  AdminDashboardStats,
  AdminUserSummary,
  AdminCategorySummary,
  AdminReviewSummary,
  AdminReportSummary,
  AdminAnnouncementResult,
  CreateCategoryInput,
  UpdateCategoryInput,
  AdminSetUserActiveInput,
  AdminSetProviderVerifiedInput,
  AdminSetServiceStatusInput,
  AdminSetReviewStatusInput,
  AdminSetReportStatusInput,
  AdminAnnouncementInput,
} from '@xidmetal/shared';
import { BookingStatus, CLIENT_APP, CLIENT_APP_HEADER } from '@xidmetal/shared';
import { useAuthStore } from '@/store/auth.store';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? '';
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

interface RequestOptions extends Omit<RequestInit, 'next'> {
  token?: string;
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
          headers: {
            'Content-Type': 'application/json',
            [CLIENT_APP_HEADER]: CLIENT_APP.ADMIN,
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

  const response = await fetch(`${API_URL}${API_PREFIX}${endpoint}`, {
    ...rest,
    credentials: 'include',
    ...(token ? { cache: 'no-store' as const } : {}),
    headers: {
      'Content-Type': 'application/json',
      [CLIENT_APP_HEADER]: CLIENT_APP.ADMIN,
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
    const message = Array.isArray(rawMessage)
      ? rawMessage.join(', ')
      : (rawMessage ?? 'Xəta baş verdi');
    throw new ApiError(message, response.status);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  const text = await response.text();
  if (!text) return undefined as T;
  return JSON.parse(text) as T;
}

export const api = {
  auth: {
    login: (data: LoginInput) =>
      apiClient<AuthResponse>('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ ...data, clientApp: CLIENT_APP.ADMIN }),
        headers: { [CLIENT_APP_HEADER]: CLIENT_APP.ADMIN },
      }),
    refresh: () =>
      apiClient<AuthResponse>('/auth/refresh', {
        method: 'POST',
        body: JSON.stringify({}),
        token: 'session',
        headers: { [CLIENT_APP_HEADER]: CLIENT_APP.ADMIN },
      }),
    logout: () =>
      apiClient<{ message: string }>('/auth/logout', {
        method: 'POST',
        body: JSON.stringify({}),
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
  },

  admin: {
    stats: (token: string) => apiClient<AdminDashboardStats>('/admin/stats', { token }),
    users: (token: string, params?: Record<string, string>) => {
      const query = params ? `?${new URLSearchParams(params)}` : '';
      return apiClient<PaginatedResponse<AdminUserSummary>>(`/admin/users${query}`, { token });
    },
    setUserActive: (token: string, id: string, data: AdminSetUserActiveInput) =>
      apiClient<AdminUserSummary>(`/admin/users/${id}/active`, {
        method: 'PATCH',
        token,
        body: JSON.stringify(data),
      }),
    setProviderVerified: (token: string, userId: string, data: AdminSetProviderVerifiedInput) =>
      apiClient<AdminUserSummary>(`/admin/providers/${userId}/verify`, {
        method: 'PATCH',
        token,
        body: JSON.stringify(data),
      }),
    categories: (token: string) =>
      apiClient<AdminCategorySummary[]>('/admin/categories', { token }),
    createCategory: (token: string, data: CreateCategoryInput) =>
      apiClient<AdminCategorySummary>('/admin/categories', {
        method: 'POST',
        token,
        body: JSON.stringify(data),
      }),
    updateCategory: (token: string, id: string, data: UpdateCategoryInput) =>
      apiClient<AdminCategorySummary>(`/admin/categories/${id}`, {
        method: 'PATCH',
        token,
        body: JSON.stringify(data),
      }),
    services: (token: string, params?: Record<string, string>) => {
      const query = params ? `?${new URLSearchParams(params)}` : '';
      return apiClient<PaginatedResponse<ServiceSummary>>(`/admin/services${query}`, { token });
    },
    setServiceStatus: (token: string, id: string, data: AdminSetServiceStatusInput) =>
      apiClient<ServiceSummary>(`/admin/services/${id}/status`, {
        method: 'PATCH',
        token,
        body: JSON.stringify(data),
      }),
    bookings: (token: string, params?: Record<string, string>) => {
      const query = params ? `?${new URLSearchParams(params)}` : '';
      return apiClient<PaginatedResponse<BookingSummary>>(`/admin/bookings${query}`, { token });
    },
    reviews: (token: string, params?: Record<string, string>) => {
      const query = params ? `?${new URLSearchParams(params)}` : '';
      return apiClient<PaginatedResponse<AdminReviewSummary>>(`/admin/reviews${query}`, {
        token,
      });
    },
    setReviewStatus: (token: string, id: string, data: AdminSetReviewStatusInput) =>
      apiClient<AdminReviewSummary>(`/admin/reviews/${id}/status`, {
        method: 'PATCH',
        token,
        body: JSON.stringify(data),
      }),
    reports: (token: string, params?: Record<string, string>) => {
      const query = params ? `?${new URLSearchParams(params)}` : '';
      return apiClient<PaginatedResponse<AdminReportSummary>>(`/admin/reports${query}`, {
        token,
      });
    },
    setReportStatus: (token: string, id: string, data: AdminSetReportStatusInput) =>
      apiClient<AdminReportSummary>(`/admin/reports/${id}/status`, {
        method: 'PATCH',
        token,
        body: JSON.stringify(data),
      }),
    announce: (token: string, data: AdminAnnouncementInput) =>
      apiClient<AdminAnnouncementResult>('/admin/announcements', {
        method: 'POST',
        token,
        body: JSON.stringify(data),
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
};
