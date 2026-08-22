import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { LoadingSpinner } from "../components/shared/LoadingSpinner";

export function ForcePasswordChangeRoute() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (!user.mustChangePassword) {
    return (
      <Navigate to={user.onboardingRequired ? "/onboarding" : "/dashboard"} replace />
    );
  }

  return <Outlet />;
}
