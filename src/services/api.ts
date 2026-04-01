import axios from "axios";
import type { DemoRole } from "@/types";

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api",
});

const DEMO_USER_STORAGE_KEY = "global-engagement-demo-user";

api.interceptors.request.use((config) => {
  if (typeof window !== "undefined") {
    const rawUser = window.localStorage.getItem(DEMO_USER_STORAGE_KEY);
    if (rawUser) {
      try {
        const user = JSON.parse(rawUser) as { email: string; role: DemoRole };
        config.headers["x-demo-user-email"] = user.email;
        config.headers["x-demo-user-role"] = user.role;
      } catch (_error) {
        window.localStorage.removeItem(DEMO_USER_STORAGE_KEY);
      }
    }
  }

  return config;
});

export type ApiEnvelope<T> = {
  success: boolean;
  data: T;
  error?: string;
};

export async function apiGet<T>(url: string, params?: Record<string, string | number | boolean | undefined>) {
  const response = await api.get<ApiEnvelope<T>>(url, { params });
  return response.data.data;
}

export async function apiPost<T>(url: string, payload?: unknown) {
  const response = await api.post<ApiEnvelope<T>>(url, payload);
  return response.data.data;
}

export async function apiPut<T>(url: string, payload?: unknown) {
  const response = await api.put<ApiEnvelope<T>>(url, payload);
  return response.data.data;
}

export async function apiDelete<T>(url: string) {
  const response = await api.delete<ApiEnvelope<T>>(url);
  return response.data.data;
}

export { DEMO_USER_STORAGE_KEY };
export default api;
