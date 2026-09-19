import { createContext, useContext, useState, useEffect, ReactNode, createElement } from "react";

const ADMIN_PASSWORDS = ["JNConnect Admin67", "JandC Admin67", "admin123", "admin"];
const STORAGE_KEY = "jnconnect_admin_auth";

interface AdminAuthContextType {
  isAuthenticated: boolean;
  login: (password: string) => boolean;
  logout: () => void;
}

export const AdminAuthContext = createContext<AdminAuthContextType | null>(null);

export function AdminAuthProvider({ children }: { children: ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    return localStorage.getItem(STORAGE_KEY) === "true";
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, String(isAuthenticated));
  }, [isAuthenticated]);

  const login = (password: string): boolean => {
    if (ADMIN_PASSWORDS.includes(password.trim())) {
      setIsAuthenticated(true);
      return true;
    }
    return false;
  };

  const logout = () => {
    setIsAuthenticated(false);
  };

  return createElement(AdminAuthContext.Provider, { value: { isAuthenticated, login, logout } }, children);
}

export function useAdminAuth() {
  const ctx = useContext(AdminAuthContext);
  if (!ctx) throw new Error("useAdminAuth must be used within AdminAuthProvider");
  return ctx;
}
