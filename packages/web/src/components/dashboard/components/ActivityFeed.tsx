import { cn } from "../../../lib/utils";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../../../components/ui/card";
import type { ActivityItem } from "../types";

interface ActivityFeedProps {
  items: ActivityItem[];
}

/**
 * Chronological list of workspace events.
 * User actors get initials; AI actors get an "AI" label with a primary-tinted avatar.
 */
export function ActivityFeed({ items }: ActivityFeedProps) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-semibold">Activity Feed</CardTitle>
        <CardDescription>Recent actions across your workspace</CardDescription>
      </CardHeader>

      <CardContent className="p-0">
        <ul className="divide-y divide-border">
          {items.map((item) => (
            <ActivityRow key={item.id} item={item} />
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}

// ─── Row ─────────────────────────────────────────────────────────────────────

function ActivityRow({ item }: { item: ActivityItem }) {
  const isAi = item.actorType === "ai";

  return (
    <li className="flex items-start gap-3 px-6 py-3">
      {/* Avatar */}
      <span
        className={cn(
          "mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold",
          isAi
            ? "bg-primary/10 text-primary"
            : "bg-secondary text-secondary-foreground",
        )}
      >
        {isAi ? "AI" : item.actor[0]}
      </span>

      {/* Text */}
      <div className="min-w-0 flex-1">
        <p className="text-sm text-foreground">
          <span className="font-medium">{item.actor}</span>{" "}
          {item.action}{" "}
          <span className="font-medium">{item.target}</span>
        </p>
        <p className="mt-0.5 text-xs text-muted-foreground">{item.time}</p>
      </div>
    </li>
  );
}