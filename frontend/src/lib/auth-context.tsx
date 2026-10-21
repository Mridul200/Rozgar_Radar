"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { User } from "@/types/user";
import { fetchMe } from "@/lib/api";

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  login: (token: string, user: User) => void;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  token: null,
  isLoading: true,
  login: () => {},
  logout: () => {},
  refreshUser: async () => {},
});

export const AUTH_TOKEN_KEY = "hirepulse_auth_token";
export const AUTH_USER_KEY = "hirepulse_auth_user";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    try {
      const storedToken = localStorage.getItem(AUTH_TOKEN_KEY);
      const storedUser = localStorage.getItem(AUTH_USER_KEY);

      if (storedToken && storedUser) {
        setToken(storedToken);
        setUser(JSON.parse(storedUser));
        // Verify with backend
        fetchMe(storedToken)
          .then((fresh) => {
            setUser(fresh);
            localStorage.setItem(AUTH_USER_KEY, JSON.stringify(fresh));
          })
          .catch(() => {
            // Token expired or invalid
            localStorage.removeItem(AUTH_TOKEN_KEY);
            localStorage.removeItem(AUTH_USER_KEY);
            setToken(null);
            setUser(null);
          })
          .finally(() => {
            setIsLoading(false);
          });
      } else {
        setIsLoading(false);
      }
    } catch {
      setIsLoading(false);
    }
  }, []);

  const login = (newToken: string, newUser: User) => {
    setToken(newToken);
    setUser(newUser);
    try {
      localStorage.setItem(AUTH_TOKEN_KEY, newToken);
      localStorage.setItem(AUTH_USER_KEY, JSON.stringify(newUser));
    } catch (e) {
      console.error("Storage error:", e);
    }
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    try {
      localStorage.removeItem(AUTH_TOKEN_KEY);
      localStorage.removeItem(AUTH_USER_KEY);
    } catch (e) {
      console.error("Storage error:", e);
    }
  };

  const refreshUser = async () => {
    if (!token) return;
    try {
      const fresh = await fetchMe(token);
      setUser(fresh);
      localStorage.setItem(AUTH_USER_KEY, JSON.stringify(fresh));
    } catch (e) {
      console.error("Error refreshing user:", e);
    }
  };

  return (
    <AuthContext.Provider value={{ user, token, isLoading, login, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
