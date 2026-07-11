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
} from '@xidmetal/shared';
import { BookingStatus } from '@xidmetal/shared';

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

export async function apiClient<T>(
  endpoint: string,
  options: RequestOptions = {},
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

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Xəta baş verdi' }));
    const rawMessage = error.message;
    const message = Array.isArray(rawMessage)
      ? rawMessage.join(', ')
      : (rawMessage ?? 'Xəta baş verdi');
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

  service: (id: string) => apiClient<ServiceSummary>(`/services/${id}`),

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

  updateBookingStatus: (token: string, id: string, status: BookingStatus) =>
    apiClient<BookingSummary>(`/bookings/${id}/status`, {
      method: 'PATCH',
      token,
      body: JSON.stringify({ status }),
    }),

  reviewsReceived: (token: string, params?: Record<string, string>) => {
    const query = params ? `?${new URLSearchParams(params)}` : '';
    return apiClient<PaginatedResponse<ReviewSummary>>(`/reviews/received${query}`, { token });
  },
};
