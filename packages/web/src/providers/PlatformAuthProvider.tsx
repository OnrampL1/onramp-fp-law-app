import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { useQueryClient } from "@tanstack/react-query";
import { platformApiClient } from "../lib/platform-api-client";

export interface PlatformUser {
  id: string;
  email: string;
  fullName: string;
  role: "SUPER_ADMIN" | "SUPPORT_ENGINEER";
}

interface PlatformAuthContextValue {
  platformUser: PlatformUser | null;
  isPlatformLoading: boolean;
  platformLogin: (email: string, password: string) => Promise<void>;
  platformLogout: () => Promise<void>;
}

const PlatformAuthContext = createContext<PlatformAuthContextValue | null>(
  null,
);

export function PlatformAuthProvider({ children }: { children: ReactNode }) {
  const [platformUser, setPlatformUser] = useState<PlatformUser | null>(null);
  const [isPlatformLoading, setIsPlatformLoading] = useState(true);
  const queryClient = useQueryClient();

  useEffect(() => {
    platformApiClient
      .get<{ data: PlatformUser }>("/platform/auth/me")
      .then(({ data }) => setPlatformUser(data.data))
      .catch(() => setPlatformUser(null))
      .finally(() => setIsPlatformLoading(false));
  }, []);

  async function platformLogin(email: string, password: string): Promise<void> {
    const { data } = await platformApiClient.post<{
      data: { platformUser: PlatformUser };
    }>("/platform/auth/login", { email, password });

    setPlatformUser(data.data.platformUser);
  }

  async function platformLogout(): Promise<void> {
    try {
      await platformApiClient.post("/platform/auth/logout");
    } finally {
      setPlatformUser(null);
      queryClient.clear();
    }
  }

  return (
    <PlatformAuthContext.Provider
      value={{
        platformUser,
        isPlatformLoading,
        platformLogin,
        platformLogout,
      }}
    >
      {children}
    </PlatformAuthContext.Provider>
  );
}

export function usePlatformAuthContext(): PlatformAuthContextValue {
  const ctx = useContext(PlatformAuthContext);

  if (!ctx) {
    throw new Error(
      "usePlatformAuthContext must be used within <PlatformAuthProvider>",
    );
  }

  return ctx;
}
