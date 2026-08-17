import { usePlatformAuthContext } from "../providers/PlatformAuthProvider";

export function usePlatformAuth() {
  return usePlatformAuthContext();
}
