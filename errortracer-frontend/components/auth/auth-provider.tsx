"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  apiFetch,
  refreshAccessToken as refreshToken,
  setAuthFailureHandler,
} from "@/lib/api-client";
import {
  clearAccessToken,
  getAccessToken,
  setAccessToken,
} from "@/lib/auth-token";

interface LoginCredentials {
  email: string;
  password: string;
}

interface RegisterPayload extends LoginCredentials {
  firstName: string;
  lastName: string;
}

interface AuthContextValue {
  login: (credentials: LoginCredentials) => Promise<void>;
  register: (payload: RegisterPayload) => Promise<void>;
  logout: () => Promise<void>;
  refreshAccessToken: () => Promise<string | null>;
  getAccessToken: () => string | null;
  isAuthenticated: boolean;
  isAuthLoading: boolean;
}

interface AccessTokenResponse {
  accessToken?: string;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isAuthLoading, setIsAuthLoading] = useState(true);

  const clearAuth = useCallback(() => {
    clearAccessToken();
    setIsAuthenticated(false);
  }, []);

  const refreshAccessToken = useCallback(async () => {
    const token = await refreshToken({ notifyOnFailure: false });
    setIsAuthenticated(Boolean(token));

    return token;
  }, []);

  const login = useCallback(async (credentials: LoginCredentials) => {
    const data = await apiFetch<AccessTokenResponse>("/v0.1/auth/login", {
      method: "POST",
      auth: false,
      retryOnUnauthorized: false,
      body: credentials,
    });

    const token =
      data.accessToken ?? (await refreshToken({ notifyOnFailure: false }));

    if (!token) {
      throw new Error("Unable to establish an authenticated session.");
    }

    setAccessToken(token);
    setIsAuthenticated(true);
  }, []);

  const register = useCallback(
    async (payload: RegisterPayload) => {
      const data = await apiFetch<AccessTokenResponse | void>(
        "/v0.1/auth/register",
        {
          method: "POST",
          auth: false,
          retryOnUnauthorized: false,
          body: payload,
        },
      );

      const token =
        data?.accessToken ?? (await refreshToken({ notifyOnFailure: false }));

      if (token) {
        setAccessToken(token);
        setIsAuthenticated(true);
        return;
      }

      await login({ email: payload.email, password: payload.password });
    },
    [login],
  );

  const logout = useCallback(async () => {
    try {
      await apiFetch<void>("/v0.1/auth/logout", {
        method: "POST",
        auth: false,
        retryOnUnauthorized: false,
      });
    } finally {
      clearAuth();
      router.replace("/login");
    }
  }, [clearAuth, router]);

  useEffect(() => {
    setAuthFailureHandler(() => {
      clearAuth();

      if (!pathname.startsWith("/login") && !pathname.startsWith("/signup")) {
        router.replace("/login");
      }
    });

    return () => setAuthFailureHandler(null);
  }, [clearAuth, pathname, router]);

  useEffect(() => {
    let active = true;

    refreshToken({ notifyOnFailure: false })
      .then((token) => {
        if (!active) {
          return;
        }

        setIsAuthenticated(Boolean(token));
      })
      .finally(() => {
        if (active) {
          setIsAuthLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      login,
      register,
      logout,
      refreshAccessToken,
      getAccessToken,
      isAuthenticated,
      isAuthLoading,
    }),
    [
      isAuthLoading,
      isAuthenticated,
      login,
      logout,
      refreshAccessToken,
      register,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used inside AuthProvider");
  }

  return context;
}
