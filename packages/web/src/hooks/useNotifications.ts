import { useQuery } from "@tanstack/react-query";
import { fetchNotifications } from "../services/notifications.service";

export function useNotifications() {
  return useQuery({
    queryKey: ["notifications"],
    queryFn: fetchNotifications,
  });
}
