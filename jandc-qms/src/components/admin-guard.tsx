import { ReactNode } from "react";
import { Redirect } from "wouter";
import { useAdminAuth } from "@/lib/admin-auth";

export function AdminGuard({ children }: { children: ReactNode }) {
  const { isAuthenticated } = useAdminAuth();
  if (!isAuthenticated) {
    return <Redirect to="/admin/login" />;
  }
  return <>{children}</>;
}
