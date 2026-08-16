import { Navigate, Outlet } from "react-router-dom";
import { LoadingSpinner } from "../components/shared/LoadingSpinner";
import { usePlatformAuth } from "../hooks/usePlatformAuth";

export function PlatformProtectedRoute() {
  const { platformUser, isPlatformLoading } = usePlatformAuth();

  if (isPlatformLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  return platformUser ? <Outlet /> : <Navigate to="/platform/login" replace />;
}
