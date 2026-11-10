import { API_BASE_URL } from '../constants';
import { storage } from './storage';
import { getDeviceId } from './device';

const REQUEST_TIMEOUT_MS = 20_000;

/** Registered by AuthContext so an expired/revoked session signs the user out everywhere. */
let onUnauthorized: (() => void) | null = null;
export function setUnauthorizedHandler(fn: (() => void) | null) { onUnauthorized = fn; }

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) { super(message); this.status = status; }
}

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
    // Always send device ID on authenticated requests so the server can verify the session
    headers['X-Device-Id'] = await getDeviceId();
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, { ...options, headers, signal: controller.signal });
  } catch (e: any) {
    throw new ApiError(
      e?.name === 'AbortError'
        ? 'The server took too long to respond. Please try again.'
        : "Can't reach the server. Check your internet connection.",
      0
    );
  } finally {
    clearTimeout(timer);
  }

  // Gateways (502/504 pages) can return HTML; never surface a raw JSON parse error.
  let data: any = null;
  try { data = await response.json(); } catch { /* non-JSON body */ }

  if (!response.ok) {
    if (response.status === 401 && authenticated) onUnauthorized?.();
    throw new ApiError(
      data?.error || (response.status >= 500 ? 'Server error. Please try again shortly.' : `Request failed (${response.status})`),
      response.status
    );
  }

  return data as T;
}

// ── Auth ──────────────────────────────────────────────────────────────────────
export const api = {
  auth: {
    login: (email: string, password: string, deviceId: string) =>
      request<{ token: string; user: any }>('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password, deviceId }),
      }),

    register: (payload: {
      email: string;
      password: string;
      fullName: string;
      university: string;
      campus: string;
      yearOfStudy: string;
      phone?: string;
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

    /** Asks the server to check PayHero for this user's pending payments (covers a late or lost webhook). */
    reconcile: () =>
      request<{ success: boolean; settled: number; pending: number }>('/api/payhero/reconcile', {
        method: 'POST',
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

  // ── Subscriptions ──────────────────────────────────────────────────────────
  subscriptions: {
    active: () => request<{ subscription: any | null }>('/api/subscriptions/active', {}, true),
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
