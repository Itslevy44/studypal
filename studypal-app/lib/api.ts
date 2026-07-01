import { API_BASE_URL } from '../constants';
import { storage } from './storage';

async function request<T>(
  path: string,
  options: RequestInit = {},
  authenticated = false
): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (authenticated) {
    const token = await storage.getToken();
    if (token) headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers,
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data?.error || `Request failed: ${response.status}`);
  }

  return data as T;
}

// ── Auth ──────────────────────────────────────────────────────────────────────
export const api = {
  auth: {
    login: (email: string, password: string) =>
      request<{ token: string; user: any }>('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      }),

    register: (payload: {
      email: string;
      password: string;
      fullName: string;
      university: string;
      campus: string;
      yearOfStudy: string;
    }) =>
      request<{ token: string; user: any }>('/api/auth/register', {
        method: 'POST',
        body: JSON.stringify(payload),
      }),

    me: () => request<{ success: boolean; user: any }>('/api/auth/me', {}, true),

    updateProfile: (payload: Partial<{
      fullName: string;
      campus: string;
      yearOfStudy: string;
      university: string;
      currentPassword: string;
      newPassword: string;
    }>) =>
      request<{ success: boolean; user: any }>('/api/auth/profile', {
        method: 'PUT',
        body: JSON.stringify(payload),
      }, true),
  },

  // ── Universities ────────────────────────────────────────────────────────────
  universities: {
    list: () => request<{ universities: any[] }>('/api/universities'),
  },

  // ── Papers ──────────────────────────────────────────────────────────────────
  papers: {
    list: (params?: { university?: string; year?: string; course?: string }) => {
      const qs = new URLSearchParams();
      if (params?.university) qs.set('university', params.university);
      if (params?.year) qs.set('year', params.year);
      if (params?.course) qs.set('course', params.course);
      const query = qs.toString() ? `?${qs}` : '';
      return request<{ papers: any[] }>(`/api/papers${query}`, {}, true);
    },
    downloadUrl: (id: string) => `${API_BASE_URL}/api/papers/${id}/download`,
  },

  // ── M-Pesa ──────────────────────────────────────────────────────────────────
  mpesa: {
    stkPush: (payload: {
      phoneNumber: string;
      amount: number;
      accountReference: string;
      transactionDesc: string;
    }) =>
      request<{ success: boolean; data: any }>('/api/mpesa/stkpush', {
        method: 'POST',
        body: JSON.stringify(payload),
      }, true),
  },

  // ── Marketplace ─────────────────────────────────────────────────────────────
  marketplace: {
    items: () => request<{ items: any[] }>('/api/marketplace/items', {}, true),
    advertisements: () =>
      request<{ advertisements: any[] }>('/api/marketplace/advertisements', {}, true),
    notices: (university?: string) => {
      const qs = university ? `?university=${university}` : '';
      return request<{ notices: any[] }>(`/api/marketplace/notices${qs}`, {}, true);
    },
  },

  // ── App Update ──────────────────────────────────────────────────────────────
  update: {
    check: () =>
      request<{
        latestVersion: string;
        latestVersionCode: number;
        downloadUrl: string;
        releaseNotes: string;
        mandatory: boolean;
      }>('/api/app/version'),
  },
};
