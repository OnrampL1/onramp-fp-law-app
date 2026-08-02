import { apiClient } from "../lib/api-client";
import type { BackendUserRole } from "../lib/permissions";

export interface ApiUser {
  id: string;
  organizationId: string;
  email: string;
  fullName: string;
  role: BackendUserRole;
  status: "INVITED" | "ACTIVE" | "SUSPENDED" | "DEACTIVATED";
  lastLoginAt: string | null;
  createdAt: string;
  updatedAt: string;
}

interface Paginated<T> {
  data: T[];
  meta: { pagination: { page: number; limit: number; total: number; totalPages: number } };
}

export async function listUsers(): Promise<ApiUser[]> {
  const { data } = await apiClient.get<Paginated<ApiUser>>("/users", {
    params: { limit: 100 },
  });
  return data.data;
}

export async function updateUserRole(
  userId: string,
  role: Extract<BackendUserRole, "ADMIN" | "INTERNAL">,
): Promise<ApiUser> {
  const { data } = await apiClient.put<{ data: ApiUser }>(
    `/users/${userId}/role`,
    { role },
  );
  return data.data;
}

export async function updateUserStatus(
  userId: string,
  status: "ACTIVE" | "SUSPENDED",
): Promise<ApiUser> {
  const { data } = await apiClient.put<{ data: ApiUser }>(
    `/users/${userId}/status`,
    { status },
  );
  return data.data;
}
