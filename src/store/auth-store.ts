"use client";

import { useSyncExternalStore } from "react";
import { request } from "@/lib/request";

export type AuthUser = {
  id: string;
  email: string;
  name?: string | null;
};

type AuthState = {
  user: AuthUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
};

type AuthResponse = {
  user: AuthUser;
};

let state: AuthState = {
  user: null,
  isLoading: true,
  isAuthenticated: false,
};

const listeners = new Set<() => void>();

function emit(nextState: Partial<AuthState>) {
  const nextUser = Object.prototype.hasOwnProperty.call(nextState, "user")
    ? nextState.user ?? null
    : state.user;

  state = {
    ...state,
    ...nextState,
    isAuthenticated: Boolean(nextUser),
  };

  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getSnapshot() {
  return state;
}

async function fetchMe() {
  emit({ isLoading: true });

  try {
    const data = await request<AuthResponse>("/api/auth/me");
    emit({ user: data.user, isLoading: false });
    return data.user;
  } catch {
    emit({ user: null, isLoading: false });
    return null;
  }
}

async function refreshAccessToken() {
  try {
    await request<AuthResponse>("/api/auth/refresh", {
      method: "POST",
      skipAuthRefresh: true,
    });
    await fetchMe();
    return true;
  } catch {
    emit({ user: null, isLoading: false });
    return false;
  }
}

async function login(params: { email: string; password: string }) {
  emit({ isLoading: true });

  try {
    const data = await request<AuthResponse>("/api/auth/login", {
      method: "POST",
      body: params,
      skipAuthRefresh: true,
    });
    emit({ user: data.user, isLoading: false });
    return data.user;
  } catch (error) {
    emit({ user: null, isLoading: false });
    throw error;
  }
}

async function register(params: {
  email: string;
  name?: string;
  password: string;
  confirmPassword: string;
}) {
  emit({ isLoading: true });

  try {
    const data = await request<AuthResponse>("/api/auth/register", {
      method: "POST",
      body: params,
      skipAuthRefresh: true,
    });
    emit({ user: data.user, isLoading: false });
    return data.user;
  } catch (error) {
    emit({ user: null, isLoading: false });
    throw error;
  }
}

async function logout() {
  await request<{ success: boolean }>("/api/auth/logout", {
    method: "POST",
    skipAuthRefresh: true,
  }).catch(() => undefined);
  emit({ user: null, isLoading: false });
}

export function useAuthStore() {
  const currentState = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

  return {
    ...currentState,
    fetchMe,
    refreshAccessToken,
    login,
    register,
    logout,
  };
}
