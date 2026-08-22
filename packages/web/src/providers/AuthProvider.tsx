import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { useQueryClient } from "@tanstack/react-query";
import { apiClient } from "../lib/api-client";

interface AuthUser {
  id: string;
  organizationId: string;
  email: string;
  fullName: string;
  role: "OWNER" | "ADMIN" | "INTERNAL";
  organizationStatus:
    | "CREATED"
    | "OWNER_ASSIGNED"
    | "ACTIVE"
    | "SUSPENDED"
    | "ARCHIVED";
  onboardingRequired: boolean;
  mustChangePassword: boolean;
}

interface AuthContextValue {
  user: AuthUser | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<AuthUser>;
  acceptInvitation: (
    invitationToken: string,
    fullName: string,
    password: string,
  ) => Promise<AuthUser>;
  refreshProfile: () => Promise<AuthUser>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const queryClient = useQueryClient();
  // Restore session on mount — access token cookie is sent automatically
  useEffect(() => {
    apiClient
      .get<{ data: AuthUser }>("/auth/me")
      .then(({ data }) => setUser(data.data))
      .catch(() => setUser(null))
      .finally(() => setIsLoading(false));
  }, []);

  async function login(email: string, password: string): Promise<AuthUser> {
    const { data } = await apiClient.post<{
      data: { user: AuthUser };
    }>("/auth/login", { email, password });

    setUser(data.data.user);
    return data.data.user;
  }

  async function acceptInvitation(
    invitationToken: string,
    fullName: string,
    password: string,
  ): Promise<AuthUser> {
    const { data } = await apiClient.post<{
      data: { user: AuthUser };
    }>("/auth/accept-invitation", {
      invitationToken,
      fullName,
      password,
    });

    setUser(data.data.user);
    return data.data.user;
  }

  async function refreshProfile(): Promise<AuthUser> {
    const { data } = await apiClient.get<{ data: AuthUser }>("/auth/me");
    setUser(data.data);
    return data.data;
  }

  async function logout(): Promise<void> {
    try {
      await apiClient.post("/auth/logout");
    } finally {
      setUser(null);
      queryClient.clear();
    }
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        login,
        acceptInvitation,
        refreshProfile,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuthContext(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx)
    throw new Error("useAuthContext must be used within <AuthProvider>");
  return ctx;
}
